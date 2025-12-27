import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import 'dayjs/locale/zh-cn'
import { useEffect, useMemo, useState } from 'react'
import { LifeKLineInput } from './LifeKLineInput'
import { LifeKLineDetail } from './LifeKLineDetail'
import { useLifeKlineChart } from '../model/useLifeKlineChart'
import { useLifeKlineController } from '../model/useLifeKlineController'
import type { PageView } from '../model/types'
import './LifeKLine.css'

export function LifeKLinePage() {
  const [currentPage, setCurrentPage] = useState<PageView>('input')
  const isTouchMode = useMediaQuery('(hover: none), (pointer: coarse)')
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  const chart = useLifeKlineChart({ currentPage, isTouchMode })
  const controller = useLifeKlineController({
    currentPage,
    setCurrentPage,
    onChartPoint: chart.addPoint,
    onChartReplace: chart.replacePoints,
    onChartReset: chart.resetPoints,
  })

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
        {currentPage === 'input' ? (
          <LifeKLineInput
            name={controller.name}
            birthDate={controller.birthDate}
            birthTime={controller.birthTime}
            gender={controller.gender}
            streamState={controller.streamState}
            errorMessage={controller.errorMessage}
            prefersDarkMode={prefersDarkMode}
            onNameChange={controller.setName}
            onBirthDateChange={controller.setBirthDate}
            onBirthTimeChange={controller.setBirthTime}
            onGenderChange={controller.handleGenderChange}
            onSubmit={controller.handleSubmit}
          />
        ) : (
          <LifeKLineDetail
            name={controller.name}
            gender={controller.gender}
            birthDate={controller.birthDate}
            birthTime={controller.birthTime}
            analysis={controller.analysis}
            daYunList={controller.daYunList}
            streamState={controller.streamState}
            statusLabel={controller.statusLabel}
            isTouchMode={isTouchMode}
            prefersDarkMode={prefersDarkMode}
            chartContainerRef={chart.chartContainerRef}
            tooltipRef={chart.tooltipRef}
            onRestart={controller.handleRestart}
          />
        )}
      </LocalizationProvider>
    </ThemeProvider>
  )
}
