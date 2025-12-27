import { createChatCompletionStream } from '../../shared/ai/chatCompletions'
import { jsonResponse } from '../../shared/http/cors'
import type { Env } from '../../shared/types'
import { buildLifeKlinePrompt, LIFE_KLINE_SYSTEM_PROMPT } from './prompts'
import { buildLifeKlinePromptParams, validateLifeKlineRequest } from './service'
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

    const userPrompt = buildLifeKlinePrompt(buildLifeKlinePromptParams(parsed.value))

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
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    return jsonResponse({ error: '请求处理失败', detail: String(error) }, { status: 500 })
  }
}
