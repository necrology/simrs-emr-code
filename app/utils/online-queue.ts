import type { OnlineQueueApiState, OnlineQueueItem } from '~/types/online-queue'

export function onlineQueueApiClass(state: OnlineQueueApiState): string {
  if (state === 'success') return 'status-ok'
  if (state === 'warning') return 'status-warning'
  return 'status-muted'
}

export function onlineQueueTaskClass(taskId: number): string {
  if (taskId === 7) return 'status-ok'
  if (taskId === 99) return 'status-danger'
  if (taskId >= 4) return 'status-info'
  return 'status-warning'
}

export function onlineQueueNumberLabel(queue: OnlineQueueItem): string {
  return queue.numbers.display
    ?? queue.numbers.clinic
    ?? queue.numbers.admission
    ?? queue.booking_code
    ?? '—'
}
