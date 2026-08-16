import type {
  RegistrationCreatePayload,
  RegistrationDraft,
  RegistrationEncounterType,
  RegistrationInsurer,
  RegistrationNewPatientDraft,
  RegistrationNewPatientPayload,
  RegistrationOption,
  RegistrationPaymentMethod,
} from '~/types/registration'

export const REGISTRATION_PATIENT_SEARCH_PER_PAGE = 10

export interface RegistrationPatientSearchQuery extends Record<string, string | number> {
  search: string
  page: number
  per_page: number
}

const TRIAGE_CATEGORIES: RegistrationOption[] = [
  { value: '1', label: 'ATS I' },
  { value: '2', label: 'ATS II' },
  { value: '3', label: 'ATS III' },
  { value: '4', label: 'ATS IV' },
  { value: '5', label: 'ATS V' },
]

const ARRIVAL_METHODS: RegistrationOption[] = [
  { value: '0', label: 'Tidak diketahui' },
  { value: '1', label: 'Datang sendiri' },
  { value: '2', label: 'Kiriman dokter' },
  { value: '3', label: 'Rujukan klinik' },
  { value: '4', label: 'Petugas kesehatan lain' },
]

const ENTRY_PROCEDURES: RegistrationOption[] = [
  { value: '1', label: 'Datang sendiri' },
  { value: '4', label: 'Rujukan luar' },
  { value: '5', label: 'Rujukan Puskesmas' },
  { value: '6', label: 'Rujukan Rumah Sakit' },
  { value: '7', label: 'Rujukan Klinik' },
  { value: '8', label: 'Rujukan dokter/dokter gigi/spesialis' },
  { value: '9', label: 'Fasilitas kesehatan lain' },
]

const SOCIAL_STATUSES: RegistrationOption[] = [
  { value: '1', label: 'Baik' },
  { value: '2', label: 'Cukup' },
  { value: '3', label: 'Kurang' },
]

const DISABILITIES: RegistrationOption[] = [
  { value: '1', label: 'Tuna Rungu' },
  { value: '2', label: 'Tuna Netra' },
  { value: '3', label: 'Tuna Wicara' },
  { value: '4', label: 'Tuna Daksa' },
  { value: '5', label: 'Tuna Grahita' },
]

export function registrationPatientSearchQuery(search: string): RegistrationPatientSearchQuery {
  return {
    search: search.trim(),
    page: 1,
    per_page: REGISTRATION_PATIENT_SEARCH_PER_PAGE,
  }
}

export function isCurrentPatientSearch(
  requestSequence: number,
  activeSequence: number,
  requestedSearch: string,
  currentSearch: string,
): boolean {
  return requestSequence === activeSequence && requestedSearch === currentSearch.trim()
}

export function registrationInsurersForPayment(
  insurers: RegistrationInsurer[],
  paymentMethodCode: string,
): RegistrationInsurer[] {
  return insurers.filter(insurer => insurer.payment_method_codes.includes(paymentMethodCode))
}

export function preferredRegistrationInsurerId(
  insurers: RegistrationInsurer[],
  paymentMethodCode: string,
  currentInsurerId: string,
  defaultInsurerId: string,
): string {
  const available = registrationInsurersForPayment(insurers, paymentMethodCode)
  const defaultInsurer = available.find(insurer => insurer.id === defaultInsurerId)
  if (paymentMethodCode === '01' && defaultInsurer) return defaultInsurer.id
  if (available.some(insurer => insurer.id === currentInsurerId)) return currentInsurerId
  return defaultInsurer?.id ?? available[0]?.id ?? ''
}

export function registrationPaymentMethodsForEncounter(
  paymentMethods: RegistrationPaymentMethod[],
  encounterPaymentMethods: Partial<Record<RegistrationEncounterType, string[]>>,
  encounterType: RegistrationEncounterType,
): RegistrationPaymentMethod[] {
  const allowedCodes = encounterPaymentMethods[encounterType] ?? []
  return paymentMethods.filter(method => allowedCodes.includes(method.code))
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim()
  return normalized || undefined
}

