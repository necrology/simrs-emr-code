export interface PatientSummary {
  patient_id: number
  medical_record_number: string
  full_name: string
  sex: string | null
  birth_date: string | null
  national_id: string | null
  insurer_number: string | null
  phone: string | null
  address: string | null
}

export interface PatientDetail extends PatientSummary {
  blood_type: string | null
  birth_place: string | null
  mobile_phone: string | null
  postal_code: string | null
}

export interface RegistrationSummary {
  registration_id: number
  registration_number: string
  registered_at: string
  queue_number: number | null
  queue_label: string | null
  encounter_type: 'emergency' | 'outpatient' | 'laboratory' | 'radiology' | 'medical_checkup' | 'executive' | 'inpatient' | 'general' | 'unknown'
  encounter_type_code: string | null
  service_registration_id: number | null
  patient_id: number
  doctor_id: string | null
  doctor_name: string | null
  clinic_id: number | null
  clinic_name: string | null
  room_id: number | null
  room_name: string | null
  payment_method_code: string | null
  payment_method: string | null
  insurer_id: string | null
  insurer_name: string | null
  complaint: string | null
  notes: string | null
  is_control: boolean
  triage: string | null
  arrival_method: string | null
  accident_location: string | null
  is_visum: string | null
  examination_status: string | null
  discharge_status: string | null
  medical_record_number: string
  patient_name: string
}

export const encounterLabels: Record<RegistrationSummary['encounter_type'], string> = {
  emergency: 'Rawat Darurat', outpatient: 'Rawat Jalan', laboratory: 'Laboratorium', radiology: 'Radiologi',
  medical_checkup: 'Medical Check-Up', executive: 'Klinik Eksekutif', inpatient: 'Rawat Inap', general: 'Umum', unknown: 'Lainnya',
}
