import { parse as parseYaml } from 'yaml'
import type { LifeKlineRequestDto } from '../../../../shared/dto/lifeKline'
import { requestLifeKlineStream } from '../api/lifeKlineApi'
import { createYamlStreamParser } from '../lib/yamlStreamParser'
import type { LifeKlineChartPoint, LifeKlineResult } from './types'

type StreamLifeKlineOptions = {
  payload: LifeKlineRequestDto
  signal: AbortSignal
  onStreamStart?: () => void
  onPartial?: (partial: Partial<LifeKlineResult>) => void
  onChartPoint?: (point: LifeKlineChartPoint) => void
}

export type StreamLifeKlineResult = {
  parsed: LifeKlineResult | null
  fallback: Partial<LifeKlineResult>
}

export const streamLifeKlineAnalysis = async ({
  payload,
  signal,
  onStreamStart,
  onPartial,
  onChartPoint,
}: StreamLifeKlineOptions): Promise<StreamLifeKlineResult> => {
  const response = await requestLifeKlineStream(payload, signal)

  if (!response.ok || !response.body) {
    const detail = await response.text()
    throw new Error(detail || 'AI 接口返回错误')
  }

  onStreamStart?.()

  const parser = createYamlStreamParser({
    onResult: onPartial,
    onChartPoint,
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let raw = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    const chunk = decoder.decode(value, { stream: true })
    raw += chunk
    parser.push(chunk)
  }

  const { raw: finalRaw, result } = parser.finish()
  let parsed: LifeKlineResult | null = null
  try {
    parsed = parseYaml(finalRaw || raw) as LifeKlineResult
  } catch {
    parsed = null
  }

  return { parsed, fallback: result }
}
