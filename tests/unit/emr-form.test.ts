import { describe, expect, it } from 'vitest'
import type { EmrFormCatalogItem, EmrFormField } from '../../app/types/emr-form'
import { areaForEncounterType } from '../../app/types/emr'
import { displayFormValue, initializeFormValues, resolveFormCatalog, writableFormValues } from '../../app/utils/emr-form'
import { emrFormFailure } from '../../app/services/emr-forms'

function field(overrides: Partial<EmrFormField>): EmrFormField {
  return {
    name: 'value',
    label: 'Nilai',
    type: 'text',
    required: false,
    read_only: false,
    nullable: true,
    rules: [],
    options: [],
    ...overrides,
  }
}

function catalogItem(key: string, area: string): EmrFormCatalogItem {
  return {
    key,
    area,
    label: key,
    module_path: `module/${key}`,
    module_id: 1,
    permissions: { view: true, create: true, update: true, delete: true },
    schema_url: `/emr/forms/${key}/schema`,
    records_url: `/emr/forms/${key}/records`,
  }
}

describe('EMR metadata form values', () => {
  it('initializes checkbox and datetime controls for browser inputs', () => {
    const fields = [
      field({ name: 'active', type: 'checkbox' }),
      field({ name: 'recorded_at', type: 'datetime-local' }),
    ]

    expect(initializeFormValues(fields, { active: 1, recorded_at: '2026-07-16 09:30:45' })).toEqual({
      active: true,
      recorded_at: '2026-07-16T09:30',
    })
  })

  it('normalizes writable numbers, nullable values, and omits read-only fields', () => {
    const fields = [
      field({ name: 'score', type: 'integer', nullable: false }),
      field({ name: 'notes', type: 'textarea' }),
      field({ name: 'officer_id', type: 'integer', read_only: true }),
    ]

    expect(writableFormValues(fields, { score: '12', notes: '', officer_id: 99 })).toEqual({
      score: 12,
      notes: null,
    })
  })

  it('writes datetime-local values with seconds required by the API contract', () => {
    const fields = [
      field({ name: 'started_at', type: 'datetime-local' }),
      field({ name: 'finished_at', type: 'datetime' }),
    ]

    expect(writableFormValues(fields, {
      started_at: '2026-07-16T09:30',
      finished_at: '2026-07-16T10:45:27',
    })).toEqual({
      started_at: '2026-07-16T09:30:00',
      finished_at: '2026-07-16T10:45:27',
    })
  })

  it('displays option labels instead of stored codes', () => {
    const continued = field({
      type: 'select',
      options: [{ value: 1, label: 'Tidak' }, { value: 2, label: 'Ya' }],
    })

    expect(displayFormValue(continued, 2)).toBe('Ya')
  })
})

describe('EMR catalog and encounter routing', () => {
  it('keeps forms inside the requested area and honors an allowed key', () => {
    const result = resolveFormCatalog([
      catalogItem('emergency-cppt', 'emergency'),
      catalogItem('outpatient-cppt', 'outpatient'),
      catalogItem('outpatient-drugs', 'outpatient'),
    ], 'outpatient', 'outpatient-drugs')

    expect(result.items.map((item) => item.key)).toEqual(['outpatient-cppt', 'outpatient-drugs'])
    expect(result.selectedKey).toBe('outpatient-drugs')
  })

  it('maps clinical encounters to their EMR area without linking support encounters', () => {
    expect(areaForEncounterType('emergency')).toBe('emergency')
    expect(areaForEncounterType('inpatient')).toBe('inpatient')
    expect(areaForEncounterType('executive')).toBe('outpatient')
    expect(areaForEncounterType('laboratory')).toBeNull()
  })
})

describe('EMR API failures', () => {
  it('reads optimistic-lock and gate codes from the standard envelope meta', () => {
    const failure = emrFormFailure({
      data: {
        message: 'Data telah berubah.',
        meta: { code: 'STALE_RECORD' },
        errors: { 'values.subjective': ['Subjective wajib diisi.'] },
      },
    })

    expect(failure).toEqual({
      message: 'Data telah berubah.',
      code: 'STALE_RECORD',
      errors: { subjective: ['Subjective wajib diisi.'] },
    })
  })
})
