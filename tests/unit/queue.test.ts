import { describe, expect, it } from 'vitest'
import type { RegistrationQueueItem, RegistrationQueueStatusKey } from '../../app/types/queue'
import {
  canCallRegistrationQueue,
  canCancelRegistrationQueue,
  localIsoDate,
  queueSourceLabel,
  queueStatusClass,
  queueTimeLabel,
  queueTypeLabel,
} from '../../app/utils/queue'

function queue(status: RegistrationQueueStatusKey): RegistrationQueueItem {
  return {
    id: 1,
    queue_number: 'A001',
    queue_date: '2026-08-11',
    queue_time: '08:15:30',
    queue_kind: 'rj',
    queue_type: 'A',
    sequence_number: 1,
    waiting_list: 2,
    source: 'langsung',
    status_code: 1,
    status_key: status,
    status_label: 'Menunggu',
    clinic_id: 10,
    clinic_code: 'PD',
    clinic_name: 'Klinik Penyakit Dalam',
    doctor_id: 'D01',
    doctor_name: 'dr. Penyakit Dalam',
    patient_id: 1,
    medical_record_number: '000001',
    patient_name: 'SITI AMINAH',
    new_patient_national_id: null,
    registration_id: null,
    registered_at: null,
    booking_code: null,
    counter: null,
    called_by: null,
    called_at: null,
    call_count: 0,
    call_history_count: 0,
    has_pending_call: false,
    latest_call: null,
    booking: null,
    bpjs: null,
  }
}

describe('registration queue helpers', () => {
  it('builds a local calendar date without UTC conversion', () => {
    expect(localIsoDate(new Date(2026, 7, 11, 23, 30))).toBe('2026-08-11')
  })

  it('formats legacy source, type, and time values', () => {
    expect(queueSourceLabel('langsung')).toBe('Langsung')
    expect(queueSourceLabel('phone')).toBe('Telepon')
    expect(queueSourceLabel('mobile app')).toBe('Mobile App')
    expect(queueTypeLabel('b')).toBe('Tipe B')
    expect(queueTimeLabel('08:15:30')).toBe('08:15')
  })

  it('maps every queue state to a stable visual class', () => {
    expect(queueStatusClass('waiting')).toBe('queue-status-waiting')
    expect(queueStatusClass('called')).toBe('queue-status-called')
    expect(queueStatusClass('completed')).toBe('queue-status-completed')
    expect(queueStatusClass('cancelled')).toBe('queue-status-cancelled')
    expect(queueStatusClass('unknown')).toBe('queue-status-unknown')
  })

  it('allows calls only for waiting and called queues', () => {
    expect(canCallRegistrationQueue(queue('waiting'))).toBe(true)
    expect(canCallRegistrationQueue(queue('called'))).toBe(true)
    expect(canCallRegistrationQueue(queue('completed'))).toBe(false)
    expect(canCallRegistrationQueue(queue('cancelled'))).toBe(false)
  })

  it('prevents cancellation after completion or an earlier cancellation', () => {
    expect(canCancelRegistrationQueue(queue('waiting'))).toBe(true)
    expect(canCancelRegistrationQueue(queue('called'))).toBe(true)
    expect(canCancelRegistrationQueue(queue('completed'))).toBe(false)
    expect(canCancelRegistrationQueue(queue('cancelled'))).toBe(false)
  })
})
