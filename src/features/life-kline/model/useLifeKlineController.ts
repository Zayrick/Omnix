import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Dayjs } from 'dayjs'
import { computeBaziAndDaYun } from './computeDaYun'
import { getStatusLabel } from './constants'
import { streamLifeKlineAnalysis } from './streamLifeKline'
import type { DaYunInfo, LifeKlineChartPoint, LifeKlineResult, PageView, StreamState } from './types'
import type { LifeKlineMonthPointDto, LifeKlineYearPointDto } from '../../../../shared/dto/lifeKline'

type KlineView = 'year' | 'month' | 'day'

type DrillFrame = {
  view: KlineView
  points: LifeKlineChartPoint[]
  selectedYearPoint: LifeKlineYearPointDto | null
  selectedMonthPoint: LifeKlineMonthPointDto | null
}

type UseLifeKlineControllerOptions = {
  currentPage: PageView
  setCurrentPage: (page: PageView) => void
  onChartPoint?: (point: LifeKlineChartPoint) => void
  onChartReplace?: (points: LifeKlineResult['chartPoints']) => void
  onChartReset?: () => void
}

export const useLifeKlineController = ({
  currentPage,
  setCurrentPage,
  onChartPoint,
  onChartReplace,
  onChartReset,
}: UseLifeKlineControllerOptions) => {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState<Dayjs | null>(null)
  const [birthTime, setBirthTime] = useState<Dayjs | null>(null)
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [analysis, setAnalysis] = useState<Partial<LifeKlineResult>>({
    bazi: [],
  })
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [daYunList, setDaYunList] = useState<DaYunInfo[]>([])

  const [klineView, setKlineView] = useState<KlineView>('year')
  const [klinePoints, setKlinePoints] = useState<LifeKlineChartPoint[]>([])
  const [selectedYearPoint, setSelectedYearPoint] = useState<LifeKlineYearPointDto | null>(null)
  const [selectedMonthPoint, setSelectedMonthPoint] = useState<LifeKlineMonthPointDto | null>(null)
  const [drillStack, setDrillStack] = useState<DrillFrame[]>([])

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (streamState === 'streaming' && currentPage === 'input') {
      setCurrentPage('detail')
    }
  }, [streamState, currentPage, setCurrentPage])

  const handleGenderChange = (
    _event: MouseEvent<HTMLElement>,
    newGender: 'male' | 'female' | null
  ) => {
    if (newGender !== null) {
      setGender(newGender)
    }
  }

  const handleRestart = () => {
    abortRef.current?.abort()
    setStreamState('idle')
    setErrorMessage(null)
    setAnalysis({ bazi: [] })
    setDaYunList([])
    setKlineView('year')
    setKlinePoints([])
    setSelectedYearPoint(null)
    setSelectedMonthPoint(null)
    setDrillStack([])
    onChartReset?.()
    setCurrentPage('input')
  }

  const inferLevel = (point: LifeKlineChartPoint): KlineView => {
    const level = point.level ?? (point.day ? 'day' : point.month ? 'month' : 'year')
    return level
  }

  const toYearPointDto = (point: LifeKlineChartPoint): LifeKlineYearPointDto => ({
    age: point.age,
    year: point.year,
    daYun: point.daYun ?? '',
    ganZhi: point.ganZhi,
    open: point.open,
    close: point.close,
    high: point.high,
    low: point.low,
    score: point.score,
    reason: point.reason,
  })

  const toMonthPointDto = (point: LifeKlineChartPoint): LifeKlineMonthPointDto => ({
    year: point.year,
    month: point.month ?? 1,
    monthInChinese: point.monthInChinese,
    ganZhi: point.ganZhi,
    open: point.open,
    close: point.close,
    high: point.high,
    low: point.low,
    score: point.score,
    reason: point.reason,
  })

  const pushDrillFrame = () => {
    setDrillStack((prev) => [
      ...prev,
      {
        view: klineView,
        points: klinePoints,
        selectedYearPoint,
        selectedMonthPoint,
      },
    ])
  }

  const handleBack = () => {
    setErrorMessage(null)
    setDrillStack((prev) => {
      if (!prev.length) {
        return prev
      }
      const next = prev.slice(0, -1)
      const last = prev[prev.length - 1]
      setKlineView(last.view)
      setKlinePoints(last.points)
      setSelectedYearPoint(last.selectedYearPoint)
      setSelectedMonthPoint(last.selectedMonthPoint)
      onChartReplace?.(last.points)
      setStreamState('done')
      return next
    })
  }

  const drillToMonth = async (yearPoint: LifeKlineChartPoint) => {
    if (!birthDate || !birthTime || !gender) {
      setErrorMessage('请先生成年K线后再下钻到月K线')
      return
    }

    const yearDto = toYearPointDto(yearPoint)
    pushDrillFrame()
    setSelectedYearPoint(yearDto)
    setSelectedMonthPoint(null)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStreamState('loading')
    onChartReset?.() // 清空图表，防止新旧数据混合

    try {
      const { parsed, fallback } = await streamLifeKlineAnalysis({
        payload: {
          name: name.trim(),
          gender,
          birthDate: birthDate.format('YYYY-MM-DD'),
          birthTime: birthTime.format('HH:mm'),
          mode: 'month',
          targetYear: yearPoint.year,
          selectedYearPoint: yearDto,
        },
        signal: controller.signal,
        onStreamStart: () => setStreamState('streaming'),
        onPartial: () => {
          // 月/日下钻不更新主分析面板内容
        },
        onChartPoint,
      })

      const points = parsed?.chartPoints?.length ? parsed.chartPoints : fallback.chartPoints
      if (points?.length) {
        const withLevel = points.map((p) => ({ ...p, level: 'month' as const }))
        onChartReplace?.(withLevel)
        setKlinePoints(withLevel)
        setKlineView('month')
      }

      setStreamState('done')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }
      setStreamState('error')
      setErrorMessage((error as Error).message || '请求失败，请稍后重试')
    }
  }

  const drillToDay = async (monthPoint: LifeKlineChartPoint) => {
    if (!birthDate || !birthTime || !gender) {
      setErrorMessage('请先生成年K线后再下钻到日K线')
      return
    }
    if (!selectedYearPoint) {
      setErrorMessage('缺少 selectedYearPoint：请从年K线下钻进入月K线后再进入日K线')
      return
    }
    if (!Number.isFinite(monthPoint.month)) {
      setErrorMessage('该月点缺少 month 字段，无法下钻到日K线')
      return
    }

    const monthDto = toMonthPointDto(monthPoint)
    pushDrillFrame()
    setSelectedMonthPoint(monthDto)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStreamState('loading')
    onChartReset?.() // 清空图表，防止新旧数据混合

    try {
      const { parsed, fallback } = await streamLifeKlineAnalysis({
        payload: {
          name: name.trim(),
          gender,
          birthDate: birthDate.format('YYYY-MM-DD'),
          birthTime: birthTime.format('HH:mm'),
          mode: 'day',
          targetYear: monthPoint.year,
          targetMonth: monthPoint.month,
          selectedYearPoint,
          selectedMonthPoint: monthDto,
        },
        signal: controller.signal,
        onStreamStart: () => setStreamState('streaming'),
        onPartial: () => {
          // 同上：不更新主分析内容
        },
        onChartPoint,
      })

      const points = parsed?.chartPoints?.length ? parsed.chartPoints : fallback.chartPoints
      if (points?.length) {
        const withLevel = points.map((p) => ({ ...p, level: 'day' as const }))
        onChartReplace?.(withLevel)
        setKlinePoints(withLevel)
        setKlineView('day')
      }

      setStreamState('done')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }
      setStreamState('error')
      setErrorMessage((error as Error).message || '请求失败，请稍后重试')
    }
  }

  const handlePointDoubleClick = (point: LifeKlineChartPoint) => {
    const level = inferLevel(point)
    if (klineView === 'year' && level === 'year') {
      void drillToMonth(point)
      return
    }
    if (klineView === 'month' && level === 'month') {
      void drillToDay(point)
      return
    }
  }

  const handleSubmit = async () => {
    setErrorMessage(null)
    if (!birthDate || !birthTime || !gender) {
      setErrorMessage('请完整填写出生日期、出生时间和性别')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStreamState('loading')
    setAnalysis({ bazi: [] })
    setKlineView('year')
    setKlinePoints([])
    setSelectedYearPoint(null)
    setSelectedMonthPoint(null)
    setDrillStack([])
    onChartReset?.()

    try {
      const computed = computeBaziAndDaYun({ birthDate, birthTime, gender })
      setAnalysis((prev) => ({ ...prev, bazi: computed.bazi }))
      setDaYunList(computed.daYunList)
    } catch {
      setDaYunList([])
    }

    try {
      const { parsed, fallback } = await streamLifeKlineAnalysis({
        payload: {
          name: name.trim(),
          gender,
          birthDate: birthDate.format('YYYY-MM-DD'),
          birthTime: birthTime.format('HH:mm'),
        },
        signal: controller.signal,
        onStreamStart: () => setStreamState('streaming'),
        onPartial: (partial) =>
          setAnalysis((prev) => ({
            ...prev,
            ...partial,
          })),
        onChartPoint,
      })

      if (parsed?.chartPoints?.length) {
        const withLevel = parsed.chartPoints.map((p) => ({ ...p, level: 'year' as const }))
        onChartReplace?.(withLevel)
        setKlinePoints(withLevel)
        setAnalysis(parsed)
      } else {
        setAnalysis((prev) => ({ ...prev, ...fallback }))
        if (fallback.chartPoints?.length) {
          const withLevel = fallback.chartPoints.map((p) => ({ ...p, level: 'year' as const }))
          setKlinePoints(withLevel)
        }
      }
      setStreamState('done')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }
      setStreamState('error')
      setErrorMessage((error as Error).message || '请求失败，请稍后重试')
    }
  }

  const statusLabel = getStatusLabel(streamState)

  return {
    name,
    setName,
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    gender,
    setGender,
    analysis,
    streamState,
    errorMessage,
    daYunList,
    statusLabel,
    klineView,
    selectedYearPoint,
    selectedMonthPoint,
    canGoBack: drillStack.length > 0,
    handleBack,
    handlePointDoubleClick,
    handleGenderChange,
    handleRestart,
    handleSubmit,
  }
}
