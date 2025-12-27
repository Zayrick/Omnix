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

  const addPoint = useCallback((point: LifeKlineChartPoint) => {
    chartPointsRef.current.set(point.year, point)
    seriesRef.current?.update(toCandle(point))
  }, [])

  const replacePoints = useCallback((points: LifeKlineChartPoint[]) => {
    chartPointsRef.current = new Map(points.map((point) => [point.year, point]))
    if (seriesRef.current) {
      seriesRef.current.setData(points.map(toCandle))
      chartRef.current?.timeScale().fitContent()
    }
  }, [])

  const resetPoints = useCallback(() => {
    chartPointsRef.current.clear()
    seriesRef.current?.setData([])
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
      (a, b) => a.year - b.year
    )
    if (existingPoints.length) {
      series.setData(existingPoints.map(toCandle))
      chart.timeScale().fitContent()
    }

    const pinnedYearRef = { current: null as number | null }

    const hideTooltip = () => {
      const tooltip = tooltipRef.current
      if (!tooltip) {
        return
      }
      tooltip.style.opacity = '0'
    }

    const yearFromTime = (time: Time): number | null => {
      if (typeof time === 'string') {
        const y = Number(time.slice(0, 4))
        return Number.isFinite(y) ? y : null
      }
      if (typeof time === 'number') {
        const y = new Date(time * 1000).getUTCFullYear()
        return Number.isFinite(y) ? y : null
      }
      const business = time as BusinessDay
      return Number.isFinite(business.year) ? business.year : null
    }

    const showTooltipAt = (year: number, x: number, y: number) => {
      const tooltip = tooltipRef.current
      const container = chartContainerRef.current
      if (!tooltip || !container) {
        return
      }

      const detail = chartPointsRef.current.get(year)
      if (!detail) {
        hideTooltip()
        return
      }

      tooltip.innerHTML = `
        <div class="tooltip-title">${detail.year}年 · ${detail.age}岁</div>
        <div class="tooltip-sub">${escapeHtml(detail.daYun)} · ${escapeHtml(detail.ganZhi)}</div>
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

      const year = yearFromTime(param.time)
      if (!year) {
        hideTooltip()
        return
      }

      showTooltipAt(year, param.point.x, param.point.y)
    }

    const handleChartClick = (param: MouseEventParams) => {
      if (!isTouchMode) {
        return
      }

      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        pinnedYearRef.current = null
        hideTooltip()
        return
      }

      const year = yearFromTime(param.time)
      if (!year) {
        pinnedYearRef.current = null
        hideTooltip()
        return
      }

      if (pinnedYearRef.current === year) {
        pinnedYearRef.current = null
        hideTooltip()
        return
      }

      pinnedYearRef.current = year
      showTooltipAt(year, param.point.x, param.point.y)
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
  }
}
