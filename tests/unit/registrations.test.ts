import { describe, expect, it } from 'vitest'
import type { RegistrationDraft } from '../../app/types/registration'
import {
  normalizeRegistrationCandidates,
  normalizeRegistrationErrors,
  registrationFailure,
} from '../../app/services/registrations'
import {
  arrivalMethodLabel,
  buildRegistrationPayload,
  isCurrentPatientSearch,
  preferredRegistrationInsurerId,
  registrationInsurersForPayment,
  registrationOptionLabel,
  registrationPatientSearchQuery,
  triageCategoryLabel,
  validateRegistrationNewPatient,
} from '../../app/utils/registration'

function registrationDraft(overrides: Partial<RegistrationDraft> = {}): RegistrationDraft {
  return {
    idempotency_key: '018f4f12-ea73-7c8b-9c41-67a7614a506f',
    patient_mode: 'existing',
    patient_id: 123,
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
    registered_at: '2026-07-18T10:30',
    clinic_id: 10,
    doctor_id: 'D01',
    payment_method_code: '01',
    insurer_id: 'Z-0007',
    insurer_number: '  ',
    shift: '1',
    complaint: '  Demam tiga hari  ',
    notes: '  ',
    is_control: true,
    triage: '3',
    arrival_method: '1',
    accident_location: 'Jalan utama',
    is_visum: true,
    responsible_name: '  Budi  ',
    responsible_national_id: '',
    responsible_address: '',
    responsible_phone: '',
    responsible_relation: '01',
    ...overrides,
  }
}

describe('registration API errors', () => {
  it('keeps only usable field validation messages', () => {
    expect(normalizeRegistrationErrors({
      patient_id: ['Pasien wajib dipilih.'],
      clinic_id: ['Poli tidak valid.', 42],
      ignored: 'Bukan array',
    })).toEqual({
      patient_id: ['Pasien wajib dipilih.'],
      clinic_id: ['Poli tidak valid.'],
    })
  })

  it('extracts the Laravel envelope from a fetch error', () => {
    expect(registrationFailure({ data: {
      message: 'Data registrasi belum valid.',
      errors: { doctor_id: ['Dokter wajib dipilih.'] },
    } })).toEqual({
      message: 'Data registrasi belum valid.',
      errors: { doctor_id: ['Dokter wajib dipilih.'] },
      code: null,
      candidates: [],
    })
  })

  it('extracts nested duplicate candidates and the API code', () => {
    const candidate = {
      patient_id: 77,
      medical_record_number: '000077',
      full_name: 'SITI AMINAH',
      birth_date: '1995-06-12',
      sex: 'P',
    }

    expect(normalizeRegistrationCandidates([candidate, { patient_id: 'invalid' }])).toEqual([candidate])
    expect(registrationFailure({ data: {
      message: 'Ditemukan kandidat pasien lama.',
      meta: { code: 'PATIENT_DUPLICATE_CANDIDATE' },
      errors: {
        'new_patient.duplicate_override': ['Konfirmasi diperlukan.'],
        candidates: [candidate],
      },
    } })).toEqual({
      message: 'Ditemukan kandidat pasien lama.',
      errors: { 'new_patient.duplicate_override': ['Konfirmasi diperlukan.'] },
      code: 'PATIENT_DUPLICATE_CANDIDATE',
      candidates: [candidate],
    })
  })

  it('provides a safe fallback for transport failures', () => {
    expect(registrationFailure(new Error('network'))).toEqual({
      message: 'Layanan registrasi tidak dapat dihubungi. Silakan coba kembali.',
      errors: {},
      code: null,
      candidates: [],
    })
  })
})

