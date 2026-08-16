import { describe, expect, it } from 'vitest'
import type { OnlineQueueItem } from '../../app/types/online-queue'
import { onlineQueueApiClass, onlineQueueNumberLabel, onlineQueueTaskClass } from '../../app/utils/online-queue'

describe('online queue helpers', () => {
  it('maps API and task status classes', () => {
    expect(onlineQueueApiClass('success')).toBe('status-ok')
    expect(onlineQueueApiClass('warning')).toBe('status-warning')
    expect(onlineQueueTaskClass(7)).toBe('status-ok')
    expect(onlineQueueTaskClass(99)).toBe('status-danger')
  })

  it('selects the most useful queue number', () => {
    const queue = {
      booking_code: 'BOOK-01',
      numbers: { display: null, clinic: 'POLI-2', admission: 'ADM-2' },
    } as OnlineQueueItem

    expect(onlineQueueNumberLabel(queue)).toBe('POLI-2')
  })
})
