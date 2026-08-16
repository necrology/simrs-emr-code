import type { ApiEnvelope } from '~/types/api'
import type {
  RegistrationBed,
  RegistrationCreatePayload,
  RegistrationCreateResult,
  RegistrationDiagnosis,
  RegistrationDoctor,
  RegistrationDuplicateCandidate,
  RegistrationFailure,
  RegistrationReferrer,
  RegistrationSchema,
} from '~/types/registration'
import { apiRequest } from '~/services/api'

export interface RegistrationDoctorQuery {
  clinic_id: number
  search?: string
}

export interface RegistrationReferenceQuery {
  search: string
  limit?: number
}

export interface RegistrationBedQuery {
  clinic_id: number
}

export async function getRegistrationSchema(): Promise<ApiEnvelope<RegistrationSchema>> {
  return await apiRequest<RegistrationSchema>('/registrations/schema')
}

export async function getRegistrationDoctors(query: RegistrationDoctorQuery): Promise<ApiEnvelope<RegistrationDoctor[]>> {
  return await apiRequest<RegistrationDoctor[]>('/registrations/doctors', { query })
}

export async function getRegistrationDiagnoses(query: RegistrationReferenceQuery): Promise<ApiEnvelope<RegistrationDiagnosis[]>> {
  return await apiRequest<RegistrationDiagnosis[]>('/registrations/diagnoses', { query })
}

export async function getRegistrationReferrers(query: RegistrationReferenceQuery): Promise<ApiEnvelope<RegistrationReferrer[]>> {
  return await apiRequest<RegistrationReferrer[]>('/registrations/referrers', { query })
}

export async function getRegistrationBeds(query: RegistrationBedQuery): Promise<ApiEnvelope<RegistrationBed[]>> {
  return await apiRequest<RegistrationBed[]>('/registrations/beds', { query })
}

export async function createRegistration(payload: RegistrationCreatePayload): Promise<ApiEnvelope<RegistrationCreateResult>> {
  return await apiRequest<RegistrationCreateResult>('/registrations', { method: 'POST', body: payload })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeRegistrationErrors(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(Object.entries(value).flatMap(([field, messages]) => {
    if (!Array.isArray(messages)) return []
    const normalized = messages.filter((message): message is string => typeof message === 'string' && message.length > 0)
    return normalized.length > 0 ? [[field, normalized]] : []
  }))
}

export function normalizeRegistrationCandidates(value: unknown): RegistrationDuplicateCandidate[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((candidate) => {
    if (!isRecord(candidate)
      || typeof candidate.patient_id !== 'number'
      || typeof candidate.medical_record_number !== 'string'
      || typeof candidate.full_name !== 'string') {
      return []
    }

    return [{
      patient_id: candidate.patient_id,
      medical_record_number: candidate.medical_record_number,
      full_name: candidate.full_name,
      birth_date: typeof candidate.birth_date === 'string' ? candidate.birth_date : null,
      sex: typeof candidate.sex === 'string' ? candidate.sex : null,
    }]
  })
}

export function registrationFailure(error: unknown): RegistrationFailure {
  const fallback = 'Layanan registrasi tidak dapat dihubungi. Silakan coba kembali.'
  if (!isRecord(error) || !isRecord(error.data)) {
    return { message: fallback, errors: {}, code: null, candidates: [] }
  }

  const responseErrors = isRecord(error.data.errors) ? error.data.errors : {}
  const responseMeta = isRecord(error.data.meta) ? error.data.meta : {}

  return {
    message: typeof error.data.message === 'string' ? error.data.message : fallback,
    errors: normalizeRegistrationErrors(responseErrors),
    code: typeof responseMeta.code === 'string' ? responseMeta.code : null,
    candidates: normalizeRegistrationCandidates(responseErrors.candidates),
  }
}
