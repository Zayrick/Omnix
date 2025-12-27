import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Box,
  Button,
  Chip,
  CssBaseline,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  createTheme,
  useMediaQuery,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'
import { parse as parseYaml } from 'yaml'
import { Solar } from 'lunar-typescript'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type BusinessDay,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import type { DaYunInfo, LifeKlineChartPoint, LifeKlineResult } from '../types/lifeKline'
import { createYamlStreamParser } from '../utils/yamlStreamParser'
import './LifeKLine.css'

type StreamState = 'idle' | 'loading' | 'streaming' | 'done' | 'error'
type PageView = 'input' | 'detail'

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

const toCandle = (point: LifeKlineChartPoint): CandlestickData<Time> => ({
  time: { year: point.year, month: 1, day: 1 },
  open: point.open,
  high: point.high,
  low: point.low,
  close: point.close,
})

const traitCards = [
  { key: 'summary', label: '命理总评', scoreKey: 'summaryScore' },
  { key: 'personality', label: '性格深层', scoreKey: 'personalityScore' },
  { key: 'industry', label: '事业走势', scoreKey: 'industryScore' },
  { key: 'wealth', label: '财富结构', scoreKey: 'wealthScore' },
  { key: 'marriage', label: '婚姻关系', scoreKey: 'marriageScore' },
  { key: 'health', label: '健康能量', scoreKey: 'healthScore' },
  { key: 'family', label: '六亲关系', scoreKey: 'familyScore' },
  { key: 'fengShui', label: '风水建议', scoreKey: 'fengShuiScore' },
  { key: 'crypto', label: '交易风格', scoreKey: 'cryptoScore' },
] as const

