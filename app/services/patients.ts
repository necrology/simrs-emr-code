import type { ApiEnvelope, PaginationMeta } from '~/types/api'
import type { PatientDetail, PatientSummary, RegistrationSummary } from '~/types/patient'

interface PatientDetailPayload {
  patient: PatientDetail
  recent_registrations: RegistrationSummary[]
}

export async function getPatients(query: Record<string, string | number | undefined>): Promise<ApiEnvelope<PatientSummary[]>> {
  return await $fetch<ApiEnvelope<PatientSummary[]>>('/api/backend/v1/patients', { query })
}

export async function getPatient(id: string): Promise<ApiEnvelope<PatientDetailPayload>> {
  return await $fetch<ApiEnvelope<PatientDetailPayload>>(`/api/backend/v1/patients/${encodeURIComponent(id)}`)
}

export async function getRegistrations(query: Record<string, string | number | undefined>): Promise<ApiEnvelope<RegistrationSummary[]>> {
  return await $fetch<ApiEnvelope<RegistrationSummary[]>>('/api/backend/v1/registrations', { query })
}

export function paginationMeta(meta: ApiEnvelope<unknown>['meta']): PaginationMeta {
  const value = meta as Partial<PaginationMeta> | null
  return {
    current_page: value?.current_page ?? 1,
    from: value?.from ?? null,
    last_page: value?.last_page ?? 1,
    per_page: value?.per_page ?? 20,
    to: value?.to ?? null,
    total: value?.total ?? 0,
  }
}
