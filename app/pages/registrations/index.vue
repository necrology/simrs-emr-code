<script setup lang="ts">
import type { PaginationMeta } from '~/types/api'
import type { RegistrationSummary } from '~/types/patient'
import { encounterLabels } from '~/types/patient'
import { errorMessage } from '~/services/api'
import { getRegistrations, paginationMeta } from '~/services/patients'
import { formatDateTime } from '~/utils/format'

useHead({ title: 'Registrasi' })

const rows = ref<RegistrationSummary[]>([])
const meta = ref<PaginationMeta>(paginationMeta(null))
const loading = ref(false)
const error = ref('')
const page = ref(1)
const patientId = ref('')
const encounterType = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const columns = [
  { key: 'registration_number', label: 'No. Registrasi' },
  { key: 'registered_at_display', label: 'Waktu' },
  { key: 'medical_record_number', label: 'No. RM' },
  { key: 'patient_name', label: 'Nama pasien' },
  { key: 'encounter_type_display', label: 'Jenis' },
  { key: 'clinic_name', label: 'Poli' },
  { key: 'doctor_name', label: 'Dokter' },
]

const tableRows = computed(() => rows.value.map(row => ({
  ...row,
  registered_at_display: formatDateTime(row.registered_at),
  encounter_type_display: encounterLabels[row.encounter_type],
})))

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const response = await getRegistrations({
      page: page.value,
      patient_id: patientId.value || undefined,
      encounter_type: encounterType.value || undefined,
      date_from: dateFrom.value || undefined,
      date_to: dateTo.value || undefined,
    })
    rows.value = response.data
    meta.value = paginationMeta(response.meta)
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    loading.value = false
  }
}

function applyFilters(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  patientId.value = ''
  encounterType.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  page.value = 1
  void load()
}

function changePage(value: number): void {
  page.value = value
  void load()
}

function registrationLink(row: object): string {
  return '/encounters/' + String((row as Record<string, unknown>).registration_id)
}

onMounted(() => { void load() })
</script>

<template>
  <div>
    <div class="breadcrumb">Beranda / Registrasi</div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Registrasi dan encounter</h1>
        <p class="page-description">Daftar kunjungan rawat jalan, rawat inap, dan gawat darurat.</p>
      </div>
      <NuxtLink class="button button-primary" to="/registrations/new">Registrasi baru</NuxtLink>
    </div>

    <section class="panel">
      <form class="filters registration-filters" @submit.prevent="applyFilters">
        <label class="field filter-field" for="registration-patient-id">
          <span>Patient ID</span>
          <input id="registration-patient-id" v-model.trim="patientId" class="input" inputmode="numeric" placeholder="Contoh: 12345">
        </label>
        <label class="field filter-field" for="registration-encounter-type">
          <span>Jenis layanan</span>
          <select id="registration-encounter-type" v-model="encounterType" class="select">
            <option value="">Semua jenis</option>
            <option value="outpatient">Rawat Jalan</option>
            <option value="emergency">Gawat Darurat</option>
          </select>
        </label>
        <label class="field filter-field" for="registration-date-from">
          <span>Dari tanggal</span>
          <input id="registration-date-from" v-model="dateFrom" class="input" type="date">
        </label>
        <label class="field filter-field" for="registration-date-to">
          <span>Sampai tanggal</span>
          <input id="registration-date-to" v-model="dateTo" class="input" type="date">
        </label>
        <div class="filter-actions">
          <button class="button button-primary" type="submit">Terapkan</button>
          <button class="button" type="button" @click="resetFilters">Reset</button>
        </div>
      </form>
      <EnterpriseTable
        :columns="columns"
        :rows="tableRows"
        :meta="meta"
        :loading="loading"
        :error="error"
        :row-link="registrationLink"
        @page="changePage"
      />
    </section>
  </div>
</template>

<style scoped>
.registration-filters { align-items: flex-end; }
.filter-field { min-width: 150px; }
.filter-field > span { color: #45545b; font-size: 11px; font-weight: 700; }
.filter-actions { display: flex; gap: 8px; }

@media (max-width: 640px) {
  .filter-field { width: 100%; }
  .filter-field .input, .filter-field .select { width: 100%; }
  .filter-actions, .filter-actions .button { width: 100%; }
}
</style>
