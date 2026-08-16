import type { ApiEnvelope, UserSession } from '~/types/api'
import { errorMessage } from '~/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserSession | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  async function load(): Promise<void> {
    if (initialized.value || loading.value) return
    loading.value = true
    try {
      const response = await $fetch<ApiEnvelope<UserSession>>('/api/backend/v1/me')
      user.value = response.data
    } catch {
      user.value = null
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function login(username: string, password: string): Promise<void> {
    loading.value = true
    try {
      const response = await $fetch<ApiEnvelope<{ user: UserSession }>>('/api/session/login', {
        method: 'POST',
        body: { username, password, device_name: 'nuxt-web' },
      })
      user.value = response.data.user
      initialized.value = true
      useEmrModulesStore().reset()
      useSimrsModulesStore().reset()
    } catch (error) {
      throw new Error(errorMessage(error), { cause: error })
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/session/logout', { method: 'POST' })
    } finally {
      user.value = null
      initialized.value = true
      useEmrModulesStore().reset()
      useSimrsModulesStore().reset()
      await navigateTo('/login')
    }
  }

  return { user, initialized, loading, load, login, logout }
})
