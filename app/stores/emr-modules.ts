import type { ApiEnvelope } from '~/types/api'
import type { EmrModuleNode } from '~/types/emr'

export const useEmrModulesStore = defineStore('emr-modules', () => {
  const roots = ref<EmrModuleNode[]>([])
  const initialized = ref(false)
  const loading = ref(false)

  async function load(): Promise<void> {
    if (initialized.value || loading.value) return
    loading.value = true
    try {
      roots.value = (await $fetch<ApiEnvelope<EmrModuleNode[]>>('/api/backend/v1/modules/navigation')).data
    } catch {
      roots.value = []
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  function reset(): void {
    roots.value = []
    initialized.value = false
    loading.value = false
  }

  return { roots, initialized, loading, load, reset }
})
