import { describe, expect, it } from 'vitest'
import { Solar } from 'lunar-typescript'
import { getGanZhiDaySolarYmd, getGanZhiMonthSolarRange, getGanZhiYearSolarRange } from './ganZhiSolarMapping'

const parseYmd = (ymd: string) => {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(ymd)
  if (!match) {
    throw new Error(`Invalid ymd: ${ymd}`)
  }
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  }
}

const addDaysUtc = (ymd: string, days: number) => {
  const { y, m, d } = parseYmd(ymd)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

describe('getGanZhiYearSolarRange', () => {
  it('should return a ChunJie-based range where start is lunar 1/1 and end+1 is next lunar 1/1', () => {
    const targetYear = 2001
    const range = getGanZhiYearSolarRange(targetYear, 'IGNORED')

    // 春节通常在 1-2 月，避免硬编码具体哪一天（受历法实现影响）
    expect(
      range.startYmd.startsWith(`${targetYear}-01-`) || range.startYmd.startsWith(`${targetYear}-02-`)
    ).toBe(true)

    // start 必须是农历正月初一（春节）
    {
      const { y, m, d } = parseYmd(range.startYmd)
      const lunarAtStart = Solar.fromYmd(y, m, d).getLunar()
      expect(lunarAtStart.getMonth()).toBe(1)
      expect(lunarAtStart.getDay()).toBe(1)
    }

    // end 的下一天必须也是农历正月初一（下一年春节）
    {
      const nextDay = addDaysUtc(range.endYmd, 1)
      const { y, m, d } = parseYmd(nextDay)
      const lunarAtNext = Solar.fromYmd(y, m, d).getLunar()
      expect(lunarAtNext.getMonth()).toBe(1)
      expect(lunarAtNext.getDay()).toBe(1)
    }
  })
})

describe('getGanZhiMonthSolarRange', () => {
  it('month 1 should start around LiChun and month 12 should cross to next year', () => {
    const targetYear = 2001
    const m1 = getGanZhiMonthSolarRange(targetYear, 1)
    expect(m1.startYmd.startsWith(`${targetYear}-02-`)).toBe(true)

    const m12 = getGanZhiMonthSolarRange(targetYear, 12)
    expect(m12.startYmd.startsWith(`${targetYear + 1}-01-`)).toBe(true)
    expect(m12.endYmd.startsWith(`${targetYear + 1}-02-`)).toBe(true)
  })

  it('month 13 should map to next year month 1 range', () => {
    const targetYear = 2001
    const m13 = getGanZhiMonthSolarRange(targetYear, 13)
    const nextM1 = getGanZhiMonthSolarRange(targetYear + 1, 1)
    expect(m13.startYmd).toBe(nextM1.startYmd)
    expect(m13.endYmd).toBe(nextM1.endYmd)
  })
})

describe('getGanZhiDaySolarYmd', () => {
  it('day index should map to a concrete solar date within the month range', () => {
    const targetYear = 2001
    const monthIndex = 1
    const range = getGanZhiMonthSolarRange(targetYear, monthIndex)

    const d1 = getGanZhiDaySolarYmd(targetYear, monthIndex, 1)
    expect(d1).toBe(range.startYmd)

    const d3 = getGanZhiDaySolarYmd(targetYear, monthIndex, 3)
    expect(d3 >= range.startYmd && d3 <= range.endYmd).toBe(true)
  })

  it('should support month 13 day mapping', () => {
    const targetYear = 2001
    const monthIndex = 13
    const range = getGanZhiMonthSolarRange(targetYear, monthIndex)
    const d1 = getGanZhiDaySolarYmd(targetYear, monthIndex, 1)
    expect(d1).toBe(range.startYmd)
  })
})
