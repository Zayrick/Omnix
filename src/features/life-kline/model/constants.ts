import type { StreamState } from './types'

export const traitCards = [
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

export const getStatusLabel = (streamState: StreamState) => {
  if (streamState === 'loading') {
    return '正在连接AI...'
  }
  if (streamState === 'streaming') {
    return 'AI解析中'
  }
  if (streamState === 'done') {
    return '再来一次'
  }
  if (streamState === 'error') {
    return '出错了'
  }
  return '待启动'
}
