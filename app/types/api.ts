export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta: PaginationMeta | Record<string, unknown> | null
  errors: Record<string, string[]> | null
  request_id: string
}

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface UserSession {
  id: number | string
  username: string
  name: string
  unit_id: string | null
  doctor_id: string | null
  clinic_id: number | null
  is_superadmin: boolean
  roles: string[]
}
