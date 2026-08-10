<script setup lang="ts">
import type { PatientSummary } from '~/types/patient'
import type {
  RegistrationClinic,
  RegistrationDoctor,
  RegistrationDraft,
  RegistrationDuplicateCandidate,
  RegistrationSchema,
} from '~/types/registration'
import { errorMessage } from '~/services/api'
import { getPatient, getPatients } from '~/services/patients'
import {
  createRegistration,
  getRegistrationDoctors,
  getRegistrationSchema,
  registrationFailure,
} from '~/services/registrations'
import { formatDate, formatDateTime } from '~/utils/format'
import {
  buildRegistrationPayload,
  isCurrentPatientSearch,
  preferredRegistrationInsurerId,
  registrationInsurersForPayment,
  registrationOptionLabel,
  registrationPatientSearchQuery,
  validateRegistrationNewPatient,
} from '~/utils/registration'

const steps = [
  { label: 'Pasien', description: 'Cari atau buat pasien' },
  { label: 'Layanan', description: 'Poli dan dokter' },
  { label: 'Pembayaran', description: 'Penjamin dan detail' },
  { label: 'Review', description: 'Periksa dan simpan' },
]

const stepFields: Record<number, string[]> = {
  1: ['encounter_type', 'registered_at', 'clinic_id', 'doctor_id', 'shift'],
  2: ['payment_method_code', 'insurer_id', 'insurer_number'],
}

const existingPatientStepFields = ['patient_mode', 'patient_id']
const newPatientStepFields = [
  'patient_mode',
  'new_patient.full_name',
  'new_patient.sex',
  'new_patient.birth_date',
  'new_patient.birth_place',
  'new_patient.national_id',
  'new_patient.address',
  'new_patient.phone',
  'new_patient.mobile_phone',
  'new_patient.duplicate_override',
  'new_patient.duplicate_override_reason',
]
const allPatientStepFields = [...new Set([...existingPatientStepFields, ...newPatientStepFields, 'new_patient'])]

const fieldSteps: Record<string, number> = {
  patient_mode: 0,
  patient_id: 0,
  new_patient: 0,
  'new_patient.full_name': 0,
  'new_patient.sex': 0,
  'new_patient.birth_date': 0,
  'new_patient.birth_place': 0,
  'new_patient.national_id': 0,
  'new_patient.address': 0,
  'new_patient.phone': 0,
  'new_patient.mobile_phone': 0,
  'new_patient.duplicate_override': 0,
  'new_patient.duplicate_override_reason': 0,
  encounter_type: 1,
  registered_at: 1,
  clinic_id: 1,
  doctor_id: 1,
  shift: 1,
  complaint: 1,
  is_control: 1,
  triage: 1,
  arrival_method: 1,
  accident_location: 1,
  is_visum: 1,
  payment_method_code: 2,
  insurer_id: 2,
  insurer_number: 2,
  notes: 2,
  responsible_name: 2,
  responsible_national_id: 2,
  responsible_address: 2,
  responsible_phone: 2,
  responsible_relation: 2,
  idempotency_key: 3,
}

const fieldElementIds: Record<string, string> = {
  patient_mode: 'patient-mode-existing',
  patient_id: 'patient-search',
  new_patient: 'new-patient-full-name',
  'new_patient.full_name': 'new-patient-full-name',
  'new_patient.sex': 'new-patient-sex',
  'new_patient.birth_date': 'new-patient-birth-date',
  'new_patient.birth_place': 'new-patient-birth-place',
  'new_patient.national_id': 'new-patient-national-id',
  'new_patient.address': 'new-patient-address',
  'new_patient.phone': 'new-patient-phone',
  'new_patient.mobile_phone': 'new-patient-mobile-phone',
  'new_patient.duplicate_override': 'new-patient-duplicate-override',
  'new_patient.duplicate_override_reason': 'new-patient-duplicate-override-reason',
  encounter_type: 'encounter-outpatient',
  registered_at: 'registered-at',
  clinic_id: 'clinic-id',
  doctor_id: 'doctor-id',
  shift: 'shift',
  complaint: 'complaint',
  is_control: 'is-control',
  triage: 'triage',
  arrival_method: 'arrival-method',
  accident_location: 'accident-location',
  is_visum: 'is-visum',
  payment_method_code: 'payment-method-code',
  insurer_id: 'insurer-id',
  insurer_number: 'insurer-number',
  notes: 'notes',
  responsible_name: 'responsible-name',
  responsible_national_id: 'responsible-national-id',
  responsible_address: 'responsible-address',
  responsible_phone: 'responsible-phone',
  responsible_relation: 'responsible-relation',
}

const stepHeadingIds = ['patient-step-title', 'service-step-title', 'payment-step-title', 'review-step-title']

useHead({ title: 'Registrasi baru' })

const wizardRoot = ref<HTMLElement | null>(null)
const schema = ref<RegistrationSchema | null>(null)
const schemaLoading = ref(true)
const schemaError = ref('')
const currentStep = ref(0)
const furthestStep = ref(0)

const selectedPatient = ref<PatientSummary | null>(null)
const patientSearch = ref('')
const patientResults = ref<PatientSummary[]>([])
const patientSearching = ref(false)
const patientSearchError = ref('')
const hasPatientSearched = ref(false)
let patientRequestSequence = 0
const duplicateCandidates = ref<RegistrationDuplicateCandidate[]>([])
const duplicateCode = ref<string | null>(null)
const duplicateCandidateLoadingId = ref<number | null>(null)
let duplicateCandidateRequestSequence = 0

const doctors = ref<RegistrationDoctor[]>([])
const doctorSearch = ref('')
const doctorsLoading = ref(false)
const doctorsError = ref('')
let doctorRequestSequence = 0

const clientErrors = ref<Record<string, string[]>>({})
const fieldErrors = ref<Record<string, string[]>>({})
const submitError = ref('')
const submitting = ref(false)

const form = reactive<RegistrationDraft>({
  idempotency_key: '',
  patient_mode: 'existing',
  patient_id: null,
  new_patient: {
    full_name: '',
    sex: '',
    birth_date: '',
    birth_place: '',
    national_id: '',
    address: '',
    phone: '',
    mobile_phone: '',
    duplicate_override: false,
    duplicate_override_reason: '',
  },
  encounter_type: 'outpatient',
  registered_at: '',
  clinic_id: null,
  doctor_id: '',
  payment_method_code: '',
  insurer_id: '',
  insurer_number: '',
  shift: '1',
  complaint: '',
  notes: '',
  is_control: false,
  triage: '',
  arrival_method: '',
  accident_location: '',
  is_visum: false,
  responsible_name: '',
  responsible_national_id: '',
  responsible_address: '',
  responsible_phone: '',
  responsible_relation: '',
})

const filteredClinics = computed<RegistrationClinic[]>(() => {
  return schema.value?.clinics.filter(clinic => clinic.encounter_type === form.encounter_type) ?? []
})

const selectedEncounterType = computed(() => {
  return schema.value?.encounter_types.find(item => item.value === form.encounter_type) ?? null
})

const selectedPatientMode = computed(() => {
  return schema.value?.patient_modes.find(item => item.value === form.patient_mode) ?? null
})

const selectedNewPatientSexLabel = computed(() => {
  return registrationOptionLabel(schema.value?.sex_options ?? [], form.new_patient.sex)
})

const maximumBirthDate = computed(() => {
  return schema.value?.defaults.registered_at.slice(0, 10) ?? ''
})

const hasSoftDuplicateCandidates = computed(() => {
  return duplicateCode.value === 'PATIENT_DUPLICATE_CANDIDATE' && duplicateCandidates.value.length > 0
})

const hasHardNationalIdDuplicate = computed(() => {
  return duplicateCode.value === 'PATIENT_NATIONAL_ID_EXISTS' && duplicateCandidates.value.length > 0
})

const selectedClinic = computed(() => {
  return schema.value?.clinics.find(clinic => clinic.id === form.clinic_id) ?? null
})

const selectedDoctor = computed(() => {
  return doctors.value.find(doctor => doctor.id === form.doctor_id) ?? null
})

const selectedPaymentMethod = computed(() => {
  return schema.value?.payment_methods.find(method => method.code === form.payment_method_code) ?? null
})

const filteredInsurers = computed(() => {
  return registrationInsurersForPayment(schema.value?.insurers ?? [], form.payment_method_code)
})

const selectedInsurer = computed(() => {
  return filteredInsurers.value.find(insurer => insurer.id === form.insurer_id) ?? null
})

const isCashPayment = computed(() => form.payment_method_code === '01')

const selectedTriageLabel = computed(() => {
  return registrationOptionLabel(schema.value?.triage_categories ?? [], form.triage)
})

