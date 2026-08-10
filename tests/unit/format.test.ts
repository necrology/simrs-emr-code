import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '../../app/utils/format'

describe('date formatting', () => {
  it('keeps empty clinical values explicit', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('returns an Indonesian readable date', () => {
    expect(formatDate('2026-07-15T00:00:00Z')).toContain('2026')
  })
})
