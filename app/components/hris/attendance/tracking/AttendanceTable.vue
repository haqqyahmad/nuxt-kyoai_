<!-- app/components/hris/attendance/tracking/AttendanceTable.vue -->

<script setup lang="ts">
type AttendanceStatus
  = | 'PRESENT'
    | 'LATE'
    | 'OFF'
    | 'HOLIDAY'
    | 'ABSENT'
    | 'SICK'
    | 'LEAVE'
    | 'PERMIT'
    | string

type OvertimeType = 'front' | 'back' | 'both' | string | null

type ApiAttendanceRow = {
  employee_id: string | number
  date: string
  status: AttendanceStatus
  checkin_time: string | null
  checkout_time: string | null
  shift_start: string | null
  shift_end: string | null
  holiday_name?: string | null
  leave_type?: string | null
  reason?: string | null
  overtime_type?: OvertimeType
  dt_minutes: number
  pc_minutes?: number
  early_checkout_minutes?: number
  ot_minutes: number
  worked_minutes: number
  worked_hours?: string
  version?: number
  computed_at?: string
}

type TableRow = {
  no: number
  day: string
  date: string
  shiftIn?: string
  shiftOut?: string
  scanIn?: string
  scanOut?: string
  totalJam?: number
  dt?: number
  pc?: number
  overtimeJam?: number
  ist?: number
  ot?: number
  cost?: number
  uml?: string
  reason?: string
  holiday?: string
  leaveInfo?: string
  status: string
  type: string
  rowType: 'normal' | 'holiday' | 'alpha' | 'sick' | 'late' | 'early'
}

const props = withDefaults(defineProps<{
  rows?: ApiAttendanceRow[]
}>(), {
  rows: () => []
})

function formatDay(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long'
  })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatTime(value: string | null) {
  if (!value) return '-'

  if (value.includes('T')) return value.slice(11, 16)
  if (value.includes(' ')) return value.split(' ')[1]?.slice(0, 5) || '-'

  return value.slice(0, 5)
}

function normalizeStatus(status: string) {
  return status?.toUpperCase?.() || '-'
}

function getLeaveLabel(status: string, leaveType?: string | null) {
  if (leaveType) return leaveType
  if (status === 'SICK') return 'Izin Sakit'
  if (status === 'LEAVE') return 'Cuti'
  if (status === 'PERMIT') return 'Izin'

  return 'Izin'
}

function toMinutes(value: string | null) {
  if (!value) return null

  let time = value

  if (value.includes('T')) {
    time = value.slice(11, 16)
  } else if (value.includes(' ')) {
    time = value.split(' ')[1]?.slice(0, 5) || ''
  } else {
    time = value.slice(0, 5)
  }

  const [hour, minute] = time.split(':').map(Number)

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null

  return hour * 60 + minute
}

function getPcMinutes(item: ApiAttendanceRow) {
  if (item.pc_minutes !== undefined) return item.pc_minutes
  if (item.early_checkout_minutes !== undefined) return item.early_checkout_minutes

  const checkout = toMinutes(item.checkout_time)
  const shiftEnd = toMinutes(item.shift_end)

  if (checkout === null || shiftEnd === null) return 0

  return checkout < shiftEnd ? shiftEnd - checkout : 0
}

function getOvertimeType(item: ApiAttendanceRow) {
  if (item.overtime_type) {
    if (item.overtime_type === 'front') return 'Lembur Depan'
    if (item.overtime_type === 'back') return 'Lembur Belakang'
    if (item.overtime_type === 'both') return 'Depan & Belakang'

    return item.overtime_type
  }

  if (!item.ot_minutes || item.ot_minutes <= 0) {
    return '-'
  }

  const checkin = toMinutes(item.checkin_time)
  const checkout = toMinutes(item.checkout_time)
  const shiftStart = toMinutes(item.shift_start)
  const shiftEnd = toMinutes(item.shift_end)

  const hasFrontOvertime = checkin !== null
    && shiftStart !== null
    && checkin < shiftStart

  const hasBackOvertime = checkout !== null
    && shiftEnd !== null
    && checkout > shiftEnd

  if (hasFrontOvertime && hasBackOvertime) return 'Depan & Belakang'
  if (hasFrontOvertime) return 'Lembur Depan'
  if (hasBackOvertime) return 'Lembur Belakang'

  return '-'
}

