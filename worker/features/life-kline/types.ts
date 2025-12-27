import type {
  LifeKlineMonthPointDto,
  LifeKlineRequestDto,
  LifeKlineYearPointDto,
} from '../../../shared/dto/lifeKline'

export type LifeKlineRequest = LifeKlineRequestDto

export type SelectedYearPoint = LifeKlineYearPointDto
export type SelectedMonthPoint = LifeKlineMonthPointDto

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