const selectedArrivalMethodLabel = computed(() => {
  return registrationOptionLabel(schema.value?.arrival_methods ?? [], form.arrival_method)
})

const selectedResponsibleRelationLabel = computed(() => {
  return registrationOptionLabel(schema.value?.responsible_relations ?? [], form.responsible_relation)
})

const serverErrorEntries = computed(() => {
  return Object.entries(fieldErrors.value).flatMap(([field, messages]) => {
    return messages.map(message => ({ field, message }))
  })
})

function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID()
}

function normalizeDateTime(value: string): string {
  return value.length >= 16 ? value.slice(0, 16) : value
}

function fieldErrorMessages(field: string): string[] {
  return [
    ...(clientErrors.value[field] ?? []),
    ...(fieldErrors.value[field] ?? []),
  ]
}

function hasFieldError(field: string): boolean {
  return fieldErrorMessages(field).length > 0
}

function clearFieldError(field: string): void {
  clientErrors.value = Object.fromEntries(
    Object.entries(clientErrors.value).filter(([key]) => key !== field),
  )
  fieldErrors.value = Object.fromEntries(
    Object.entries(fieldErrors.value).filter(([key]) => key !== field),
  )
}

function setClientError(field: string, message: string): void {
  clientErrors.value[field] = [message]
}

function clearClientErrors(fields: string[]): void {
  const clearedFields = new Set(fields)
  clientErrors.value = Object.fromEntries(
    Object.entries(clientErrors.value).filter(([field]) => !clearedFields.has(field)),
  )
}

function fieldsForStep(step: number): string[] {
  if (step === 0) {
    return form.patient_mode === 'new' ? newPatientStepFields : existingPatientStepFields
  }
  if (step === 1 && form.encounter_type === 'emergency') {
    return [...(stepFields[step] ?? []), 'triage', 'arrival_method']
  }
  return stepFields[step] ?? []
}

function clearPatientFieldErrors(): void {
  const fields = new Set(allPatientStepFields)
  clientErrors.value = Object.fromEntries(
    Object.entries(clientErrors.value).filter(([field]) => !fields.has(field)),
  )
  fieldErrors.value = Object.fromEntries(
    Object.entries(fieldErrors.value).filter(([field]) => !fields.has(field)),
  )
}

function resetDuplicateReview(): void {
  const hadDuplicateResponse = duplicateCode.value !== null
  duplicateCandidates.value = []
  duplicateCode.value = null
  form.new_patient.duplicate_override = false
  form.new_patient.duplicate_override_reason = ''
  clearFieldError('new_patient.duplicate_override')
  clearFieldError('new_patient.duplicate_override_reason')
  if (hadDuplicateResponse) submitError.value = ''
}

async function focusField(field: string): Promise<void> {
  await nextTick()
  const elementId = fieldElementIds[field]
  if (elementId) document.getElementById(elementId)?.focus()
}

async function focusStepHeading(): Promise<void> {
  await nextTick()
  document.getElementById(stepHeadingIds[currentStep.value] ?? '')?.focus({ preventScroll: true })
}