function optionalInteger(value: string): number | undefined {
  if (!value) return undefined
  const normalized = Number(value)
  return Number.isInteger(normalized) && normalized > 0 ? normalized : undefined
}

function addValidationError(errors: Record<string, string[]>, field: string, message: string): void {
  errors[field] = [message]
}

function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export function validateRegistrationNewPatient(
  patient: RegistrationNewPatientDraft,
  today: string,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  const fullName = patient.full_name.trim()
  const birthPlace = patient.birth_place.trim()
  const nationalId = patient.national_id.trim()
  const address = patient.address.trim()
  const phone = patient.phone.trim()
  const mobilePhone = patient.mobile_phone.trim()
  const duplicateReason = patient.duplicate_override_reason.trim()
  const phonePattern = /^[0-9+().\s-]+$/

  if (!fullName) addValidationError(errors, 'new_patient.full_name', 'Nama lengkap pasien wajib diisi.')
  else if (fullName.length > 50) addValidationError(errors, 'new_patient.full_name', 'Nama lengkap maksimal 50 karakter.')

  if (patient.sex !== 'L' && patient.sex !== 'P') {
    addValidationError(errors, 'new_patient.sex', 'Pilih jenis kelamin pasien.')
  }

  if (!patient.birth_date) {
    addValidationError(errors, 'new_patient.birth_date', 'Tanggal lahir pasien wajib diisi.')
  } else if (!isValidDateOnly(patient.birth_date)) {
    addValidationError(errors, 'new_patient.birth_date', 'Tanggal lahir pasien tidak valid.')
  } else if (isValidDateOnly(today) && patient.birth_date > today) {
    addValidationError(errors, 'new_patient.birth_date', 'Tanggal lahir tidak boleh di masa depan.')
  }

  if (birthPlace.length > 30) {
    addValidationError(errors, 'new_patient.birth_place', 'Tempat lahir maksimal 30 karakter.')
  }
  if (nationalId && !/^\d{16}$/.test(nationalId)) {
    addValidationError(errors, 'new_patient.national_id', 'NIK harus terdiri dari tepat 16 digit.')
  }
  if (!address) addValidationError(errors, 'new_patient.address', 'Alamat pasien wajib diisi.')
  else if (address.length > 1000) addValidationError(errors, 'new_patient.address', 'Alamat maksimal 1.000 karakter.')

  if (phone.length > 30) addValidationError(errors, 'new_patient.phone', 'Nomor telepon maksimal 30 karakter.')
  else if (phone && !phonePattern.test(phone)) addValidationError(errors, 'new_patient.phone', 'Format nomor telepon tidak valid.')

  if (mobilePhone.length > 30) addValidationError(errors, 'new_patient.mobile_phone', 'Nomor HP maksimal 30 karakter.')
  else if (mobilePhone && !phonePattern.test(mobilePhone)) addValidationError(errors, 'new_patient.mobile_phone', 'Format nomor HP tidak valid.')

  if (patient.duplicate_override && !duplicateReason) {
    addValidationError(
      errors,
      'new_patient.duplicate_override_reason',
      'Alasan wajib diisi setelah mengonfirmasi pasien ini berbeda.',
    )
  } else if (duplicateReason.length > 255) {
    addValidationError(errors, 'new_patient.duplicate_override_reason', 'Alasan maksimal 255 karakter.')
  }

  return errors
}

