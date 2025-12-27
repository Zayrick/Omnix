export type LifeKlineMode = 'year' | 'month' | 'day'

export type LifeKlineYearPointDto = {
  age: number
  year: number
  daYun: string
  ganZhi: string
  open: number
  close: number
  high: number
  low: number
  score: number
  reason: string
}

export type LifeKlineMonthPointDto = {
  year: number
  month: number
  monthInChinese?: string
  ganZhi: string
  open: number
  close: number
  high: number
  low: number
  score: number
  reason: string
}

export type LifeKlineRequestDto = {
  name?: string
  gender?: 'male' | 'female'
  birthDate?: string
  birthTime?: string

  /** 默认不传等同于 'year'（兼容已有年K线接口） */
  mode?: LifeKlineMode

  /** 下钻目标：year 模式不需要；month/day 模式需要 */
  targetYear?: number
  /** day 模式需要 */
  targetMonth?: number

  /** 月K线请求时，必须携带上次 AI 生成的该年点数据，避免 AI 自己推算出错 */
  selectedYearPoint?: LifeKlineYearPointDto

  /** 日K线请求时，必须携带上次 AI 生成的该月点数据（并且同时带 selectedYearPoint） */
  selectedMonthPoint?: LifeKlineMonthPointDto
}
