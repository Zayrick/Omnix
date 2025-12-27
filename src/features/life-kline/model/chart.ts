import type { CandlestickData, Time } from 'lightweight-charts'
import type { LifeKlineChartPoint } from './types'

import {
  getGanZhiDaySolarYmd,
  getGanZhiMonthSolarRange,
  getGanZhiYearSolarRange,
} from '../lib/ganZhiSolarMapping'

const pointToDateString = (point: LifeKlineChartPoint): string => {
  const level = point.level ?? (point.day ? 'day' : point.month ? 'month' : 'year')
  if (level === 'day') {
    return getGanZhiDaySolarYmd(point.year, point.month ?? 1, point.day ?? 1)
  }
  if (level === 'month') {
    return getGanZhiMonthSolarRange(point.year, point.month ?? 1).startYmd
  }
  return getGanZhiYearSolarRange(point.year, point.ganZhi).startYmd
}

export const toCandle = (point: LifeKlineChartPoint): CandlestickData<Time> => ({
  time: pointToDateString(point),
  open: point.open,
  high: point.high,
  low: point.low,
  close: point.close,
})