const rows = computed<TableRow[]>(() => {
  return props.rows.map((item, index) => {
    const status = normalizeStatus(item.status)
    const pc = getPcMinutes(item)
    const overtimeType = getOvertimeType(item)

    const baseRow = {
      no: index + 1,
      day: formatDay(item.date),
      date: formatDate(item.date),
      status,
      type: '-'
    }

    if (status === 'OFF' || status === 'HOLIDAY') {
      return {
        ...baseRow,
        holiday: status === 'HOLIDAY'
          ? item.holiday_name || 'Libur Nasional'
          : 'Hari Libur',
        status: 'LBR',
        rowType: 'holiday'
      }
    }

    if (status === 'ABSENT') {
      return {
        ...baseRow,
        shiftIn: formatTime(item.shift_start),
        shiftOut: formatTime(item.shift_end),
        scanIn: 'ALFA',
        scanOut: '-',
        totalJam: 0,
        dt: item.dt_minutes ?? 0,
        pc: 0,
        overtimeJam: item.ot_minutes ?? 0,
        ist: 0,
        ot: item.ot_minutes ?? 0,
        cost: 0,
        uml: '-',
        reason: item.reason || 'Tanpa Keterangan',
        status: 'A',
        type: overtimeType,
        rowType: 'alpha'
      }
    }

    if (status === 'SICK' || status === 'LEAVE' || status === 'PERMIT') {
      return {
        ...baseRow,
        shiftIn: formatTime(item.shift_start),
        shiftOut: formatTime(item.shift_end),
        scanIn: formatTime(item.checkin_time),
        scanOut: formatTime(item.checkout_time),
        leaveInfo: getLeaveLabel(status, item.leave_type),
        status: status === 'SICK'
          ? 'S'
          : status === 'LEAVE'
            ? 'C'
            : 'I',
        type: overtimeType,
        rowType: 'sick'
      }
    }

    if (status === 'LATE') {
      return {
        ...baseRow,
        shiftIn: formatTime(item.shift_start),
        shiftOut: formatTime(item.shift_end),
        scanIn: formatTime(item.checkin_time),
        scanOut: formatTime(item.checkout_time),
        totalJam: item.worked_minutes ?? 0,
        dt: item.dt_minutes ?? 0,
        pc,
        overtimeJam: item.ot_minutes ?? 0,
        ist: 0,
        ot: item.ot_minutes ?? 0,
        cost: 0,
        uml: '-',
        reason: item.reason || 'Terlambat',
        status: 'T',
        type: overtimeType,
        rowType: pc > 0 ? 'early' : 'late'
      }
    }

    return {
      ...baseRow,
      shiftIn: formatTime(item.shift_start),
      shiftOut: formatTime(item.shift_end),
      scanIn: formatTime(item.checkin_time),
      scanOut: formatTime(item.checkout_time),
      totalJam: item.worked_minutes ?? 0,
      dt: item.dt_minutes ?? 0,
      pc,
      overtimeJam: item.ot_minutes ?? 0,
      ist: 0,
      ot: item.ot_minutes ?? 0,
      cost: 0,
      uml: '-',
      reason: pc > 0
        ? `Pulang Cepat ${pc} Menit`
        : item.reason || 'Reguler',
      status: status === 'PRESENT' ? '-' : status,
      type: overtimeType,
      rowType: pc > 0 ? 'early' : 'normal'
    }
  })
})
</script>

