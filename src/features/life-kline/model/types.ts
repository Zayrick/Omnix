export type LifeKlineChartPoint = {
  /** year: 1-100(虚岁)；month: 1-12；day: 1-31（用于保持流式解析的唯一递增序号） */
  age: number

  /** 数据层级：不传默认视为 year（兼容旧数据） */
  level?: 'year' | 'month' | 'day'

  year: number
  month?: number
  day?: number

  /** 月份中文（可选），例如“正月”；不提供也能正常展示 */
  monthInChinese?: string

  /** 大运（年K线必有；月/日K线会继承年点的大运） */
  daYun?: string

  ganZhi: string
  open: number
  close: number
  high: number
  low: number
  score: number
  reason: string
}

export type StreamState = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export type PageView = 'input' | 'detail'

export type DaYunInfo = {
  ganZhi: string
  startAge: number
  endAge: number
  startYear: number
  endYear: number
}

export type LifeKlineResult = {
  bazi: string[]
  summary: string
  summaryScore: number
  personality: string
  personalityScore: number
  industry: string
  industryScore: number
  fengShui: string
  fengShuiScore: number
  wealth: string
  wealthScore: number
  marriage: string
  marriageScore: number
  health: string
  healthScore: number
  family: string
  familyScore: number
  crypto: string
  cryptoScore: number
  cryptoYear: string
  cryptoStyle: string
  chartPoints: LifeKlineChartPoint[]
}
