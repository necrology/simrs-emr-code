import type { RegistrationSummary } from '~/types/patient'

export type RegistrationEncounterType = 'outpatient' | 'emergency' | 'laboratory' | 'radiology' | 'inpatient'
export type RegistrationShift = '1' | '2'
export type RegistrationPatientMode = 'existing' | 'new'
export type RegistrationPatientSex = 'L' | 'P'

export interface RegistrationPatientModeOption {
  value: RegistrationPatientMode
  label: string
  description: string
}

export interface RegistrationEncounterTypeOption {
  value: RegistrationEncounterType
  code: string
  label: string
  description: string
}

export interface RegistrationClinic {
  id: number
  code: string
  name: string
  encounter_type: RegistrationEncounterType
  room_id: number | null
  room_name: string | null
}

export interface RegistrationPaymentMethod {
  code: string
  name: string
}

export interface RegistrationInsurer {
  id: string
  name: string
  short_name: string | null
  payment_method_codes: string[]
  requires_number: boolean
}

export interface RegistrationOption {
  value: string
  label: string
}

export interface RegistrationCaseOption extends RegistrationOption {
  code: string
}

export interface RegistrationDefaults {
  registered_at: string
  encounter_type: RegistrationEncounterType
  payment_method_code: string
  insurer_id: string
  shift: RegistrationShift
  entry_procedure: string
  case_id: number
}

export interface RegistrationSchema {
  patient_modes: RegistrationPatientModeOption[]
  sex_options: RegistrationOption[]
  encounter_types: RegistrationEncounterTypeOption[]
  clinics: RegistrationClinic[]
  payment_methods: RegistrationPaymentMethod[]
  insurers: RegistrationInsurer[]
  encounter_payment_methods: Record<RegistrationEncounterType, string[]>
  triage_categories: RegistrationOption[]
  arrival_methods: RegistrationOption[]
  entry_procedures: RegistrationOption[]
  cases: RegistrationCaseOption[]
  social_statuses: RegistrationOption[]
  disabilities: RegistrationOption[]
  responsible_relations: RegistrationOption[]
  defaults: RegistrationDefaults
  warnings?: string[]
}

export interface RegistrationDoctor {
  id: string
  name: string
  schedule_days: string[] | null
  schedule_time: string | null
}

export interface RegistrationDiagnosis {
  id: number
  code: string
  name: string
}

export interface RegistrationReferrer {
  id: number
  code: string | null
  name: string
  address: string | null
}

export interface RegistrationBed {
  id: number
  clinic_id: number
  code: string | null
  name: string
  class_id: number | null
  class_name: string | null
  room_rate: number | null
}

export interface RegistrationNewPatientDraft {
  full_name: string
  sex: RegistrationPatientSex | ''
  birth_date: string
  birth_place: string
  national_id: string
  address: string
  phone: string
  mobile_phone: string
  duplicate_override: boolean
  duplicate_override_reason: string
}

export interface RegistrationNewPatientPayload {
  full_name: string
  sex: RegistrationPatientSex
  birth_date: string
  birth_place?: string
  national_id?: string
  address: string
  phone?: string
  mobile_phone?: string
  duplicate_override: boolean
  duplicate_override_reason?: string
}

export interface RegistrationDraft {
  idempotency_key: string
  patient_mode: RegistrationPatientMode
  patient_id: number | null
  new_patient: RegistrationNewPatientDraft
  encounter_type: RegistrationEncounterType
  registered_at: string
  clinic_id: number | null
  doctor_id: string
  payment_method_code: string
  insurer_id: string
  insurer_number: string
  shift: RegistrationShift
  complaint: string
  notes: string
  entry_procedure: string
  referrer_id: number | null
  diagnosis_id: number | null
  case_id: number | null
  social_status: string
  disability: string
  bed_id: number | null
  is_control: boolean
  triage: string
  arrival_method: string
  accident_location: string
  is_visum: boolean
  responsible_name: string
  responsible_national_id: string
  responsible_address: string
  responsible_phone: string
  responsible_relation: string
}

interface RegistrationCreatePayloadBase {
  idempotency_key: string
  encounter_type: RegistrationEncounterType
  registered_at: string
  clinic_id: number
  doctor_id: string
  payment_method_code: string
  insurer_id: string
  insurer_number?: string
  shift: RegistrationShift
  complaint?: string
  notes?: string
  entry_procedure: string
  referrer_id?: number
  diagnosis_id?: number
  case_id: number
  social_status?: number
  disability?: number
  bed_id?: number
  is_control: boolean
  triage?: string
  arrival_method?: string
  accident_location?: string
  is_visum: boolean
  responsible_name?: string
  responsible_national_id?: string
  responsible_address?: string
  responsible_phone?: string
  responsible_relation?: string
}

export interface RegistrationExistingPatientPayload extends RegistrationCreatePayloadBase {
  patient_mode: 'existing'
  patient_id: number
  new_patient?: never
}

export interface RegistrationNewPatientRegistrationPayload extends RegistrationCreatePayloadBase {
  patient_mode: 'new'
  patient_id?: never
  new_patient: RegistrationNewPatientPayload
}

export type RegistrationCreatePayload = RegistrationExistingPatientPayload | RegistrationNewPatientRegistrationPayload

export interface RegistrationDuplicateCandidate {
  patient_id: number
  medical_record_number: string
  full_name: string
  birth_date: string | null
  sex: string | null
}

export interface RegistrationFailure {
  message: string
  errors: Record<string, string[]>
  code: string | null
  candidates: RegistrationDuplicateCandidate[]
}

export type RegistrationCreateResult = RegistrationSummary
