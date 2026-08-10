<script setup lang="ts">
import type { PatientDetail, RegistrationSummary } from '~/types/patient'
import { errorMessage } from '~/services/api'
import { getPatient } from '~/services/patients'
import { formatDate, formatDateTime } from '~/utils/format'

const route = useRoute()
const patient = ref<PatientDetail | null>(null)
const registrations = ref<RegistrationSummary[]>([])
const loading = ref(true)
const error = ref('')
useHead({ title: computed(() => patient.value?.full_name ?? 'Detail Pasien') })

onMounted(async () => {
  try { const response = await getPatient(String(route.params.id)); patient.value = response.data.patient; registrations.value = response.data.recent_registrations }
  catch (cause) { error.value = errorMessage(cause) }
  finally { loading.value = false }
})
</script>

<template>
  <div>
  <div class="breadcrumb">Beranda / Master Pasien / Detail</div>
  <div v-if="loading" class="panel loading-state">Memuat detail pasien…</div>
  <div v-else-if="error" class="panel error-state">{{ error }}</div>
  <template v-else-if="patient">
    <div class="page-header"><div><h1 class="page-title">{{ patient.full_name }}</h1><p class="page-description">No. RM {{ patient.medical_record_number }}</p></div><NuxtLink class="button" to="/patients">Kembali</NuxtLink></div>
    <div class="grid-2">
      <section class="panel"><div class="panel-header"><strong>Identitas pasien</strong></div><div class="panel-body"><dl class="detail-list"><dt>No. rekam medis</dt><dd>{{ patient.medical_record_number }}</dd><dt>NIK</dt><dd>{{ patient.national_id ?? '—' }}</dd><dt>Jenis kelamin</dt><dd>{{ patient.sex ?? '—' }}</dd><dt>Tempat, tanggal lahir</dt><dd>{{ patient.birth_place ?? '—' }}, {{ formatDate(patient.birth_date) }}</dd><dt>Golongan darah</dt><dd>{{ patient.blood_type ?? '—' }}</dd><dt>No. penjamin</dt><dd>{{ patient.insurer_number ?? '—' }}</dd></dl></div></section>
      <section class="panel"><div class="panel-header"><strong>Kontak</strong></div><div class="panel-body"><dl class="detail-list"><dt>Telepon</dt><dd>{{ patient.phone ?? '—' }}</dd><dt>Nomor seluler</dt><dd>{{ patient.mobile_phone ?? '—' }}</dd><dt>Alamat</dt><dd>{{ patient.address ?? '—' }}</dd><dt>Kode pos</dt><dd>{{ patient.postal_code ?? '—' }}</dd></dl></div></section>
    </div>
    <section class="panel" style="margin-top:12px"><div class="panel-header"><strong>Registrasi terakhir</strong></div><div v-if="registrations.length === 0" class="empty">Belum ada histori registrasi.</div><div v-else class="data-wrap"><table class="data-table"><thead><tr><th>No. registrasi</th><th>Waktu</th><th>Jenis</th><th>Poli</th><th>Dokter</th></tr></thead><tbody><tr v-for="item in registrations" :key="item.registration_id"><td><NuxtLink :to="`/encounters/${item.registration_id}`" style="color:var(--brand);font-weight:700">{{ item.registration_number }}</NuxtLink></td><td>{{ formatDateTime(item.registered_at) }}</td><td>{{ item.encounter_type ?? '—' }}</td><td>{{ item.clinic_id ?? '—' }}</td><td>{{ item.doctor_id ?? '—' }}</td></tr></tbody></table></div></section>
  </template>
  </div>
</template>