<template>
  <UCard>
    <div class="overflow-auto">
      <table class="min-w-[1400px] w-full border-collapse text-sm">
        <thead class="bg-muted text-muted">
          <tr>
            <th rowspan="2" class="border border-default p-2 text-center">
              NO
            </th>
            <th rowspan="2" class="border border-default p-2">
              HARI
            </th>
            <th rowspan="2" class="border border-default p-2">
              TANGGAL
            </th>
            <th colspan="2" class="border border-default p-2 text-center">
              JADWAL SHIFT
            </th>
            <th colspan="2" class="border border-default p-2 text-center">
              FINGER SCAN
            </th>
            <th colspan="3" class="border border-default p-2 text-center text-primary">
              TOTAL (MENIT)
            </th>
            <th colspan="4" class="border border-default p-2 text-center text-primary">
              OVERTIME
            </th>
            <th rowspan="2" class="border border-default p-2">
              UML
            </th>
            <th rowspan="2" class="border border-default p-2">
              ALASAN
            </th>
            <th rowspan="2" class="border border-default p-2 text-center">
              STATUS
            </th>
            <th rowspan="2" class="border border-default p-2">
              TYPE LEMBUR
            </th>
          </tr>

          <tr>
            <th class="border border-default p-2 text-center">
              MASUK
            </th>
            <th class="border border-default p-2 text-center">
              KELUAR
            </th>
            <th class="border border-default p-2 text-center">
              MASUK
            </th>
            <th class="border border-default p-2 text-center">
              KELUAR
            </th>
            <th class="border border-default p-2 text-center">
              JAM
            </th>
            <th class="border border-default p-2 text-center">
              DT
            </th>
            <th class="border border-default p-2 text-center">
              PC
            </th>
            <th class="border border-default p-2 text-center">
              JAM
            </th>
            <th class="border border-default p-2 text-center">
              IST
            </th>
            <th class="border border-default p-2 text-center">
              OT
            </th>
            <th class="border border-default p-2 text-center">
              COST
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in rows"
            :key="row.no"
            class="hover:bg-muted/50"
            :class="{
              'bg-violet-500/10': row.rowType === 'holiday',
              'bg-red-500/5': row.rowType === 'alpha',
              'bg-cyan-500/10': row.rowType === 'sick',
              'bg-amber-500/10': row.rowType === 'late',
              'bg-orange-500/10': row.rowType === 'early'
            }"
          >
            <td class="border border-default p-2 text-center">
              {{ row.no }}
            </td>
            <td class="border border-default p-2">
              {{ row.day }}
            </td>
            <td class="border border-default p-2">
              {{ row.date }}
            </td>

            <template v-if="row.rowType === 'holiday'">
              <td colspan="13" class="border border-default p-2 text-center font-bold text-violet-600">
                {{ row.holiday }}
              </td>
              <td class="border border-default p-2 text-center font-bold text-violet-600">
                {{ row.status }}
              </td>
              <td class="border border-default p-2">
                {{ row.type }}
              </td>
            </template>

            <template v-else-if="row.rowType === 'sick'">
              <td class="border border-default p-2 text-center">
                {{ row.shiftIn }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.shiftOut }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.scanIn }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.scanOut }}
              </td>

              <td colspan="9" class="border border-default p-2 text-center font-semibold italic text-cyan-600">
                {{ row.leaveInfo }}
              </td>

              <td class="border border-default p-2 text-center font-bold text-cyan-600">
                {{ row.status }}
              </td>

              <td class="border border-default p-2">
                {{ row.type }}
              </td>
            </template>

            <template v-else>
              <td class="border border-default p-2 text-center">
                {{ row.shiftIn }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.shiftOut }}
              </td>
              <td
                class="border border-default p-2 text-center"
                :class="{
                  'font-bold text-error': row.scanIn === 'ALFA',
                  'font-semibold text-amber-600': row.rowType === 'late'
                }"
              >
                {{ row.scanIn }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.scanOut }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.totalJam }}
              </td>
              <td class="border border-default p-2 text-center text-amber-600 font-semibold">
                {{ row.dt }}
              </td>
              <td
                class="border border-default p-2 text-center font-semibold"
                :class="row.pc > 0 ? 'bg-orange-500/10 text-orange-500' : 'text-muted'"
              >
                {{ row.pc }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.overtimeJam }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.ist }}
              </td>
              <td class="border border-default p-2 text-center font-bold">
                {{ row.ot }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.cost }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.uml }}
              </td>
              <td
                class="border border-default p-2"
                :class="{
                  'text-red-600': row.rowType === 'alpha',
                  'text-amber-600': row.rowType === 'late',
                  'text-orange-600 font-semibold': row.rowType === 'early',
                  'italic': row.rowType === 'normal'
                }"
              >
                {{ row.reason }}
              </td>
              <td
                class="border border-default p-2 text-center font-bold"
                :class="{
                  'text-red-600': row.rowType === 'alpha',
                  'text-amber-600': row.rowType === 'late',
                  'text-orange-600': row.rowType === 'early'
                }"
              >
                {{ row.status }}
              </td>
              <td class="border border-default p-2">
                {{ row.type }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
