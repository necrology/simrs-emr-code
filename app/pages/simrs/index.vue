<script setup lang=ts>
import type { PaginationMeta } from '~/types/api'
import type { SimrsMigrationStatus, SimrsModuleItem, SimrsModuleListPayload, SimrsModuleMeta } from '~/types/simrs'
import { errorMessage } from '~/services/api'
import { getSimrsModules } from '~/services/simrs'
import { resolveSimrsIcon, simrsMigrationClass, simrsMigrationLabel } from '~/utils/simrs'

useHead({ title: 'Katalog Modul SIMRS' })
type StatusFilter = '' | SimrsMigrationStatus

const route = useRoute()
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const selectedGroup = ref(typeof route.query.group === 'string' ? route.query.group : '')
const selectedStatus = ref<StatusFilter>(['integrated', 'read_only', 'planned'].includes(String(route.query.status)) ? route.query.status as SimrsMigrationStatus : '')
const page = ref(1)
const loading = ref(false)
const loadError = ref('')
const payload = ref<SimrsModuleListPayload>({
  items: [], summary: { total: 0, integrated: 0, read_only: 0, planned: 0 }, groups: [], navigation: [],
  diagnostics: { invalid_privilege_records: 0, invalid_module_records: 0, active_module_records: 0 },
})
const meta = ref<SimrsModuleMeta>({ current_page: 1, from: null, last_page: 1, per_page: 25, to: null, total: 0 })
let loadSequence = 0

const summaryCards = computed(() => [
  { label: 'Modul diizinkan', value: payload.value.summary.total, status: '' as StatusFilter },
  { label: 'Terintegrasi', value: payload.value.summary.integrated, status: 'integrated' as StatusFilter },
  { label: 'Baca saja', value: payload.value.summary.read_only, status: 'read_only' as StatusFilter },
  { label: 'Dalam migrasi', value: payload.value.summary.planned, status: 'planned' as StatusFilter },
])
const hasDiagnostics = computed(() => payload.value.diagnostics.invalid_module_records > 0 || payload.value.diagnostics.invalid_privilege_records > 0)

function normalizeMeta(value: PaginationMeta | Record<string, unknown> | null): SimrsModuleMeta {
  const source = (value ?? {}) as Partial<SimrsModuleMeta>
  return { current_page: source.current_page ?? page.value, from: source.from ?? null, last_page: source.last_page ?? 1, per_page: source.per_page ?? 25, to: source.to ?? null, total: source.total ?? 0 }
}

