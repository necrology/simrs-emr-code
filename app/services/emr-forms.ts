import type { ApiEnvelope } from '~/types/api'
import type {
  EmrFormCatalogItem,
  EmrFormDeletePayload,
  EmrFormDeleteResult,
  EmrFormFailure,
  EmrFormLookup,
  EmrFormOption,
  EmrFormRecord,
  EmrFormSchema,
  EmrFormUpdatePayload,
  EmrFormWritePayload,
} from '~/types/emr-form'
import { apiRequest } from '~/services/api'

export interface EmrFormCatalogQuery {
  module_id?: number
  legacy_path?: string
}

export interface EmrFormRecordQuery {
  encounter_id: string | number
  page?: number
  per_page?: number
}

function formPath(formKey: string): string {
  return `/emr/forms/${encodeURIComponent(formKey)}`
}

export function emrLookupPath(endpoint: string): string {
  const normalized = endpoint.trim()
  const prefix = '/api/v1/'

  if (!normalized.startsWith(prefix) || normalized.includes('?') || normalized.includes('#') || normalized.includes('\\')) {
    throw new Error('Endpoint lookup EMR tidak valid.')
  }

  const encodedSegments = normalized.slice(prefix.length).split('/')
  if (encodedSegments.some(segment => segment.length === 0)) throw new Error('Endpoint lookup EMR tidak valid.')

  const hasUnsafeSegment = encodedSegments.some((segment) => {
    try {
      const decoded = decodeURIComponent(segment)
      return decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')
    } catch {
      return true
    }
  })

  if (hasUnsafeSegment) throw new Error('Endpoint lookup EMR tidak valid.')

  return `/${encodedSegments.join('/')}`
}

function isLookupOptionValue(value: unknown): value is EmrFormOption['value'] {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export async function searchEmrLookup(
  lookup: EmrFormLookup,
  search: string,
  signal?: AbortSignal,
): Promise<EmrFormOption[]> {
  const response = await apiRequest<unknown[]>(emrLookupPath(lookup.endpoint), {
    query: {
      [lookup.query_parameter]: search,
      limit: lookup.limit,
    },
    signal,
  })

  return response.data.flatMap((row) => {
    if (!isRecord(row)) return []

    const value = row[lookup.value_key]
    const label = row[lookup.label_key]

    return isLookupOptionValue(value) && (typeof label === 'string' || typeof label === 'number')
      ? [{ value, label: String(label) }]
      : []
  })
}

export async function getEmrFormCatalog(query: EmrFormCatalogQuery): Promise<ApiEnvelope<EmrFormCatalogItem[]>> {
  return await apiRequest<EmrFormCatalogItem[]>('/emr/forms', { query })
}

export async function getEmrFormSchema(formKey: string): Promise<ApiEnvelope<EmrFormSchema>> {
  return await apiRequest<EmrFormSchema>(`${formPath(formKey)}/schema`)
}

export async function getEmrFormRecords(formKey: string, query: EmrFormRecordQuery): Promise<ApiEnvelope<EmrFormRecord[]>> {
  return await apiRequest<EmrFormRecord[]>(`${formPath(formKey)}/records`, { query })
}

export async function getEmrFormRecord(formKey: string, recordId: string | number, encounterId: string | number): Promise<ApiEnvelope<EmrFormRecord>> {
  return await apiRequest<EmrFormRecord>(`${formPath(formKey)}/records/${encodeURIComponent(String(recordId))}`, {
    query: { encounter_id: encounterId },
  })
}

export async function createEmrFormRecord(formKey: string, payload: EmrFormWritePayload): Promise<ApiEnvelope<EmrFormRecord>> {
  return await apiRequest<EmrFormRecord>(`${formPath(formKey)}/records`, { method: 'POST', body: payload })
}

export async function updateEmrFormRecord(
  formKey: string,
  recordId: string | number,
  payload: EmrFormUpdatePayload,
): Promise<ApiEnvelope<EmrFormRecord>> {
  return await apiRequest<EmrFormRecord>(`${formPath(formKey)}/records/${encodeURIComponent(String(recordId))}`, {
    method: 'PATCH',
    query: { encounter_id: payload.encounter_id },
    body: payload,
  })
}

export async function deleteEmrFormRecord(
  formKey: string,
  recordId: string | number,
  payload: EmrFormDeletePayload,
): Promise<ApiEnvelope<EmrFormDeleteResult>> {
  return await apiRequest<EmrFormDeleteResult>(`${formPath(formKey)}/records/${encodeURIComponent(String(recordId))}`, {
    method: 'DELETE',
    query: { encounter_id: payload.encounter_id },
    body: payload,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeErrors(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(Object.entries(value).flatMap(([key, messages]) => {
    if (!Array.isArray(messages)) return []
    const normalized = messages.filter((message): message is string => typeof message === 'string')
    return normalized.length ? [[key.replace(/^values\./, ''), normalized]] : []
  }))
}

export function emrFormFailure(error: unknown): EmrFormFailure {
  const fallback: EmrFormFailure = {
    message: 'Layanan formulir EMR tidak dapat dihubungi. Silakan coba kembali.',
    code: null,
    errors: {},
  }

  if (!isRecord(error) || !('data' in error) || !isRecord(error.data)) return fallback
  const payload = error.data
  const meta = isRecord(payload.meta) ? payload.meta : null

  return {
    message: typeof payload.message === 'string' ? payload.message : fallback.message,
    code: typeof payload.code === 'string' ? payload.code : (typeof meta?.code === 'string' ? meta.code : null),
    errors: normalizeErrors(payload.errors),
  }
}
