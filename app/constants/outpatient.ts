export const ENCOUNTER_STATUS_LABEL: Record<string, string> = {
  WAITING: 'Menunggu',
  IN_CONSULTATION: 'Konsultasi',
  DONE: 'Selesai',
  CANCELLED: 'Dibatalkan'
}

export const ENCOUNTER_STATUS_COLOR: Record<string, string> = {
  WAITING: 'warning',
  IN_CONSULTATION: 'info',
  DONE: 'success',
  CANCELLED: 'error'
}

export const ITEM_STATUS_LABEL: Record<string, string> = {
  ORDERED: 'Dipesan',
  PROCESSING: 'Diproses',
  READY: 'Siap',
  DISPENSED: 'Diserahkan',
  CANCELLED: 'Dibatalkan'
}

export const ITEM_STATUS_COLOR: Record<string, string> = {
  ORDERED: 'warning',
  PROCESSING: 'info',
  READY: 'primary',
  DISPENSED: 'success',
  CANCELLED: 'error'
}

export const PRESCRIPTION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  PARTIAL: 'Sebagian',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan'
}

export const TIMING_LABEL: Record<string, string> = {
  BEFORE_MEAL: 'Sebelum makan',
  AFTER_MEAL: 'Sesudah makan',
  EMPTY_STOMACH: 'Perut kosong',
  BEDTIME: 'Malam sebelum tidur',
  AS_NEEDED: 'Bila perlu'
}

export const TIMING_OPTIONS = Object.entries(TIMING_LABEL).map(([value, label]) => ({ value, label }))

export const MEDICINE_FORM_OPTIONS = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Kapsul' },
  { value: 'SYRUP', label: 'Sirup' },
  { value: 'DROPS', label: 'Tetes' },
  { value: 'OINTMENT', label: 'Salep' },
  { value: 'CREAM', label: 'Krim' },
  { value: 'INJECTION', label: 'Injeksi' },
  { value: 'SUPPOSITORY', label: 'Supositoria' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'OTHER', label: 'Lainnya' }
]

export const WAREHOUSE_TYPE_OPTIONS = [
  { value: 'MAIN', label: 'Gudang Utama' },
  { value: 'BRANCH', label: 'Gudang Cabang' },
  { value: 'PHARMACY', label: 'Gudang Farmasi' },
  { value: 'OTHER', label: 'Lainnya' }
]

export const PRICE_TIER_TYPE_OPTIONS = [
  { value: 'DEFAULT', label: 'Default (Pasien Indonesia)' },
  { value: 'CUSTOMER', label: 'Karyawan / Customer' },
  { value: 'INSURANCE', label: 'Asuransi' },
  { value: 'NATIONALITY', label: 'Kewarganegaraan (Luar Negeri)' }
]

export const STOCK_REQUEST_STATUS_COLOR: Record<string, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral'
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export function formatRupiah(value?: number | null): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}
