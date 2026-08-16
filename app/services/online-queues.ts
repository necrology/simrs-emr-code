import type { ApiEnvelope } from '~/types/api'
import type { OnlineQueueItem, OnlineQueueListPayload, OnlineQueueQuery } from '~/types/online-queue'
import { apiRequest } from '~/services/api'

export async function getOnlineQueues(query: OnlineQueueQuery): Promise<ApiEnvelope<OnlineQueueListPayload>> {
  return await apiRequest<OnlineQueueListPayload>('/online-queues', { query })
}

export async function getOnlineQueue(id: number): Promise<ApiEnvelope<OnlineQueueItem>> {
  return await apiRequest<OnlineQueueItem>(`/online-queues/${encodeURIComponent(id)}`)
}
