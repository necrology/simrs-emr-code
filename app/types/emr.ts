export interface EmrModulePermissions {
  view: boolean
  add: boolean
  edit: boolean
  delete: boolean
}

export interface EmrModuleNode {
  id: number
  parent_id: number
  name: string
  legacy_path: string
  icon: string | null
  is_group: boolean
  sort_order: number
  permissions: EmrModulePermissions
  children: EmrModuleNode[]
}

export interface ModuleStatus {
  module: string
  label: string
  read_ready: boolean
  write_ready: boolean
  required_tables: string[]
  missing_tables: string[]
  schema_table_count: number
  catalog_item_count: number
}

export interface EmrAreaDefinition {
  label: string
  legacyRoot: string
  mark: string
}

export const EMR_AREAS: Record<string, EmrAreaDefinition> = {
  emergency: { label: 'EMR Rawat Darurat', legacyRoot: 'emr_rawatdarurat', mark: 'IG' },
  outpatient: { label: 'EMR Rawat Jalan', legacyRoot: 'emr_rawatjalan', mark: 'RJ' },
  inpatient: { label: 'EMR Rawat Inap', legacyRoot: 'emr_rawatinap', mark: 'RI' },
  master_data: { label: 'EMR Master Data', legacyRoot: 'emr_masterdata', mark: 'MD' },
}

export function areaForLegacyRoot(legacyPath: string): string | null {
  return Object.entries(EMR_AREAS).find(([, area]) => area.legacyRoot === legacyPath)?.[0] ?? null
}

export function areaForEncounterType(encounterType: string): string | null {
  if (encounterType === 'emergency') return 'emergency'
  if (encounterType === 'inpatient') return 'inpatient'
  if (['outpatient', 'medical_checkup', 'executive', 'general'].includes(encounterType)) return 'outpatient'
  return null
}
