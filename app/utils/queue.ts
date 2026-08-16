import type { RegistrationQueueItem, RegistrationQueueStatusKey } from '~/types/queue'

export const registrationQueueStatuses: Array<{
  value: Exclude<RegistrationQueueStatusKey, 'unknown'>
  label: string
}> = [
  { value: 'waiting', label: 'Menunggu' },
  { value: 'called', label: 'Dipanggil' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Batal' },
]

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function queueSourceLabel(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return '—'
  const labels: Record<string, string> = {
    langsung: 'Langsung',
    phone: 'Telepon',
    batal: 'Batal',
  }
  return labels[normalized] ?? normalized.replace(/\b\w/g, letter => letter.toUpperCase())
}

export function queueTypeLabel(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase()
  return normalized ? `Tipe ${normalized}` : '—'
}

export function queueTimeLabel(value: string | null | undefined): string {
  const normalized = value?.trim()
  return normalized ? normalized.slice(0, 5) : '—'
}

export function queueStatusClass(status: RegistrationQueueStatusKey): string {
  return {
    waiting: 'queue-status-waiting',
    called: 'queue-status-called',
    completed: 'queue-status-completed',
    cancelled: 'queue-status-cancelled',
    unknown: 'queue-status-unknown',
  }[status]
}

export function canCallRegistrationQueue(queue: RegistrationQueueItem): boolean {
  return queue.status_key === 'waiting' || queue.status_key === 'called'
}

export function canCancelRegistrationQueue(queue: RegistrationQueueItem): boolean {
  return queue.status_key !== 'completed' && queue.status_key !== 'cancelled'
}
