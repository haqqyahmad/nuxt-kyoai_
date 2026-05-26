// app/constants/rooms.ts
import type { RoomStatus, RoomType } from '~/types/room'

export const roomTypeOptions: {
  label: string
  value: RoomType
  icon: string
}[] = [
  {
    label: 'Poli / Ruang Periksa',
    value: 'POLI',
    icon: 'i-lucide-stethoscope'
  },
  {
    label: 'Ruang Tindakan',
    value: 'TINDAKAN',
    icon: 'i-lucide-activity'
  },
  {
    label: 'Laboratorium',
    value: 'LABORATORIUM',
    icon: 'i-lucide-microscope'
  },
  {
    label: 'Farmasi / Apotek',
    value: 'FARMASI',
    icon: 'i-lucide-pill'
  },
  {
    label: 'Administrasi',
    value: 'ADMINISTRASI',
    icon: 'i-lucide-clipboard-list'
  },
  {
    label: 'Lainnya',
    value: 'LAINNYA',
    icon: 'i-lucide-door-open'
  }
]

export const roomStatusOptions: {
  label: string
  value: RoomStatus
}[] = [
  {
    label: 'Aktif',
    value: 'ACTIVE'
  },
  {
    label: 'Tidak Aktif',
    value: 'INACTIVE'
  }
]

export const roomTypeConfig = {
  POLI: {
    label: 'Poli',
    class: 'bg-blue-500/10 text-blue-500 ring-blue-500/20',
    icon: 'i-lucide-stethoscope'
  },

  TINDAKAN: {
    label: 'Tindakan',
    class: 'bg-amber-500/10 text-amber-500 ring-amber-500/20',
    icon: 'i-lucide-activity'
  },

  LABORATORIUM: {
    label: 'Laboratorium',
    class: 'bg-red-500/10 text-red-500 ring-red-500/20',
    icon: 'i-lucide-microscope'
  },

  FARMASI: {
    label: 'Farmasi',
    class: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20',
    icon: 'i-lucide-pill'
  },

  ADMINISTRASI: {
    label: 'Administrasi',
    class: 'bg-violet-500/10 text-violet-500 ring-violet-500/20',
    icon: 'i-lucide-clipboard-list'
  },

  LAINNYA: {
    label: 'Lainnya',
    class: 'bg-gray-500/10 text-gray-500 ring-gray-500/20',
    icon: 'i-lucide-door-open'
  }
} as const
