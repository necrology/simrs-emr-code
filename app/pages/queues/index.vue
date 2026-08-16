<script setup lang='ts'>
import type {
  RegistrationQueueDetail,
  RegistrationQueueItem,
  RegistrationQueueListPayload,
  RegistrationQueueMeta,
  RegistrationQueueStatusKey,
} from '~/types/queue'
import { errorMessage } from '~/services/api'
import {
  callRegistrationQueue,
  cancelRegistrationQueue,
  getRegistrationQueue,
  getRegistrationQueues,
} from '~/services/queues'
import { formatDate, formatDateTime } from '~/utils/format'
import {
  canCallRegistrationQueue,
  canCancelRegistrationQueue,
  localIsoDate,
  queueSourceLabel,
  queueStatusClass,
  queueTimeLabel,
  queueTypeLabel,
  registrationQueueStatuses,
} from '~/utils/queue'

useHead({ title: 'Antrean Registrasi' })

type FilterStatus = '' | Exclude<RegistrationQueueStatusKey, 'unknown'>
type FeedbackKind = 'success' | 'error'

function emptyPayload(): RegistrationQueueListPayload {
  return {
    items: [],
    summary: { total: 0, waiting: 0, called: 0, completed: 0, cancelled: 0 },
    options: { clinics: [], sources: [], queue_types: [] },
    capabilities: { writes_enabled: false, can_manage: false },
  }
}

function emptyMeta(date: string): RegistrationQueueMeta {
  return {
    current_page: 1,
    from: null,
    last_page: 1,
    per_page: 25,
    to: null,
    total: 0,
    date,
  }
}

const selectedDate = ref(localIsoDate())
const clinicId = ref('')
const selectedStatus = ref<FilterStatus>('')
const selectedSource = ref('')
const selectedQueueType = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const counter = useLocalStorage<number>('registration-queue-counter', 1)

const payload = ref<RegistrationQueueListPayload>(emptyPayload())
const meta = ref<RegistrationQueueMeta>(emptyMeta(selectedDate.value))
const loading = ref(false)
const refreshing = ref(false)
const loadError = ref('')
const lastUpdated = ref<Date | null>(null)
const actionQueueId = ref<number | null>(null)
const feedback = ref('')
const feedbackKind = ref<FeedbackKind>('success')

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<RegistrationQueueDetail | null>(null)

const cancelTarget = ref<RegistrationQueueItem | null>(null)
const cancelReason = ref('')
const cancelError = ref('')

let loadSequence = 0
let refreshTimer: ReturnType<typeof setInterval> | undefined

const canManage = computed(() => payload.value.capabilities.can_manage)
const canWrite = computed(() => canManage.value && payload.value.capabilities.writes_enabled)
const counterValid = computed(() => Number.isInteger(Number(counter.value))
  && Number(counter.value) >= 1
  && Number(counter.value) <= 99)
const lastUpdatedLabel = computed(() => lastUpdated.value
  ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastUpdated.value)
  : 'Belum diperbarui')
const summaryCards = computed(() => [
  { key: '' as FilterStatus, label: 'Total', count: payload.value.summary.total, tone: 'total' },
  { key: 'waiting' as FilterStatus, label: 'Menunggu', count: payload.value.summary.waiting, tone: 'waiting' },
  { key: 'called' as FilterStatus, label: 'Dipanggil', count: payload.value.summary.called, tone: 'called' },
  { key: 'completed' as FilterStatus, label: 'Selesai', count: payload.value.summary.completed, tone: 'completed' },
  { key: 'cancelled' as FilterStatus, label: 'Batal', count: payload.value.summary.cancelled, tone: 'cancelled' },
])

function normalizeMeta(value: unknown): RegistrationQueueMeta {
  const source = (value ?? {}) as Partial<RegistrationQueueMeta>
  return {
    current_page: source.current_page ?? page.value,
    from: source.from ?? null,
    last_page: source.last_page ?? 1,
    per_page: source.per_page ?? perPage.value,
    to: source.to ?? null,
    total: source.total ?? 0,
    date: source.date ?? selectedDate.value,
  }
}

