import { useState, useMemo } from 'react'
import {
  Box,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Button,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  CssBaseline,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'
import './LifeKLine.css'

function LifeKLine() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState<Dayjs | null>(null)
  const [birthTime, setBirthTime] = useState<Dayjs | null>(null)
  const [gender, setGender] = useState<'male' | 'female' | null>(null)

  // 检测系统深色模式
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  // 创建主题
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: prefersDarkMode ? '#a0a0a0' : '#505050',
          },
          background: {
            default: prefersDarkMode ? '#121212' : '#fafafa',
            paper: prefersDarkMode ? '#1e1e1e' : '#ffffff',
          },
        },
        shape: {
          borderRadius: 8,
        },
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
                  borderRadius: 8,
                },
              },
            },
          },
          MuiToggleButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 500,
                padding: '10px 24px',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: 'none',
              },
            },
          },
        },
      }),
    [prefersDarkMode]
  )

  const handleGenderChange = (
    _event: React.MouseEvent<HTMLElement>,
    newGender: 'male' | 'female' | null
  ) => {
    if (newGender !== null) {
      setGender(newGender)
    }
  }

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
          className="life-kline-container"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
            width: '100%',
            padding: { xs: 2, sm: 3 },
            boxSizing: 'border-box',
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 500,
              mb: 3,
              color: 'text.primary',
            }}
          >
            我的人生K线
          </Typography>

          <Box
            component="form"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              width: '100%',
              maxWidth: 480,
            }}
          >
            {/* 姓名 */}
            <TextField
              label="姓名（可选）"
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
              fullWidth
            />

            {/* 出生日期 */}
            <DatePicker
              label="出生日期"
              value={birthDate}
              onChange={(newValue) => setBirthDate(newValue)}
              maxDate={dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  placeholder: '请选择出生日期',
                },
              }}
            />

            {/* 出生时间 */}
            <TimePicker
              label="出生时间"
              value={birthTime}
              onChange={(newValue) => setBirthTime(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  placeholder: '请选择出生时间',
                },
              }}
            />

            {/* 性别选择 */}
            <Box>
              <Typography
                variant="body2"
                sx={{
                  mb: 1.5,
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                性别
              </Typography>
              <ToggleButtonGroup
                value={gender}
                exclusive
                onChange={handleGenderChange}
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    flex: 1,
                    py: 1.5,
                    fontSize: '1rem',
                  },
                }}
              >
                <ToggleButton value="male">男</ToggleButton>
                <ToggleButton value="female">女</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* 启动按钮 */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              sx={{
                mt: 2,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              启动人生K线
            </Button>
          </Box>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default LifeKLine
