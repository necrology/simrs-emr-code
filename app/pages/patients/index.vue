<script setup lang="ts">
import type { PatientSummary } from '~/types/patient'
import type { PaginationMeta } from '~/types/api'
import { errorMessage } from '~/services/api'
import { getPatients, paginationMeta } from '~/services/patients'
import { formatDate } from '~/utils/format'

useHead({ title: 'Master Pasien' })
const rows = ref<PatientSummary[]>([])
const meta = ref<PaginationMeta>(paginationMeta(null))
const loading = ref(false)
const error = ref('')
const search = ref('')
const birthDate = ref('')
const page = ref(1)
const sort = ref('medical_record_number')
const direction = ref<'asc' | 'desc'>('asc')
const columns = [
  { key: 'medical_record_number', label: 'No. RM', sortable: true }, { key: 'full_name', label: 'Nama pasien', sortable: true },
  { key: 'sex', label: 'JK' }, { key: 'birth_date_display', label: 'Tanggal lahir', sortable: true }, { key: 'phone', label: 'Telepon' }, { key: 'address', label: 'Alamat' },
]
const tableRows = computed(() => rows.value.map((row) => ({ ...row, birth_date_display: formatDate(row.birth_date) })))

async function load(): Promise<void> {
  if (search.value.length > 0 && search.value.length < 3) { error.value = 'Pencarian minimal 3 karakter.'; return }
  loading.value = true; error.value = ''
  try {
    const response = await getPatients({ search: search.value || undefined, birth_date: birthDate.value || undefined, page: page.value, sort: sort.value, direction: direction.value })
    rows.value = response.data; meta.value = paginationMeta(response.meta)
  } catch (cause) { error.value = errorMessage(cause) }
  finally { loading.value = false }
}

function changePage(value: number): void { page.value = value; void load() }
function changeSort(value: string): void { if (sort.value === value) direction.value = direction.value === 'asc' ? 'desc' : 'asc'; else sort.value = value; page.value = 1; void load() }
function patientLink(row: object): string { return `/patients/${String((row as Record<string, unknown>).patient_id)}` }
onMounted(load)
</script>

<template>
  <div>
  <div class="breadcrumb">Beranda / Master Pasien</div>
  <div class="page-header"><div><h1 class="page-title">Master pasien</h1><p class="page-description">Pencarian server-side pada sumber utama rekam medis.</p></div></div>
  <section class="panel">
    <form class="filters" @submit.prevent="page = 1; load()"><input v-model.trim="search" class="input" style="min-width:280px" placeholder="No. RM, NIK, atau nama"><input v-model="birthDate" class="input" type="date"><button class="button button-primary" type="submit">Cari</button><button class="button" type="button" @click="search = ''; birthDate = ''; page = 1; load()">Reset</button></form>
    <AppTable :columns="columns" :rows="tableRows" :meta="meta" :loading="loading" :error="error" :row-link="patientLink" @page="changePage" @sort="changeSort" />
  </section>
  </div>
</template>
