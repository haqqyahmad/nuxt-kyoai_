// app/types/hris-leave.ts

export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type LeaveType = 'annual' | 'sick' | 'special' | 'maternity'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'off' | 'leave' | 'sick' | 'holiday'

export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

export type ApiLeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ApiLeaveType = 'ANNUAL' | 'SICK' | 'SPECIAL' | 'MATERNITY'

export type ApiLeaveRequestDetail = {
  id: number
  employee_id: number
  leave_type: ApiLeaveType
  status: ApiLeaveStatus
  start_date: string
  end_date: string
  total_days: string | number
  half_day_session?: string | null
  permission_until?: string | null
  attachment_path?: string | null
  special_reason?: string | null
  deduct_balance?: boolean
  balance_source?: string | null
  notes?: string | null
  approved_by?: number | null
  approved_at?: string | null
  rejected_reason?: string | null
  created_at?: string
  updated_at?: string
  employee: {
    id: number
    nik: string
    nama: string
  }
  auditLogs?: {
    id: number
    action: string
    actor_role: string
    notes?: string | null
    created_at: string
  }[]
}

export type EmployeeProfile = {
  id: number
  name: string
  email: string
  employee_code: string
  department: string
  position: string
  avatar?: string | null
}

export type LeaveBalance = {
  entitlement_days: number
  used_days: number
  remaining_days: number

  new_entitlement_days: number
  new_used_days: number
  new_remaining_days: number

  old_entitlement_days: number
  old_used_days: number
  old_remaining_days: number

  expired_at?: string | null
}

export type AttendanceHistoryItem = {
  date: string
  status: AttendanceStatus
}

export type LeaveConflict = {
  employee_name: string
  leave_type: LeaveType
  start_date: string
  end_date: string
}

export type LeaveDetail = {
  id: number
  employee: EmployeeProfile
  leave_type: LeaveType
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: LeaveStatus
  admin_notes?: string | null
  leave_balance: LeaveBalance
  attendance_history: AttendanceHistoryItem[]
  conflicts: LeaveConflict[]
}

export type ApiAttendanceReportItem = {
  employee_id: string | number
  date: string
  status: string
  checkin_time?: string | null
  checkout_time?: string | null
  shift_start?: string | null
  shift_end?: string | null
  dt_minutes?: number
  ot_minutes?: number
  worked_minutes?: number
  worked_hours?: string
}

export type ApiLeaveBalanceDetail = {
  id: number
  employee_id: number
  tahun: number
  jatah_cuti_baru: number
  terpakai_baru: string | number
  sisa_baru: string | number
  jatah_cuti_lama: number
  terpakai_lama: string | number
  sisa_lama: string | number
  expired_at?: string | null
}
