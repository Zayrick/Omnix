export type LifeKlineRequest = {
  name?: string
  gender?: 'male' | 'female'
  birthDate?: string
  birthTime?: string
}

export type TimelineItem = {
  age: number
  year: number
  daYun: string
  ganZhi: string
}

export type DaYunDetail = {
  ganZhi: string
  startAge: number
  endAge: number
  startYear: number
  endYear: number
}
