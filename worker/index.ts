import { handleLifeKline } from './features/life-kline/handler'
import { emptyResponse } from './shared/http/cors'
import type { Env } from './shared/types'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return emptyResponse()
    }

    if (url.pathname === '/api/life-kline' && request.method === 'POST') {
      return handleLifeKline(request, env)
    }

    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>
