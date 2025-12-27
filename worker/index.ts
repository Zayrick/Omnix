import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleLifeKline } from './features/life-kline/handler'
import { emptyResponse } from './shared/http/cors'
import type { Env } from './shared/types'

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.options('*', () => emptyResponse())
app.post('/api/life-kline', (c) => handleLifeKline(c.req.raw, c.env))

app.notFound((c) => c.text('', 404))

export default app