function LifeKLine() {
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
  const [currentPage, setCurrentPage] = useState<PageView>('input')

  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const chartPointsRef = useRef<Map<number, LifeKlineChartPoint>>(new Map())
  const abortRef = useRef<AbortController | null>(null)

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    root.classList.add('life-kline-active')
    body.classList.add('life-kline-active')

    return () => {
      root.classList.remove('life-kline-active')
      body.classList.remove('life-kline-active')
    }
  }, [])

  // 当 AI 开始输出时自动跳转到详情页
  useEffect(() => {
    if (streamState === 'streaming' && currentPage === 'input') {
      setCurrentPage('detail')
    }
  }, [streamState, currentPage])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: { main: prefersDarkMode ? '#5ad2bb' : '#0f9f8f' },
          secondary: { main: prefersDarkMode ? '#ffb36b' : '#e27a3c' },
          background: {
            default: prefersDarkMode ? '#0b1110' : '#f6f0e5',
            paper: prefersDarkMode ? '#121c1a' : '#ffffff',
          },
        },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
        },
        components: {
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 12,
                },
              },
            },
          },
        },
      }),
    [prefersDarkMode]
  )

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

    // 如果在切换到详情页之前已经收到部分/全部数据，初始化时回放一遍
    const existingPoints = Array.from(chartPointsRef.current.values()).sort(
      (a, b) => a.year - b.year
    )
    if (existingPoints.length) {
      series.setData(existingPoints.map(toCandle))
      chart.timeScale().fitContent()
    }

    const handleCrosshairMove = (param: MouseEventParams) => {
      const tooltip = tooltipRef.current
      const container = chartContainerRef.current
      if (!tooltip || !container) {
        return
      }

      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        tooltip.style.opacity = '0'
        return
      }

      let year: number | null = null
      if (typeof param.time === 'string') {
        year = Number(param.time.slice(0, 4))
      } else if (typeof param.time === 'number') {
        year = new Date(param.time * 1000).getUTCFullYear()
      } else {
        const business = param.time as BusinessDay
        year = business.year
      }

      if (!year) {
        tooltip.style.opacity = '0'
        return
      }

      const detail = chartPointsRef.current.get(year)
      if (!detail) {
        tooltip.style.opacity = '0'
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
      const left = Math.min(param.point.x + 16, width - tooltipWidth - 12)
      const top = Math.min(param.point.y + 16, height - tooltipHeight - 12)
      tooltip.style.left = `${Math.max(left, 12)}px`
      tooltip.style.top = `${Math.max(top, 12)}px`
      tooltip.style.opacity = '1'
    }

    chart.subscribeCrosshairMove(handleCrosshairMove)

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      chart.remove()
    }
  }, [currentPage])

  const handleGenderChange = (
    _event: MouseEvent<HTMLElement>,
    newGender: 'male' | 'female' | null
  ) => {
    if (newGender !== null) {
      setGender(newGender)
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
    setAnalysis({ bazi: [], daYunList: [] })
    chartPointsRef.current.clear()
    seriesRef.current?.setData([])

    // 计算大运信息
    try {
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

      const computedDaYunList: DaYunInfo[] = daYunRaw
        .filter((item) => item.getGanZhi())
        .map((item) => ({
          ganZhi: item.getGanZhi(),
          startAge: item.getStartAge(),
          endAge: item.getEndAge(),
          startYear: year + item.getStartAge() - 1,
          endYear: year + item.getEndAge() - 1,
        }))

      setDaYunList(computedDaYunList)
    } catch {
      // 大运计算失败不影响主流程
    }

    try {
      const response = await fetch('/api/life-kline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          name: name.trim(),
          gender,
          birthDate: birthDate.format('YYYY-MM-DD'),
          birthTime: birthTime.format('HH:mm'),
        }),
      })

      if (!response.ok || !response.body) {
        const detail = await response.text()
        setStreamState('error')
        setErrorMessage(detail || 'AI 接口返回错误')
        return
      }

      setStreamState('streaming')
      const parser = createYamlStreamParser({
        onResult: (partial) =>
          setAnalysis((prev) => ({
            ...prev,
            ...partial,
          })),
        onChartPoint: (point) => {
          chartPointsRef.current.set(point.year, point)
          seriesRef.current?.update(toCandle(point))
        },
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let raw = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }
        const chunk = decoder.decode(value, { stream: true })
        raw += chunk
        parser.push(chunk)
      }

      const { raw: finalRaw, result } = parser.finish()
      let parsed: LifeKlineResult | null = null
      try {
        parsed = parseYaml(finalRaw || raw) as LifeKlineResult
      } catch {
        parsed = null
      }

      if (parsed?.chartPoints?.length) {
        chartPointsRef.current = new Map(
          parsed.chartPoints.map((point) => [point.year, point])
        )
        seriesRef.current?.setData(parsed.chartPoints.map(toCandle))
        chartRef.current?.timeScale().fitContent()
        setAnalysis(parsed)
      } else {
        setAnalysis((prev) => ({ ...prev, ...result }))
      }
      setStreamState('done')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }
      setStreamState('error')
      setErrorMessage('请求失败，请稍后重试')
    }
  }

  const statusLabel =
    streamState === 'loading'
      ? '正在连接AI...'
      : streamState === 'streaming'
        ? 'AI解析中'
        : streamState === 'done'
          ? '分析完成'
          : streamState === 'error'
            ? '发生错误'
            : '待启动'

  // 输入页面
  if (currentPage === 'input') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale="zh-cn"
          localeText={{
            cancelButtonLabel: '取消',
            okButtonLabel: '确定',
            clearButtonLabel: '清除',
            todayButtonLabel: '今天',
          }}
        >
          <Box
            className="life-kline-page life-kline-input-page"
            data-theme={prefersDarkMode ? 'dark' : 'light'}
          >
            <div className="input-page-container">
              <div className="input-page-header">
                <Typography variant="h3" className="input-page-title">
                  我的人生K线
                </Typography>
                <Typography className="input-page-subtitle">
                  以干支与大运为底层逻辑，刻画人生涨跌脉冲
                </Typography>
              </div>

              <div className="input-form-card">
                {streamState === 'loading' ? (
                  // 加载状态
                  <div className="loading-state">
                    <div className="loading-spinner">
                      <div className="spinner-ring" />
                      <div className="spinner-ring" />
                      <div className="spinner-ring" />
                    </div>
                    <Typography className="loading-text">AI测算中</Typography>
                    <Typography className="loading-hint">正在生成命理报告与人生K线，请稍候</Typography>
                  </div>
                ) : (
                  // 表单
                  <>
                    <div className="input-form-title">填写出生信息</div>
                    <div className="input-form-fields">
                      <TextField
                        label="姓名（可选）"
                        placeholder="请输入姓名"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        variant="outlined"
                        size="small"
                        fullWidth
                      />
                      <DatePicker
                        label="出生日期"
                        value={birthDate}
                        onChange={(newValue) => setBirthDate(newValue)}
                        maxDate={dayjs()}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            placeholder: '请选择出生日期',
                          },
                        }}
                      />
                      <TimePicker
                        label="出生时间"
                        value={birthTime}
                        onChange={(newValue) => setBirthTime(newValue)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            placeholder: '请选择出生时间',
                          },
                        }}
                      />
                      <Box className="gender-field">
                        <Typography className="gender-label">性别</Typography>
                        <ToggleButtonGroup
                          value={gender}
                          exclusive
                          onChange={handleGenderChange}
                          className="gender-toggle-group"
                          fullWidth
                        >
                          <ToggleButton value="male">男</ToggleButton>
                          <ToggleButton value="female">女</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSubmit}
                        className="input-submit-btn"
                      >
                        启动人生K线
                      </Button>
                      {errorMessage && (
                        <Typography className="error-text">{errorMessage}</Typography>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Box>
        </LocalizationProvider>
      </ThemeProvider>
    )
  }

  // 详情页面
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="zh-cn"
        localeText={{
          cancelButtonLabel: '取消',
          okButtonLabel: '确定',
          clearButtonLabel: '清除',
          todayButtonLabel: '今天',
        }}
      >
        <Box
          className="life-kline-page"
          data-theme={prefersDarkMode ? 'dark' : 'light'}
        >
          <header className="life-kline-header">
            <div>
              <Typography variant="h4" className="life-kline-title">
                我的人生K线
              </Typography>
              <Typography className="life-kline-subtitle">
                以干支与大运为底层逻辑，刻画人生涨跌脉冲
              </Typography>
            </div>
            <div className={`life-kline-status life-kline-status-${streamState}`}>
              {statusLabel}
            </div>
          </header>

          <section className="life-kline-board">
            <div className="panel chart-panel">
              <div className="panel-header">
                <span>人生K线</span>
                <span className="panel-hint">鼠标悬停柱子查看批注</span>
              </div>
              <div className="chart-shell">
                <div ref={chartContainerRef} className="chart-canvas" />
                <div ref={tooltipRef} className="chart-tooltip" />
              </div>
            </div>

            <aside className="panel bazi-panel">
              <div className="panel-header">
                <span>八字命盘</span>
                <span className="panel-hint">四柱信息</span>
              </div>
              <div className="bazi-user-info">
                <span className="user-name">{name || '未命名'}</span>
                <span className="user-meta">
                  {gender === 'male' ? '男' : '女'} · {birthDate?.format('YYYY年M月D日')} {birthTime?.format('HH:mm')}
                </span>
              </div>
              <div className="bazi-pillars">
                {['年柱', '月柱', '日柱', '时柱'].map((label, index) => {
                  const pillar = analysis.bazi?.[index] ?? '--'
                  const tianGan = pillar.charAt(0) || '-'
                  const diZhi = pillar.charAt(1) || '-'
                  return (
                    <div key={label} className="bazi-pillar">
                      <span className="pillar-label">{label}</span>
                      <div className="pillar-chars">
                        <span className="pillar-tiangan">{tianGan}</span>
                        <span className="pillar-dizhi">{diZhi}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {daYunList.length > 0 && (
                <div className="bazi-dayun">
                  <div className="dayun-title">大运走势</div>
                  <div className="dayun-list">
                    {daYunList.slice(0, 9).map((item, index) => (
                      <div key={index} className="dayun-item">
                        <span className="dayun-ganzhi">{item.ganZhi}</span>
                        <span className="dayun-meta">{item.startAge}-{item.endAge}岁</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </section>

          <section className="traits-section">
            <div className="panel-header">
              <span>特质与评分</span>
              <span className="panel-hint">AI 流式输出 YAML 解析</span>
            </div>
            <div className="traits-grid">
              {traitCards.map((card) => {
                const text = analysis[card.key] as string | undefined
                const score = analysis[card.scoreKey] as number | undefined
                const isLoading = streamState === 'streaming' && !text
                const scoreColor = score !== undefined
                  ? score >= 8 ? 'excellent' : score >= 6 ? 'good' : score >= 4 ? 'average' : 'poor'
                  : 'none'
                return (
                  <div key={card.key} className={`trait-card ${isLoading ? 'trait-card-loading' : ''}`}>
                    <div className="trait-title">
                      <span>{card.label}</span>
                      <span className={`trait-score trait-score-${scoreColor}`}>
                        {score !== undefined ? score : '--'}
                      </span>
                    </div>
                    <div className="trait-progress-wrapper">
                      <div 
                        className={`trait-progress-bar trait-progress-${scoreColor}`}
                        style={{ width: score !== undefined ? `${score * 10}%` : '0%' }}
                      />
                    </div>
                    <div className="trait-body">
                      {isLoading ? (
                        <div className="trait-loading">
                          <span className="loading-dot" />
                          <span className="loading-dot" />
                          <span className="loading-dot" />
                        </div>
                      ) : text ? (
                        text
                      ) : (
                        '等待分析'
                      )}
                    </div>
                    {card.key === 'crypto' && (
                      <div className="trait-tags">
                        {analysis.cryptoYear && (
                          <Chip label={analysis.cryptoYear} size="small" />
                        )}
                        {analysis.cryptoStyle && (
                          <Chip label={analysis.cryptoStyle} size="small" />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default LifeKLine
