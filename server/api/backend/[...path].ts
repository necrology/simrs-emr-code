export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'simrs_session')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })

  const path = event.context.params?.path ?? ''
  if (path.includes('..') || !path.startsWith('v1/')) throw createError({ statusCode: 400, statusMessage: 'Invalid API path' })
  const config = useRuntimeConfig(event)
  const query = getRequestURL(event).search
  const requestId = getRequestHeader(event, 'x-request-id')
  const headers: Record<string, string> = { authorization: `Bearer ${token}`, accept: 'application/json' }
  if (requestId) headers['x-request-id'] = requestId
  const contentType = getRequestHeader(event, 'content-type')
  if (contentType) headers['content-type'] = contentType

  return proxyRequest(event, `${config.apiBaseUrl}/${path}${query}`, { headers })
})
