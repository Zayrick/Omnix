export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const withCors = (init: ResponseInit = {}) => ({
  ...init,
  headers: {
    ...corsHeaders,
    ...(init.headers ?? {}),
  },
})

export const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  Response.json(data, withCors(init))

export const emptyResponse = (status = 204) => new Response(null, withCors({ status }))
