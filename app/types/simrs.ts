import type { PaginationMeta } from '~/types/api'

export type SimrsMigrationStatus = 'integrated' | 'read_only' | 'planned'

export interface SimrsModuleCapabilities {
  view: boolean
  add: boolean
  edit: boolean
  delete: boolean
  print: boolean
}

export interface SimrsModuleMigration {
  status: SimrsMigrationStatus
  route: string | null
  notes: string
}

export interface SimrsModuleItem {
  id: string
  type: string
  name: string
  description: string
  menu_path: string
  menu_segments: string[]
  group: string
  icon: string
  author: string | null
  version: string | null
  client_class: string | null
  server_class: string | null
  server_file: string | null
  declared_methods: string[]
  allowed_methods: string[]
  capabilities: SimrsModuleCapabilities
  migration: SimrsModuleMigration
}

export interface SimrsModuleSummary {
  total: number
  integrated: number
  read_only: number
  planned: number
}

export interface SimrsModuleGroup {
  name: string
  count: number
  icon: string
}

export interface SimrsNavigationItem {
  id: string
  label: string
  route: string
  icon: string
  status: Exclude<SimrsMigrationStatus, 'planned'>
  group: string
}

export interface SimrsModuleDiagnostics {
  invalid_privilege_records: number
  invalid_module_records: number
  active_module_records: number
}

export interface SimrsModuleListPayload {
  items: SimrsModuleItem[]
  summary: SimrsModuleSummary
  groups: SimrsModuleGroup[]
  navigation: SimrsNavigationItem[]
  diagnostics: SimrsModuleDiagnostics
}

export interface SimrsModuleQuery {
  search?: string
  group?: string
  status?: SimrsMigrationStatus
  page?: number
  per_page?: number
}

export type SimrsModuleMeta = PaginationMeta
