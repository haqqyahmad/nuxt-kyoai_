export type FinalShiftStatus = 'active' | 'off'

export type FinalShiftItem = {
  employee_id: number
  employee_name?: string
  department?: string
  date: string
  shift_name?: string | null
  start_time: string | null
  end_time: string | null
  status: FinalShiftStatus
}

export type FinalShiftResponse = {
  success: boolean
  message: string
  data: FinalShiftItem[]
}
