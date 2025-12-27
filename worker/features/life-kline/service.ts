import { LunarYear, Solar } from 'lunar-typescript'
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

const daysInGregorianMonth = (year: number, month: number) => {
  // JS Date 的 month 是 0-based；这里传入 1-12，配合 day=0 得到该月最后一天
  return new Date(year, month, 0).getDate()
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
        ganZhi: LunarYear.fromYear(targetYear).getGanZhi(),
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

  // 用公历每月中旬（15日中午）取当月月柱，避免月初临界点（节气切换）导致偏差
  const months = Array.from({ length: 12 }, (_, index) => {
    const m = index + 1
    const solarMid = Solar.fromYmdHms(targetYear, m, 15, 12, 0, 0)
    const lunarMid = solarMid.getLunar()
    const ec = lunarMid.getEightChar()
    const monthGanZhi = ec.getMonth()

    return {
      month: m,
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
    targetYearGanZhi: LunarYear.fromYear(targetYear).getGanZhi(),
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

  const totalDays = daysInGregorianMonth(targetYear, targetMonth)
  const days = Array.from({ length: totalDays }, (_, index) => {
    const d = index + 1
    const solarDay = Solar.fromYmdHms(targetYear, targetMonth, d, 12, 0, 0)
    const lunarDay = solarDay.getLunar()
    const ec = lunarDay.getEightChar()
    const dayGanZhi = ec.getDay()
    const weekInChinese = (solarDay as unknown as { getWeekInChinese?: () => string })
      .getWeekInChinese?.()

    return {
      day: d,
      solar: `${targetYear}-${pad2(targetMonth)}-${pad2(d)}`,
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
    targetYearGanZhi: LunarYear.fromYear(targetYear).getGanZhi(),
    selectedYearPoint,
    selectedMonthPoint,
    totalDays,
    days,
  }
}