function scrollToWizard(): void {
  wizardRoot.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

async function loadSchema(): Promise<void> {
  schemaLoading.value = true
  schemaError.value = ''

  try {
    const loaded = (await getRegistrationSchema()).data
    schema.value = loaded
    form.patient_mode = loaded.patient_modes.some(item => item.value === 'existing')
      ? 'existing'
      : (loaded.patient_modes[0]?.value ?? 'existing')
    form.registered_at = normalizeDateTime(loaded.defaults.registered_at)
    form.encounter_type = loaded.encounter_types.some(item => item.value === loaded.defaults.encounter_type)
      ? loaded.defaults.encounter_type
      : (loaded.encounter_types[0]?.value ?? 'outpatient')
    form.payment_method_code = loaded.payment_methods.some(item => item.code === loaded.defaults.payment_method_code)
      ? loaded.defaults.payment_method_code
      : (loaded.payment_methods[0]?.code ?? '')
    form.insurer_id = loaded.defaults.insurer_id
    form.shift = loaded.defaults.shift === '2' ? '2' : '1'
    normalizeInsurerForPayment()
    if (!form.idempotency_key) form.idempotency_key = newIdempotencyKey()
  } catch (cause) {
    schemaError.value = registrationFailure(cause).message
  } finally {
    schemaLoading.value = false
  }
}

async function searchPatients(): Promise<void> {
  const query = registrationPatientSearchQuery(patientSearch.value)
  const search = query.search
  const sequence = ++patientRequestSequence
  if (search.length < 3) {
    patientSearchError.value = 'Ketik minimal 3 karakter untuk mencari pasien.'
    patientResults.value = []
    hasPatientSearched.value = false
    return
  }

  patientSearching.value = true
  patientSearchError.value = ''
  hasPatientSearched.value = true
  patientResults.value = []

  try {
    const response = await getPatients(query)
    if (!isCurrentPatientSearch(sequence, patientRequestSequence, search, patientSearch.value)) return
    patientResults.value = response.data
  } catch (cause) {
    if (!isCurrentPatientSearch(sequence, patientRequestSequence, search, patientSearch.value)) return
    patientResults.value = []
    patientSearchError.value = errorMessage(cause)
  } finally {
    if (sequence === patientRequestSequence) patientSearching.value = false
  }
}

function onPatientSearchInput(): void {
  patientRequestSequence += 1
  patientResults.value = []
  patientSearchError.value = ''
  hasPatientSearched.value = false
  patientSearching.value = false
}

function onPatientModeChange(): void {
  patientRequestSequence += 1
  duplicateCandidateRequestSequence += 1
  duplicateCandidateLoadingId.value = null
  patientSearching.value = false
  patientResults.value = []
  patientSearchError.value = ''
  hasPatientSearched.value = false
  clearPatientFieldErrors()
  resetDuplicateReview()

  if (form.patient_mode === 'new') {
    selectedPatient.value = null
    form.patient_id = null
    form.insurer_number = ''
    form.is_control = false
  }
}

function onNewPatientIdentityInput(field: string): void {
  duplicateCandidateRequestSequence += 1
  duplicateCandidateLoadingId.value = null
  clearFieldError(field)
  resetDuplicateReview()
}

function onDuplicateOverrideChange(): void {
  clearFieldError('new_patient.duplicate_override')
  if (!form.new_patient.duplicate_override) {
    form.new_patient.duplicate_override_reason = ''
    clearFieldError('new_patient.duplicate_override_reason')
  }
}

async function useDuplicateCandidate(candidate: RegistrationDuplicateCandidate): Promise<void> {
  if (duplicateCandidateLoadingId.value !== null) return
  const sequence = ++duplicateCandidateRequestSequence
  duplicateCandidateLoadingId.value = candidate.patient_id
  patientSearchError.value = ''

  try {
    const response = await getPatient(String(candidate.patient_id))
    if (sequence !== duplicateCandidateRequestSequence) return
    resetDuplicateReview()
    clearPatientFieldErrors()
    submitError.value = ''
    form.patient_mode = 'existing'
    form.patient_id = response.data.patient.patient_id
    form.insurer_number = response.data.patient.insurer_number ?? form.insurer_number
    form.is_control = false
    selectedPatient.value = response.data.patient
    patientResults.value = []
    hasPatientSearched.value = false
    await nextTick()
    document.getElementById('patient-mode-existing')?.focus()
  } catch (cause) {
    if (sequence !== duplicateCandidateRequestSequence) return
    patientSearchError.value = errorMessage(cause)
  } finally {
    if (sequence === duplicateCandidateRequestSequence) duplicateCandidateLoadingId.value = null
  }
}

function selectPatient(patient: PatientSummary): void {
  selectedPatient.value = patient
  form.patient_id = patient.patient_id
  form.insurer_number = patient.insurer_number ?? ''
  clearFieldError('patient_id')
  clearFieldError('insurer_number')
}

function changePatient(): void {
  patientRequestSequence += 1
  selectedPatient.value = null
  form.patient_id = null
  form.insurer_number = ''
  patientResults.value = []
  hasPatientSearched.value = false
  nextTick(() => document.getElementById('patient-search')?.focus())
}

function validateStep(step: number): boolean {
  const activeFields = fieldsForStep(step)
  clearClientErrors(step === 0 ? allPatientStepFields : activeFields)

  if (step === 0) {
    if (!schema.value?.patient_modes.some(item => item.value === form.patient_mode)) {
      setClientError('patient_mode', 'Pilih pasien lama atau pasien baru.')
    } else if (form.patient_mode === 'existing' && (!selectedPatient.value || !form.patient_id)) {
      setClientError('patient_id', 'Pilih pasien lama sebelum melanjutkan.')
    } else if (form.patient_mode === 'new') {
      const validationErrors = validateRegistrationNewPatient(form.new_patient, maximumBirthDate.value)
      for (const [field, messages] of Object.entries(validationErrors)) {
        clientErrors.value[field] = messages
      }
    }
  }

  if (step === 1) {
    if (!schema.value?.encounter_types.some(item => item.value === form.encounter_type)) {
      setClientError('encounter_type', 'Pilih jenis layanan yang tersedia.')
    }
    if (!form.registered_at) setClientError('registered_at', 'Waktu registrasi wajib diisi.')
    if (!form.clinic_id || !filteredClinics.value.some(clinic => clinic.id === form.clinic_id)) {
      setClientError('clinic_id', 'Pilih poli atau unit layanan.')
    }
    if (!form.doctor_id) setClientError('doctor_id', 'Pilih dokter.')
    if (form.shift !== '1' && form.shift !== '2') setClientError('shift', 'Pilih shift registrasi.')
    if (form.encounter_type === 'emergency') {
      if (!form.triage) setClientError('triage', 'Pilih kategori triage IGD.')
      if (!form.arrival_method) setClientError('arrival_method', 'Pilih cara datang pasien IGD.')
    }
  }

  if (step === 2) {
    if (!form.payment_method_code) setClientError('payment_method_code', 'Pilih cara pembayaran.')
    if (!form.insurer_id) setClientError('insurer_id', 'Pilih penjamin.')
    if (selectedInsurer.value?.requires_number && !form.insurer_number.trim()) {
      setClientError('insurer_number', 'Nomor kepesertaan wajib diisi untuk penjamin ini.')
    }
  }

  return activeFields.every(field => !hasFieldError(field))
}

async function nextStep(): Promise<void> {
  if (!validateStep(currentStep.value)) {
    const firstError = fieldsForStep(currentStep.value).find(hasFieldError)
    if (firstError) await focusField(firstError)
    return
  }

  currentStep.value += 1
  furthestStep.value = Math.max(furthestStep.value, currentStep.value)
  scrollToWizard()
  await focusStepHeading()
}

async function previousStep(): Promise<void> {
  currentStep.value = Math.max(0, currentStep.value - 1)
  scrollToWizard()
  await focusStepHeading()
}

async function openStep(step: number): Promise<void> {
  if (step > furthestStep.value || submitting.value) return
  currentStep.value = step
  scrollToWizard()
  await focusStepHeading()
}

function onEncounterTypeChange(): void {
  clearFieldError('encounter_type')
  clearFieldError('triage')
  clearFieldError('arrival_method')
  clearFieldError('accident_location')
  clearFieldError('is_visum')
  if (selectedClinic.value?.encounter_type !== form.encounter_type) {
    form.clinic_id = null
    form.doctor_id = ''
    doctors.value = []
    doctorSearch.value = ''
    clearFieldError('clinic_id')
    clearFieldError('doctor_id')
  }
}

async function loadDoctors(): Promise<void> {
  const clinicId = form.clinic_id
  const search = doctorSearch.value.trim()
  const sequence = ++doctorRequestSequence
  doctorsError.value = ''

  if (!clinicId) {
    doctors.value = []
    doctorsLoading.value = false
    return
  }

  if (search.length === 1) {
    doctorsError.value = 'Ketik minimal 2 karakter atau kosongkan pencarian untuk menampilkan semua dokter.'
    doctorsLoading.value = false
    return
  }

  doctors.value = []
  doctorsLoading.value = true
  try {
    const response = await getRegistrationDoctors({
      clinic_id: clinicId,
      search: search || undefined,
    })
    if (sequence === doctorRequestSequence && clinicId === form.clinic_id) doctors.value = response.data
  } catch (cause) {
    if (sequence === doctorRequestSequence) doctorsError.value = registrationFailure(cause).message
  } finally {
    if (sequence === doctorRequestSequence) doctorsLoading.value = false
  }
}

function onClinicChange(): void {
  form.doctor_id = ''
  doctorSearch.value = ''
  clearFieldError('clinic_id')
  clearFieldError('doctor_id')
  void loadDoctors()
}

function searchDoctors(): void {
  if (doctorSearch.value.trim().length === 1) {
    doctorsError.value = 'Ketik minimal 2 karakter atau kosongkan pencarian untuk menampilkan semua dokter.'
    return
  }

  form.doctor_id = ''
  clearFieldError('doctor_id')
  void loadDoctors()
}

function onDoctorSearchInput(): void {
  doctorsError.value = doctorSearch.value.trim().length === 1
    ? 'Ketik minimal 2 karakter atau kosongkan pencarian untuk menampilkan semua dokter.'
    : ''
}

function onPaymentMethodChange(): void {
  clearFieldError('payment_method_code')
  normalizeInsurerForPayment()
  clearFieldError('insurer_id')
  clearFieldError('insurer_number')
}

function onInsurerChange(): void {
  clearFieldError('insurer_id')
  if (!selectedInsurer.value?.requires_number) clearFieldError('insurer_number')
}

function normalizeInsurerForPayment(): void {
  if (!schema.value) return
  form.insurer_id = preferredRegistrationInsurerId(
    schema.value.insurers,
    form.payment_method_code,
    form.insurer_id,
    schema.value.defaults.insurer_id,
  )
}

function doctorSchedule(doctor: RegistrationDoctor): string {
  const days = Array.isArray(doctor.schedule_days) ? doctor.schedule_days.join(', ') : ''
  return [days, doctor.schedule_time ?? ''].filter(Boolean).join(' · ')
}

function doctorOptionLabel(doctor: RegistrationDoctor): string {
  const schedule = doctorSchedule(doctor)
  return schedule ? doctor.name + ' — ' + schedule : doctor.name
}

function firstServerErrorStep(errors: Record<string, string[]>): number | null {
  const stepsWithErrors = Object.keys(errors)
    .map(field => fieldSteps[field])
    .filter((step): step is number => typeof step === 'number')
  return stepsWithErrors.length > 0 ? Math.min(...stepsWithErrors) : null
}

async function submitRegistration(): Promise<void> {
  if (submitting.value) return

  for (let step = 0; step <= 2; step += 1) {
    if (!validateStep(step)) {
      currentStep.value = step
      const firstError = fieldsForStep(step).find(hasFieldError)
      if (firstError) await focusField(firstError)
      return
    }
  }

  if (!form.idempotency_key) form.idempotency_key = newIdempotencyKey()
  submitting.value = true
  submitError.value = ''
  fieldErrors.value = {}

  const payload = buildRegistrationPayload(form)

  try {
    const response = await createRegistration(payload)
    await navigateTo('/encounters/' + response.data.registration_id)
  } catch (cause) {
    const failure = registrationFailure(cause)
    submitError.value = failure.message
    fieldErrors.value = failure.errors
    duplicateCode.value = failure.code
    duplicateCandidates.value = failure.candidates
    if (failure.code === 'PATIENT_NATIONAL_ID_EXISTS') {
      form.new_patient.duplicate_override = false
      form.new_patient.duplicate_override_reason = ''
    }
    const targetStep = firstServerErrorStep(failure.errors)
    if (targetStep !== null && targetStep < 3) {
      currentStep.value = targetStep
      const firstField = Object.keys(failure.errors).find(field => fieldSteps[field] === targetStep)
      if (firstField) await focusField(firstField)
    }
    scrollToWizard()
  } finally {
    submitting.value = false
  }
}

onMounted(() => { void loadSchema() })
onBeforeUnmount(() => {
  patientRequestSequence += 1
  doctorRequestSequence += 1
  duplicateCandidateRequestSequence += 1
})
</script>

<template>
  <div>
    <div class="breadcrumb">
      <NuxtLink to="/registrations">Beranda / Registrasi</NuxtLink>
      / Baru
    </div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Registrasi baru</h1>
        <p class="page-description">Buat pasien baru bila diperlukan, lalu daftarkan encounter rawat jalan atau gawat darurat.</p>
      </div>
      <NuxtLink class="button" to="/registrations">Kembali ke daftar</NuxtLink>
    </div>

    <section v-if="schemaLoading" class="panel loading-state" aria-live="polite">Memuat pilihan registrasi…</section>
    <section v-else-if="schemaError" class="panel error-state" role="alert">
      <p>{{ schemaError }}</p>
      <button class="button" type="button" @click="loadSchema">Coba lagi</button>
    </section>

    <section v-else-if="schema" ref="wizardRoot" class="panel registration-wizard">
      <nav class="registration-step-nav" aria-label="Tahapan registrasi">
        <ol class="registration-steps">
          <li v-for="(step, index) in steps" :key="step.label">
            <button
              type="button"
              class="registration-step"
              :class="{ 'registration-step-active': currentStep === index, 'registration-step-complete': furthestStep > index }"
              :disabled="index > furthestStep || submitting"
              :aria-current="currentStep === index ? 'step' : undefined"
              @click="openStep(index)"
            >
              <span class="step-number">{{ index + 1 }}</span>
              <span><strong>{{ step.label }}</strong><small>{{ step.description }}</small></span>
            </button>
          </li>
        </ol>
      </nav>

      <div class="wizard-body">
        <div v-if="schema.warnings?.length" class="notice-state schema-warnings" role="status">
          <strong>Catatan data master</strong>
          <ul>
            <li v-for="warning in schema.warnings" :key="warning">{{ warning }}</li>
          </ul>
        </div>

        <div v-if="submitError || serverErrorEntries.length" class="inline-error" role="alert">
          <strong v-if="submitError">{{ submitError }}</strong>
          <ul v-if="serverErrorEntries.length" class="error-list">
            <li v-for="entry in serverErrorEntries" :key="entry.field + entry.message">{{ entry.message }}</li>
          </ul>
        </div>

        <section v-show="currentStep === 0" :aria-hidden="currentStep !== 0" aria-labelledby="patient-step-title">
          <div class="step-heading">
            <div>
              <h2 id="patient-step-title" tabindex="-1">Identitas pasien</h2>
              <p>Pilih pasien lama dari rekam medis atau isi identitas pasien baru.</p>
            </div>
            <span class="status">Langkah 1 dari 4</span>
          </div>

          <fieldset class="registration-fieldset patient-mode-fieldset">
            <legend>Jenis pasien <span class="required-mark" aria-label="wajib">*</span></legend>
            <div class="encounter-choices patient-mode-choices">
              <label
                v-for="item in schema.patient_modes"
                :key="item.value"
                class="encounter-choice"
                :class="{ 'encounter-choice-active': form.patient_mode === item.value }"
              >
                <input
                  :id="'patient-mode-' + item.value"
                  v-model="form.patient_mode"
                  type="radio"
                  name="patient_mode"
                  :value="item.value"
                  @change="onPatientModeChange"
                >
                <span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
              </label>
            </div>
            <div v-if="hasFieldError('patient_mode')" id="patient-mode-error" class="field-description" role="alert">
              <span v-for="message in fieldErrorMessages('patient_mode')" :key="message" class="field-error">{{ message }}</span>
            </div>
          </fieldset>

          <template v-if="form.patient_mode === 'existing'">
            <div v-if="selectedPatient" class="selected-patient" role="status">
              <div>
                <span class="selected-label">Pasien lama terpilih</span>
                <strong>{{ selectedPatient.full_name }}</strong>
                <span>No. RM {{ selectedPatient.medical_record_number }} · {{ selectedPatient.sex ?? 'Jenis kelamin belum diisi' }} · {{ formatDate(selectedPatient.birth_date) }}</span>
              </div>
              <button class="button" type="button" @click="changePatient">Cari pasien lain</button>
            </div>

            <template v-else>
              <form class="patient-search" role="search" @submit.prevent="searchPatients">
                <label class="field" for="patient-search">
                  <span>Kata kunci pasien</span>
                  <div class="patient-search-control">
                    <input
                      id="patient-search"
                      v-model.trim="patientSearch"
                      class="input"
                      type="search"
                      autocomplete="off"
                      placeholder="Contoh: 00123456, NIK, atau nama pasien"
                      aria-describedby="patient-search-help"
                      :aria-invalid="hasFieldError('patient_id')"
                      :disabled="patientSearching"
                      @input="onPatientSearchInput"
                    >
                    <button class="button button-primary" type="submit" :disabled="patientSearching">
                      {{ patientSearching ? 'Mencari…' : 'Cari pasien' }}
                    </button>
                  </div>
                  <small id="patient-search-help">Masukkan minimal 3 karakter.</small>
                </label>
              </form>

              <div v-if="patientSearchError" class="inline-error compact-error" role="alert">{{ patientSearchError }}</div>
              <div v-if="patientSearching" class="lookup-state" role="status">Mencari data pasien…</div>
              <div v-else-if="hasPatientSearched && patientResults.length === 0 && !patientSearchError" class="lookup-state">
                Pasien tidak ditemukan. Periksa kembali kata kunci pencarian atau pilih mode pasien baru.
              </div>
              <ul v-else-if="patientResults.length" class="patient-results" aria-label="Hasil pencarian pasien">
                <li v-for="patient in patientResults" :key="patient.patient_id">
                  <button type="button" class="patient-result" @click="selectPatient(patient)">
                    <span>
                      <strong>{{ patient.full_name }}</strong>
                      <small>No. RM {{ patient.medical_record_number }} · NIK {{ patient.national_id ?? '—' }}</small>
                    </span>
                    <span class="patient-meta">
                      <span>{{ patient.sex ?? '—' }}</span>
                      <span>{{ formatDate(patient.birth_date) }}</span>
                    </span>
                  </button>
                </li>
              </ul>
            </template>

            <div v-if="hasFieldError('patient_id')" id="patient-id-error" class="field-description" role="alert">
              <span v-for="message in fieldErrorMessages('patient_id')" :key="message" class="field-error">{{ message }}</span>
            </div>
          </template>

          <template v-else>
            <div v-if="hasFieldError('new_patient')" class="inline-error compact-error" role="alert">
              <span v-for="message in fieldErrorMessages('new_patient')" :key="message">{{ message }}</span>
            </div>
            <div class="form-grid new-patient-form">
              <label class="field field-wide" for="new-patient-full-name">
                <span>Nama lengkap <span class="required-mark" aria-label="wajib">*</span></span>
                <input
                  id="new-patient-full-name"
                  v-model="form.new_patient.full_name"
                  class="input"
                  name="new_patient.full_name"
                  maxlength="50"
                  autocomplete="off"
                  required
                  :aria-invalid="hasFieldError('new_patient.full_name')"
                  :aria-describedby="hasFieldError('new_patient.full_name') ? 'new-patient-full-name-error' : undefined"
                  @input="onNewPatientIdentityInput('new_patient.full_name')"
                >
                <span v-if="hasFieldError('new_patient.full_name')" id="new-patient-full-name-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.full_name')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="new-patient-sex">
                <span>Jenis kelamin <span class="required-mark" aria-label="wajib">*</span></span>
                <select
                  id="new-patient-sex"
                  v-model="form.new_patient.sex"
                  class="select"
                  name="new_patient.sex"
                  required
                  :aria-invalid="hasFieldError('new_patient.sex')"
                  :aria-describedby="hasFieldError('new_patient.sex') ? 'new-patient-sex-error' : undefined"
                  @change="onNewPatientIdentityInput('new_patient.sex')"
                >
                  <option value="" disabled>Pilih jenis kelamin</option>
                  <option v-for="option in schema.sex_options" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <span v-if="hasFieldError('new_patient.sex')" id="new-patient-sex-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.sex')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="new-patient-birth-date">
                <span>Tanggal lahir <span class="required-mark" aria-label="wajib">*</span></span>
                <input
                  id="new-patient-birth-date"
                  v-model="form.new_patient.birth_date"
                  class="input"
                  name="new_patient.birth_date"
                  type="date"
                  :max="maximumBirthDate"
                  required
                  :aria-invalid="hasFieldError('new_patient.birth_date')"
                  :aria-describedby="hasFieldError('new_patient.birth_date') ? 'new-patient-birth-date-error' : undefined"
                  @input="onNewPatientIdentityInput('new_patient.birth_date')"
                >
                <span v-if="hasFieldError('new_patient.birth_date')" id="new-patient-birth-date-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.birth_date')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="new-patient-birth-place">
                <span>Tempat lahir</span>
                <input
                  id="new-patient-birth-place"
                  v-model="form.new_patient.birth_place"
                  class="input"
                  name="new_patient.birth_place"
                  maxlength="30"
                  autocomplete="off"
                  :aria-invalid="hasFieldError('new_patient.birth_place')"
                  :aria-describedby="hasFieldError('new_patient.birth_place') ? 'new-patient-birth-place-error' : undefined"
                  @input="clearFieldError('new_patient.birth_place')"
                >
                <span v-if="hasFieldError('new_patient.birth_place')" id="new-patient-birth-place-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.birth_place')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="new-patient-national-id">
                <span>NIK <span class="optional-mark">Opsional, 16 digit</span></span>
                <input
                  id="new-patient-national-id"
                  v-model.trim="form.new_patient.national_id"
                  class="input"
                  name="new_patient.national_id"
                  inputmode="numeric"
                  maxlength="16"
                  pattern="[0-9]{16}"
                  autocomplete="off"
                  :aria-invalid="hasFieldError('new_patient.national_id')"
                  :aria-describedby="hasFieldError('new_patient.national_id') ? 'new-patient-national-id-error' : undefined"
                  @input="onNewPatientIdentityInput('new_patient.national_id')"
                >
                <span v-if="hasFieldError('new_patient.national_id')" id="new-patient-national-id-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.national_id')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field field-wide" for="new-patient-address">
                <span>Alamat <span class="required-mark" aria-label="wajib">*</span></span>
                <textarea
                  id="new-patient-address"
                  v-model="form.new_patient.address"
                  class="input textarea"
                  name="new_patient.address"
                  rows="3"
                  maxlength="1000"
                  required
                  :aria-invalid="hasFieldError('new_patient.address')"
                  :aria-describedby="hasFieldError('new_patient.address') ? 'new-patient-address-error' : undefined"
                  @input="clearFieldError('new_patient.address')"
                />
                <span v-if="hasFieldError('new_patient.address')" id="new-patient-address-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.address')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="new-patient-phone">
                <span>Telepon</span>
                <input
                  id="new-patient-phone"
                  v-model.trim="form.new_patient.phone"
                  class="input"
                  name="new_patient.phone"
                  type="tel"
                  maxlength="30"
                  autocomplete="off"
                  :aria-invalid="hasFieldError('new_patient.phone')"
                  :aria-describedby="hasFieldError('new_patient.phone') ? 'new-patient-phone-error' : undefined"
                  @input="clearFieldError('new_patient.phone')"
                >
                <span v-if="hasFieldError('new_patient.phone')" id="new-patient-phone-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.phone')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="new-patient-mobile-phone">
                <span>Nomor HP</span>
                <input
                  id="new-patient-mobile-phone"
                  v-model.trim="form.new_patient.mobile_phone"
                  class="input"
                  name="new_patient.mobile_phone"
                  type="tel"
                  maxlength="30"
                  autocomplete="off"
                  :aria-invalid="hasFieldError('new_patient.mobile_phone')"
                  :aria-describedby="hasFieldError('new_patient.mobile_phone') ? 'new-patient-mobile-phone-error' : undefined"
                  @input="clearFieldError('new_patient.mobile_phone')"
                >
                <span v-if="hasFieldError('new_patient.mobile_phone')" id="new-patient-mobile-phone-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.mobile_phone')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>
            </div>

            <section v-if="duplicateCandidates.length" class="duplicate-review" role="alert" aria-labelledby="duplicate-review-title">
              <h3 id="duplicate-review-title">Kandidat pasien lama ditemukan</h3>
              <p v-if="hasHardNationalIdDuplicate">NIK ini sudah terhubung ke pasien lama dan tidak dapat dioverride. Gunakan pasien lama atau koreksi NIK.</p>
              <p v-else>Nama, tanggal lahir, dan jenis kelamin sama dengan pasien lama. Periksa kandidat sebelum melanjutkan.</p>
              <ul class="duplicate-candidates">
                <li v-for="candidate in duplicateCandidates" :key="candidate.patient_id">
                  <div>
                    <strong>{{ candidate.full_name }}</strong>
                    <span>No. RM {{ candidate.medical_record_number }} · {{ candidate.sex ?? '—' }} · {{ formatDate(candidate.birth_date) }}</span>
                  </div>
                  <button
                    class="button"
                    type="button"
                    :disabled="duplicateCandidateLoadingId !== null"
                    @click="useDuplicateCandidate(candidate)"
                  >
                    {{ duplicateCandidateLoadingId === candidate.patient_id ? 'Memuat…' : 'Gunakan pasien lama' }}
                  </button>
                </li>
              </ul>
              <div v-if="patientSearchError" class="inline-error compact-error" role="alert">{{ patientSearchError }}</div>

              <div v-if="hasSoftDuplicateCandidates" class="duplicate-override">
                <label class="checkbox-field" for="new-patient-duplicate-override">
                  <input
                    id="new-patient-duplicate-override"
                    v-model="form.new_patient.duplicate_override"
                    type="checkbox"
                    name="new_patient.duplicate_override"
                    :aria-invalid="hasFieldError('new_patient.duplicate_override')"
                    :aria-describedby="hasFieldError('new_patient.duplicate_override') ? 'new-patient-duplicate-override-error' : undefined"
                    @change="onDuplicateOverrideChange"
                  >
                  <span>Saya sudah memverifikasi bahwa pasien ini adalah orang yang berbeda.</span>
                </label>
                <span v-if="hasFieldError('new_patient.duplicate_override')" id="new-patient-duplicate-override-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('new_patient.duplicate_override')" :key="message" class="field-error">{{ message }}</span>
                </span>

                <label v-if="form.new_patient.duplicate_override" class="field" for="new-patient-duplicate-override-reason">
                  <span>Alasan pasien berbeda <span class="required-mark" aria-label="wajib">*</span></span>
                  <textarea
                    id="new-patient-duplicate-override-reason"
                    v-model="form.new_patient.duplicate_override_reason"
                    class="input textarea"
                    name="new_patient.duplicate_override_reason"
                    rows="3"
                    maxlength="255"
                    required
                    :aria-invalid="hasFieldError('new_patient.duplicate_override_reason')"
                    :aria-describedby="hasFieldError('new_patient.duplicate_override_reason') ? 'new-patient-duplicate-override-reason-error' : undefined"
                    @input="clearFieldError('new_patient.duplicate_override_reason')"
                  />
                  <span v-if="hasFieldError('new_patient.duplicate_override_reason')" id="new-patient-duplicate-override-reason-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('new_patient.duplicate_override_reason')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
              </div>
            </section>
          </template>

          <div class="wizard-actions">
            <NuxtLink class="button" to="/registrations">Batalkan</NuxtLink>
            <button class="button button-primary" type="button" @click="nextStep">Lanjut ke layanan</button>
          </div>
        </section>

        <section v-show="currentStep === 1" :aria-hidden="currentStep !== 1" aria-labelledby="service-step-title">
          <div class="step-heading">
            <div>
              <h2 id="service-step-title" tabindex="-1">Pilih layanan</h2>
              <p>Tentukan jenis encounter, unit layanan, dokter, dan waktu registrasi.</p>
            </div>
            <span class="status">Langkah 2 dari 4</span>
          </div>

          <form @submit.prevent="nextStep">
            <fieldset class="registration-fieldset">
              <legend>Jenis layanan <span class="required-mark" aria-label="wajib">*</span></legend>
              <div class="encounter-choices">
                <label
                  v-for="item in schema.encounter_types"
                  :key="item.value"
                  class="encounter-choice"
                  :class="{ 'encounter-choice-active': form.encounter_type === item.value }"
                >
                  <input
                    :id="'encounter-' + item.value"
                    v-model="form.encounter_type"
                    type="radio"
                    name="encounter_type"
                    :value="item.value"
                    @change="onEncounterTypeChange"
                  >
                  <span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
                </label>
              </div>
              <div v-if="hasFieldError('encounter_type')" class="field-description" role="alert">
                <span v-for="message in fieldErrorMessages('encounter_type')" :key="message" class="field-error">{{ message }}</span>
              </div>
            </fieldset>

            <div class="form-grid">
              <label class="field" for="registered-at">
                <span>Waktu registrasi <span class="required-mark" aria-label="wajib">*</span></span>
                <input
                  id="registered-at"
                  v-model="form.registered_at"
                  class="input"
                  type="datetime-local"
                  name="registered_at"
                  required
                  :aria-invalid="hasFieldError('registered_at')"
                  :aria-describedby="hasFieldError('registered_at') ? 'registered-at-error' : undefined"
                  @input="clearFieldError('registered_at')"
                >
                <span v-if="hasFieldError('registered_at')" id="registered-at-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('registered_at')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="shift">
                <span>Shift <span class="required-mark" aria-label="wajib">*</span></span>
                <select
                  id="shift"
                  v-model="form.shift"
                  class="select"
                  name="shift"
                  required
                  :aria-invalid="hasFieldError('shift')"
                  :aria-describedby="hasFieldError('shift') ? 'shift-error' : undefined"
                  @change="clearFieldError('shift')"
                >
                  <option value="1">Shift 1</option>
                  <option value="2">Shift 2</option>
                </select>
                <span v-if="hasFieldError('shift')" id="shift-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('shift')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="clinic-id">
                <span>Poli / unit layanan <span class="required-mark" aria-label="wajib">*</span></span>
                <select
                  id="clinic-id"
                  v-model="form.clinic_id"
                  class="select"
                  name="clinic_id"
                  required
                  :aria-invalid="hasFieldError('clinic_id')"
                  :aria-describedby="hasFieldError('clinic_id') ? 'clinic-id-error' : undefined"
                  @change="onClinicChange"
                >
                  <option :value="null" disabled>Pilih poli atau unit</option>
                  <option v-for="clinic in filteredClinics" :key="clinic.id" :value="clinic.id">
                    {{ clinic.code }} — {{ clinic.name }}{{ clinic.room_name ? ' · ' + clinic.room_name : '' }}
                  </option>
                </select>
                <span v-if="filteredClinics.length === 0" class="field-description">Belum ada unit untuk jenis layanan ini.</span>
                <span v-if="hasFieldError('clinic_id')" id="clinic-id-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('clinic_id')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <div class="field">
                <label for="doctor-id">Dokter <span class="required-mark" aria-label="wajib">*</span></label>
                <div class="doctor-lookup">
                  <div class="doctor-search-control">
                    <label class="sr-only" for="doctor-search">Cari nama dokter</label>
                    <input
                      id="doctor-search"
                      v-model.trim="doctorSearch"
                      class="input"
                      type="search"
                      placeholder="Cari nama dokter"
                      :disabled="!form.clinic_id || doctorsLoading"
                      @input="onDoctorSearchInput"
                    >
                    <button
                      class="button"
                      type="button"
                      :disabled="!form.clinic_id || doctorsLoading || doctorSearch.trim().length === 1"
                      @click="searchDoctors"
                    >
                      Cari
                    </button>
                  </div>
                  <select
                    id="doctor-id"
                    v-model="form.doctor_id"
                    class="select"
                    name="doctor_id"
                    required
                    :disabled="!form.clinic_id || doctorsLoading"
                    :aria-busy="doctorsLoading"
                    :aria-invalid="hasFieldError('doctor_id')"
                    :aria-describedby="hasFieldError('doctor_id') ? 'doctor-id-error' : 'doctor-status'"
                    @change="clearFieldError('doctor_id')"
                  >
                    <option value="" disabled>
                      {{ doctorsLoading ? 'Memuat dokter…' : (form.clinic_id ? 'Pilih dokter' : 'Pilih poli terlebih dahulu') }}
                    </option>
                    <option v-for="doctor in doctors" :key="doctor.id" :value="doctor.id">{{ doctorOptionLabel(doctor) }}</option>
                  </select>
                </div>
                <span id="doctor-status" class="field-description" :class="{ 'field-error': doctorsError }" aria-live="polite">
                  {{ doctorsError || (!doctorsLoading && form.clinic_id && doctors.length === 0 ? 'Tidak ada dokter yang cocok.' : '') }}
                </span>
                <span v-if="hasFieldError('doctor_id')" id="doctor-id-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('doctor_id')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </div>

              <label class="field field-wide" for="complaint">
                <span>Keluhan awal</span>
                <textarea
                  id="complaint"
                  v-model="form.complaint"
                  class="input textarea"
                  name="complaint"
                  rows="3"
                  placeholder="Keluhan utama pasien saat datang"
                  :aria-invalid="hasFieldError('complaint')"
                  @input="clearFieldError('complaint')"
                />
                <span v-if="hasFieldError('complaint')" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('complaint')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>
            </div>

            <div v-if="form.encounter_type === 'outpatient'" class="form-subsection">
              <h3>Detail rawat jalan</h3>
              <p v-if="form.patient_mode === 'new'" class="field-description">Pasien baru otomatis dicatat sebagai kunjungan baru dan tidak dapat ditandai sebagai pasien kontrol.</p>
              <label v-else class="checkbox-field" for="is-control">
                <input id="is-control" v-model="form.is_control" type="checkbox" name="is_control">
                <span>Kunjungan kontrol</span>
              </label>
            </div>

            <div v-else class="form-subsection">
              <h3>Detail gawat darurat</h3>
              <div class="form-grid">
                <label class="field" for="triage">
                  <span>Triage <span class="required-mark" aria-label="wajib">*</span></span>
                  <select
                    id="triage"
                    v-model="form.triage"
                    class="select"
                    name="triage"
                    required
                    :aria-invalid="hasFieldError('triage')"
                    :aria-describedby="hasFieldError('triage') ? 'triage-error' : undefined"
                    @change="clearFieldError('triage')"
                  >
                    <option value="" disabled>Pilih kategori triage</option>
                    <option v-for="option in schema.triage_categories" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                  <span v-if="hasFieldError('triage')" id="triage-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('triage')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
                <label class="field" for="arrival-method">
                  <span>Cara datang <span class="required-mark" aria-label="wajib">*</span></span>
                  <select
                    id="arrival-method"
                    v-model="form.arrival_method"
                    class="select"
                    name="arrival_method"
                    required
                    :aria-invalid="hasFieldError('arrival_method')"
                    :aria-describedby="hasFieldError('arrival_method') ? 'arrival-method-error' : undefined"
                    @change="clearFieldError('arrival_method')"
                  >
                    <option value="" disabled>Pilih cara datang</option>
                    <option v-for="option in schema.arrival_methods" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                  <span v-if="hasFieldError('arrival_method')" id="arrival-method-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('arrival_method')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
                <label class="field field-wide" for="accident-location">
                  <span>Lokasi kecelakaan</span>
                  <input id="accident-location" v-model.trim="form.accident_location" class="input" name="accident_location" placeholder="Isi bila kunjungan terkait kecelakaan" @input="clearFieldError('accident_location')">
                  <span v-if="hasFieldError('accident_location')" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('accident_location')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
                <label class="checkbox-field field-wide" for="is-visum">
                  <input id="is-visum" v-model="form.is_visum" type="checkbox" name="is_visum">
                  <span>Memerlukan visum</span>
                </label>
              </div>
            </div>

            <div class="wizard-actions">
              <button class="button" type="button" @click="previousStep">Kembali</button>
              <button class="button button-primary" type="submit">Lanjut ke pembayaran</button>
            </div>
          </form>
        </section>

        <section v-show="currentStep === 2" :aria-hidden="currentStep !== 2" aria-labelledby="payment-step-title">
          <div class="step-heading">
            <div>
              <h2 id="payment-step-title" tabindex="-1">Pembayaran dan detail</h2>
              <p>Pilih cara pembayaran dan penjamin yang sesuai dengan kunjungan.</p>
            </div>
            <span class="status">Langkah 3 dari 4</span>
          </div>

          <form @submit.prevent="nextStep">
            <div class="form-grid">
              <label class="field" for="payment-method-code">
                <span>Cara pembayaran <span class="required-mark" aria-label="wajib">*</span></span>
                <select
                  id="payment-method-code"
                  v-model="form.payment_method_code"
                  class="select"
                  name="payment_method_code"
                  required
                  :aria-invalid="hasFieldError('payment_method_code')"
                  :aria-describedby="hasFieldError('payment_method_code') ? 'payment-method-error' : undefined"
                  @change="onPaymentMethodChange"
                >
                  <option value="" disabled>Pilih cara pembayaran</option>
                  <option v-for="method in schema.payment_methods" :key="method.code" :value="method.code">{{ method.name }}</option>
                </select>
                <span v-if="hasFieldError('payment_method_code')" id="payment-method-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('payment_method_code')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="insurer-id">
                <span>Penjamin <span class="required-mark" aria-label="wajib">*</span></span>
                <select
                  id="insurer-id"
                  v-model="form.insurer_id"
                  class="select"
                  name="insurer_id"
                  required
                  :disabled="isCashPayment"
                  :aria-invalid="hasFieldError('insurer_id')"
                  :aria-describedby="hasFieldError('insurer_id') ? 'insurer-id-error' : undefined"
                  @change="onInsurerChange"
                >
                  <option value="" disabled>Pilih penjamin</option>
                  <option v-for="insurer in filteredInsurers" :key="insurer.id" :value="insurer.id">
                    {{ insurer.short_name || insurer.name }} — {{ insurer.name }}
                  </option>
                </select>
                <span v-if="isCashPayment" class="field-description">Penjamin umum ditetapkan otomatis untuk pembayaran tunai.</span>
                <span v-else-if="filteredInsurers.length === 0" class="field-description field-error">Tidak ada penjamin untuk cara pembayaran ini.</span>
                <span v-if="hasFieldError('insurer_id')" id="insurer-id-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('insurer_id')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field" for="insurer-number">
                <span>
                  Nomor kepesertaan
                  <span v-if="selectedInsurer?.requires_number" class="required-mark" aria-label="wajib">*</span>
                </span>
                <input
                  id="insurer-number"
                  v-model.trim="form.insurer_number"
                  class="input"
                  name="insurer_number"
                  placeholder="Nomor kartu / kepesertaan"
                  :required="selectedInsurer?.requires_number"
                  :aria-invalid="hasFieldError('insurer_number')"
                  :aria-describedby="hasFieldError('insurer_number') ? 'insurer-number-error' : undefined"
                  @input="clearFieldError('insurer_number')"
                >
                <span v-if="hasFieldError('insurer_number')" id="insurer-number-error" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('insurer_number')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>

              <label class="field field-wide" for="notes">
                <span>Catatan registrasi</span>
                <textarea id="notes" v-model="form.notes" class="input textarea" name="notes" rows="3" placeholder="Catatan administratif tambahan" @input="clearFieldError('notes')" />
                <span v-if="hasFieldError('notes')" class="field-description" role="alert">
                  <span v-for="message in fieldErrorMessages('notes')" :key="message" class="field-error">{{ message }}</span>
                </span>
              </label>
            </div>

            <div class="form-subsection">
              <h3>Penanggung jawab pasien <span>Opsional</span></h3>
              <div class="form-grid">
                <label class="field" for="responsible-name">
                  <span>Nama penanggung jawab</span>
                  <input
                    id="responsible-name"
                    v-model.trim="form.responsible_name"
                    class="input"
                    name="responsible_name"
                    :aria-invalid="hasFieldError('responsible_name')"
                    :aria-describedby="hasFieldError('responsible_name') ? 'responsible-name-error' : undefined"
                    @input="clearFieldError('responsible_name')"
                  >
                  <span v-if="hasFieldError('responsible_name')" id="responsible-name-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('responsible_name')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
                <label class="field" for="responsible-national-id">
                  <span>NIK penanggung jawab</span>
                  <input
                    id="responsible-national-id"
                    v-model.trim="form.responsible_national_id"
                    class="input"
                    name="responsible_national_id"
                    inputmode="numeric"
                    :aria-invalid="hasFieldError('responsible_national_id')"
                    :aria-describedby="hasFieldError('responsible_national_id') ? 'responsible-national-id-error' : undefined"
                    @input="clearFieldError('responsible_national_id')"
                  >
                  <span v-if="hasFieldError('responsible_national_id')" id="responsible-national-id-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('responsible_national_id')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
                <label class="field" for="responsible-relation">
                  <span>Hubungan dengan pasien</span>
                  <select
                    id="responsible-relation"
                    v-model="form.responsible_relation"
                    class="select"
                    name="responsible_relation"
                    :aria-invalid="hasFieldError('responsible_relation')"
                    :aria-describedby="hasFieldError('responsible_relation') ? 'responsible-relation-error' : undefined"
                    @change="clearFieldError('responsible_relation')"
                  >
                    <option value="">Belum ditentukan</option>
                    <option v-for="option in schema.responsible_relations" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                  <span v-if="hasFieldError('responsible_relation')" id="responsible-relation-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('responsible_relation')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
                <label class="field" for="responsible-phone">
                  <span>Nomor telepon</span>
                  <input
                    id="responsible-phone"
                    v-model.trim="form.responsible_phone"
                    class="input"
                    name="responsible_phone"
                    type="tel"
                    :aria-invalid="hasFieldError('responsible_phone')"
                    :aria-describedby="hasFieldError('responsible_phone') ? 'responsible-phone-error' : undefined"
                    @input="clearFieldError('responsible_phone')"
                  >
                  <span v-if="hasFieldError('responsible_phone')" id="responsible-phone-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('responsible_phone')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
                <label class="field field-wide" for="responsible-address">
                  <span>Alamat penanggung jawab</span>
                  <textarea
                    id="responsible-address"
                    v-model="form.responsible_address"
                    class="input textarea"
                    name="responsible_address"
                    rows="2"
                    :aria-invalid="hasFieldError('responsible_address')"
                    :aria-describedby="hasFieldError('responsible_address') ? 'responsible-address-error' : undefined"
                    @input="clearFieldError('responsible_address')"
                  />
                  <span v-if="hasFieldError('responsible_address')" id="responsible-address-error" class="field-description" role="alert">
                    <span v-for="message in fieldErrorMessages('responsible_address')" :key="message" class="field-error">{{ message }}</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="wizard-actions">
              <button class="button" type="button" @click="previousStep">Kembali</button>
              <button class="button button-primary" type="submit">Lanjut ke review</button>
            </div>
          </form>
        </section>

        <section v-show="currentStep === 3" :aria-hidden="currentStep !== 3" aria-labelledby="review-step-title">
          <div class="step-heading">
            <div>
              <h2 id="review-step-title" tabindex="-1">Review registrasi</h2>
              <p>Pastikan identitas pasien, layanan, dokter, dan penjamin sudah benar sebelum disimpan.</p>
            </div>
            <span class="status">Langkah 4 dari 4</span>
          </div>

          <div class="review-grid">
            <article class="review-card">
              <header><h3>Pasien</h3><button type="button" @click="openStep(0)">Ubah</button></header>
              <dl class="review-list">
                <dt>Jenis pasien</dt><dd>{{ selectedPatientMode?.label ?? form.patient_mode }}</dd>
                <template v-if="form.patient_mode === 'existing'">
                  <dt>Nama</dt><dd>{{ selectedPatient?.full_name ?? '—' }}</dd>
                  <dt>No. RM</dt><dd>{{ selectedPatient?.medical_record_number ?? '—' }}</dd>
                  <dt>NIK</dt><dd>{{ selectedPatient?.national_id ?? '—' }}</dd>
                  <dt>Tanggal lahir</dt><dd>{{ formatDate(selectedPatient?.birth_date) }}</dd>
                </template>
                <template v-else>
                  <dt>Nama</dt><dd>{{ form.new_patient.full_name || '—' }}</dd>
                  <dt>No. RM</dt><dd>Dibuat otomatis saat registrasi disimpan</dd>
                  <dt>Jenis kelamin</dt><dd>{{ selectedNewPatientSexLabel }}</dd>
                  <dt>Tempat lahir</dt><dd>{{ form.new_patient.birth_place || '—' }}</dd>
                  <dt>Tanggal lahir</dt><dd>{{ formatDate(form.new_patient.birth_date) }}</dd>
                  <dt>NIK</dt><dd>{{ form.new_patient.national_id || '—' }}</dd>
                  <dt>Alamat</dt><dd>{{ form.new_patient.address || '—' }}</dd>
                  <dt>Telepon</dt><dd>{{ form.new_patient.phone || '—' }}</dd>
                  <dt>Nomor HP</dt><dd>{{ form.new_patient.mobile_phone || '—' }}</dd>
                  <template v-if="form.new_patient.duplicate_override">
                    <dt>Verifikasi duplikat</dt><dd>{{ form.new_patient.duplicate_override_reason || '—' }}</dd>
                  </template>
                </template>
              </dl>
            </article>

            <article class="review-card">
              <header><h3>Layanan</h3><button type="button" @click="openStep(1)">Ubah</button></header>
              <dl class="review-list">
                <dt>Jenis</dt><dd>{{ selectedEncounterType?.label ?? form.encounter_type }}</dd>
                <dt>Waktu</dt><dd>{{ formatDateTime(form.registered_at) }}</dd>
                <dt>Poli / unit</dt><dd>{{ selectedClinic?.name ?? '—' }}</dd>
                <dt>Ruang</dt><dd>{{ selectedClinic?.room_name ?? '—' }}</dd>
                <dt>Dokter</dt><dd>{{ selectedDoctor?.name ?? '—' }}</dd>
                <dt>Jadwal</dt><dd>{{ selectedDoctor ? doctorSchedule(selectedDoctor) || '—' : '—' }}</dd>
                <dt>Shift</dt><dd>Shift {{ form.shift }}</dd>
                <dt>Keluhan</dt><dd>{{ form.complaint || '—' }}</dd>
                <template v-if="form.encounter_type === 'outpatient'">
                  <dt>Kunjungan kontrol</dt><dd>{{ form.is_control ? 'Ya' : 'Tidak' }}</dd>
                </template>
                <template v-else>
                  <dt>Triage</dt><dd>{{ selectedTriageLabel }}</dd>
                  <dt>Cara datang</dt><dd>{{ selectedArrivalMethodLabel }}</dd>
                  <dt>Lokasi kecelakaan</dt><dd>{{ form.accident_location || '—' }}</dd>
                  <dt>Visum</dt><dd>{{ form.is_visum ? 'Ya' : 'Tidak' }}</dd>
                </template>
              </dl>
            </article>

            <article class="review-card">
              <header><h3>Pembayaran</h3><button type="button" @click="openStep(2)">Ubah</button></header>
              <dl class="review-list">
                <dt>Cara bayar</dt><dd>{{ selectedPaymentMethod?.name ?? '—' }}</dd>
                <dt>Penjamin</dt><dd>{{ selectedInsurer?.name ?? '—' }}</dd>
                <dt>No. kepesertaan</dt><dd>{{ form.insurer_number || '—' }}</dd>
                <dt>Catatan</dt><dd>{{ form.notes || '—' }}</dd>
              </dl>
            </article>

            <article class="review-card">
              <header><h3>Penanggung jawab</h3><button type="button" @click="openStep(2)">Ubah</button></header>
              <dl class="review-list">
                <dt>Nama</dt><dd>{{ form.responsible_name || '—' }}</dd>
                <dt>NIK</dt><dd>{{ form.responsible_national_id || '—' }}</dd>
                <dt>Hubungan</dt><dd>{{ selectedResponsibleRelationLabel }}</dd>
                <dt>Telepon</dt><dd>{{ form.responsible_phone || '—' }}</dd>
                <dt>Alamat</dt><dd>{{ form.responsible_address || '—' }}</dd>
              </dl>
            </article>
          </div>

          <form class="wizard-actions review-actions" @submit.prevent="submitRegistration">
            <button class="button" type="button" :disabled="submitting" @click="previousStep">Kembali</button>
            <button class="button button-primary" type="submit" :disabled="submitting">
              {{ submitting ? 'Menyimpan registrasi…' : 'Simpan registrasi' }}
            </button>
          </form>
          <p class="submit-note">Tombol simpan dilindungi dari pengiriman ganda. Jika koneksi terputus, percobaan ulang memakai kunci registrasi yang sama.</p>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.registration-wizard { scroll-margin-top: 76px; overflow: hidden; }
.registration-step-nav { border-bottom: 1px solid var(--line); background: #fafbfb; overflow-x: auto; }
.registration-steps { display: grid; min-width: 620px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
.registration-steps li { min-width: 0; }
.registration-step { display: flex; width: 100%; min-height: 70px; align-items: center; gap: 9px; padding: 11px 14px; border: 0; border-right: 1px solid var(--line); background: transparent; color: var(--text-muted); cursor: pointer; text-align: left; }
.registration-steps li:last-child .registration-step { border-right: 0; }
.registration-step:disabled { cursor: not-allowed; opacity: .55; }
.registration-step-active { box-shadow: inset 0 -3px var(--brand); background: var(--brand-soft); color: var(--brand); }
.registration-step-complete:not(.registration-step-active) { color: var(--text); }
.step-number { display: grid; flex: 0 0 auto; width: 28px; height: 28px; place-items: center; border: 1px solid #a9b7bc; border-radius: 50%; font-weight: 700; }
.registration-step-active .step-number, .registration-step-complete .step-number { border-color: var(--brand); background: var(--brand); color: #fff; }
.registration-step strong, .registration-step small { display: block; }
.registration-step small { margin-top: 2px; font-size: 11px; font-weight: 400; }
.wizard-body { padding: 20px; }
.step-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.step-heading h2 { margin: 0; font-size: 18px; }
.step-heading h2:focus-visible { outline: 2px solid var(--brand); outline-offset: 4px; border-radius: 2px; }
.step-heading p { margin: 4px 0 0; color: var(--text-muted); }
.patient-mode-fieldset { max-width: 760px; }
.patient-search { max-width: 760px; }
.patient-search-control, .doctor-search-control { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; }
.patient-search .input, .doctor-search-control .input { width: 100%; }
.field > small { color: var(--text-muted); font-size: 11px; }
.compact-error { max-width: 760px; margin: 12px 0 0; }
.lookup-state { margin-top: 14px; padding: 24px; border: 1px dashed #c9d3d6; border-radius: 5px; color: var(--text-muted); text-align: center; }
.patient-results { display: grid; gap: 7px; margin: 16px 0 0; padding: 0; list-style: none; }
.patient-result { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 5px; background: #fff; color: var(--text); cursor: pointer; text-align: left; }
.patient-result:hover, .patient-result:focus-visible { border-color: #83aa9f; background: var(--brand-soft); outline: none; }
.patient-result strong, .patient-result small { display: block; }
.patient-result small { margin-top: 3px; color: var(--text-muted); }
.patient-meta { display: flex; flex: 0 0 auto; gap: 6px; color: var(--text-muted); font-size: 12px; }
.selected-patient { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border: 1px solid #9cc4b9; border-radius: 6px; background: var(--brand-soft); }
.selected-patient strong, .selected-patient span { display: block; }
.selected-patient strong { margin: 3px 0; font-size: 17px; }
.selected-patient .selected-label { color: var(--brand); font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.selected-patient div > span:last-child { color: var(--text-muted); font-size: 12px; }
.new-patient-form { max-width: 900px; }
.optional-mark { margin-left: 5px; color: var(--text-muted); font-size: 11px; font-weight: 400; }
.duplicate-review { max-width: 900px; margin-top: 18px; padding: 16px; border: 1px solid #d6ad57; border-radius: 6px; background: #fff9eb; }
.duplicate-review h3 { margin: 0; font-size: 15px; }
.duplicate-review > p { margin: 5px 0 13px; color: #6c551f; }
.duplicate-candidates { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.duplicate-candidates li { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 11px 12px; border: 1px solid #e1c682; border-radius: 5px; background: #fff; }
.duplicate-candidates strong, .duplicate-candidates span { display: block; }
.duplicate-candidates span { margin-top: 3px; color: var(--text-muted); font-size: 12px; }
.duplicate-override { display: grid; gap: 9px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e1c682; }
.duplicate-override > .field { max-width: 720px; }
.registration-fieldset { margin: 0 0 18px; padding: 0; border: 0; }
.registration-fieldset legend { margin-bottom: 7px; color: #45545b; font-size: 12px; font-weight: 700; }
.encounter-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.encounter-choice { display: flex; min-height: 74px; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid #bcc8cd; border-radius: 6px; background: #fff; cursor: pointer; }
.encounter-choice:hover, .encounter-choice-active { border-color: var(--brand); background: var(--brand-soft); }
.encounter-choice input { margin-top: 3px; accent-color: var(--brand); }
.encounter-choice strong, .encounter-choice small { display: block; }
.encounter-choice small { margin-top: 3px; color: var(--text-muted); font-weight: 400; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.form-grid .field-wide { grid-column: 1 / -1; }
.form-grid .input, .form-grid .select { width: 100%; }
.doctor-lookup { display: grid; gap: 7px; }
.form-subsection { margin-top: 20px; padding: 16px; border: 1px solid var(--line); border-radius: 6px; background: #fafbfb; }
.form-subsection h3 { margin: 0 0 13px; font-size: 14px; }
.form-subsection h3 span { margin-left: 5px; color: var(--text-muted); font-size: 11px; font-weight: 400; }
.form-subsection > .checkbox-field { width: fit-content; }
.wizard-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); }
.review-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.review-card { min-width: 0; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
.review-card header { display: flex; min-height: 42px; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--line); background: #fafbfb; }
.review-card h3 { margin: 0; font-size: 14px; }
.review-card header button { padding: 3px; border: 0; background: transparent; color: var(--brand); cursor: pointer; font-size: 12px; font-weight: 700; }
.review-card header button:hover { text-decoration: underline; }
.review-list { display: grid; grid-template-columns: 135px minmax(0, 1fr); margin: 0; padding: 6px 12px 10px; }
.review-list dt, .review-list dd { margin: 0; padding: 6px 0; border-bottom: 1px solid #edf0f1; overflow-wrap: anywhere; }
.review-list dt { color: var(--text-muted); }
.error-list { margin: 7px 0 0; padding-left: 18px; }
.schema-warnings ul { margin: 6px 0 0; padding-left: 18px; }
.review-actions { margin-top: 18px; }
.submit-note { margin: 9px 0 0; color: var(--text-muted); font-size: 11px; text-align: right; }
.schemaError p { margin-top: 0; }

@media (max-width: 760px) {
  .wizard-body { padding: 15px; }
  .step-heading, .selected-patient, .patient-result, .duplicate-candidates li { align-items: stretch; flex-direction: column; }
  .encounter-choices, .form-grid, .review-grid { grid-template-columns: 1fr; }
  .form-grid .field-wide { grid-column: auto; }
  .patient-meta { flex-wrap: wrap; }
  .review-list { grid-template-columns: 115px minmax(0, 1fr); }
}

@media (max-width: 520px) {
  .patient-search-control, .doctor-search-control { grid-template-columns: 1fr; }
  .wizard-actions { flex-direction: column-reverse; }
  .wizard-actions .button { width: 100%; }
  .review-list { grid-template-columns: 1fr; }
  .review-list dt { padding-bottom: 0; border-bottom: 0; }
}
</style>
