import { describe, expect, it } from 'vitest'
import type { SimrsNavigationItem } from '../../app/types/simrs'
import { resolveSimrsIcon, simrsMigrationClass, simrsMigrationLabel, uniqueSimrsNavigation } from '../../app/utils/simrs'

describe('simrs helpers', () => {
  it('maps migration labels and visual states', () => {
    expect(simrsMigrationLabel('integrated')).toBe('Terintegrasi')
    expect(simrsMigrationLabel('read_only')).toBe('Baca saja')
    expect(simrsMigrationClass('planned')).toBe('status-warning')
  })

  it('deduplicates and excludes core navigation routes', () => {
    const items: SimrsNavigationItem[] = [
      { id: 'Pasien', label: 'Pasien', route: '/patients', icon: 'lucide:users', status: 'integrated', group: 'Medical Record' },
      { id: 'MonitoringAPM', label: 'APM', route: '/online-queues', icon: 'lucide:scan-line', status: 'read_only', group: 'Front Office' },
      { id: 'AntreanBPJS', label: 'BPJS', route: '/online-queues', icon: 'lucide:list-checks', status: 'read_only', group: 'BPJS Antrean' },
    ]

    expect(uniqueSimrsNavigation(items, ['/patients'])).toEqual([items[1]])
  })

  it('aliases removed icons and falls back for unknown API values', () => {
    expect(resolveSimrsIcon('lucide:walking')).toBe('lucide:person-standing')
    expect(resolveSimrsIcon('legacy:unknown')).toBe('lucide:box')
    expect(resolveSimrsIcon(null)).toBe('lucide:box')
  })
})
