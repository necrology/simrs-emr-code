<script setup lang="ts">
import type { PaginationMeta } from '~/types/api'
import type {
  OnlineQueueApiState,
  OnlineQueueItem,
  OnlineQueueListPayload,
  OnlineQueueMeta,
} from '~/types/online-queue'
import { errorMessage } from '~/services/api'
import { getOnlineQueue, getOnlineQueues } from '~/services/online-queues'
import { formatDateTime } from '~/utils/format'
import { localIsoDate } from '~/utils/queue'
import { onlineQueueApiClass, onlineQueueNumberLabel, onlineQueueTaskClass } from '~/utils/online-queue'

useHead({ title: 'Antrean Online BPJS' })

const selectedDate = ref(localIsoDate())
const selectedClinic = ref('')
const selectedDoctor = ref('')
const selectedTask = ref('')
const selectedPatientType = ref('')
const selectedApiState = ref<'' | OnlineQueueApiState>('')
const selectedCheckin = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(25)
const loading = ref(false)
const refreshing = ref(false)
const loadError = ref('')
const lastUpdated = ref<Date | null>(null)
const payload = ref<OnlineQueueListPayload>({
  items: [],
  summary: { total: 0, booked: 0, admission: 0, clinic_wait: 0, clinic_service: 0, pharmacy: 0, completed: 0, cancelled: 0, checked_in: 0, api_warning: 0 },
  options: { clinics: [], doctors: [], patient_types: [], tasks: [], api_states: [] },
  capabilities: { read_only: true, writes_enabled: false, external_bpjs_calls_enabled: false },
})
const meta = ref<OnlineQueueMeta>({ current_page: 1, from: null, last_page: 1, per_page: 25, to: null, total: 0, date: selectedDate.value })
const detail = ref<OnlineQueueItem | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
let loadSequence = 0
let refreshTimer: ReturnType<typeof setInterval> | undefined

const summaryCards = computed(() => [
  { label: 'Total', value: payload.value.summary.total, icon: 'lucide:list-checks' },
  { label: 'Booking', value: payload.value.summary.booked, icon: 'lucide:calendar-check' },
  { label: 'Tunggu poli', value: payload.value.summary.clinic_wait, icon: 'lucide:clock-3' },
  { label: 'Pelayanan', value: payload.value.summary.clinic_service, icon: 'lucide:stethoscope' },
  { label: 'Selesai', value: payload.value.summary.completed, icon: 'lucide:circle-check' },
  { label: 'Peringatan API', value: payload.value.summary.api_warning, icon: 'lucide:triangle-alert' },
])
const lastUpdatedLabel = computed(() => lastUpdated.value
  ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastUpdated.value)
  : 'Belum diperbarui')

