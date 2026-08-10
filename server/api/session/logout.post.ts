export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const token = getCookie(event, 'simrs_session')
  deleteCookie(event, 'simrs_session', { path: '/' })
  if (!token) return { success: true }
  try {
    return await $fetch(`${config.apiBaseUrl}/v1/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${token}` } })
  } catch {
    return { success: true }
  }
})