async function load(silent = false): Promise<void> {
  const sequence = ++loadSequence
  if (silent) refreshing.value = true
  else loading.value = true
  loadError.value = ''

  try {
    const response = await getRegistrationQueues({
      date: selectedDate.value,
      clinic_id: clinicId.value ? Number(clinicId.value) : undefined,
      status: selectedStatus.value || undefined,
      source: selectedSource.value || undefined,
      queue_type: selectedQueueType.value || undefined,
      search: search.value.trim() || undefined,
      page: page.value,
      per_page: perPage.value,
    })
    if (sequence !== loadSequence) return
    payload.value = response.data
    meta.value = normalizeMeta(response.meta)
    lastUpdated.value = new Date()
  } catch (cause) {
    if (sequence === loadSequence) loadError.value = errorMessage(cause)
  } finally {
    if (sequence === loadSequence) {
      loading.value = false
      refreshing.value = false
    }
  }
}

function applyFilters(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  selectedDate.value = localIsoDate()
  clinicId.value = ''
  selectedStatus.value = ''
  selectedSource.value = ''
  selectedQueueType.value = ''
  search.value = ''
  page.value = 1
  void load()
}

function selectStatus(status: FilterStatus): void {
  selectedStatus.value = status
  page.value = 1
  void load()
}

function changePage(target: number): void {
  if (target < 1 || target > meta.value.last_page || target === page.value) return
  page.value = target
  void load()
}

async function refreshDetail(): Promise<void> {
  if (!detail.value) return
  const response = await getRegistrationQueue(detail.value.id)
  detail.value = response.data
}

async function refreshOpenDetail(queueId: number): Promise<void> {
  if (!detailOpen.value || detail.value?.id !== queueId) return
  try {
    await refreshDetail()
  } catch (cause) {
    detailError.value = errorMessage(cause)
  }
}

async function openDetail(queue: RegistrationQueueItem): Promise<void> {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    const response = await getRegistrationQueue(queue.id)
    detail.value = response.data
  } catch (cause) {
    detailError.value = errorMessage(cause)
  } finally {
    detailLoading.value = false
  }
}

function closeDetail(): void {
  if (actionQueueId.value !== null) return
  detailOpen.value = false
  detail.value = null
  detailError.value = ''
}

async function performCall(queue: RegistrationQueueItem): Promise<void> {
  if (!canWrite.value || !counterValid.value || !canCallRegistrationQueue(queue)) return
  actionQueueId.value = queue.id
  feedback.value = ''
  try {
    await callRegistrationQueue(queue.id, Number(counter.value))
    feedbackKind.value = 'success'
    feedback.value = `Antrean ${queue.queue_number ?? queue.id} berhasil dipanggil ke loket ${counter.value}.`
    await load(true)
    await refreshOpenDetail(queue.id)
  } catch (cause) {
    feedbackKind.value = 'error'
    feedback.value = errorMessage(cause)
  } finally {
    actionQueueId.value = null
  }
}

function openCancel(queue: RegistrationQueueItem): void {
  if (!canWrite.value || !canCancelRegistrationQueue(queue)) return
  cancelTarget.value = queue
  cancelReason.value = ''
  cancelError.value = ''
}

function closeCancel(): void {
  if (cancelTarget.value && actionQueueId.value === cancelTarget.value.id) return
  cancelTarget.value = null
  cancelReason.value = ''
  cancelError.value = ''
}

async function submitCancel(): Promise<void> {
  const queue = cancelTarget.value
  const reason = cancelReason.value.trim()
  if (!queue) return
  if (reason.length < 5) {
    cancelError.value = 'Alasan pembatalan minimal 5 karakter.'
    return
  }

  actionQueueId.value = queue.id
  cancelError.value = ''
  feedback.value = ''
  try {
    await cancelRegistrationQueue(queue.id, reason)
    feedbackKind.value = 'success'
    feedback.value = `Antrean ${queue.queue_number ?? queue.id} berhasil dibatalkan.`
    cancelTarget.value = null
    cancelReason.value = ''
    cancelError.value = ''
    await load(true)
    await refreshOpenDetail(queue.id)
  } catch (cause) {
    cancelError.value = errorMessage(cause)
  } finally {
    actionQueueId.value = null
  }
}

function dateLabel(value: string | null | undefined): string {
  return value ? formatDate(`${value}T00:00:00`) : '—'
}

function dateTimeLabel(value: string | null | undefined): string {
  return value ? formatDateTime(value.includes('T') ? value : value.replace(' ', 'T')) : '—'
}

