// app/types/room.ts
export type RoomType
  = | 'POLI'
    | 'TINDAKAN'
    | 'LABORATORIUM'
    | 'FARMASI'
    | 'ADMINISTRASI'
    | 'LAINNYA'

export type RoomStatus = 'ACTIVE' | 'INACTIVE'

export type PatientRoomStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE'

export type RoomPatient = {
  id: string
  name: string
  queueNo: string
  complaint: string
  guarantor: string
  enteredAt: string
  status: PatientRoomStatus
}

export type Room = {
  id: string
  code: string
  name: string
  type: RoomType
  floor: string | null
  capacity: number
  pic: string | null
  facilities: string | null
  description: string | null
  status: RoomStatus
  patients: RoomPatient[]
  createdAt: string
  updatedAt: string
}

export type RoomState = 'AVAILABLE' | 'OCCUPIED' | 'INACTIVE'

export type RoomForm = {
  code: string
  name: string
  type: RoomType | null
  floor: string
  capacity: number | null
  pic: string
  facilities: string
  description: string
  status: RoomStatus
}
