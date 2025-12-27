import { createChatCompletionStream } from '../../shared/ai/chatCompletions'
import { jsonResponse } from '../../shared/http/cors'
import type { Env } from '../../shared/types'
import {
  buildLifeKlineDayPrompt,
  buildLifeKlineMonthPrompt,
  buildLifeKlinePrompt,
  LIFE_KLINE_DAY_SYSTEM_PROMPT,
  LIFE_KLINE_MONTH_SYSTEM_PROMPT,
  LIFE_KLINE_SYSTEM_PROMPT,
} from './prompts'
import {
  buildLifeKlineDayPromptParams,
  buildLifeKlineMonthPromptParams,
  buildLifeKlinePromptParams,
  validateLifeKlineRequest,
} from './service'
import type { LifeKlineRequest } from './types'

export const handleLifeKline = async (request: Request, env: Env) => {
  try {
    const payload = (await request.json()) as LifeKlineRequest
    const parsed = validateLifeKlineRequest(payload)

    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, { status: parsed.status })
    }

    if (!env.AI_API_KEY) {
      return jsonResponse({ error: '缺少 AI_API_KEY' }, { status: 500 })
    }

    const mode = parsed.value.mode

    const { systemPrompt, userPrompt } = (() => {
      if (mode === 'month') {
        return {
          systemPrompt: LIFE_KLINE_MONTH_SYSTEM_PROMPT,
          userPrompt: buildLifeKlineMonthPrompt(buildLifeKlineMonthPromptParams(parsed.value)),
        }
      }

      if (mode === 'day') {
        return {
          systemPrompt: LIFE_KLINE_DAY_SYSTEM_PROMPT,
          userPrompt: buildLifeKlineDayPrompt(buildLifeKlineDayPromptParams(parsed.value)),
        }
      }

      return {
        systemPrompt: LIFE_KLINE_SYSTEM_PROMPT,
        userPrompt: buildLifeKlinePrompt(buildLifeKlinePromptParams(parsed.value)),
      }
    })()

    const stream = await createChatCompletionStream({
      apiKey: env.AI_API_KEY,
      baseUrl: env.AI_API_BASE,
      model: env.AI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    return jsonResponse({ error: '请求处理失败', detail: String(error) }, { status: 500 })
  }
}
