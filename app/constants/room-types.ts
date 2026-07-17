import type { ServiceType } from '~/types/room'

export const serviceTypeOptions: Array<{
  label: string
  value: ServiceType
}> = [
  {
    label: 'Laboratorium',
    value: 'Laboratorium'
  },
  {
    label: 'Vitamin Injection',
    value: 'VitaminInjection'
  },
  {
    label: 'Pharmacy',
    value: 'Pharmacy'
  },
  {
    label: 'Antigen',
    value: 'Antigen'
  },
  {
    label: 'PCR',
    value: 'PCR'
  },
  {
    label: 'Vaccine',
    value: 'Vaccine'
  },
  {
    label: 'Doctor Consultation',
    value: 'DoctorConsultation'
  },
  {
    label: 'MCU',
    value: 'MCU'
  },
  {
    label: 'Dental',
    value: 'Dental'
  }
]

export const serviceTypeBadgeColor: Record<ServiceType, string> = {
  Laboratorium: 'error',
  VitaminInjection: 'primary',
  Pharmacy: 'success',
  Antigen: 'warning',
  PCR: 'info',
  Vaccine: 'neutral',
  DoctorConsultation: 'primary',
  MCU: 'info',
  Dental: 'warning'
}

export const examTypeBadgeColor: Record<ExamType, string> = {
  MCU: 'info',
  RAWAT_JALAN: 'success'
}
