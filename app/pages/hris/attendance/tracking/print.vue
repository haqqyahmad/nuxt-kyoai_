<!-- app/pages/hris/attendance/tracking/print.vue -->

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false
})

useSeoMeta({
  title: 'Print Attendance Report'
})

type AttendanceRow = {
  employee_id: string | number
  date: string
  status: string
  checkin_time: string | null
  checkout_time: string | null
  shift_start: string | null
  shift_end: string | null
  holiday_name?: string | null
  leave_type?: string | null
  reason?: string | null
  overtime_type?: 'front' | 'back' | 'both' | string | null
  dt_minutes: number
  pc_minutes?: number
  early_checkout_minutes?: number
  ot_minutes: number
  worked_minutes: number
  worked_hours: string
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

type Employee = {
  id: string | number
  nama?: string
  employee_name?: string
  full_name?: string
}

const route = useRoute()
const api = useApi()

const loading = ref(false)
const rows = ref<AttendanceRow[]>([])
const employeeName = ref('-')

const employeeId = computed(() => String(route.query.employee_id || ''))
const start = computed(() => String(route.query.start || ''))
const end = computed(() => String(route.query.end || ''))

function normalizeStatus(status: string) {
  return status?.toUpperCase?.() || '-'
}

function formatDate(value: string) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatDateShort(value: string) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatDay(value: string) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long'
  })
}

