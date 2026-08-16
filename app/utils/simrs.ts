import type { SimrsMigrationStatus, SimrsNavigationItem } from '~/types/simrs'

const simrsIconAliases: Record<string, string> = {
  'lucide:walking': 'lucide:person-standing',
}

const supportedSimrsIcons = new Set([
  'lucide:bed',
  'lucide:box',
  'lucide:boxes',
  'lucide:chart-no-axes-combined',
  'lucide:clipboard-list',
  'lucide:clipboard-plus',
  'lucide:database',
  'lucide:file-check-2',
  'lucide:folder',
  'lucide:folder-heart',
  'lucide:folder-search-2',
  'lucide:landmark',
  'lucide:list-checks',
  'lucide:list-ordered',
  'lucide:monitor-dot',
  'lucide:person-standing',
  'lucide:pill',
  'lucide:receipt-text',
  'lucide:scan-line',
  'lucide:settings',
  'lucide:shield-check',
  'lucide:stethoscope',
  'lucide:users',
  'lucide:users-round',
])

export function resolveSimrsIcon(icon: string | null | undefined, fallback = 'lucide:box'): string {
  const resolved = icon ? (simrsIconAliases[icon] ?? icon) : fallback
  return supportedSimrsIcons.has(resolved) ? resolved : fallback
}

export function simrsMigrationLabel(status: SimrsMigrationStatus): string {
  if (status === 'integrated') return 'Terintegrasi'
  if (status === 'read_only') return 'Baca saja'
  return 'Dalam migrasi'
}

export function simrsMigrationClass(status: SimrsMigrationStatus): string {
  if (status === 'integrated') return 'status-ok'
  if (status === 'read_only') return 'status-info'
  return 'status-warning'
}

export function uniqueSimrsNavigation(items: SimrsNavigationItem[], excludedRoutes: string[] = []): SimrsNavigationItem[] {
  const excluded = new Set(excludedRoutes)
  const seen = new Set<string>()

  return items.filter((item) => {
    if (excluded.has(item.route) || seen.has(item.route)) return false
    seen.add(item.route)
    return true
  })
}
