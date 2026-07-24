<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { computed } from 'vue'

type SampleUser = { id: number, name: string, email?: string | null }

export type SampleCollectionHistoryRow = {
  id: string
  status: string
  tubeCount?: number | null
  barcode?: string | null
  collectedAt?: string | null
  receivedAt?: string | null
  collectedByUser?: SampleUser | null
  receivedByUser?: SampleUser | null
  sampleType?: { id: string, name?: string | null } | null
  queueEntry?: {
    id: string
    queueCode?: string | null
    registration?: {
      examDate?: string | null
      id_reg?: string | null
      patient?: {
        PatientId?: string | null
        firstName?: string | null
        middleName?: string | null
        lastName?: string | null
      } | null
    } | null
  } | null
  items?: Array<{
    id: string
    item?: { id: string, code?: string | null, name?: string | null } | null
  }>
}

type BadgeColor = 'success' | 'info' | 'error' | 'warning' | 'neutral'

type GroupedRow = {
  queueEntryId: string
  queueCode: string
  idReg: string
  patientName: string
  patientId: string
  examDate: string
  samples: SampleCollectionHistoryRow[]
}

const props = defineProps<{
  data: SampleCollectionHistoryRow[]
  loading?: boolean
}>()

const emit = defineEmits<{
  detail: [row: SampleCollectionHistoryRow]
  navigate: [row: SampleCollectionHistoryRow]
}>()

function patientName(row: SampleCollectionHistoryRow) {
  const patient = row.queueEntry?.registration?.patient
  return [patient?.firstName, patient?.middleName, patient?.lastName]
    .filter(Boolean)
    .join(' ') || '-'
}

function statusLabel(status: string) {
  if (status === 'PENDING') return 'Belum Diambil'
  if (status === 'COLLECTED') return 'Sudah Diambil'
  if (status === 'RECEIVED') return 'Diterima Lab'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Dijadwalkan Ulang'
  return status
}

function statusColor(status: string): BadgeColor {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'neutral'
}

const sampleTypeColorMap: Record<string, string> = {
  'Darah': 'error',
  'Serum': 'warning',
  'Plasma': 'info',
  'Urine': 'success',
  'Feses': 'neutral',
  'Sputum': 'primary',
  'Swab': 'info',
  'Semen': 'warning',
  'Aspirat': 'error',
  'Jaringan': 'primary'
}
const defaultSampleColor = 'neutral'
function sampleTypeColor(name: string) {
  return sampleTypeColorMap[name] ?? defaultSampleColor
}

function groupByPatient(rows: SampleCollectionHistoryRow[]): GroupedRow[] {
  const map = new Map<string, GroupedRow>()
  for (const row of rows) {
    const key = row.queueEntry?.id ?? row.id
    if (!map.has(key)) {
      const p = row.queueEntry?.registration?.patient
      map.set(key, {
        queueEntryId: row.queueEntry?.id ?? '',
        queueCode: row.queueEntry?.queueCode || '-',
        idReg: row.queueEntry?.registration?.id_reg || '-',
        patientName: [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(' ') || '-',
        patientId: p?.PatientId || '-',
        examDate: row.queueEntry?.registration?.examDate || '-',
        samples: []
      })
    }
    map.get(key)!.samples.push(row)
  }
  return Array.from(map.values())
}

const groupedData = computed(() => groupByPatient(props.data))

const columns: ColumnDef<GroupedRow>[] = [
  {
    id: 'patient',
    header: 'Pasien',
    enableSorting: false
  },
  {
    id: 'examDate',
    header: 'Tanggal Exam',
    enableSorting: false
  },
  {
    id: 'sample',
    header: 'Sample / Item',
    enableSorting: false
  },
  {
    id: 'action',
    header: 'Aksi',
    enableSorting: false
  }
]

const table = useVueTable({
  data: groupedData,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel()
})
</script>

<template>
  <table class="w-full text-sm">
    <thead class="sticky top-0 z-10 bg-elevated/95 backdrop-blur-sm">
      <tr class="border-b border-default">
        <th
          v-for="header in table.getHeaderGroups()[0]?.headers ?? []"
          :key="header.id"
          class="px-4 py-3 text-left text-xs font-medium text-muted"
          :class="{
            'w-[30%]': header.column.id === 'patient',
            'w-[12%]': header.column.id === 'examDate',
            'w-[43%]': header.column.id === 'sample',
            'w-[15%]': header.column.id === 'action'
          }"
        >
          <FlexRender
            v-if="!header.isPlaceholder"
            :render="header.column.columnDef.header"
            :props="header.getContext()"
          />
        </th>
      </tr>
    </thead>

    <tbody>
      <tr v-if="loading">
        <td :colspan="columns.length" class="h-64 text-center text-muted">
          <div class="flex items-center justify-center gap-2">
            <UIcon name="i-lucide-loader-circle" class="animate-spin size-4" />
            <span>Memuat data...</span>
          </div>
        </td>
      </tr>

      <tr v-else-if="!table.getRowModel().rows.length">
        <td :colspan="columns.length" class="h-64 text-center text-muted">
          <div class="flex flex-col items-center gap-2">
            <UIcon name="i-lucide-inbox" class="size-8 text-muted/50" />
            <span>Tidak ada data sample collection.</span>
          </div>
        </td>
      </tr>

      <tr
        v-for="tableRow in table.getRowModel().rows"
        v-else
        :key="tableRow.original.queueEntryId"
        class="border-b border-default/50 transition-colors hover:bg-muted/30"
      >
        <td
          v-for="cell in tableRow.getVisibleCells()"
          :key="cell.id"
          class="px-4 py-3"
        >
          <template v-if="cell.column.id === 'patient'">
            <p class="font-medium text-highlighted">
              {{ tableRow.original.patientName }}
            </p>
            <p class="text-xs text-muted">
              {{ tableRow.original.idReg }}
              · Queue {{ tableRow.original.queueCode }}
            </p>
          </template>

          <template v-else-if="cell.column.id === 'examDate'">
            {{ tableRow.original.examDate }}
          </template>

          <template v-else-if="cell.column.id === 'sample'">
            <div class="flex flex-wrap gap-2">
              <div
                v-for="s in tableRow.original.samples"
                :key="s.id"
                class="flex items-center gap-2 rounded-lg border border-default/60 bg-muted/10 px-2.5 py-1.5"
              >
                <span class="font-medium text-highlighted">{{ s.sampleType?.name || 'Sample' }}</span>
                <UBadge
                  :color="statusColor(s.status)"
                  variant="soft"
                  size="xs"
                >
                  {{ statusLabel(s.status) }}
                </UBadge>
              </div>
            </div>
          </template>

          <template v-else-if="cell.column.id === 'action'">
            <UDropdownMenu
              :items="[[
                ...(tableRow.original.samples.some(s => s.status === 'PENDING') && tableRow.original.queueEntryId ? [{
                  label: 'Lanjutkan',
                  icon: 'i-lucide-arrow-right',
                  onSelect: () => {
                    const first = tableRow.original.samples[0]
                    if (first) emit('navigate', first)
                  }
                }] : []),
                {
                  label: 'Detail',
                  icon: 'i-lucide-eye',
                  onSelect: () => {
                    const first = tableRow.original.samples[0]
                    if (first) emit('detail', first)
                  }
                }
              ]]"
              :content="{ align: 'end' }"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                size="xs"
              />
            </UDropdownMenu>
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>
