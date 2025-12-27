import { LunarYear, Solar } from 'lunar-typescript'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompts'

type Env = {
  AI_API_KEY: string
  AI_API_BASE?: string
  AI_MODEL?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

type LifeKlineRequest = {
  name?: string
  gender?: 'male' | 'female'
  birthDate?: string
  birthTime?: string
}

type TimelineItem = {
  age: number
  year: number
  daYun: string
  ganZhi: string
}

type DaYunDetail = {
  ganZhi: string
  startAge: number
  endAge: number
  startYear: number
  endYear: number
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === '/api/life-kline' && request.method === 'POST') {
      try {
        const payload = (await request.json()) as LifeKlineRequest
        const { name, gender, birthDate, birthTime } = payload

        if (!birthDate || !birthTime || !gender) {
          return Response.json(
            { error: '缺少必要参数' },
            { status: 400, headers: corsHeaders }
          )
        }

        const [year, month, day] = birthDate.split('-').map(Number)
        const [hour, minute] = birthTime.split(':').map(Number)

        if (![year, month, day, hour, minute].every(Number.isFinite)) {
          return Response.json(
            { error: '出生日期或时间格式错误' },
            { status: 400, headers: corsHeaders }
          )
        }

        if (!env.AI_API_KEY) {
          return Response.json(
            { error: '缺少 AI_API_KEY' },
            { status: 500, headers: corsHeaders }
          )
        }

        const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
        const lunar = solar.getLunar()
        const eightChar = lunar.getEightChar()

        const bazi = [
          eightChar.getYear(),
          eightChar.getMonth(),
          eightChar.getDay(),
          eightChar.getTime(),
        ]

        const genderFlag = gender === 'male' ? 1 : 0
        const yun = eightChar.getYun(genderFlag)
        const daYunList = yun.getDaYun(20)

        const timeline: TimelineItem[] = []
        for (const daYun of daYunList) {
          const liuNianList = daYun.getLiuNian(10)
          for (const liuNian of liuNianList) {
            const age = liuNian.getAge()
            if (age < 1 || age > 100) {
              continue
            }
            const daYunGanZhi = daYun.getGanZhi() || '童限'
            timeline.push({
              age,
              year: liuNian.getYear(),
              daYun: daYunGanZhi,
              ganZhi: liuNian.getGanZhi(),
            })
          }
        }

        const timelineMap = new Map<number, TimelineItem>()
        for (const item of timeline) {
          timelineMap.set(item.age, item)
        }

        if (timelineMap.size < 100) {
          for (let age = 1; age <= 100; age += 1) {
            if (timelineMap.has(age)) {
              continue
            }
            const targetYear = year + age - 1
            const matchedDaYun =
              daYunList.find(
                (item) => age >= item.getStartAge() && age <= item.getEndAge()
              ) ?? daYunList[0]
            timelineMap.set(age, {
              age,
              year: targetYear,
              daYun: matchedDaYun?.getGanZhi() || '童限',
              ganZhi: LunarYear.fromYear(targetYear).getGanZhi(),
            })
          }
        }

        const timelineTrimmed = Array.from(timelineMap.values())
          .sort((a, b) => a.age - b.age)
          .slice(0, 100)

        const daYunGanZhiList = daYunList
          .map((item) => item.getGanZhi())
          .filter((item) => item)
          .slice(0, 10)

        const daYunDetails: DaYunDetail[] = daYunList
          .filter((item) => item.getGanZhi())
          .slice(0, 10)
          .map((item) => ({
            ganZhi: item.getGanZhi(),
            startAge: item.getStartAge(),
            endAge: item.getEndAge(),
            startYear: year + item.getStartAge() - 1,
            endYear: year + item.getEndAge() - 1,
          }))

        const userPrompt = buildUserPrompt({
          name,
          gender: gender === 'male' ? '男' : '女',
          birthDate,
          birthTime,
          bazi,
          startAge: daYunList[0]?.getStartAge() ?? 1,
          direction: yun.isForward() ? '顺行' : '逆行',
          daYunList: daYunGanZhiList,
          daYunDetails,
          timeline: timelineTrimmed,
        })

        const baseUrl = (env.AI_API_BASE ?? 'https://api.openai.com/v1').replace(
          /\/$/,
          ''
        )
        const aiResponse = await fetch(
          `${baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.AI_API_KEY}`,
            },
            body: JSON.stringify({
              model: env.AI_MODEL ?? 'gpt-4o-mini',
              stream: true,
              temperature: 0.7,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
            }),
          }
        )

        if (!aiResponse.ok || !aiResponse.body) {
          const detail = await aiResponse.text()
          return Response.json(
            { error: 'AI 请求失败', detail },
            { status: 500, headers: corsHeaders }
          )
        }

        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        const reader = aiResponse.body.getReader()

        const stream = new ReadableStream({
          async start(controller) {
            let buffer = ''

            while (true) {
              const { value, done } = await reader.read()
              if (done) {
                break
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split(/\r?\n/)
              buffer = lines.pop() ?? ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed.startsWith('data:')) {
                  continue
                }
                const data = trimmed.replace(/^data:\s*/, '')
                if (data === '[DONE]') {
                  controller.close()
                  return
                }
                try {
                  const json = JSON.parse(data)
                  const delta = json?.choices?.[0]?.delta?.content ?? ''
                  if (delta) {
                    controller.enqueue(encoder.encode(delta))
                  }
                } catch (error) {
                  console.error('stream parse error', error)
                }
              }
            }

            controller.close()
          },
        })

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        })
      } catch (error) {
        return Response.json(
          { error: '请求处理失败', detail: String(error) },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>
