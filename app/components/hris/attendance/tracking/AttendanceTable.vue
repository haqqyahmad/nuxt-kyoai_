<!-- app/components/hris/attendance/dashboard/AttendanceTable.vue -->

<script setup lang="ts">
const rows = [
  {
    no: 1,
    day: 'Senin',
    date: '21/10/2024',
    shiftIn: '06:00',
    shiftOut: '14:00',
    scanIn: '05:54',
    scanOut: '14:05',
    totalJam: 480,
    dt: 0,
    pc: 0,
    overtimeJam: 0,
    ist: 0,
    ot: 0,
    cost: 0,
    uml: '-',
    reason: 'Reguler',
    status: '-',
    type: '-',
    rowType: 'normal'
  },
  {
    no: 2,
    day: 'Selasa',
    date: '22/10/2024',
    holiday: 'Libur Nasional (Hari Santri)',
    status: 'LBR',
    type: '-',
    rowType: 'holiday'
  },
  {
    no: 3,
    day: 'Rabu',
    date: '23/10/2024',
    shiftIn: '06:00',
    shiftOut: '14:00',
    scanIn: 'ALFA',
    scanOut: '-',
    totalJam: 0,
    dt: 0,
    pc: 0,
    overtimeJam: 0,
    ist: 0,
    ot: 0,
    cost: 0,
    uml: '-',
    reason: 'Tanpa Keterangan',
    status: 'A',
    type: '-',
    rowType: 'alpha'
  },
  {
    no: 4,
    day: 'Kamis',
    date: '24/10/2024',
    shiftIn: '06:00',
    shiftOut: '14:00',
    scanIn: '-',
    scanOut: '-',
    leaveInfo: 'Izin Sakit (Medical Certificate Provided)',
    status: 'S',
    type: '-',
    rowType: 'sick'
  }
]
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
              'bg-success/10': row.rowType === 'holiday',
              'bg-error/5': row.rowType === 'alpha',
              'bg-primary/10': row.rowType === 'sick'
            }"
          >
            <td class="border border-default p-2 text-center">
              {{ row.no }}
            </td>
            <td
              class="border border-default p-2"
              :class="row.rowType === 'alpha' ? 'font-bold text-error' : ''"
            >
              {{ row.day }}
            </td>
            <td
              class="border border-default p-2"
              :class="row.rowType === 'alpha' ? 'font-bold text-error' : ''"
            >
              {{ row.date }}
            </td>

            <template v-if="row.rowType === 'holiday'">
              <td colspan="13" class="border border-default p-2 text-center font-bold text-success">
                {{ row.holiday }}
              </td>
              <td class="border border-default p-2 text-center font-bold text-success">
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
              <td colspan="9" class="border border-default p-2 text-center font-semibold italic text-primary">
                {{ row.leaveInfo }}
              </td>
              <td class="border border-default p-2 text-center font-bold text-primary">
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
                :class="row.scanIn === 'ALFA' ? 'font-bold text-error' : ''"
              >
                {{ row.scanIn }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.scanOut }}
              </td>
              <td class="border border-default p-2 text-center">
                {{ row.totalJam }}
              </td>
              <td class="border border-default p-2 text-center text-error">
                {{ row.dt }}
              </td>
              <td class="border border-default p-2 text-center text-error">
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
                :class="row.rowType === 'alpha' ? 'text-error' : 'italic'"
              >
                {{ row.reason }}
              </td>
              <td
                class="border border-default p-2 text-center font-bold"
                :class="row.rowType === 'alpha' ? 'text-error' : ''"
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
