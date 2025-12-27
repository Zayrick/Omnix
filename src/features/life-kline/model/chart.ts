import type { CandlestickData, Time } from 'lightweight-charts'
import type { LifeKlineChartPoint } from './types'

const pad2 = (value: number) => String(value).padStart(2, '0')

const pointToDateString = (point: LifeKlineChartPoint): string => {
  const level = point.level ?? (point.day ? 'day' : point.month ? 'month' : 'year')
  if (level === 'day') {
    const m = point.month ?? 1
    const d = point.day ?? 1
    return `${point.year}-${pad2(m)}-${pad2(d)}`
  }
  if (level === 'month') {
    const m = point.month ?? 1
    return `${point.year}-${pad2(m)}-01`
  }
  return `${point.year}-01-01`
}

export const toCandle = (point: LifeKlineChartPoint): CandlestickData<Time> => ({
  time: pointToDateString(point),
  open: point.open,
  high: point.high,
  low: point.low,
  close: point.close,
})
