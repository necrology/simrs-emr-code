import type { ApiEnvelope } from '~/types/api'
import type { SimrsModuleItem, SimrsModuleListPayload, SimrsModuleQuery } from '~/types/simrs'
import { apiRequest } from '~/services/api'

export async function getSimrsModules(query: SimrsModuleQuery = {}): Promise<ApiEnvelope<SimrsModuleListPayload>> {
  return await apiRequest<SimrsModuleListPayload>('/simrs/modules', { query })
}

export async function getSimrsModule(id: string): Promise<ApiEnvelope<SimrsModuleItem>> {
  return await apiRequest<SimrsModuleItem>(`/simrs/modules/${encodeURIComponent(id)}`)
}