function normalizeMeta(value: PaginationMeta | Record<string, unknown> | null): OnlineQueueMeta {
  const source = (value ?? {}) as Partial<OnlineQueueMeta>
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
    const response = await getOnlineQueues({
      date: selectedDate.value,
      clinic_code: selectedClinic.value || undefined,
      doctor_code: selectedDoctor.value || undefined,
      task_id: selectedTask.value === '' ? undefined : Number(selectedTask.value),
      patient_type: selectedPatientType.value || undefined,
      api_state: selectedApiState.value || undefined,
      checkin_state: selectedCheckin.value === 'checked_in' || selectedCheckin.value === 'pending' ? selectedCheckin.value : undefined,
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
  selectedClinic.value = ''
  selectedDoctor.value = ''
  selectedTask.value = ''
  selectedPatientType.value = ''
  selectedApiState.value = ''
  selectedCheckin.value = ''
  search.value = ''
  applyFilters()
}

function changePage(nextPage: number): void {
  if (nextPage < 1 || nextPage > meta.value.last_page) return
  page.value = nextPage
  void load()
}

async function openDetail(queueId: number): Promise<void> {
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    detail.value = (await getOnlineQueue(queueId)).data
  } catch (cause) {
    detailError.value = errorMessage(cause)
  } finally {
    detailLoading.value = false
  }
}

watch(selectedClinic, () => { selectedDoctor.value = '' })
onMounted(() => {
  void load()
  refreshTimer = setInterval(() => void load(true), 30_000)
})
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<template>
  <div>
    <div class="breadcrumb">Beranda / SIMRS / Antrean Online</div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Antrean Online BPJS & APM</h1>
        <p class="page-description">Monitoring read-only dari rs_reg_antrian_bpjs. Registrasi, SEP, check-in, dan update BPJS tetap dinonaktifkan.</p>
      </div>
      <div class="refresh-state"><Icon :name="refreshing ? 'lucide:loader-circle' : 'lucide:refresh-cw'" :class="{ spinning: refreshing }" /> {{ lastUpdatedLabel }}</div>
    </div>

    <div class="safety-banner">
      <Icon name="lucide:shield-alert" aria-hidden="true" />
      <span>Modul ini tidak melakukan write ke database maupun request ke layanan BPJS.</span>
    </div>

    <div class="queue-metric-grid">
      <article v-for="card in summaryCards" :key="card.label" class="queue-metric-card">
        <Icon :name="card.icon" aria-hidden="true" />
        <div><span>{{ card.label }}</span><strong>{{ card.value.toLocaleString('id-ID') }}</strong></div>
      </article>
    </div>

    <section class="panel">
      <form class="filters online-queue-filters" @submit.prevent="applyFilters">
        <input v-model="selectedDate" class="input" type="date" aria-label="Tanggal periksa">
        <select v-model="selectedClinic" class="select" aria-label="Poliklinik">
          <option value="">Semua poli</option>
          <option v-for="clinic in payload.options.clinics" :key="clinic.code" :value="clinic.code">{{ clinic.name }}</option>
        </select>
        <select v-model="selectedDoctor" class="select" aria-label="Dokter">
          <option value="">Semua dokter</option>
          <option v-for="doctor in payload.options.doctors" :key="doctor.code" :value="doctor.code">{{ doctor.name }}</option>
        </select>
        <select v-model="selectedTask" class="select" aria-label="Task BPJS">
          <option value="">Semua task</option>
          <option v-for="task in payload.options.tasks" :key="task.id" :value="String(task.id)">Task {{ task.id }} ? {{ task.label }}</option>
        </select>
        <select v-model="selectedPatientType" class="select" aria-label="Jenis pasien">
          <option value="">Semua jenis pasien</option>
          <option v-for="patientType in payload.options.patient_types" :key="patientType" :value="patientType">{{ patientType }}</option>
        </select>
        <select v-model="selectedApiState" class="select" aria-label="Status API">
          <option value="">Semua status API</option>
          <option v-for="state in payload.options.api_states" :key="state.key" :value="state.key">{{ state.label }}</option>
        </select>
        <select v-model="selectedCheckin" class="select" aria-label="Status check-in">
          <option value="">Semua check-in</option>
          <option value="checked_in">Sudah check-in</option>
          <option value="pending">Belum check-in</option>
        </select>
        <input v-model="search" class="input online-queue-search" type="search" placeholder="Booking, RM, pasien, kartu, SEP">
        <button class="button button-primary" type="submit"><Icon name="lucide:search" /> Terapkan</button>
        <button class="button" type="button" @click="resetFilters">Reset</button>
      </form>
      <div v-if="loading" class="loading-state">Memuat antrean online?</div>
      <div v-else-if="loadError" class="error-state" role="alert">{{ loadError }}</div>
      <div v-else-if="payload.items.length === 0" class="empty">Tidak ada antrean online yang sesuai dengan filter.</div>
      <div v-else class="data-wrap">
        <table class="data-table online-queue-table">
          <thead><tr><th>Antrean</th><th>Pasien</th><th>Poli & Dokter</th><th>Task BPJS</th><th>Check-in</th><th>Status API</th><th>Aksi</th></tr></thead>
          <tbody>
            <tr v-for="queue in payload.items" :key="queue.id">
              <td>
                <strong class="queue-number">{{ onlineQueueNumberLabel(queue) }}</strong>
                <code>{{ queue.booking_code ?? '?' }}</code>
                <small>{{ queue.visit.estimated_service_at ? `Estimasi ${formatDateTime(queue.visit.estimated_service_at)}` : 'Tanpa estimasi' }}</small>
              </td>
              <td>
                <strong>{{ queue.patient.name ?? '?' }}</strong>
                <span>RM {{ queue.patient.medical_record_number ?? '?' }} ? {{ queue.patient.type ?? '?' }}</span>
                <small>Kartu {{ queue.patient.insurance_number ?? '?' }}</small>
              </td>
              <td>
                <strong>{{ queue.clinic.name ?? queue.clinic.code ?? '?' }}</strong>
                <span>{{ queue.doctor.name ?? queue.doctor.code ?? '?' }}</span>
                <small>{{ queue.doctor.schedule ?? 'Jadwal tidak tersedia' }}</small>
              </td>
              <td><span class="status" :class="onlineQueueTaskClass(queue.task.id)">Task {{ queue.task.id }} ? {{ queue.task.label }}</span></td>
              <td>
                <span class="status" :class="queue.checkin.checked_in ? 'status-ok' : 'status-muted'">{{ queue.checkin.checked_in ? 'Sudah check-in' : 'Belum check-in' }}</span>
                <small v-if="queue.checkin.at">{{ formatDateTime(queue.checkin.at) }}</small>
              </td>
              <td>
                <span class="status" :class="onlineQueueApiClass(queue.api.state)">{{ queue.api.label }}</span>
                <small class="api-message">{{ queue.api.message ?? 'Belum ada respons API.' }}</small>
              </td>
              <td class="record-actions-column"><button class="button" type="button" @click="openDetail(queue.id)">Detail</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span>Menampilkan {{ meta.from ?? 0 }}?{{ meta.to ?? 0 }} dari {{ meta.total.toLocaleString('id-ID') }}</span>
        <div class="pagination-actions">
          <button class="button" type="button" :disabled="meta.current_page <= 1" @click="changePage(meta.current_page - 1)">Sebelumnya</button>
          <span class="button">{{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class="button" type="button" :disabled="meta.current_page >= meta.last_page" @click="changePage(meta.current_page + 1)">Berikutnya</button>
        </div>
      </div>
    </section>
    <div v-if="detailLoading || detailError || detail" class="dialog-backdrop" role="presentation" @click.self="detail = null; detailError = ''">
      <section class="queue-detail-dialog" role="dialog" aria-modal="true" aria-label="Detail antrean online">
        <div class="panel-header">
          <div><strong>Detail Antrean Online</strong><small v-if="detail">{{ detail.booking_code }}</small></div>
          <button class="button" type="button" @click="detail = null; detailError = ''"><Icon name="lucide:x" /> Tutup</button>
        </div>
        <div v-if="detailLoading" class="loading-state">Memuat detail?</div>
        <div v-else-if="detailError" class="error-state">{{ detailError }}</div>
        <div v-else-if="detail" class="panel-body queue-detail-body">
          <div class="grid-2">
            <dl class="detail-list">
              <dt>Pasien</dt><dd>{{ detail.patient.name ?? '?' }}</dd>
              <dt>No. RM</dt><dd>{{ detail.patient.medical_record_number ?? '?' }}</dd>
              <dt>No. kartu</dt><dd>{{ detail.patient.insurance_number ?? '?' }}</dd>
              <dt>Poli</dt><dd>{{ detail.clinic.name ?? detail.clinic.code ?? '?' }}</dd>
              <dt>Dokter</dt><dd>{{ detail.doctor.name ?? detail.doctor.code ?? '?' }}</dd>
            </dl>
            <dl class="detail-list">
              <dt>Antrean admisi</dt><dd>{{ detail.numbers.admission ?? '?' }}</dd>
              <dt>Antrean poli</dt><dd>{{ detail.numbers.clinic ?? '?' }}</dd>
              <dt>Antrean farmasi</dt><dd>{{ detail.numbers.pharmacy ?? '?' }}</dd>
              <dt>Referensi</dt><dd>{{ detail.visit.reference_number ?? '?' }}</dd>
              <dt>No. SEP</dt><dd>{{ detail.visit.sep_number ?? '?' }}</dd>
            </dl>
          </div>

          <div class="queue-detail-section">
            <strong>Timeline Task BPJS</strong>
            <ol class="task-timeline">
              <li v-for="step in detail.timeline" :key="step.task_id" :class="`timeline-${step.state}`">
                <span class="timeline-marker">{{ step.task_id }}</span>
                <div><strong>{{ step.label }}</strong><small>{{ step.at ? formatDateTime(step.at) : step.state === 'current' ? 'Task aktif' : 'Belum tercatat' }}</small></div>
              </li>
            </ol>
          </div>

          <div class="grid-2">
            <div class="queue-detail-section">
              <strong>Kuota</strong>
              <p>JKN: {{ detail.quota.jkn_remaining ?? '?' }} tersisa dari {{ detail.quota.jkn_total ?? '?' }}</p>
              <p>Non-JKN: {{ detail.quota.non_jkn_remaining ?? '?' }} tersisa dari {{ detail.quota.non_jkn_total ?? '?' }}</p>
            </div>
            <div class="queue-detail-section">
              <strong>Status Integrasi</strong>
              <p><span class="status" :class="onlineQueueApiClass(detail.api.state)">{{ detail.api.label }}</span></p>
              <p>{{ detail.api.message ?? 'Belum ada respons API.' }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
