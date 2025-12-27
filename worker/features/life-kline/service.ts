import { Solar } from 'lunar-typescript'
import type {
  LifeKlineMode,
  LifeKlineMonthPointDto,
  LifeKlineRequestDto,
  LifeKlineYearPointDto,
} from '../../../shared/dto/lifeKline'
import type {
  LifeKlineDayPromptParams,
  LifeKlineMonthPromptParams,
  LifeKlinePromptParams,
} from './prompts'
import type { DaYunDetail, TimelineItem } from './types'

type LifeKlineValidated = {
  name?: string
  gender: 'male' | 'female'
  birthDate: string
  birthTime: string
  year: number
  month: number
  day: number
  hour: number
  minute: number

  mode: LifeKlineMode
  targetYear?: number
  targetMonth?: number
  selectedYearPoint?: LifeKlineYearPointDto
  selectedMonthPoint?: LifeKlineMonthPointDto
}

type ValidationResult =
  | { ok: true; value: LifeKlineValidated }
  | { ok: false; status: number; error: string }

export const validateLifeKlineRequest = (payload: LifeKlineRequestDto): ValidationResult => {
  const { name, gender, birthDate, birthTime } = payload
  const mode: LifeKlineMode = payload.mode ?? 'year'

  if (!birthDate || !birthTime || !gender) {
    return { ok: false, status: 400, error: '缺少必要参数' }
  }

  const [year, month, day] = birthDate.split('-').map(Number)
  const [hour, minute] = birthTime.split(':').map(Number)

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return { ok: false, status: 400, error: '出生日期或时间格式错误' }
  }

  if (mode === 'month') {
    const targetYear = payload.targetYear
    if (!Number.isFinite(targetYear)) {
      return { ok: false, status: 400, error: '缺少 targetYear' }
    }
    if (!payload.selectedYearPoint) {
      return { ok: false, status: 400, error: '缺少 selectedYearPoint' }
    }
    if (payload.selectedYearPoint.year !== targetYear) {
      return { ok: false, status: 400, error: 'selectedYearPoint.year 与 targetYear 不一致' }
    }
  }

  if (mode === 'day') {
    const targetYear = payload.targetYear
    const targetMonth = payload.targetMonth
    if (!Number.isFinite(targetYear)) {
      return { ok: false, status: 400, error: '缺少 targetYear' }
    }
    if (typeof targetMonth !== 'number' || !Number.isFinite(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return { ok: false, status: 400, error: 'targetMonth 必须是 1-12 的数字' }
    }
    if (!payload.selectedYearPoint) {
      return { ok: false, status: 400, error: '缺少 selectedYearPoint' }
    }
    if (!payload.selectedMonthPoint) {
      return { ok: false, status: 400, error: '缺少 selectedMonthPoint' }
    }
    if (payload.selectedYearPoint.year !== targetYear) {
      return { ok: false, status: 400, error: 'selectedYearPoint.year 与 targetYear 不一致' }
    }
    if (
      payload.selectedMonthPoint.year !== targetYear ||
      payload.selectedMonthPoint.month !== targetMonth
    ) {
      return { ok: false, status: 400, error: 'selectedMonthPoint 与 targetYear/targetMonth 不一致' }
    }
  }

  return {
    ok: true,
    value: {
      name,
      gender,
      birthDate,
      birthTime,
      year,
      month,
      day,
      hour,
      minute,

      mode,
      targetYear: payload.targetYear,
      targetMonth: payload.targetMonth,
      selectedYearPoint: payload.selectedYearPoint,
      selectedMonthPoint: payload.selectedMonthPoint,
    },
  }
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const toYmd = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`

const parseYmd = (ymd: string) => {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(ymd)
  if (!match) {
    throw new Error(`Invalid ymd: ${ymd}`)
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

const addDaysUtc = (ymd: string, days: number) => {
  const { y, m, d } = parseYmd(ymd)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return toYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

const diffDaysInclusiveUtc = (startYmd: string, endYmd: string) => {
  const s = parseYmd(startYmd)
  const e = parseYmd(endYmd)
  const sDt = Date.UTC(s.y, s.m - 1, s.d)
  const eDt = Date.UTC(e.y, e.m - 1, e.d)
  const days = Math.floor((eDt - sDt) / (24 * 60 * 60 * 1000)) + 1
  return Math.max(0, days)
}

const getJieQiYmd = (solarYear: number, jieQiName: string) => {
  const lunar = Solar.fromYmdHms(solarYear, 6, 15, 12, 0, 0).getLunar()
  const table = lunar.getJieQiTable() as unknown as Record<string, { toYmd: () => string }>
  const solar = table[jieQiName]
  if (!solar) {
    throw new Error(`JieQi not found in table: ${jieQiName} (${solarYear})`)
  }
  return solar.toYmd()
}

const getMonthRangeByIndex = (targetYear: number, monthIndex: number) => {
  if (!Number.isFinite(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    throw new Error(`Invalid monthIndex: ${monthIndex}`)
  }
  const startsInTargetYear = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪']

  const isLast = monthIndex === 12
  const startName = isLast ? '小寒' : startsInTargetYear[monthIndex - 1]!
  const nextName =
    monthIndex <= 10
      ? startsInTargetYear[monthIndex]!
      : monthIndex === 11
        ? '小寒'
        : '立春'

  const startYmd = isLast ? getJieQiYmd(targetYear + 1, startName) : getJieQiYmd(targetYear, startName)
  const nextStartYmd =
    monthIndex <= 10 ? getJieQiYmd(targetYear, nextName) : getJieQiYmd(targetYear + 1, nextName)

  return { startYmd, endYmd: addDaysUtc(nextStartYmd, -1) }
}

/**
 * 计算“公历年份”对应的年柱干支（八字口径，按节气/立春切换，而非农历正月初一）。
 *
 * 说明：为避免 1-2 月临界点（立春附近）导致偏差，这里取公历年中（6/15 中午）作为代表点。
 */
const getYearGanZhiBySolarYear = (targetYear: number) => {
  const solarMid = Solar.fromYmdHms(targetYear, 6, 15, 12, 0, 0)
  return solarMid.getLunar().getEightChar().getYear()
}

export const buildLifeKlinePromptParams = (input: LifeKlineValidated): LifeKlinePromptParams => {
  const { name, gender, birthDate, birthTime, year, month, day, hour, minute } = input

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()

  const bazi = [
    eightChar.getYear(),
    eightChar.getMonth(),
    eightChar.getDay(),
    eightChar.getTime(),
  ]

  const genderFlag = gender === 'male' ? 1 : 0
  const yun = eightChar.getYun(genderFlag)
  const daYunList = yun.getDaYun(20)

  const timeline: TimelineItem[] = []
  for (const daYun of daYunList) {
    const liuNianList = daYun.getLiuNian(10)
    for (const liuNian of liuNianList) {
      const age = liuNian.getAge()
      if (age < 1 || age > 100) {
        continue
      }
      const daYunGanZhi = daYun.getGanZhi() || '童限'
      timeline.push({
        age,
        year: liuNian.getYear(),
        daYun: daYunGanZhi,
        ganZhi: liuNian.getGanZhi(),
      })
    }
  }

  const timelineMap = new Map<number, TimelineItem>()
  for (const item of timeline) {
    timelineMap.set(item.age, item)
  }

  if (timelineMap.size < 100) {
    for (let age = 1; age <= 100; age += 1) {
      if (timelineMap.has(age)) {
        continue
      }
      const targetYear = year + age - 1
      const matchedDaYun =
        daYunList.find((item) => age >= item.getStartAge() && age <= item.getEndAge()) ??
        daYunList[0]
      timelineMap.set(age, {
        age,
        year: targetYear,
        daYun: matchedDaYun?.getGanZhi() || '童限',
        // 注意：这里必须使用“八字年柱”的口径，与 daYun.getLiuNian() 返回的 ganZhi 保持一致。
        ganZhi: getYearGanZhiBySolarYear(targetYear),
      })
    }
  }

  const timelineTrimmed = Array.from(timelineMap.values())
    .sort((a, b) => a.age - b.age)
    .slice(0, 100)

  const daYunGanZhiList = daYunList
    .map((item) => item.getGanZhi())
    .filter((item) => item)
    .slice(0, 10)

  const daYunDetails: DaYunDetail[] = daYunList
    .filter((item) => item.getGanZhi())
    .slice(0, 10)
    .map((item) => ({
      ganZhi: item.getGanZhi(),
      startAge: item.getStartAge(),
      endAge: item.getEndAge(),
      startYear: year + item.getStartAge() - 1,
      endYear: year + item.getEndAge() - 1,
    }))

  return {
    name,
    gender: gender === 'male' ? '男' : '女',
    birthDate,
    birthTime,
    bazi,
    startAge: daYunList[0]?.getStartAge() ?? 1,
    direction: yun.isForward() ? '顺行' : '逆行',
    daYunList: daYunGanZhiList,
    daYunDetails,
    timeline: timelineTrimmed,
  }
}

export const buildLifeKlineMonthPromptParams = (
  input: LifeKlineValidated
): LifeKlineMonthPromptParams => {
  const {
    name,
    gender,
    birthDate,
    birthTime,
    year,
    month,
    day,
    hour,
    minute,
    targetYear,
    selectedYearPoint,
  } = input

  if (!targetYear || !selectedYearPoint) {
    throw new Error('buildLifeKlineMonthPromptParams: missing targetYear/selectedYearPoint')
  }

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()

  const bazi = [
    eightChar.getYear(),
    eightChar.getMonth(),
    eightChar.getDay(),
    eightChar.getTime(),
  ]

  // 以“节”(立春起)作为月界，生成 12 个节气月（每月是一个公历范围，而不是公历月份）
  const months = Array.from({ length: 12 }, (_, index) => {
    const monthIndex = index + 1
    const range = getMonthRangeByIndex(targetYear, monthIndex)
    const { y, m, d } = parseYmd(range.startYmd)
    const solarStartNoon = Solar.fromYmdHms(y, m, d, 12, 0, 0)
    const monthGanZhi = solarStartNoon.getLunar().getEightChar().getMonth()

    return {
      month: monthIndex,
      monthInChinese: '',
      ganZhi: monthGanZhi,
      liuYue: monthGanZhi,
    }
  })

  return {
    name,
    gender: gender === 'male' ? '男' : '女',
    birthDate,
    birthTime,
    bazi,
    targetYear,
    // 下钻以 selectedYearPoint 为“真值来源”，避免与其它口径（农历年/立春）产生矛盾
    targetYearGanZhi: selectedYearPoint.ganZhi,
    selectedYearPoint,
    months,
  }
}

export const buildLifeKlineDayPromptParams = (input: LifeKlineValidated): LifeKlineDayPromptParams => {
  const {
    name,
    gender,
    birthDate,
    birthTime,
    year,
    month,
    day,
    hour,
    minute,
    targetYear,
    targetMonth,
    selectedYearPoint,
    selectedMonthPoint,
  } = input

  if (!targetYear || !targetMonth || !selectedYearPoint || !selectedMonthPoint) {
    throw new Error('buildLifeKlineDayPromptParams: missing targetYear/targetMonth/selected points')
  }

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()

  const bazi = [
    eightChar.getYear(),
    eightChar.getMonth(),
    eightChar.getDay(),
    eightChar.getTime(),
  ]

  const monthRange = getMonthRangeByIndex(targetYear, targetMonth)
  const totalDays = diffDaysInclusiveUtc(monthRange.startYmd, monthRange.endYmd)
  const days = Array.from({ length: totalDays }, (_, index) => {
    const d = index + 1
    const solarYmd = addDaysUtc(monthRange.startYmd, d - 1)
    const { y, m, d: dd } = parseYmd(solarYmd)
    const solarDay = Solar.fromYmdHms(y, m, dd, 12, 0, 0)
    const lunarDay = solarDay.getLunar()
    const ec = lunarDay.getEightChar()
    const dayGanZhi = ec.getDay()
    const weekInChinese = (solarDay as unknown as { getWeekInChinese?: () => string })
      .getWeekInChinese?.()

    return {
      day: d,
      solar: solarYmd,
      ganZhi: dayGanZhi,
      liuRi: dayGanZhi,
      week: weekInChinese ?? '',
    }
  })

  return {
    name,
    gender: gender === 'male' ? '男' : '女',
    birthDate,
    birthTime,
    bazi,
    targetYear,
    targetMonth,
    // 同上：以 selectedYearPoint 为准，保持提示词一致性
    targetYearGanZhi: selectedYearPoint.ganZhi,
    selectedYearPoint,
    selectedMonthPoint,
    totalDays,
    days,
  }
}
