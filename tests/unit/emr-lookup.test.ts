import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EmrFormLookup } from '../../app/types/emr-form'
import { emrLookupPath, searchEmrLookup } from '../../app/services/emr-forms'

const lookup: EmrFormLookup = {
  endpoint: '/api/v1/lookups/icd-10',
  query_parameter: 'search',
  min_search: 2,
  limit: 15,
  value_key: 'diagnosis_id',
  label_key: 'description',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EMR async lookup service', () => {
  it('routes only safe v1 API endpoints through the authenticated backend proxy', () => {
    expect(emrLookupPath('/api/v1/lookups/icd-10')).toBe('/lookups/icd-10')
    expect(() => emrLookupPath('https://example.test/api/v1/lookups')).toThrow()
    expect(() => emrLookupPath('/api/v1/%2e%2e/private')).toThrow()
    expect(() => emrLookupPath('/api/v1/lookups?q=unsafe')).toThrow()
  })

  it('maps configurable value and label keys while ignoring malformed rows', async () => {
    const fetch = vi.fn().mockResolvedValue({
      data: [
        { diagnosis_id: 71, description: 'A00 - Kolera' },
        { diagnosis_id: 72, description: 1234 },
        { diagnosis_id: null, description: 'Tidak valid' },
        null,
      ],
    })
    vi.stubGlobal('$fetch', fetch)

    await expect(searchEmrLookup(lookup, 'kol')).resolves.toEqual([
      { value: 71, label: 'A00 - Kolera' },
      { value: 72, label: '1234' },
    ])
    expect(fetch).toHaveBeenCalledWith('/api/backend/v1/lookups/icd-10', {
      query: { search: 'kol', limit: 15 },
      signal: undefined,
    })
  })
})
