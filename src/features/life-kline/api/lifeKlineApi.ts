export type LifeKlineRequestPayload = {
  name?: string
  gender: 'male' | 'female'
  birthDate: string
  birthTime: string
}

export const requestLifeKlineStream = (payload: LifeKlineRequestPayload, signal?: AbortSignal) =>
  fetch('/api/life-kline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(payload),
  })
