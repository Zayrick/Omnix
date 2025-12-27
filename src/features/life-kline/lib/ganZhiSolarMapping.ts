import { Lunar, Solar } from 'lunar-typescript'

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

const getChunJieYmd = (lunarYear: number): SolarYmd => {
  // 春节 = 农历正月初一
  // 注意：这里的 lunarYear 是“农历年”编号（与大多数公历年同名，但春节在 1-2 月）。
  return Lunar.fromYmd(lunarYear, 1, 1).getSolar().toYmd()
}

/**
 * 计算“年K线显示用”的公历时间段（按春节/农历正月初一切换）。
 *
 * 说明：
 * - 用户侧“年份”以春节交替（而非立春）。春节通常落在 1-2 月，且会发生在某个节气月的中间。
 * - 这里只用于【年级别】的显示（图表 time 轴与 tooltip 年范围），不影响月/日采用节气月的口径。
 * - 保持 targetGanZhi 参数仅为兼容既有调用；春节边界与该参数无关。
 */
export const getGanZhiYearSolarRange = (targetYear: number, _targetGanZhi: string): SolarRange => {
  const startYmd = getChunJieYmd(targetYear)
  const nextStartYmd = getChunJieYmd(targetYear + 1)
  return { startYmd, endYmd: addDays(nextStartYmd, -1) }
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
  if (!Number.isFinite(monthIndex) || monthIndex < 1 || monthIndex > 13) {
    throw new Error(`Invalid monthIndex: ${monthIndex}`)
  }

  // 追加“第13月”表示“次年第一节气月（立春起）”，用于在春节年界的口径下补齐跨度。
  if (monthIndex === 13) {
    return getGanZhiMonthSolarRange(targetYear + 1, 1)
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
