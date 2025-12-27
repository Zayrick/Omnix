import type { CandlestickData, Time } from 'lightweight-charts'
import type { LifeKlineChartPoint } from './types'

export const toCandle = (point: LifeKlineChartPoint): CandlestickData<Time> => ({
  time: { year: point.year, month: 1, day: 1 },
  open: point.open,
  high: point.high,
  low: point.low,
  close: point.close,
})
