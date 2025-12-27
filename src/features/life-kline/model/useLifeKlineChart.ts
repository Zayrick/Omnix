import { useCallback, useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type BusinessDay,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import { toCandle } from './chart'
import type { LifeKlineChartPoint, PageView } from './types'

type UseLifeKlineChartOptions = {
  currentPage: PageView
  isTouchMode: boolean
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[char] ?? char
  })

export const useLifeKlineChart = ({ currentPage, isTouchMode }: UseLifeKlineChartOptions) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const chartPointsRef = useRef<Map<number, LifeKlineChartPoint>>(new Map())
  const onPointDoubleClickRef = useRef<((point: LifeKlineChartPoint) => void) | null>(null)

  const pad2 = (value: number) => String(value).padStart(2, '0')

  const getPointLevel = (point: LifeKlineChartPoint) =>
    point.level ?? (point.day ? 'day' : point.month ? 'month' : 'year')

  const getPointKey = (point: LifeKlineChartPoint): number => {
    const level = getPointLevel(point)
    const m = level === 'year' ? 1 : (point.month ?? 1)
    const d = level === 'day' ? (point.day ?? 1) : 1
    return point.year * 10000 + m * 100 + d
  }

  const getKeyFromTime = (time: Time): number | null => {
    if (typeof time === 'string') {
      const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(time)
      if (!match) {
        return null
      }
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      if (![year, month, day].every(Number.isFinite)) {
        return null
      }
      return year * 10000 + month * 100 + day
    }
    if (typeof time === 'number') {
      const dt = new Date(time * 1000)
      const year = dt.getUTCFullYear()
      const month = dt.getUTCMonth() + 1
      const day = dt.getUTCDate()
      return year * 10000 + month * 100 + day
    }
    const business = time as BusinessDay
    if (!Number.isFinite(business.year) || !Number.isFinite(business.month) || !Number.isFinite(business.day)) {
      return null
    }
    return business.year * 10000 + business.month * 100 + business.day
  }

  const addPoint = useCallback((point: LifeKlineChartPoint) => {
    chartPointsRef.current.set(getPointKey(point), point)
    seriesRef.current?.update(toCandle(point))
  }, [])

  const replacePoints = useCallback((points: LifeKlineChartPoint[]) => {
    chartPointsRef.current = new Map(points.map((point) => [getPointKey(point), point]))
    if (seriesRef.current) {
      seriesRef.current.setData(points.map(toCandle))
      chartRef.current?.timeScale().fitContent()
    }
  }, [])

  const resetPoints = useCallback(() => {
    chartPointsRef.current.clear()
    seriesRef.current?.setData([])
  }, [])

  const setOnPointDoubleClick = useCallback((handler: ((point: LifeKlineChartPoint) => void) | null) => {
    onPointDoubleClickRef.current = handler
  }, [])

  useEffect(() => {
    if (currentPage !== 'detail') {
      return
    }

    if (!chartContainerRef.current) {
      return
    }

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: '#0e1919' },
        textColor: '#e7f4f2',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.08)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.08)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#2aa877',
      downColor: '#d9644a',
      wickUpColor: '#2aa877',
      wickDownColor: '#d9644a',
      borderVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = series

    const existingPoints = Array.from(chartPointsRef.current.values()).sort(
      (a, b) => getPointKey(a) - getPointKey(b)
    )
    if (existingPoints.length) {
      series.setData(existingPoints.map(toCandle))
      chart.timeScale().fitContent()
    }

    const pinnedKeyRef = { current: null as number | null }
    const lastClickRef = { key: null as number | null, ts: 0 }

    const hideTooltip = () => {
      const tooltip = tooltipRef.current
      if (!tooltip) {
        return
      }
      tooltip.style.opacity = '0'
    }

    const showTooltipAt = (key: number, x: number, y: number) => {
      const tooltip = tooltipRef.current
      const container = chartContainerRef.current
      if (!tooltip || !container) {
        return
      }

      const detail = chartPointsRef.current.get(key)
      if (!detail) {
        hideTooltip()
        return
      }

      const level = getPointLevel(detail)
      const title =
        level === 'year'
          ? `${detail.year}年 · ${detail.age}岁`
          : level === 'month'
            ? `${detail.year}年 · ${detail.monthInChinese || `${detail.month ?? ''}月`}`
            : `${detail.year}-${pad2(detail.month ?? 1)}-${pad2(detail.day ?? 1)}`

      const sub = [detail.daYun, detail.ganZhi].filter(Boolean).join(' · ')

      tooltip.innerHTML = `
        <div class="tooltip-title">${escapeHtml(title)}</div>
        <div class="tooltip-sub">${escapeHtml(sub)}</div>
        <div class="tooltip-score">评分 ${detail.score}</div>
        <div class="tooltip-reason">${escapeHtml(detail.reason)}</div>
      `

      const { width, height } = container.getBoundingClientRect()
      const tooltipWidth = tooltip.offsetWidth
      const tooltipHeight = tooltip.offsetHeight
      const left = Math.min(x + 16, width - tooltipWidth - 12)
      const top = Math.min(y + 16, height - tooltipHeight - 12)
      tooltip.style.left = `${Math.max(left, 12)}px`
      tooltip.style.top = `${Math.max(top, 12)}px`
      tooltip.style.opacity = '1'
    }

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (isTouchMode) {
        return
      }

      const tooltip = tooltipRef.current
      if (!tooltip) {
        return
      }

      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        hideTooltip()
        return
      }

      const key = getKeyFromTime(param.time)
      if (!key) {
        hideTooltip()
        return
      }

      showTooltipAt(key, param.point.x, param.point.y)
    }

    const handleChartClick = (param: MouseEventParams) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        pinnedKeyRef.current = null
        hideTooltip()
        return
      }

      const key = getKeyFromTime(param.time)
      if (!key) {
        pinnedKeyRef.current = null
        hideTooltip()
        return
      }

      // 双击识别（桌面双击、移动端双击/双点按均可）
      const now = Date.now()
      const isDouble = lastClickRef.key === key && now - lastClickRef.ts < 350
      lastClickRef.key = key
      lastClickRef.ts = now
      if (isDouble) {
        const point = chartPointsRef.current.get(key)
        if (point) {
          onPointDoubleClickRef.current?.(point)
        }
        return
      }

      // 触摸模式：单击/点按用于固定 tooltip
      if (!isTouchMode) {
        return
      }

      if (pinnedKeyRef.current === key) {
        pinnedKeyRef.current = null
        hideTooltip()
        return
      }

      pinnedKeyRef.current = key
      showTooltipAt(key, param.point.x, param.point.y)
    }

    chart.subscribeCrosshairMove(handleCrosshairMove)
    chart.subscribeClick(handleChartClick)

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      chart.unsubscribeClick(handleChartClick)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [currentPage, isTouchMode])

  return {
    chartContainerRef,
    tooltipRef,
    addPoint,
    replacePoints,
    resetPoints,
    setOnPointDoubleClick,
  }
}