function callStatusLabel(status: RegistrationQueueDetail['calls'][number]['status_key']): string {
  return { pending: 'Menunggu audio', processing: 'Diproses', completed: 'Selesai' }[status]
}

onMounted(() => {
  void load()
  refreshTimer = setInterval(() => {
    if (!detailOpen.value && !cancelTarget.value && actionQueueId.value === null) void load(true)
  }, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div>
    <div class='breadcrumb'>Beranda / Antrean Registrasi</div>
    <div class='page-header queue-page-header'>
      <div>
        <h1 class='page-title'>Dashboard antrean registrasi</h1>
        <p class='page-description'>Pantau antrean poli, panggil pasien ke loket, dan telusuri riwayat pemanggilan.</p>
      </div>
      <div class='queue-toolbar'>
        <label v-if='canManage' class='field counter-field' for='queue-counter'>
          <span>Loket aktif</span>
          <input
            id='queue-counter'
            v-model.number='counter'
            class='input counter-input'
            type='number'
            min='1'
            max='99'
            inputmode='numeric'
          >
        </label>
        <button class='button' type='button' :disabled='loading || refreshing' @click='load(true)'>
          {{ refreshing ? 'Memperbarui...' : 'Perbarui' }}
        </button>
        <small class='queue-updated'>Terakhir: {{ lastUpdatedLabel }}</small>
      </div>
    </div>

    <div
      v-if='canManage && !payload.capabilities.writes_enabled'
      class='queue-banner queue-banner-warning'
      role='status'
    >
      Mode baca aktif. Panggilan dan pembatalan baru tersedia setelah LEGACY_WRITES_ENABLED dan LEGACY_QUEUE_WRITES_ENABLED diaktifkan.
    </div>
    <div v-else-if='!canManage' class='queue-banner' role='status'>
      Akun Anda memiliki akses pantau antrean, tetapi tidak memiliki izin pengelolaan registrasi.
    </div>
    <div
      v-if='feedback'
      class='queue-banner'
      :class='feedbackKind === `error` ? `queue-banner-error` : `queue-banner-success`'
      role='status'
      aria-live='polite'
    >
      {{ feedback }}
    </div>
    <div v-if='canManage && !counterValid' class='queue-banner queue-banner-error' role='alert'>
      Nomor loket harus berupa angka 1 sampai 99 sebelum memanggil antrean.
    </div>

    <section class='queue-summary-grid' aria-label='Ringkasan antrean'>
      <button
        v-for='card in summaryCards'
        :key='card.label'
        class='queue-summary-card'
        :class='[`queue-summary-${card.tone}`, { active: selectedStatus === card.key }]'
        type='button'
        @click='selectStatus(card.key)'
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.count.toLocaleString('id-ID') }}</strong>
      </button>
    </section>

    <section class='panel queue-panel'>
      <form class='filters queue-filters' @submit.prevent='applyFilters'>
        <label class='field queue-filter-field' for='queue-date'>
          <span>Tanggal</span>
          <input id='queue-date' v-model='selectedDate' class='input' type='date' required>
        </label>
        <label class='field queue-filter-field queue-filter-clinic' for='queue-clinic'>
          <span>Poli</span>
          <select id='queue-clinic' v-model='clinicId' class='select'>
            <option value=''>Semua poli</option>
            <option v-for='clinic in payload.options.clinics' :key='clinic.id' :value='String(clinic.id)'>
              {{ clinic.code ? `${clinic.code} — ` : '' }}{{ clinic.name }}
            </option>
          </select>
        </label>
        <label class='field queue-filter-field' for='queue-status'>
          <span>Status</span>
          <select id='queue-status' v-model='selectedStatus' class='select'>
            <option value=''>Semua status</option>
            <option v-for='status in registrationQueueStatuses' :key='status.value' :value='status.value'>
              {{ status.label }}
            </option>
          </select>
        </label>
        <label class='field queue-filter-field' for='queue-source'>
          <span>Sumber</span>
          <select id='queue-source' v-model='selectedSource' class='select'>
            <option value=''>Semua sumber</option>
            <option v-for='source in payload.options.sources' :key='source' :value='source'>
              {{ queueSourceLabel(source) }}
            </option>
          </select>
        </label>
        <label class='field queue-filter-field' for='queue-type'>
          <span>Tipe</span>
          <select id='queue-type' v-model='selectedQueueType' class='select'>
            <option value=''>Semua tipe</option>
            <option v-for='type in payload.options.queue_types' :key='type' :value='type'>
              {{ queueTypeLabel(type) }}
            </option>
          </select>
        </label>
        <label class='field queue-filter-search' for='queue-search'>
          <span>Pencarian</span>
          <input
            id='queue-search'
            v-model.trim='search'
            class='input'
            placeholder='No. antrean, RM, pasien, dokter, booking'
          >
        </label>
        <label class='field queue-filter-field queue-filter-page-size' for='queue-page-size'>
          <span>Per halaman</span>
          <select id='queue-page-size' v-model.number='perPage' class='select' @change='applyFilters'>
            <option :value='25'>25</option>
            <option :value='50'>50</option>
            <option :value='100'>100</option>
          </select>
        </label>
        <div class='filter-actions'>
          <button class='button button-primary' type='submit'>Terapkan</button>
          <button class='button' type='button' @click='resetFilters'>Reset</button>
        </div>
      </form>

      <div class='panel-header queue-table-header'>
        <div>
          <strong>{{ meta.total.toLocaleString('id-ID') }} antrean</strong>
          <span>{{ dateLabel(meta.date) }}</span>
        </div>
        <span v-if='refreshing' class='status queue-refresh-status'>Sinkronisasi...</span>
      </div>

      <div v-if='loadError' class='error-state' role='alert'>
        {{ loadError }}
        <button class='button queue-retry' type='button' @click='load()'>Coba lagi</button>
      </div>
      <div v-else-if='loading' class='loading-state' role='status'>Memuat antrean...</div>
      <div v-else-if='payload.items.length === 0' class='empty'>
        Tidak ada antrean yang sesuai dengan tanggal dan filter yang dipilih.
      </div>
      <div v-else class='data-wrap'>
        <table class='data-table queue-table'>
          <thead>
            <tr>
              <th>Antrean</th>
              <th>Pasien</th>
              <th>Poli / Dokter</th>
              <th>Waktu</th>
              <th>Status</th>
              <th>Panggilan</th>
              <th>Booking / BPJS</th>
              <th class='queue-actions-column'>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for='row in payload.items' :key='row.id'>
              <td>
                <button class='queue-number-button' type='button' @click='openDetail(row)'>
                  {{ row.queue_number ?? `#${row.id}` }}
                </button>
                <div class='queue-cell-meta'>
                  <span>{{ queueTypeLabel(row.queue_type) }}</span>
                  <span>{{ queueSourceLabel(row.source) }}</span>
                </div>
              </td>
              <td>
                <NuxtLink
                  v-if='row.patient_id'
                  class='queue-primary-link'
                  :to='`/patients/${row.patient_id}`'
                >
                  {{ row.patient_name ?? 'Nama belum tersedia' }}
                </NuxtLink>
                <strong v-else>{{ row.patient_name ?? 'Pasien belum teridentifikasi' }}</strong>
                <div class='queue-cell-meta'>
                  <span>RM {{ row.medical_record_number ?? '—' }}</span>
                  <span v-if='row.new_patient_national_id'>NIK {{ row.new_patient_national_id }}</span>
                </div>
              </td>
              <td>
                <strong>{{ row.clinic_name ?? row.clinic_code ?? 'Poli belum terpetakan' }}</strong>
                <div class='queue-cell-meta'>
                  <span v-if='row.clinic_code'>{{ row.clinic_code }}</span>
                  <span>{{ row.doctor_name ?? row.doctor_id ?? 'Dokter belum terpetakan' }}</span>
                </div>
              </td>
              <td>
                <strong>{{ queueTimeLabel(row.queue_time) }}</strong>
                <div class='queue-cell-meta'>
                  <span v-if='row.called_at'>Dipanggil {{ dateTimeLabel(row.called_at) }}</span>
                  <span v-else>Belum dipanggil</span>
                </div>
              </td>
              <td>
                <span class='status queue-status' :class='queueStatusClass(row.status_key)'>{{ row.status_label }}</span>
                <div class='queue-cell-meta'><span>Kode {{ row.status_code }}</span></div>
              </td>
              <td>
                <strong>{{ row.counter ? `Loket ${row.counter}` : 'Belum ada loket' }}</strong>
                <div class='queue-cell-meta'>
                  <span>{{ row.call_count }} kali panggil</span>
                  <span v-if='row.has_pending_call' class='queue-pending-call'>Audio menunggu</span>
                </div>
              </td>
              <td>
                <strong>{{ row.booking_code ?? row.booking?.number ?? '—' }}</strong>
                <div class='queue-cell-meta'>
                  <span v-if='row.bpjs'>BPJS Task {{ row.bpjs.task_id ?? '—' }}</span>
                  <span v-else-if='row.booking'>Booking {{ queueSourceLabel(row.booking.source) }}</span>
                  <span v-else>Non-booking</span>
                </div>
              </td>
              <td class='queue-actions-column'>
                <div class='queue-row-actions'>
                  <button class='button button-small' type='button' @click='openDetail(row)'>Detail</button>
                  <button
                    class='button button-primary button-small'
                    type='button'
                    :disabled='!canWrite || !counterValid || !canCallRegistrationQueue(row) || actionQueueId !== null'
                    @click='performCall(row)'
                  >
                    {{ actionQueueId === row.id ? 'Memproses...' : row.status_key === 'called' ? 'Panggil ulang' : 'Panggil' }}
                  </button>
                  <button
                    class='button button-danger button-small'
                    type='button'
                    :disabled='!canWrite || !canCancelRegistrationQueue(row) || actionQueueId !== null'
                    @click='openCancel(row)'
                  >
                    Batal
                  </button>
                  <NuxtLink
                    v-if='row.registration_id'
                    class='button button-small'
                    :to='`/encounters/${row.registration_id}`'
                  >
                    Encounter
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class='pagination'>
        <span>Menampilkan {{ meta.from ?? 0 }}–{{ meta.to ?? 0 }} dari {{ meta.total.toLocaleString('id-ID') }}</span>
        <div class='pagination-actions'>
          <button class='button' type='button' :disabled='meta.current_page <= 1 || loading' @click='changePage(meta.current_page - 1)'>
            Sebelumnya
          </button>
          <span class='button'>{{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class='button' type='button' :disabled='meta.current_page >= meta.last_page || loading' @click='changePage(meta.current_page + 1)'>
            Berikutnya
          </button>
        </div>
      </div>
    </section>

    <Teleport to='body'>
      <div v-if='detailOpen' class='dialog-backdrop queue-dialog-backdrop' @click.self='closeDetail'>
        <section
          class='queue-detail-dialog'
          role='dialog'
          aria-modal='true'
          aria-labelledby='queue-detail-title'
        >
          <div class='panel-header queue-dialog-header'>
            <div>
              <strong id='queue-detail-title'>Detail antrean registrasi</strong>
              <span v-if='detail'>{{ detail.queue_number ?? `#${detail.id}` }} · {{ dateLabel(detail.queue_date) }}</span>
            </div>
            <button class='button' type='button' :disabled='actionQueueId !== null' @click='closeDetail'>Tutup</button>
          </div>

          <div v-if='detailLoading' class='loading-state' role='status'>Memuat detail antrean...</div>
          <div v-else-if='detailError' class='error-state' role='alert'>{{ detailError }}</div>
          <div v-else-if='detail' class='queue-detail-body'>
            <div class='queue-detail-lead'>
              <div>
                <span class='queue-detail-number'>{{ detail.queue_number ?? `#${detail.id}` }}</span>
                <span>{{ queueTypeLabel(detail.queue_type) }} · {{ queueSourceLabel(detail.source) }}</span>
              </div>
              <span class='status queue-status' :class='queueStatusClass(detail.status_key)'>{{ detail.status_label }}</span>
            </div>

            <div class='queue-detail-grid'>
              <section class='queue-detail-card'>
                <h3>Pasien</h3>
                <dl class='detail-list queue-detail-list'>
                  <dt>Nama</dt>
                  <dd>{{ detail.patient_name ?? detail.booking?.patient_name ?? 'Belum teridentifikasi' }}</dd>
                  <dt>No. rekam medis</dt>
                  <dd>{{ detail.medical_record_number ?? '—' }}</dd>
                  <dt>NIK pasien baru</dt>
                  <dd>{{ detail.new_patient_national_id ?? '—' }}</dd>
                  <dt>Registrasi</dt>
                  <dd>
                    <NuxtLink
                      v-if='detail.registration_id'
                      class='queue-primary-link'
                      :to='`/encounters/${detail.registration_id}`'
                    >
                      Encounter #{{ detail.registration_id }}
                    </NuxtLink>
                    <span v-else>Belum registrasi</span>
                  </dd>
                </dl>
              </section>

              <section class='queue-detail-card'>
                <h3>Pelayanan</h3>
                <dl class='detail-list queue-detail-list'>
                  <dt>Poli</dt>
                  <dd>{{ detail.clinic_name ?? detail.clinic_code ?? '—' }}</dd>
                  <dt>Dokter</dt>
                  <dd>{{ detail.doctor_name ?? detail.doctor_id ?? '—' }}</dd>
                  <dt>Waktu antrean</dt>
                  <dd>{{ dateLabel(detail.queue_date) }} · {{ queueTimeLabel(detail.queue_time) }}</dd>
                  <dt>Urutan / waiting list</dt>
                  <dd>{{ detail.sequence_number ?? '—' }} / {{ detail.waiting_list ?? '—' }}</dd>
                </dl>
              </section>

              <section class='queue-detail-card'>
                <h3>Pemanggilan terakhir</h3>
                <dl class='detail-list queue-detail-list'>
                  <dt>Loket</dt>
                  <dd>{{ detail.counter ? `Loket ${detail.counter}` : 'Belum dipanggil' }}</dd>
                  <dt>Petugas</dt>
                  <dd>{{ detail.called_by ?? '—' }}</dd>
                  <dt>Waktu</dt>
                  <dd>{{ dateTimeLabel(detail.called_at) }}</dd>
                  <dt>Jumlah panggil</dt>
                  <dd>{{ detail.call_count }} kali</dd>
                </dl>
              </section>

              <section v-if='detail.booking' class='queue-detail-card'>
                <h3>Booking</h3>
                <dl class='detail-list queue-detail-list'>
                  <dt>Nomor</dt>
                  <dd>{{ detail.booking.number ?? detail.booking_code ?? '—' }}</dd>
                  <dt>Sumber</dt>
                  <dd>{{ queueSourceLabel(detail.booking.source) }}</dd>
                  <dt>Nama / telepon</dt>
                  <dd>{{ detail.booking.patient_name ?? '—' }} / {{ detail.booking.phone ?? '—' }}</dd>
                  <dt>Verifikasi</dt>
                  <dd>{{ detail.booking.verified_code ?? '—' }} · {{ detail.booking.verified_at ?? '—' }}</dd>
                </dl>
              </section>

              <section v-if='detail.bpjs' class='queue-detail-card'>
                <h3>Antrean BPJS</h3>
                <dl class='detail-list queue-detail-list'>
                  <dt>Kode booking</dt>
                  <dd>{{ detail.booking_code ?? '—' }}</dd>
                  <dt>Task ID</dt>
                  <dd>{{ detail.bpjs.task_id ?? '—' }}</dd>
                  <dt>Status API</dt>
                  <dd>{{ detail.bpjs.api_status ?? detail.bpjs.status ?? '—' }}</dd>
                  <dt>Admisi / Poli / Farmasi</dt>
                  <dd>{{ detail.bpjs.admission_queue ?? '—' }} / {{ detail.bpjs.clinic_queue ?? '—' }} / {{ detail.bpjs.pharmacy_queue ?? '—' }}</dd>
                </dl>
              </section>
            </div>

            <section class='queue-call-history'>
              <div class='queue-section-heading'>
                <h3>Riwayat panggilan</h3>
                <span>{{ detail.calls.length }} catatan</span>
              </div>
              <div v-if='detail.calls.length === 0' class='empty queue-history-empty'>Belum ada riwayat pemanggilan.</div>
              <div v-else class='data-wrap'>
                <table class='data-table'>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Loket</th>
                      <th>Petugas</th>
                      <th>Status audio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for='call in detail.calls' :key='call.id'>
                      <td>{{ dateTimeLabel(call.called_at) }}</td>
                      <td>{{ call.counter ? `Loket ${call.counter}` : '—' }}</td>
                      <td>{{ call.called_by ?? '—' }}</td>
                      <td>
                        <span class='status' :class='call.status_key === `pending` ? `status-warning` : `status-ok`'>
                          {{ callStatusLabel(call.status_key) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div class='queue-dialog-actions'>
              <button
                class='button button-primary'
                type='button'
                :disabled='!canWrite || !counterValid || !canCallRegistrationQueue(detail) || actionQueueId !== null'
                @click='performCall(detail)'
              >
                {{ actionQueueId === detail.id ? 'Memproses...' : detail.status_key === 'called' ? 'Panggil ulang' : 'Panggil' }}
              </button>
              <button
                class='button button-danger'
                type='button'
                :disabled='!canWrite || !canCancelRegistrationQueue(detail) || actionQueueId !== null'
                @click='openCancel(detail)'
              >
                Batalkan antrean
              </button>
            </div>
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to='body'>
      <div v-if='cancelTarget' class='dialog-backdrop queue-cancel-backdrop' @click.self='closeCancel'>
        <section
          class='confirm-dialog queue-cancel-dialog'
          role='alertdialog'
          aria-modal='true'
          aria-labelledby='queue-cancel-title'
          aria-describedby='queue-cancel-description'
        >
          <div class='panel-header'>
            <strong id='queue-cancel-title'>Batalkan antrean {{ cancelTarget.queue_number ?? `#${cancelTarget.id}` }}</strong>
          </div>
          <form class='panel-body queue-cancel-form' @submit.prevent='submitCancel'>
            <p id='queue-cancel-description' class='confirm-dialog-message'>
              Pembatalan mengubah status legacy menjadi 99 dan menutup panggilan audio yang masih tertunda. Alasan disimpan pada audit log.
            </p>
            <label class='field' for='queue-cancel-reason'>
              <span>Alasan pembatalan</span>
              <textarea
                id='queue-cancel-reason'
                v-model='cancelReason'
                class='input textarea'
                minlength='5'
                maxlength='500'
                required
                placeholder='Tuliskan alasan operasional yang dapat diaudit'
              />
            </label>
            <div class='queue-reason-meta'>{{ cancelReason.trim().length }} / 500 karakter</div>
            <div v-if='cancelError' class='inline-error' role='alert'>{{ cancelError }}</div>
            <div class='form-actions'>
              <button class='button' type='button' :disabled='actionQueueId === cancelTarget.id' @click='closeCancel'>Kembali</button>
              <button class='button button-danger' type='submit' :disabled='actionQueueId === cancelTarget.id'>
                {{ actionQueueId === cancelTarget.id ? 'Membatalkan...' : 'Konfirmasi pembatalan' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.queue-page-header { align-items: center; }
.queue-toolbar { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: flex-end; gap: 8px; }
.counter-field { gap: 4px; }
.counter-field > span, .queue-filter-field > span, .queue-filter-search > span { color: #45545b; font-size: 11px; font-weight: 700; }
.counter-input { width: 82px; }
.queue-updated { align-self: center; color: var(--text-muted); white-space: nowrap; }
.queue-banner { margin-bottom: 14px; padding: 10px 12px; border: 1px solid #bfd5ce; border-radius: 6px; background: #f0f8f5; color: #285849; }
.queue-banner-warning { border-color: #e2c98f; background: #fff8e8; color: #74540d; }
.queue-banner-error { border-color: #e1bbbb; background: #fff6f6; color: var(--danger); }
.queue-banner-success { border-color: #a9d2c5; background: #edf8f4; color: #176147; }
.queue-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
.queue-summary-card { display: grid; gap: 5px; padding: 13px 14px; border: 1px solid var(--line); border-left-width: 4px; border-radius: 6px; background: var(--surface); color: var(--text); text-align: left; cursor: pointer; }
.queue-summary-card span { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.queue-summary-card strong { font-size: 24px; line-height: 1; }
.queue-summary-card:hover, .queue-summary-card.active { border-color: #78a99c; box-shadow: 0 2px 8px rgb(24 70 58 / 10%); }
.queue-summary-total { border-left-color: #668088; }
.queue-summary-waiting { border-left-color: #d39a22; }
.queue-summary-called { border-left-color: #2478a6; }
.queue-summary-completed { border-left-color: #24825d; }
.queue-summary-cancelled { border-left-color: #b54c4c; }
.queue-panel { overflow: hidden; }
.queue-filters { align-items: flex-end; }
.queue-filter-field { min-width: 132px; }
.queue-filter-field .input, .queue-filter-field .select, .queue-filter-search .input { width: 100%; }
.queue-filter-clinic { min-width: 230px; }
.queue-filter-search { min-width: 260px; flex: 1 1 300px; }
.queue-filter-page-size { min-width: 100px; }
.filter-actions { display: flex; gap: 8px; }
.queue-table-header > div { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.queue-table-header span { color: var(--text-muted); font-size: 12px; }
.queue-refresh-status { color: #176147 !important; }
.queue-retry { margin-left: 10px; }
.queue-table td { min-width: 110px; }
.queue-table td:nth-child(2), .queue-table td:nth-child(3) { min-width: 190px; }
.queue-number-button { padding: 0; border: 0; background: transparent; color: var(--brand); cursor: pointer; font-size: 17px; font-weight: 800; }
.queue-number-button:hover, .queue-primary-link:hover { text-decoration: underline; }
.queue-primary-link { color: var(--brand); font-weight: 700; }
.queue-cell-meta { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; color: var(--text-muted); font-size: 11px; }
.queue-status { white-space: nowrap; }
.queue-status-waiting { background: #fff1d7; color: #76520b; }
.queue-status-called { background: #e0eef7; color: #185a7d; }
.queue-status-completed { background: #e0f2ea; color: #176147; }
.queue-status-cancelled { background: #f7e4e4; color: #8b3131; }
.queue-status-unknown { background: #e8edee; color: #405056; }
.queue-pending-call { color: #8b5d00; font-weight: 700; }
.queue-actions-column { width: 1%; min-width: 190px !important; }
.queue-row-actions { display: flex; flex-wrap: wrap; gap: 5px; }
.button-small { min-height: 29px; padding: 4px 8px; font-size: 11px; }
.queue-dialog-backdrop { z-index: 120; align-items: start; overflow-y: auto; }
.queue-detail-dialog { width: min(1120px, 100%); max-height: calc(100vh - 40px); overflow: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); box-shadow: 0 20px 60px rgb(9 24 20 / 28%); }
.queue-dialog-header { position: sticky; z-index: 2; top: 0; background: var(--surface); }
.queue-dialog-header > div { display: grid; gap: 2px; }
.queue-dialog-header span { color: var(--text-muted); font-size: 11px; }
.queue-detail-body { padding: 14px; }
.queue-detail-lead { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding: 12px 14px; border: 1px solid #cfe0db; border-radius: 6px; background: #f4faf8; }
.queue-detail-lead > div { display: flex; align-items: baseline; gap: 10px; color: var(--text-muted); }
.queue-detail-number { color: var(--brand); font-size: 24px; font-weight: 800; }
.queue-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.queue-detail-card { min-width: 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: 6px; }
.queue-detail-card h3, .queue-call-history h3 { margin: 0 0 8px; font-size: 14px; }
.queue-detail-list { grid-template-columns: 135px minmax(0, 1fr); font-size: 12px; }
.queue-detail-list dt, .queue-detail-list dd { overflow-wrap: anywhere; }
.queue-call-history { margin-top: 14px; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.queue-section-heading { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--line); background: #fafbfb; }
.queue-section-heading h3 { margin: 0; }
.queue-section-heading span { color: var(--text-muted); font-size: 11px; }
.queue-history-empty { padding: 24px; }
.queue-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.queue-cancel-backdrop { z-index: 140; }
.queue-cancel-dialog { width: min(560px, 100%); }
.queue-cancel-form { display: grid; gap: 12px; }
.queue-cancel-form .textarea { width: 100%; min-height: 110px; }
.queue-reason-meta { margin-top: -8px; color: var(--text-muted); font-size: 11px; text-align: right; }
.queue-cancel-form .inline-error { margin-bottom: 0; }

@media (max-width: 1100px) {
  .queue-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .queue-page-header { align-items: stretch; flex-direction: column; }
  .queue-toolbar { justify-content: flex-start; }
  .queue-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .queue-filter-field, .queue-filter-clinic, .queue-filter-search { width: 100%; min-width: 0; }
  .filter-actions, .filter-actions .button { width: 100%; }
  .queue-detail-grid { grid-template-columns: 1fr; }
  .queue-detail-lead { align-items: flex-start; flex-direction: column; }
  .queue-detail-lead > div { align-items: flex-start; flex-direction: column; gap: 2px; }
  .queue-detail-list { grid-template-columns: 110px minmax(0, 1fr); }
  .queue-dialog-actions { align-items: stretch; flex-direction: column; }
}
</style>
