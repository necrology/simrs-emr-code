export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.meta.public === true) return
  const auth = useAuthStore()
  await auth.load()
  if (to.path === '/login') {
    if (auth.user) return navigateTo('/')
    return
  }
  if (!auth.user) return navigateTo('/login')
})