describe('registration form helpers', () => {
  it('builds a patient query accepted by the backend contract', () => {
    expect(registrationPatientSearchQuery('  Siti Aminah  ')).toEqual({
      search: 'Siti Aminah',
      page: 1,
      per_page: 10,
    })
  })

  it('accepts only the latest response for the unchanged patient query', () => {
    expect(isCurrentPatientSearch(3, 3, 'Siti', 'Siti')).toBe(true)
    expect(isCurrentPatientSearch(2, 3, 'Siti', 'Siti')).toBe(false)
    expect(isCurrentPatientSearch(3, 3, 'Siti', 'Budi')).toBe(false)
  })

  it('uses schema labels and preserves an unknown legacy code', () => {
    expect(registrationOptionLabel([{ value: '01', label: 'Orang tua' }], '01')).toBe('Orang tua')
    expect(registrationOptionLabel([], 'legacy-code')).toBe('legacy-code')
    expect(registrationOptionLabel([], null)).toBe('—')
  })

  it('maps static encounter labels consistently with registration schema', () => {
    expect(triageCategoryLabel('3')).toBe('ATS III')
    expect(arrivalMethodLabel('1')).toBe('Datang sendiri')
  })

  it('filters and selects only insurers allowed for the payment method', () => {
    const insurers = [
      {
        id: 'Z-0007',
        name: 'Umum',
        short_name: 'UMUM',
        payment_method_codes: ['01'],
        requires_number: false,
      },
      {
        id: 'BPJS',
        name: 'BPJS Kesehatan',
        short_name: 'BPJS',
        payment_method_codes: ['02'],
        requires_number: true,
      },
    ]

    expect(registrationInsurersForPayment(insurers, '02').map(insurer => insurer.id)).toEqual(['BPJS'])
    expect(preferredRegistrationInsurerId(insurers, '01', 'BPJS', 'Z-0007')).toBe('Z-0007')
    expect(preferredRegistrationInsurerId(insurers, '02', 'Z-0007', 'Z-0007')).toBe('BPJS')
  })

  it('builds a normalized outpatient payload without leaking emergency fields', () => {
    const payload = buildRegistrationPayload(registrationDraft())

    expect(payload.patient_mode).toBe('existing')
    expect(payload.patient_id).toBe(123)
    expect('new_patient' in payload).toBe(false)
    expect(payload.complaint).toBe('Demam tiga hari')
    expect(payload.notes).toBeUndefined()
    expect(payload.responsible_name).toBe('Budi')
    expect(payload.is_control).toBe(true)
    expect(payload.triage).toBeUndefined()
    expect(payload.arrival_method).toBeUndefined()
    expect(payload.accident_location).toBeUndefined()
    expect(payload.is_visum).toBe(false)
  })

  it('normalizes emergency fields and disables the outpatient control flag', () => {
    const payload = buildRegistrationPayload(registrationDraft({
      encounter_type: 'emergency',
      triage: ' 3 ',
      arrival_method: ' 1 ',
      accident_location: '  Jalan utama ',
    }))

    expect(payload.is_control).toBe(false)
    expect(payload.triage).toBe('3')
    expect(payload.arrival_method).toBe('1')
    expect(payload.accident_location).toBe('Jalan utama')
    expect(payload.is_visum).toBe(true)
  })

  it('builds a normalized new-patient payload without patient_id', () => {
    const payload = buildRegistrationPayload(registrationDraft({
      patient_mode: 'new',
      patient_id: null,
      is_control: true,
      new_patient: {
        full_name: '  Siti Aminah  ',
        sex: 'P',
        birth_date: '1995-06-12',
        birth_place: '  Subang  ',
        national_id: ' 3213000000000003 ',
        address: '  Jalan Otista  ',
        phone: ' 0260123456 ',
        mobile_phone: ' 081234567890 ',
        duplicate_override: true,
        duplicate_override_reason: '  Sudah diverifikasi sebagai orang berbeda. ',
      },
    }))

    expect(payload.patient_mode).toBe('new')
    expect('patient_id' in payload).toBe(false)
    expect(payload.is_control).toBe(false)
    expect(payload.new_patient).toEqual({
      full_name: 'Siti Aminah',
      sex: 'P',
      birth_date: '1995-06-12',
      birth_place: 'Subang',
      national_id: '3213000000000003',
      address: 'Jalan Otista',
      phone: '0260123456',
      mobile_phone: '081234567890',
      duplicate_override: true,
      duplicate_override_reason: 'Sudah diverifikasi sebagai orang berbeda.',
    })
  })

  it('validates required identity fields, NIK, phone, future dates, and override reason', () => {
    const errors = validateRegistrationNewPatient({
      full_name: ' ',
      sex: '',
      birth_date: '2026-07-19',
      birth_place: 'S'.repeat(31),
      national_id: '1234',
      address: '',
      phone: 'nomor?',
      mobile_phone: '0'.repeat(31),
      duplicate_override: true,
      duplicate_override_reason: '',
    }, '2026-07-18')

    expect(Object.keys(errors)).toEqual(expect.arrayContaining([
      'new_patient.full_name',
      'new_patient.sex',
      'new_patient.birth_date',
      'new_patient.birth_place',
      'new_patient.national_id',
      'new_patient.address',
      'new_patient.phone',
      'new_patient.mobile_phone',
      'new_patient.duplicate_override_reason',
    ]))
  })

  it('accepts an optional empty NIK and valid patient identity', () => {
    expect(validateRegistrationNewPatient({
      full_name: 'Siti Aminah',
      sex: 'P',
      birth_date: '1995-06-12',
      birth_place: 'Subang',
      national_id: '',
      address: 'Jalan Otista',
      phone: '(0260) 123-456',
      mobile_phone: '+62 812-3456-7890',
      duplicate_override: false,
      duplicate_override_reason: '',
    }, '2026-07-18')).toEqual({})
  })
})