function buildNewPatientPayload(patient: RegistrationNewPatientDraft): RegistrationNewPatientPayload {
  return {
    full_name: patient.full_name.trim(),
    sex: patient.sex as RegistrationNewPatientPayload['sex'],
    birth_date: patient.birth_date,
    birth_place: optionalText(patient.birth_place),
    national_id: optionalText(patient.national_id),
    address: patient.address.trim(),
    phone: optionalText(patient.phone),
    mobile_phone: optionalText(patient.mobile_phone),
    duplicate_override: patient.duplicate_override,
    duplicate_override_reason: patient.duplicate_override
      ? optionalText(patient.duplicate_override_reason)
      : undefined,
  }
}

export function buildRegistrationPayload(form: RegistrationDraft): RegistrationCreatePayload {
  if (form.clinic_id === null) {
    throw new Error('Unit layanan wajib dipilih sebelum membentuk payload registrasi.')
  }
  if (form.patient_mode === 'existing' && form.patient_id === null) {
    throw new Error('Pasien lama wajib dipilih sebelum membentuk payload registrasi.')
  }
  if (form.case_id === null) {
    throw new Error('Jenis kasus wajib dipilih sebelum membentuk payload registrasi.')
  }

  const commonPayload = {
    idempotency_key: form.idempotency_key,
    encounter_type: form.encounter_type,
    registered_at: form.registered_at,
    clinic_id: form.clinic_id,
    doctor_id: form.doctor_id,
    payment_method_code: form.payment_method_code,
    insurer_id: form.insurer_id,
    insurer_number: optionalText(form.insurer_number),
    shift: form.shift,
    complaint: optionalText(form.complaint),
    notes: optionalText(form.notes),
    entry_procedure: form.entry_procedure,
    referrer_id: form.entry_procedure === '1' ? undefined : (form.referrer_id ?? undefined),
    diagnosis_id: form.diagnosis_id ?? undefined,
    case_id: form.case_id,
    social_status: optionalInteger(form.social_status),
    disability: optionalInteger(form.disability),
    bed_id: form.encounter_type === 'inpatient' ? (form.bed_id ?? undefined) : undefined,
    is_control: form.patient_mode === 'existing' && form.encounter_type === 'outpatient' && form.is_control,
    triage: form.encounter_type === 'emergency' ? optionalText(form.triage) : undefined,
    arrival_method: form.encounter_type === 'emergency' ? optionalText(form.arrival_method) : undefined,
    accident_location: form.encounter_type === 'emergency' ? optionalText(form.accident_location) : undefined,
    is_visum: form.encounter_type === 'emergency' && form.is_visum,
    responsible_name: optionalText(form.responsible_name),
    responsible_national_id: optionalText(form.responsible_national_id),
    responsible_address: optionalText(form.responsible_address),
    responsible_phone: optionalText(form.responsible_phone),
    responsible_relation: optionalText(form.responsible_relation),
  }

  if (form.patient_mode === 'existing') {
    return {
      ...commonPayload,
      patient_mode: 'existing',
      patient_id: form.patient_id as number,
    }
  }

  return {
    ...commonPayload,
    patient_mode: 'new',
    new_patient: buildNewPatientPayload(form.new_patient),
  }
}

export function registrationOptionLabel(
  options: RegistrationOption[],
  value: string | number | null | undefined,
  emptyLabel = '—',
): string {
  if (value === null || value === undefined || value === '') return emptyLabel
  const normalized = String(value)
  return options.find(option => option.value === normalized)?.label ?? normalized
}

export function triageCategoryLabel(value: string | null | undefined): string {
  return registrationOptionLabel(TRIAGE_CATEGORIES, value)
}

export function arrivalMethodLabel(value: string | null | undefined): string {
  return registrationOptionLabel(ARRIVAL_METHODS, value)
}

export function entryProcedureLabel(value: string | null | undefined): string {
  return registrationOptionLabel(ENTRY_PROCEDURES, value)
}

export function socialStatusLabel(value: string | number | null | undefined): string {
  return registrationOptionLabel(SOCIAL_STATUSES, value)
}

export function disabilityLabel(value: string | number | null | undefined): string {
  return registrationOptionLabel(DISABILITIES, value)
}
