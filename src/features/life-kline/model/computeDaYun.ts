import type { Dayjs } from 'dayjs'
import { Solar } from 'lunar-typescript'
import type { DaYunInfo } from './types'

type ComputeDaYunInput = {
  birthDate: Dayjs
  birthTime: Dayjs
  gender: 'male' | 'female'
}

export const computeDaYunList = ({
  birthDate,
  birthTime,
  gender,
}: ComputeDaYunInput): DaYunInfo[] => {
  const year = birthDate.year()
  const month = birthDate.month() + 1
  const day = birthDate.date()
  const hour = birthTime.hour()
  const minute = birthTime.minute()

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()
  const genderFlag = gender === 'male' ? 1 : 0
  const yun = eightChar.getYun(genderFlag)
  const daYunRaw = yun.getDaYun(10)

  return daYunRaw
    .filter((item) => item.getGanZhi())
    .map((item) => ({
      ganZhi: item.getGanZhi(),
      startAge: item.getStartAge(),
      endAge: item.getEndAge(),
      startYear: year + item.getStartAge() - 1,
      endYear: year + item.getEndAge() - 1,
    }))
}
