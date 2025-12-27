import { Box, Button, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { type Dayjs } from 'dayjs'
import type { MouseEvent } from 'react'
import type { StreamState } from '../model/types'

type LifeKLineInputProps = {
  name: string
  birthDate: Dayjs | null
  birthTime: Dayjs | null
  gender: 'male' | 'female' | null
  streamState: StreamState
  errorMessage: string | null
  prefersDarkMode: boolean
  onNameChange: (value: string) => void
  onBirthDateChange: (value: Dayjs | null) => void
  onBirthTimeChange: (value: Dayjs | null) => void
  onGenderChange: (event: MouseEvent<HTMLElement>, value: 'male' | 'female' | null) => void
  onSubmit: () => void
}

export function LifeKLineInput({
  name,
  birthDate,
  birthTime,
  gender,
  streamState,
  errorMessage,
  prefersDarkMode,
  onNameChange,
  onBirthDateChange,
  onBirthTimeChange,
  onGenderChange,
  onSubmit,
}: LifeKLineInputProps) {
  if (streamState === 'loading') {
    return (
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
            <div className="loading-state">
              <div className="loading-spinner">
                <div className="spinner-ring" />
                <div className="spinner-ring" />
                <div className="spinner-ring" />
              </div>
              <Typography className="loading-text">AI测算中</Typography>
              <Typography className="loading-hint">
                正在生成命理报告与人生K线，请稍候
              </Typography>
            </div>
          </div>
        </div>
      </Box>
    )
  }

  return (
    <Box className="life-kline-page life-kline-input-page" data-theme={prefersDarkMode ? 'dark' : 'light'}>
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
          <div className="input-form-title">填写出生信息</div>
          <div className="input-form-fields">
            <TextField
              label="姓名（可选）"
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
            />
            <DatePicker
              label="出生日期"
              value={birthDate}
              onChange={onBirthDateChange}
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
              onChange={onBirthTimeChange}
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
                onChange={onGenderChange}
                className="gender-toggle-group"
                fullWidth
              >
                <ToggleButton value="male">男</ToggleButton>
                <ToggleButton value="female">女</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Button variant="contained" fullWidth onClick={onSubmit} className="input-submit-btn">
              启动人生K线
            </Button>
            {errorMessage && <Typography className="error-text">{errorMessage}</Typography>}
          </div>
        </div>
      </div>
    </Box>
  )
}
