// app/types/room.ts
export type RoomStatus = 'ACTIVE' | 'INACTIVE'

export type ServiceType =
  | 'Laboratorium'
  | 'VitaminInjection'
  | 'Pharmacy'
  | 'Antigen'
  | 'PCR'
  | 'Vaccine'
  | 'DoctorConsultation'
  | 'MCU'
  | 'Dental'

export type ExamType =
  | 'MCU'
  | 'RAWAT_JALAN'

export type RoomTypeStage = {
  id: string
  code: string
  name: string
  stageOrder: number
  slotLimit?: number
  isActive: boolean
}

export type RoomTypeRecord = {
  id: string
  code: string
  name: string
  serviceType: ServiceType
  tierOrder: number
  isActive: boolean
  stages?: RoomTypeStage[]
}

export type RoomStageLink = {
  id: string
  stageId: string
  isPrimary: boolean
  stage: RoomTypeStage
}

export type Room = {
  id: string
  roomTypeId: string
  code: string
  name: string
  staffCapacity: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  roomType: RoomTypeRecord | null
  stageLinks?: RoomStageLink[]
}

export type RoomState = 'ACTIVE' | 'INACTIVE'

export type RoomForm = {
  code: string
  name: string
  roomTypeId: string | null
  staffCapacity: number | null
  isActive: boolean
  stageIds?: string[]
}

export type RoomTypeOption = {
  label: string
  value: string
  serviceType: ServiceType
}

export type RoomTypeForm = {
  code: string
  name: string
  serviceType: ServiceType | null
  tierOrder: number | null
  isActive: boolean
}

export type RoomSession = {
  id: string
  roomId: string
  roomTypeId: string
  startedAt: string
  endedAt: string | null
  exitReason: string | null
  room: {
    id: string
    code: string
    name: string
    staffCapacity: number | null
  } | null
  roomType: {
    id: string
    code: string
    name: string
  } | null
}

export type RoomSessionEnterPayload = {
  roomId: string
}

export type RoomSessionExitPayload = {
  exitReason?: string
}
