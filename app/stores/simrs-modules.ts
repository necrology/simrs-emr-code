import type { SimrsModuleGroup, SimrsModuleSummary, SimrsNavigationItem } from '~/types/simrs'
import { errorMessage } from '~/services/api'
import { getSimrsModules } from '~/services/simrs'

const emptySummary = (): SimrsModuleSummary => ({ total: 0, integrated: 0, read_only: 0, planned: 0 })

export const useSimrsModulesStore = defineStore('simrs-modules', () => {
  const summary = ref<SimrsModuleSummary>(emptySummary())
  const groups = ref<SimrsModuleGroup[]>([])
  const navigation = ref<SimrsNavigationItem[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')

  async function load(force = false): Promise<void> {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    error.value = ''
    try {
      const response = await getSimrsModules({ per_page: 10 })
      summary.value = response.data.summary
      groups.value = response.data.groups
      navigation.value = response.data.navigation
      loaded.value = true
    } catch (cause) {
      error.value = errorMessage(cause)
      summary.value = emptySummary()
      groups.value = []
      navigation.value = []
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    summary.value = emptySummary()
    groups.value = []
    navigation.value = []
    loaded.value = false
    loading.value = false
    error.value = ''
  }

  return { summary, groups, navigation, loaded, loading, error, load, reset }
})
