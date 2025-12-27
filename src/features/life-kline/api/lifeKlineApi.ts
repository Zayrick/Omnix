import type { LifeKlineRequestDto } from '../../../../shared/dto/lifeKline'

export const requestLifeKlineStream = (payload: LifeKlineRequestDto, signal?: AbortSignal) =>
  fetch('/api/life-kline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(payload),
  })
