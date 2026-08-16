import type { PaginationMeta } from '~/types/api'

export type RegistrationQueueStatusKey = 'waiting' | 'called' | 'completed' | 'cancelled' | 'unknown'

export interface RegistrationQueueClinicOption {
  id: number
  code: string | null
  name: string
}

export interface RegistrationQueueCall {
  id: number
  called_at: string | null
  counter: number | null
  counter_type: string | null
  called_by: string | null
  status_code: number
  status_key: 'pending' | 'processing' | 'completed'
  calling_state: number
  has_audio?: boolean
}

export interface RegistrationQueueBooking {
  id: number
  number: string | null
  source: string | null
  time: string | null
  type: string | null
  patient_name: string | null
  phone: string | null
  verified_code: number | null
  verified_at: string | null
  description: string | null
}

export interface RegistrationQueueBpjs {
  id: number
  task_id: number | null
  api_status: string | null
  status: string | null
  admission_queue: string | null
  clinic_queue: string | null
  pharmacy_queue: string | null
  checkin: string | null
  checked_in_at: string | null
}

export interface RegistrationQueueItem {
  id: number
  queue_number: string | null
  queue_date: string | null
  queue_time: string | null
  queue_kind: string | null
  queue_type: string | null
  sequence_number: number | null
  waiting_list: number | null
  source: string | null
  status_code: number
  status_key: RegistrationQueueStatusKey
  status_label: string
  clinic_id: number | null
  clinic_code: string | null
  clinic_name: string | null
  doctor_id: string | null
  doctor_name: string | null
  patient_id: number | null
  medical_record_number: string | null
  patient_name: string | null
  new_patient_national_id: string | null
  registration_id: number | null
  registered_at: string | null
  booking_code: string | null
  counter: number | null
  called_by: string | null
  called_at: string | null
  call_count: number
  call_history_count: number
  has_pending_call: boolean
  latest_call: RegistrationQueueCall | null
  booking: RegistrationQueueBooking | null
  bpjs: RegistrationQueueBpjs | null
}

export interface RegistrationQueueDetail extends RegistrationQueueItem {
  calls: RegistrationQueueCall[]
}

export interface RegistrationQueueSummary {
  total: number
  waiting: number
  called: number
  completed: number
  cancelled: number
}

export interface RegistrationQueueOptions {
  clinics: RegistrationQueueClinicOption[]
  sources: string[]
  queue_types: string[]
}

export interface RegistrationQueueCapabilities {
  writes_enabled: boolean
  can_manage: boolean
}

export interface RegistrationQueueListPayload {
  items: RegistrationQueueItem[]
  summary: RegistrationQueueSummary
  options: RegistrationQueueOptions
  capabilities: RegistrationQueueCapabilities
}

export interface RegistrationQueueMeta extends PaginationMeta {
  date: string
}

export interface RegistrationQueueQuery {
  date: string
  clinic_id?: number
  status?: Exclude<RegistrationQueueStatusKey, 'unknown'>
  source?: string
  queue_type?: string
  search?: string
  page?: number
  per_page?: number
}
