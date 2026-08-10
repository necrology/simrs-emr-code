import type { ApiEnvelope, UserSession } from '../../../app/types/api'

interface LoginPayload { token: string; token_type: string; user: UserSession }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<Record<string, unknown>>(event)
  try {
    const response = await $fetch<ApiEnvelope<LoginPayload>>(`${config.apiBaseUrl}/v1/auth/login`, { method: 'POST', body })
    setCookie(event, 'simrs_session', response.data.token, {
      httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8,
    })
    return { ...response, data: { user: response.data.user } }
  } catch (error) {
    const failure = error as { statusCode?: number; data?: unknown }
    throw createError({ statusCode: failure.statusCode ?? 502, data: failure.data, message: 'Login tidak dapat diproses.' })
  }
})
