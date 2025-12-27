import { LunarYear, Solar } from 'lunar-typescript'
import { createChatCompletionStream } from '../../shared/ai/chatCompletions'
import { corsHeaders, jsonResponse } from '../../shared/http/cors'
import type { Env } from '../../shared/types'
import { buildLifeKlinePrompt, LIFE_KLINE_SYSTEM_PROMPT } from './prompts'
import type { DaYunDetail, LifeKlineRequest, TimelineItem } from './types'

export const handleLifeKline = async (request: Request, env: Env) => {
  try {
    const payload = (await request.json()) as LifeKlineRequest
    const { name, gender, birthDate, birthTime } = payload

    if (!birthDate || !birthTime || !gender) {
      return jsonResponse({ error: '缺少必要参数' }, { status: 400 })
    }

    const [year, month, day] = birthDate.split('-').map(Number)
    const [hour, minute] = birthTime.split(':').map(Number)

    if (![year, month, day, hour, minute].every(Number.isFinite)) {
      return jsonResponse({ error: '出生日期或时间格式错误' }, { status: 400 })
    }

    if (!env.AI_API_KEY) {
      return jsonResponse({ error: '缺少 AI_API_KEY' }, { status: 500 })
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
          daYunList.find((item) => age >= item.getStartAge() && age <= item.getEndAge()) ??
          daYunList[0]
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

    const userPrompt = buildLifeKlinePrompt({
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

    const stream = await createChatCompletionStream({
      apiKey: env.AI_API_KEY,
      baseUrl: env.AI_API_BASE,
      model: env.AI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: LIFE_KLINE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    return jsonResponse({ error: '请求处理失败', detail: String(error) }, { status: 500 })
  }
}
