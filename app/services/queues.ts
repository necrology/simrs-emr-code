import type { ApiEnvelope } from '~/types/api'
import type {
  RegistrationQueueDetail,
  RegistrationQueueItem,
  RegistrationQueueListPayload,
  RegistrationQueueQuery,
} from '~/types/queue'
import { apiRequest } from '~/services/api'

export async function getRegistrationQueues(query: RegistrationQueueQuery): Promise<ApiEnvelope<RegistrationQueueListPayload>> {
  return await apiRequest<RegistrationQueueListPayload>('/queues', { query })
}

export async function getRegistrationQueue(id: number): Promise<ApiEnvelope<RegistrationQueueDetail>> {
  return await apiRequest<RegistrationQueueDetail>(`/queues/${encodeURIComponent(id)}`)
}

export async function callRegistrationQueue(id: number, counter: number): Promise<ApiEnvelope<RegistrationQueueItem>> {
  return await apiRequest<RegistrationQueueItem>(`/queues/${encodeURIComponent(id)}/call`, {
    method: 'POST',
    body: { counter },
  })
}

export async function cancelRegistrationQueue(id: number, reason: string): Promise<ApiEnvelope<RegistrationQueueItem>> {
  return await apiRequest<RegistrationQueueItem>(`/queues/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { reason },
  })
}
