import type { LifeKlineRequestDto } from '../../../shared/dto/lifeKline'

export type LifeKlineRequest = LifeKlineRequestDto

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
