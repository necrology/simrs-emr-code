<script setup lang="ts">
import type { ApiEnvelope } from '~/types/api'
import type { RegistrationSummary } from '~/types/patient'
import { encounterLabels } from '~/types/patient'
import { areaForEncounterType } from '~/types/emr'
import { errorMessage } from '~/services/api'
import { formatDateTime } from '~/utils/format'
import { arrivalMethodLabel, triageCategoryLabel } from '~/utils/registration'

const route = useRoute()
const record = ref<RegistrationSummary | null>(null)
const loading = ref(true)
const error = ref('')
const emrArea = computed(() => record.value ? areaForEncounterType(record.value.encounter_type) : null)
const emrLink = computed(() => record.value && emrArea.value
  ? {
      path: `/emr/${emrArea.value}`,
      query: {
        encounter_id: String(record.value.registration_id),
        patient_id: String(record.value.patient_id),
      },
    }
  : null)
useHead({ title: 'Ringkasan Encounter' })

onMounted(async () => {
  try {
    record.value = (await $fetch<ApiEnvelope<RegistrationSummary>>(`/api/backend/v1/encounters/${encodeURIComponent(String(route.params.id))}/summary`)).data
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="breadcrumb">Beranda / Encounter / Ringkasan</div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Ringkasan encounter</h1>
        <p class="page-description">Konteks registrasi dipetakan dari tabel layanan EMR legacy.</p>
      </div>
      <NuxtLink v-if="emrLink" :to="emrLink" class="button button-primary">Buka formulir EMR</NuxtLink>
    </div>
    <section v-if="loading" class="panel loading-state">Memuat encounter…</section>
    <section v-else-if="error" class="panel error-state">{{ error }}</section>
    <section v-else-if="record" class="panel">
      <div class="panel-header"><strong>{{ record.registration_number }}</strong><span class="status">{{ encounterLabels[record.encounter_type] }}</span></div>
      <div class="panel-body">
        <dl class="detail-list">
          <dt>Pasien</dt><dd><NuxtLink :to="`/patients/${record.patient_id}`" style="color:var(--brand);font-weight:700">{{ record.medical_record_number }} · {{ record.patient_name }}</NuxtLink></dd>
          <dt>Waktu registrasi</dt><dd>{{ formatDateTime(record.registered_at) }}</dd>
          <dt>Nomor antrean</dt><dd>{{ record.queue_label ?? record.queue_number ?? '—' }}</dd>
          <dt>ID layanan</dt><dd>{{ record.service_registration_id ?? '—' }}</dd>
          <dt>Poli / unit</dt><dd>{{ record.clinic_name ?? record.clinic_id ?? '—' }}</dd>
          <dt>Ruangan</dt><dd>{{ record.room_name ?? '—' }}</dd>
          <dt>Dokter</dt><dd>{{ record.doctor_name ?? record.doctor_id ?? '—' }}</dd>
          <dt>Cara bayar</dt><dd>{{ record.payment_method ?? record.payment_method_code ?? '—' }}</dd>
          <dt>Penjamin</dt><dd>{{ record.insurer_name ?? record.insurer_id ?? '—' }}</dd>
          <dt>Keluhan</dt><dd>{{ record.complaint ?? '—' }}</dd>
          <dt>Catatan</dt><dd>{{ record.notes ?? '—' }}</dd>
          <template v-if="record.encounter_type === 'outpatient'">
            <dt>Kunjungan kontrol</dt><dd>{{ record.is_control ? 'Ya' : 'Tidak' }}</dd>
          </template>
          <template v-if="record.encounter_type === 'emergency'">
            <dt>Triage</dt><dd>{{ triageCategoryLabel(record.triage) }}</dd>
            <dt>Cara datang</dt><dd>{{ arrivalMethodLabel(record.arrival_method) }}</dd>
            <dt>Lokasi kecelakaan</dt><dd>{{ record.accident_location ?? '—' }}</dd>
            <dt>Visum</dt><dd>{{ record.is_visum === '1' ? 'Ya' : (record.is_visum === '0' ? 'Tidak' : '—') }}</dd>
          </template>
          <dt>Status periksa</dt><dd>{{ record.examination_status ?? '—' }}</dd>
          <dt>Status pulang</dt><dd>{{ record.discharge_status ?? '—' }}</dd>
        </dl>
      </div>
    </section>
  </div>
</template>
