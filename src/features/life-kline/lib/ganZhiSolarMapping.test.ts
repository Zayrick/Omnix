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
  it('should return a LiChun-based range where year pillar is stable within boundaries', () => {
    const targetYear = 2001
    const targetGanZhi = Solar.fromYmdHms(targetYear, 6, 15, 12, 0, 0).getLunar().getEightChar().getYear()

    const range = getGanZhiYearSolarRange(targetYear, targetGanZhi)

    // start 通常在 2 月初，避免硬编码具体哪一天（受时区/历法实现影响）
    expect(range.startYmd.startsWith(`${targetYear}-02-`)).toBe(true)

    // start 当天中午的年柱应等于 targetGanZhi
    {
      const { y, m, d } = parseYmd(range.startYmd)
      const ganZhiAtStart = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar().getYear()
      expect(ganZhiAtStart).toBe(targetGanZhi)
    }

    // end 的下一天（nextStart）年柱应已经切换到下一年柱
    {
      const nextDay = addDaysUtc(range.endYmd, 1)
      const { y, m, d } = parseYmd(nextDay)
      const ganZhiAtNext = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar().getYear()
      expect(ganZhiAtNext).not.toBe(targetGanZhi)
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
})
