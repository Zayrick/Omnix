import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Dayjs } from 'dayjs'
import { computeDaYunList } from './computeDaYun'
import { getStatusLabel } from './constants'
import { streamLifeKlineAnalysis } from './streamLifeKline'
import type { DaYunInfo, LifeKlineChartPoint, LifeKlineResult, PageView, StreamState } from './types'

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
    daYunList: [],
  })
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [daYunList, setDaYunList] = useState<DaYunInfo[]>([])

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
    setAnalysis({ bazi: [], daYunList: [] })
    setDaYunList([])
    onChartReset?.()
    setCurrentPage('input')
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
    setAnalysis({ bazi: [], daYunList: [] })
    onChartReset?.()

    try {
      const computed = computeDaYunList({ birthDate, birthTime, gender })
      setDaYunList(computed)
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
        onChartReplace?.(parsed.chartPoints)
        setAnalysis(parsed)
      } else {
        setAnalysis((prev) => ({ ...prev, ...fallback }))
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
    handleGenderChange,
    handleRestart,
    handleSubmit,
  }
}
