// app/utils/hris-leave.ts

import type { AttendanceStatus, LeaveStatus, LeaveType } from '~/types/hris-leave'

export function getInitial(name?: string) {
  if (!name) return '-'

  return name
    .split(' ')
    .map(item => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function getLeaveTypeLabel(type: LeaveType) {
  const labels: Record<LeaveType, string> = {
    annual: 'Cuti Tahunan',
    sick: 'Sakit',
    special: 'Izin Khusus',
    maternity: 'Cuti Melahirkan'
  }

  return labels[type]
}

export function getLeaveTypeColor(type: LeaveType) {
  const colors: Record<LeaveType, 'primary' | 'success' | 'warning' | 'error'> = {
    annual: 'success',
    sick: 'error',
    special: 'primary',
    maternity: 'warning'
  }

  return colors[type]
}

export function getStatusColor(status: LeaveStatus) {
  const colors: Record<LeaveStatus, 'warning' | 'success' | 'error'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error'
  }

  return colors[status]
}

export function getStatusLabel(status: LeaveStatus) {
  const labels: Record<LeaveStatus, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected'
  }

  return labels[status]
}

export function formatLeaveDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function getAttendanceColor(status: AttendanceStatus) {
  const colors: Record<AttendanceStatus, string> = {
    present: 'bg-success/15 text-success',
    late: 'bg-warning/15 text-warning',
    absent: 'bg-error/15 text-error',
    leave: 'bg-blue-500/15 text-blue-500',
    sick: 'bg-orange-500/15 text-orange-500',

    off: 'bg-neutral-200 text-neutral-500',

    holiday: 'bg-purple-500/15 text-purple-600'
  }

  return colors[status]
}
