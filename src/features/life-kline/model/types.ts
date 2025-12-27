export type LifeKlineChartPoint = {
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
  daYunList: DaYunInfo[]
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
