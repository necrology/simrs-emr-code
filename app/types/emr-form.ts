import type { EmrModulePermissions } from '~/types/emr'

export type EmrFormFieldType = 'text' | 'textarea' | 'number' | 'integer' | 'date' | 'datetime' | 'datetime-local' | 'select' | 'checkbox'

export type EmrFormValue = string | number | boolean | null
export type EmrFormValues = Record<string, EmrFormValue>

export interface EmrFormPermissions {
  view: boolean
  create: boolean
  update: boolean
  delete: boolean
}

export interface EmrFormOption {
  value: string | number | boolean
  label: string
}

export interface EmrFormLookup {
  endpoint: string
  query_parameter: string
  min_search: number
  limit: number
  value_key: string
  label_key: string
}

export interface EmrFormField {
  name: string
  label: string
  type: EmrFormFieldType
  required: boolean
  read_only: boolean
  nullable: boolean
  rules: string[]
  options?: EmrFormOption[]
  lookup?: EmrFormLookup
  placeholder?: string | null
  help?: string | null
  help_text?: string | null
  default?: EmrFormValue
}

export interface EmrFormCapabilities {
  list?: boolean
  read?: boolean
  create?: boolean
  update?: boolean
  delete?: boolean
  [capability: string]: boolean | string | number | null | undefined
}

export interface EmrFormCatalogItem {
  key: string
  label: string
  area: string
  module_path: string
  module_id: number | null
  description?: string
  permissions: EmrFormPermissions
  schema_url: string
  records_url: string
  navigation_paths?: string[]
  available?: boolean
}

export interface EmrFormSchema extends EmrFormCatalogItem {
  writes_enabled?: boolean
  capabilities: EmrFormCapabilities
  encounter?: { required: boolean, query_parameter: string }
  versioning?: { strategy: string, field: string, required_for: string[] }
  fields: EmrFormField[]
}

export interface EmrFormRecord {
  id: string | number
  encounter_id: string | number
  patient_id: string | number | null
  version: string
  values: EmrFormValues
}

export interface EmrFormWritePayload {
  encounter_id: string | number
  patient_id?: string | number
  values: EmrFormValues
}

export interface EmrFormUpdatePayload {
  encounter_id: string | number
  version: string
  values: EmrFormValues
}

export interface EmrFormDeletePayload {
  encounter_id: string | number
  version: string
}

export interface EmrFormDeleteResult {
  id: string | number
  encounter_id: string | number
  patient_id: string | number | null
  deleted: boolean
}

export interface EmrFormFailure {
  message: string
  code: string | null
  errors: Record<string, string[]>
}

export function formPermissionsFromModule(permissions: EmrModulePermissions): EmrFormPermissions {
  return {
    view: permissions.view,
    create: permissions.add,
    update: permissions.edit,
    delete: permissions.delete,
  }
}
