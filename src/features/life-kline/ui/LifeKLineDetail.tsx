import { Chip, Typography } from '@mui/material'
import type { Dayjs } from 'dayjs'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { traitCards } from '../model/constants'
import type { DaYunInfo, LifeKlineResult, StreamState } from '../model/types'

type LifeKLineDetailProps = {
  name: string
  gender: 'male' | 'female' | null
  birthDate: Dayjs | null
  birthTime: Dayjs | null
  analysis: Partial<LifeKlineResult>
  daYunList: DaYunInfo[]
  streamState: StreamState
  statusLabel: string
  isTouchMode: boolean
  prefersDarkMode: boolean
  chartContainerRef: RefObject<HTMLDivElement | null>
  tooltipRef: RefObject<HTMLDivElement | null>
  onRestart: () => void
}

export function LifeKLineDetail({
  name,
  gender,
  birthDate,
  birthTime,
  analysis,
  daYunList,
  streamState,
  statusLabel,
  isTouchMode,
  prefersDarkMode,
  chartContainerRef,
  tooltipRef,
  onRestart,
}: LifeKLineDetailProps) {
  const [traitInsertToken, setTraitInsertToken] = useState<Record<string, number>>({})
  const prevTraitTextRef = useRef<Record<string, string | undefined>>({})
  const traitInsertTimersRef = useRef<Record<string, number>>({})

  useEffect(() => {
    return () => {
      Object.values(traitInsertTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId)
      })
      traitInsertTimersRef.current = {}
    }
  }, [])

  useEffect(() => {
    traitCards.forEach(({ key }) => {
      const currentText = analysis[key] as string | undefined
      const prevText = prevTraitTextRef.current[key]

      if (currentText && currentText !== prevText) {
        setTraitInsertToken((prev) => ({
          ...prev,
          [key]: (prev[key] ?? 0) + 1,
        }))

        const existingTimer = traitInsertTimersRef.current[key]
        if (existingTimer) {
          window.clearTimeout(existingTimer)
        }

        traitInsertTimersRef.current[key] = window.setTimeout(() => {
          setTraitInsertToken((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
          })
          delete traitInsertTimersRef.current[key]
        }, 520)
      }

      prevTraitTextRef.current[key] = currentText
    })
  }, [analysis])

  return (
    <div className="life-kline-page" data-theme={prefersDarkMode ? 'dark' : 'light'}>
      <header className="life-kline-header">
        <div>
          <Typography variant="h4" className="life-kline-title">
            我的人生K线
          </Typography>
          <Typography className="life-kline-subtitle">
            以干支与大运为底层逻辑，刻画人生涨跌脉冲
          </Typography>
        </div>
        {streamState === 'done' ? (
          <button
            type="button"
            className={`life-kline-status life-kline-status-${streamState} life-kline-status-action`}
            onClick={onRestart}
          >
            {statusLabel}
          </button>
        ) : (
          <div className={`life-kline-status life-kline-status-${streamState}`}>{statusLabel}</div>
        )}
      </header>

      <section className="life-kline-board">
        <div className="panel chart-panel">
          <div className="panel-header">
            <span>人生K线</span>
            <span className="panel-hint">{isTouchMode ? '点击柱子查看批注' : '鼠标悬停柱子查看批注'}</span>
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
                    <span className="dayun-meta">
                      {item.startAge}-{item.endAge}岁
                    </span>
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
            const insertToken = traitInsertToken[card.key]
            const scoreColor =
              score !== undefined
                ? score >= 8
                  ? 'excellent'
                  : score >= 6
                    ? 'good'
                    : score >= 4
                      ? 'average'
                      : 'poor'
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
                    <div
                      key={insertToken ? `${card.key}-${insertToken}` : card.key}
                      className={`trait-body-content ${insertToken ? 'trait-body-insert' : ''}`}
                    >
                      {text}
                    </div>
                  ) : (
                    '等待分析'
                  )}
                </div>
                {card.key === 'crypto' && (
                  <div className="trait-tags">
                    {analysis.cryptoYear && <Chip label={analysis.cryptoYear} size="small" />}
                    {analysis.cryptoStyle && <Chip label={analysis.cryptoStyle} size="small" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