async function load(): Promise<void> {
  const sequence = ++loadSequence
  loading.value = true
  loadError.value = ''
  try {
    const response = await getSimrsModules({
      search: search.value.trim() || undefined,
      group: selectedGroup.value || undefined,
      status: selectedStatus.value || undefined,
      page: page.value,
      per_page: 25,
    })
    if (sequence !== loadSequence) return
    payload.value = response.data
    meta.value = normalizeMeta(response.meta)
  } catch (cause) {
    if (sequence === loadSequence) loadError.value = errorMessage(cause)
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

function applyFilters(status?: StatusFilter): void {
  if (status !== undefined) selectedStatus.value = status
  page.value = 1
  void load()
}

function resetFilters(): void {
  search.value = ''
  selectedGroup.value = ''
  selectedStatus.value = ''
  applyFilters()
}

function changePage(nextPage: number): void {
  if (nextPage < 1 || nextPage > meta.value.last_page) return
  page.value = nextPage
  void load()
}

function capabilityLabels(module: SimrsModuleItem): string[] {
  return [module.capabilities.view && 'Lihat', module.capabilities.add && 'Tambah', module.capabilities.edit && 'Ubah', module.capabilities.delete && 'Hapus', module.capabilities.print && 'Cetak']
    .filter((label): label is string => Boolean(label))
}

onMounted(() => void load())
</script>

<template>
  <div>
    <div class="breadcrumb">Beranda / SIMRS / Katalog Modul</div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Katalog Modul SIMRS</h1>
        <p class="page-description">Inventaris ExtJS yang dibatasi berdasarkan gabungan privilege grup pengguna aktif.</p>
      </div>
      <span class="status status-info">Sumber: simrs_modules</span>
    </div>
    <div class="schema-cards">
      <button v-for="card in summaryCards" :key="card.label" type="button" class="schema-card catalog-summary-card" @click="applyFilters(card.status)">
        <span>{{ card.label }}</span>
        <strong>{{ card.value.toLocaleString('id-ID') }}</strong>
      </button>
    </div>
    <div v-if="hasDiagnostics" class="inline-warning" role="status">
      <Icon name="lucide:triangle-alert" aria-hidden="true" />
      {{ payload.diagnostics.invalid_module_records }} metadata modul dan {{ payload.diagnostics.invalid_privilege_records }} privilege JSON diabaikan karena tidak valid.
    </div>
    <section class="panel">
      <form class="filters catalog-filters" @submit.prevent="applyFilters()">
        <input v-model="search" class="input catalog-search" type="search" placeholder="Cari nama, ID, deskripsi, atau jalur menu">
        <select v-model="selectedGroup" class="select" aria-label="Grup menu">
          <option value="">Semua grup menu</option>
          <option v-for="group in payload.groups" :key="group.name" :value="group.name">{{ group.name }} ({{ group.count }})</option>
        </select>
        <select v-model="selectedStatus" class="select" aria-label="Status migrasi">
          <option value="">Semua status</option>
          <option value="integrated">Terintegrasi</option>
          <option value="read_only">Baca saja</option>
          <option value="planned">Dalam migrasi</option>
        </select>
        <button class="button button-primary" type="submit"><Icon name="lucide:search" aria-hidden="true" /> Terapkan</button>
        <button class="button" type="button" @click="resetFilters">Reset</button>
      </form>
      <div v-if="loading" class="loading-state">Memuat katalog modul?</div>
      <div v-else-if="loadError" class="error-state" role="alert">{{ loadError }}</div>
      <div v-else-if="payload.items.length === 0" class="empty">Tidak ada modul yang sesuai dengan filter dan hak akses pengguna.</div>
      <div v-else class="data-wrap">
        <table class="data-table catalog-table">
          <thead><tr><th>Modul</th><th>Jalur menu lama</th><th>Hak akses</th><th>Status migrasi</th><th>Aksi</th></tr></thead>
          <tbody>
            <tr v-for="module in payload.items" :key="module.id">
              <td>
                <div class="catalog-module-name">
                  <span class="catalog-module-icon"><Icon :name="resolveSimrsIcon(module.icon)" aria-hidden="true" /></span>
                  <div>
                    <strong>{{ module.name }}</strong>
                    <code>{{ module.id }}</code>
                    <small>{{ module.description || 'Tanpa deskripsi.' }}</small>
                  </div>
                </div>
              </td>
              <td><strong>{{ module.group }}</strong><code class="catalog-path">{{ module.menu_path }}</code></td>
              <td>
                <div class="capability-list">
                  <span v-for="ability in capabilityLabels(module)" :key="ability" class="status">{{ ability }}</span>
                  <span v-if="capabilityLabels(module).length === 0" class="status status-muted">Tidak ada method cocok</span>
                </div>
              </td>
              <td><span class="status" :class="simrsMigrationClass(module.migration.status)">{{ simrsMigrationLabel(module.migration.status) }}</span></td>
              <td class="record-actions-column">
                <div class="record-actions">
                  <NuxtLink v-if="module.migration.route" class="button button-primary" :to="module.migration.route">Buka</NuxtLink>
                  <NuxtLink class="button" :to="`/simrs/modules/${encodeURIComponent(module.id)}`">Detail</NuxtLink>
                </div>
              </td>
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
  </div>
</template>
