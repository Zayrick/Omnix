import { Solar } from 'lunar-typescript'

const pad2 = (value: number) => String(value).padStart(2, '0')

export type SolarRange = {
  startYmd: string
  endYmd: string
}

export type SolarYmd = string

const toYmd = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`

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

const addDays = (ymd: string, days: number) => {
  const { y, m, d } = parseYmd(ymd)
  // 使用 UTC 避免本地时区/DST 导致日期偏移
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return toYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

const getJieQiYmd = (solarYear: number, jieQiName: string): SolarYmd => {
  // 取年中中午作为“锚点”，确保能取到该阳历年的 24 节气（大雪~大雪）
  const lunar = Solar.fromYmdHms(solarYear, 6, 15, 12, 0, 0).getLunar()
  const table = lunar.getJieQiTable() as unknown as Record<string, { toYmd: () => string }>
  const solar = table[jieQiName]
  if (!solar) {
    throw new Error(`JieQi not found in table: ${jieQiName} (${solarYear})`)
  }
  return solar.toYmd()
}

const getYearGanZhiAtNoon = (y: number, m: number, d: number) => {
  const solar = Solar.fromYmdHms(y, m, d, 12, 0, 0)
  return solar.getLunar().getEightChar().getYear()
}

const findYearPillarStartYmd = (year: number, ganZhi: string) => {
  // 立春通常在 2/3~2/5，扫描窗口放宽避免极端情况。
  for (let day = 1; day <= 15; day += 1) {
    const current = getYearGanZhiAtNoon(year, 2, day)
    if (current === ganZhi) {
      return toYmd(year, 2, day)
    }
  }
  // 极端情况下未命中（理论上不应发生），降级为 2/4
  return toYmd(year, 2, 4)
}

/**
 * 计算“年柱干支”的公历时间段（按节气/立春切换的八字口径）。
 *
 * 说明：
 * - 年柱不是简单的 1/1~12/31；通常在 2 月初（立春附近）切换。
 * - 这里以“找到该年柱干支首次出现的日期”为 start；end 为下一年 start 的前一天。
 */
export const getGanZhiYearSolarRange = (targetYear: number, targetGanZhi: string): SolarRange => {
  const startYmd = findYearPillarStartYmd(targetYear, targetGanZhi)

  const nextYearGanZhi = getYearGanZhiAtNoon(targetYear + 1, 6, 15)
  const nextStartYmd = findYearPillarStartYmd(targetYear + 1, nextYearGanZhi)

  const endYmd = addDays(nextStartYmd, -1)

  return { startYmd, endYmd }
}

/**
 * 计算“月柱干支（节气月）”对应的公历时间段。
 *
 * monthIndex: 1-12，按立春起的 12 个节气月顺序。
 * - 1: 立春~惊蛰前一日
 * - ...
 * - 11: 大雪~小寒前一日
 * - 12: 小寒~次年立春前一日
 */
export const getGanZhiMonthSolarRange = (targetYear: number, monthIndex: number): SolarRange => {
  if (!Number.isFinite(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    throw new Error(`Invalid monthIndex: ${monthIndex}`)
  }

  // 12 个“节”(Jie) 作为月界（从立春开始）
  const startsInTargetYear = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪']

  const isLastMonth = monthIndex === 12
  const startName = isLastMonth ? '小寒' : startsInTargetYear[monthIndex - 1]!
  const nextName =
    monthIndex <= 10
      ? startsInTargetYear[monthIndex]!
      : monthIndex === 11
        ? '小寒'
        : '立春'

  const startYmd = isLastMonth ? getJieQiYmd(targetYear + 1, startName) : getJieQiYmd(targetYear, startName)
  const nextStartYmd =
    monthIndex <= 10
      ? getJieQiYmd(targetYear, nextName)
      : getJieQiYmd(targetYear + 1, nextName)

  return {
    startYmd,
    endYmd: addDays(nextStartYmd, -1),
  }
}

/**
 * 将“节气月”的日点（1..N）映射为具体公历日期。
 */
export const getGanZhiDaySolarYmd = (targetYear: number, monthIndex: number, dayIndex: number): SolarYmd => {
  if (!Number.isFinite(dayIndex) || dayIndex < 1) {
    throw new Error(`Invalid dayIndex: ${dayIndex}`)
  }
  const range = getGanZhiMonthSolarRange(targetYear, monthIndex)
  return addDays(range.startYmd, dayIndex - 1)
}

export const formatSolarYmdZh = (ymd: SolarYmd) => {
  const { y, m, d } = parseYmd(ymd)
  return `${y}年${m}月${d}日`
}

export const formatSolarRangeZh = (range: SolarRange) => {
  return `${formatSolarYmdZh(range.startYmd)}-${formatSolarYmdZh(range.endYmd)}`
}
