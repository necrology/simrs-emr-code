import type { ApiEnvelope } from '~/types/api'

export async function apiRequest<T>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<ApiEnvelope<T>> {
  return await $fetch<ApiEnvelope<T>>(`/api/backend/v1${path}`, options)
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: unknown } }).data
    if (typeof data?.message === 'string') return data.message
  }
  return 'Layanan tidak dapat dihubungi. Silakan coba kembali.'
}
