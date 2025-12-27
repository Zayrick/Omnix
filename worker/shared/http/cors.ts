export const jsonResponse = (data: unknown, init: ResponseInit = {}) => Response.json(data, init)

export const emptyResponse = (status = 204) => new Response(null, { status })
