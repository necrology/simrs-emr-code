import type { PaginationMeta } from '~/types/api'

export type OnlineQueueApiState = 'pending' | 'success' | 'warning'
export type OnlineQueueTimelineState = 'pending' | 'current' | 'completed'

export interface OnlineQueueTimelineItem {
  task_id: number
  label: string
  at: string | null
  state: OnlineQueueTimelineState
}

export interface OnlineQueueCallState {
  at: string | null
  user: string | null
  status: number | null
  is_calling: boolean
}

export interface OnlineQueueItem {
  id: number
  booking_code: string | null
  patient: {
    medical_record_number: string | null
    name: string | null
    insurance_number: string | null
    national_id: string | null
    phone: string | null
    is_new: boolean | null
    type: string | null
  }
  clinic: { code: string | null, name: string | null }
  doctor: { code: string | null, name: string | null, schedule: string | null }
  visit: {
    date: string | null
    type: string | null
    reference_number: string | null
    sep_number: string | null
    estimated_service_at: string | null
  }
  numbers: {
    display: string | null
    sequence: number | null
    admission: string | null
    clinic: string | null
    pharmacy: string | null
  }
  quota: {
    jkn_remaining: number | null
    jkn_total: number | null
    non_jkn_remaining: number | null
    non_jkn_total: number | null
  }
  task: { id: number, key: string, label: string, description: string | null }
  timeline: OnlineQueueTimelineItem[]
  checkin: { status: string | null, code: string | null, at: string | null, checked_in: boolean }
  api: { state: OnlineQueueApiState, label: string, message: string | null }
  calls: {
    admission: OnlineQueueCallState
    clinic: OnlineQueueCallState
    pharmacy: OnlineQueueCallState
  }
  audit: {
    created_at: string | null
    created_by: string | null
    edited_at: string | null
    edited_by: string | null
  }
}

export interface OnlineQueueSummary {
  total: number
  booked: number
  admission: number
  clinic_wait: number
  clinic_service: number
  pharmacy: number
  completed: number
  cancelled: number
  checked_in: number
  api_warning: number
}

export interface OnlineQueueOption {
  code: string
  name: string
}

export interface OnlineQueueTaskOption {
  id: number
  key: string
  label: string
}

export interface OnlineQueueOptions {
  clinics: OnlineQueueOption[]
  doctors: OnlineQueueOption[]
  patient_types: string[]
  tasks: OnlineQueueTaskOption[]
  api_states: Array<{ key: OnlineQueueApiState, label: string }>
}

export interface OnlineQueueCapabilities {
  read_only: boolean
  writes_enabled: boolean
  external_bpjs_calls_enabled: boolean
}

export interface OnlineQueueListPayload {
  items: OnlineQueueItem[]
  summary: OnlineQueueSummary
  options: OnlineQueueOptions
  capabilities: OnlineQueueCapabilities
}

export interface OnlineQueueQuery {
  date: string
  clinic_code?: string
  doctor_code?: string
  task_id?: number
  patient_type?: string
  api_state?: OnlineQueueApiState
  checkin_state?: 'pending' | 'checked_in'
  search?: string
  page?: number
  per_page?: number
}

export interface OnlineQueueMeta extends PaginationMeta {
  date: string
}
