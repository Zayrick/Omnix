import type { LifeKlineChartPoint, LifeKlineResult } from '../types/lifeKline'

type ParserCallbacks = {
  onResult?: (partial: Partial<LifeKlineResult>) => void
  onChartPoint?: (point: LifeKlineChartPoint) => void
}

type ParserState = {
  result: Partial<LifeKlineResult>
  raw: string
}

const parseScalar = (value: string) => {
  const cleaned = value.replace(/\s+#.*$/, '').trim()
  if (!cleaned) {
    return ''
  }
  const quoted =
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  if (quoted) {
    return cleaned.slice(1, -1).replace(/\\"/g, '"')
  }
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned)
  }
  if (cleaned === 'true') {
    return true
  }
  if (cleaned === 'false') {
    return false
  }
  return cleaned
}

const parseKeyValue = (line: string) => {
  const index = line.indexOf(':')
  if (index === -1) {
    return null
  }
  const key = line.slice(0, index).trim()
  const value = line.slice(index + 1).trim()
  return { key, value }
}

export const createYamlStreamParser = (callbacks: ParserCallbacks = {}) => {
  let buffer = ''
  let raw = ''
  let currentSection: 'bazi' | 'chartPoints' | null = null
  let currentPoint: Partial<LifeKlineChartPoint> | null = null
  const seenAges = new Set<number>()
  const result: Partial<LifeKlineResult> = {
    bazi: [],
    chartPoints: [],
  }

  const commitPoint = () => {
    if (!currentPoint) {
      return
    }
    const age = Number(currentPoint.age)
    if (!Number.isFinite(age) || seenAges.has(age)) {
      currentPoint = null
      return
    }
    const normalized: LifeKlineChartPoint = {
      age,
      year: Number(currentPoint.year),
      daYun: String(currentPoint.daYun ?? ''),
      ganZhi: String(currentPoint.ganZhi ?? ''),
      open: Number(currentPoint.open),
      close: Number(currentPoint.close),
      high: Number(currentPoint.high),
      low: Number(currentPoint.low),
      score: Number(currentPoint.score),
      reason: String(currentPoint.reason ?? ''),
    }
    seenAges.add(age)
    result.chartPoints?.push(normalized)
    callbacks.onChartPoint?.(normalized)
    currentPoint = null
  }

  const parseLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return
    }

    const isRootLine = !line.startsWith(' ')
    if (currentSection && isRootLine && !trimmed.startsWith('-') && !trimmed.endsWith(':')) {
      currentSection = null
    }

    if (isRootLine && trimmed.endsWith(':') && !trimmed.startsWith('-')) {
      const section = trimmed.slice(0, -1).trim()
      if (section === 'bazi' || section === 'chartPoints') {
        currentSection = section
        return
      }
      currentSection = null
    }

    if (currentSection === 'bazi') {
      if (trimmed.startsWith('-')) {
        const value = parseScalar(trimmed.slice(1).trim())
        if (typeof value === 'string') {
          const next = [...(result.bazi ?? []), value]
          result.bazi = next
          callbacks.onResult?.({ bazi: next })
        }
      }
      return
    }

    if (currentSection === 'chartPoints') {
      if (trimmed.startsWith('-')) {
        commitPoint()
        currentPoint = {}
        const rest = trimmed.replace(/^-+\s*/, '')
        if (rest) {
          const pair = parseKeyValue(rest)
          if (pair) {
            currentPoint[pair.key as keyof LifeKlineChartPoint] = parseScalar(
              pair.value
            ) as never
          }
        }
        return
      }
      const pair = parseKeyValue(trimmed)
      if (!pair || !currentPoint) {
        return
      }
      currentPoint[pair.key as keyof LifeKlineChartPoint] = parseScalar(
        pair.value
      ) as never
      if (pair.key === 'reason') {
        commitPoint()
      }
      return
    }

    const pair = parseKeyValue(trimmed)
    if (!pair) {
      return
    }
    const parsed = parseScalar(pair.value)
    result[pair.key as keyof LifeKlineResult] = parsed as never
    callbacks.onResult?.({ [pair.key]: parsed } as Partial<LifeKlineResult>)
  }

  return {
    push(chunk: string) {
      raw += chunk
      buffer += chunk
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        parseLine(line)
      }
    },
    finish(): ParserState {
      if (buffer.trim()) {
        parseLine(buffer)
      }
      commitPoint()
      return { result, raw }
    },
  }
}
