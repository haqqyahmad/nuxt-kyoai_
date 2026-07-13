export type RoomAssignmentFilters = {
  assignedDate: string
  roomTypeId: string
  roomId: string
  userId: string
  isActive: 'ALL' | 'true' | 'false'
}

export type RoomAssignmentUser = {
  id: number
  name: string
  email?: string | null
}

export type RoomAssignmentRoomType = {
  id: string
  code: string
  name: string
  tierOrder?: number | null
}

export type RoomAssignmentRoom = {
  id: string
  code: string
  name: string
  staffCapacity?: number | null
  isActive?: boolean
}

export type RoomAssignmentRecord = {
  id: string
  userId: number
  roomId: string
  roomTypeId: string
  assignedDate: string
  isActive: boolean
  assignmentSource?: 'PIC' | 'SELF'
  notes?: string | null
  createdAt?: string
  updatedAt?: string
  assignedBy?: number | null
  user?: RoomAssignmentUser | null
  room?: RoomAssignmentRoom | null
  roomType?: RoomAssignmentRoomType | null
}

export type RoomAssignmentForm = {
  userId: number | null
  roomId: string | null
  assignedDate: string
  notes: string
}

export type RoomAssignmentSelfForm = {
  roomId: string | null
  assignedDate: string
  notes: string
}

export type RoomAssignmentBatchRow = {
  userId: number | null
  roomId: string | null
  notes: string
}

export type RoomAssignmentBatchForm = {
  assignedDate: string
  assignments: RoomAssignmentBatchRow[]
}