function formatTime(value: string | null) {
  if (!value) return '-'

  if (value.includes('T')) {
    return value.slice(11, 16)
  }

  if (value.includes(' ')) {
    return value.split(' ')[1]?.slice(0, 5) || '-'
  }

  return value.slice(0, 5)
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

function getPcMinutes(item: AttendanceRow) {
  if (item.pc_minutes !== undefined) return Number(item.pc_minutes || 0)
  if (item.early_checkout_minutes !== undefined) return Number(item.early_checkout_minutes || 0)

  const checkout = toMinutes(item.checkout_time)
  const shiftEnd = toMinutes(item.shift_end)

  if (checkout === null || shiftEnd === null) return 0

  return checkout < shiftEnd ? shiftEnd - checkout : 0
}

function getOvertimeType(item: AttendanceRow) {
  if (item.overtime_type === 'front') return 'Lembur Depan'
  if (item.overtime_type === 'back') return 'Lembur Belakang'
  if (item.overtime_type === 'both') return 'Depan & Belakang'

  if (!item.ot_minutes || item.ot_minutes <= 0) return '-'

  const checkin = toMinutes(item.checkin_time)
  const checkout = toMinutes(item.checkout_time)
  const shiftStart = toMinutes(item.shift_start)
  const shiftEnd = toMinutes(item.shift_end)

  const front = checkin !== null && shiftStart !== null && checkin < shiftStart
  const back = checkout !== null && shiftEnd !== null && checkout > shiftEnd

  if (front && back) return 'Depan & Belakang'
  if (front) return 'Lembur Depan'
  if (back) return 'Lembur Belakang'

  return '-'
}

function getLeaveLabel(status: string, leaveType?: string | null) {
  if (leaveType) return leaveType
  if (status === 'SICK') return 'Izin Sakit'
  if (status === 'LEAVE') return 'Cuti'
  if (status === 'PERMIT') return 'Izin'

  return 'Izin'
}

const tableRows = computed<TableRow[]>(() => {
  return rows.value.map((item, index) => {
    const status = normalizeStatus(item.status)
    const pc = getPcMinutes(item)
    const overtimeType = getOvertimeType(item)

    const baseRow = {
      no: index + 1,
      day: formatDay(item.date),
      date: formatDateShort(item.date),
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
        type: overtimeType,
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
        reason: pc > 0
          ? `Terlambat & Pulang Cepat ${pc} Menit`
          : item.reason || 'Terlambat',
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

const totalPresent = computed(() => {
  return rows.value.filter(row => normalizeStatus(row.status) === 'PRESENT').length
})

const totalAbsent = computed(() => {
  return rows.value.filter(row => normalizeStatus(row.status) === 'ABSENT').length
})

const totalOff = computed(() => {
  return rows.value.filter(row => normalizeStatus(row.status) === 'OFF').length
})

const totalHoliday = computed(() => {
  return rows.value.filter(row => normalizeStatus(row.status) === 'HOLIDAY').length
})

const totalLeave = computed(() => {
  return rows.value.filter(row =>
    ['LEAVE', 'SICK', 'PERMIT'].includes(normalizeStatus(row.status))
  ).length
})

const totalLate = computed(() => {
  return rows.value.reduce((total, row) => {
    return total + Number(row.dt_minutes || 0)
  }, 0)
})

const totalPc = computed(() => {
  return rows.value.reduce((total, row) => {
    return total + getPcMinutes(row)
  }, 0)
})

const totalOtMinutes = computed(() => {
  return rows.value.reduce((total, row) => {
    return total + Number(row.ot_minutes || 0)
  }, 0)
})

const totalLateCount = computed(() => {
  return rows.value.filter(row => Number(row.dt_minutes || 0) > 0).length
})

const totalPcCount = computed(() => {
  return rows.value.filter(row => getPcMinutes(row) > 0).length
})

const totalOtCount = computed(() => {
  return rows.value.filter(row => Number(row.ot_minutes || 0) > 0).length
})

async function loadEmployee() {
  try {
    const res = await api.get('/hris/employees')
    const employees: Employee[] = res.data?.data ?? []

    const employee = employees.find((item) => {
      return String(item.id) === employeeId.value
    })

    employeeName.value
      = employee?.nama
        || employee?.employee_name
        || employee?.full_name
        || '-'
  } catch (error) {
    console.error(error)
    employeeName.value = '-'
  }
}

async function loadReport() {
  loading.value = true

  try {
    const res = await api.get('/hris/attendance/report', {
      params: {
        employee_id: employeeId.value,
        start: start.value,
        end: end.value
      }
    })

    rows.value = res.data?.data ?? []
  } catch (error) {
    console.error(error)
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadEmployee(),
    loadReport()
  ])

  setTimeout(() => {
    window.print()
  }, 500)
})
</script>

<template>
  <div class="min-h-screen bg-white p-6 text-black">
    <div class="mx-auto max-w-[1400px]">
      <div class="mb-3 border-b border-black pb-2">
        <div class="text-center">
          <h1 class="text-lg font-bold uppercase tracking-wide">
            Attendance Report
          </h1>

          <div class="mt-1 space-y-0.5 text-xs">
            <p>
              <strong>{{ employeeName }}</strong>
              ({{ employeeId }})
            </p>

            <p>
              Period :
              <strong>{{ formatDate(start) }}</strong>
              -
              <strong>{{ formatDate(end) }}</strong>
            </p>

            <p class="text-[10px]">
              Printed :
              {{ new Date().toLocaleString('id-ID') }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="loading"
        class="py-10 text-center text-sm"
      >
        Loading report...
      </div>

      <template v-else>
        <div class="summary-print mb-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border border-black p-3 text-[13px] font-medium">
          <span><strong>Present</strong> : {{ totalPresent }}</span>
          <span><strong>Absent</strong> : {{ totalAbsent }}</span>
          <span><strong>Off</strong> : {{ totalOff }}</span>
          <span><strong>Holiday</strong> : {{ totalHoliday }}</span>
          <span><strong>Leave</strong> : {{ totalLeave }}</span>
          <span><strong>Late</strong> : {{ totalLateCount }} kali, Total : {{ totalLate }} minutes</span>
          <span><strong>PC</strong> : {{ totalPcCount }} kali, Total : {{ totalPc }} minutes</span>
          <span><strong>OT</strong> : {{ totalOtCount }} kali, Total : {{ totalOtMinutes }} minutes</span>
        </div>

        <table class="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th rowspan="2" class="border border-black p-1 text-center">
                NO
              </th>
              <th rowspan="2" class="border border-black p-1">
                HARI
              </th>
              <th rowspan="2" class="border border-black p-1">
                TANGGAL
              </th>
              <th colspan="2" class="border border-black p-1 text-center">
                JADWAL SHIFT
              </th>
              <th colspan="2" class="border border-black p-1 text-center">
                FINGER SCAN
              </th>
              <th colspan="3" class="border border-black p-1 text-center">
                TOTAL (MENIT)
              </th>
              <th colspan="4" class="border border-black p-1 text-center">
                OVERTIME
              </th>
              <th rowspan="2" class="border border-black p-1">
                UML
              </th>
              <th rowspan="2" class="border border-black p-1">
                ALASAN
              </th>
              <th rowspan="2" class="border border-black p-1 text-center">
                STATUS
              </th>
              <th rowspan="2" class="border border-black p-1">
                TYPE LEMBUR
              </th>
            </tr>

            <tr>
              <th class="border border-black p-1 text-center">
                MASUK
              </th>
              <th class="border border-black p-1 text-center">
                KELUAR
              </th>
              <th class="border border-black p-1 text-center">
                MASUK
              </th>
              <th class="border border-black p-1 text-center">
                KELUAR
              </th>
              <th class="border border-black p-1 text-center">
                JAM
              </th>
              <th class="border border-black p-1 text-center">
                DT
              </th>
              <th class="border border-black p-1 text-center">
                PC
              </th>
              <th class="border border-black p-1 text-center">
                JAM
              </th>
              <th class="border border-black p-1 text-center">
                IST
              </th>
              <th class="border border-black p-1 text-center">
                OT
              </th>
              <th class="border border-black p-1 text-center">
                COST
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in tableRows"
              :key="row.no"
            >
              <td class="border border-black p-1 text-center">
                {{ row.no }}
              </td>

              <td
                class="border border-black p-1"
                :class="row.rowType === 'alpha' ? 'font-bold' : ''"
              >
                {{ row.day }}
              </td>

              <td
                class="border border-black p-1"
                :class="row.rowType === 'alpha' ? 'font-bold' : ''"
              >
                {{ row.date }}
              </td>

              <template v-if="row.rowType === 'holiday'">
                <td
                  colspan="13"
                  class="border border-black p-1 text-center font-bold"
                >
                  {{ row.holiday }}
                </td>

                <td class="border border-black p-1 text-center font-bold">
                  {{ row.status }}
                </td>

                <td class="border border-black p-1">
                  {{ row.type }}
                </td>
              </template>

              <template v-else-if="row.rowType === 'sick'">
                <td class="border border-black p-1 text-center">
                  {{ row.shiftIn }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.shiftOut }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.scanIn }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.scanOut }}
                </td>

                <td
                  colspan="9"
                  class="border border-black p-1 text-center font-semibold italic"
                >
                  {{ row.leaveInfo }}
                </td>

                <td class="border border-black p-1 text-center font-bold">
                  {{ row.status }}
                </td>

                <td class="border border-black p-1">
                  {{ row.type }}
                </td>
              </template>

              <template v-else>
                <td class="border border-black p-1 text-center">
                  {{ row.shiftIn }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.shiftOut }}
                </td>

                <td
                  class="border border-black p-1 text-center"
                  :class="row.scanIn === 'ALFA' ? 'font-bold' : ''"
                >
                  {{ row.scanIn }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.scanOut }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.totalJam }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.dt }}
                </td>

                <td
                  class="border border-black p-1 text-center"
                  :class="row.pc && row.pc > 0 ? 'font-bold' : ''"
                >
                  {{ row.pc }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.overtimeJam }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.ist }}
                </td>

                <td class="border border-black p-1 text-center font-bold">
                  {{ row.ot }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.cost }}
                </td>

                <td class="border border-black p-1 text-center">
                  {{ row.uml }}
                </td>

                <td
                  class="border border-black p-1"
                  :class="[
                    row.rowType === 'alpha' ? 'font-semibold' : '',
                    row.rowType === 'late' ? 'font-semibold' : '',
                    row.rowType === 'early' ? 'font-semibold' : 'italic'
                  ]"
                >
                  {{ row.reason }}
                </td>

                <td class="border border-black p-1 text-center font-bold">
                  {{ row.status }}
                </td>

                <td class="border border-black p-1">
                  {{ row.type }}
                </td>
              </template>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 grid grid-cols-2 gap-24 text-[11px]">
          <div class="text-center">
            <p>Karyawan,</p>
            <div class="h-10" />
            <p class="font-semibold underline">
              {{ employeeName }}
            </p>
          </div>

          <div class="text-center">
            <p>HR,</p>
            <div class="h-10" />
            <p class="font-semibold underline">
              HR Department
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4 landscape;
    margin: 4mm;
  }

  html,
  body {
    width: 100%;
    height: auto;
  }

  body {
    zoom: 85%;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  table {
    width: 100%;
    font-size: 8px;
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  thead {
    display: table-header-group;
  }

  thead th {
    font-size: 9px !important;
    font-weight: 700 !important;
  }

  th,
  td {
    padding: 3px 4px !important;
  }

  .summary-print {
    margin-bottom: 4px !important;
    padding: 4px 6px !important;
    gap: 4px 14px !important;
    font-size: 10px !important;
    line-height: 1.4 !important;
    text-align: center !important;
  }
}
</style>
