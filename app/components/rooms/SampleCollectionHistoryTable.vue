<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { computed } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table/exports'

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

const props = defineProps<{
  data: SampleCollectionHistoryRow[]
  loading?: boolean
}>()

const emit = defineEmits<{
  detail: [row: SampleCollectionHistoryRow]
}>()

const columns: ColumnDef<SampleCollectionHistoryRow>[] = [
  { id: 'patient', header: 'Pasien' },
  { id: 'examDate', header: 'Tanggal Exam' },
  { id: 'sample', header: 'Sample / Item' },
  { id: 'collection', header: 'Collection' },
  { id: 'receive', header: 'Receive' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'action', header: 'Aksi' }
]

const tableData = computed(() => props.data)

const table = useVueTable({
  data: tableData,
  columns,
  getCoreRowModel: getCoreRowModel()
})

function patientName(row: SampleCollectionHistoryRow) {
  const patient = row.queueEntry?.registration?.patient
  return [patient?.firstName, patient?.middleName, patient?.lastName]
    .filter(Boolean)
    .join(' ') || '-'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function statusLabel(status: string) {
  if (status === 'PENDING') return 'Belum Diambil'
  if (status === 'COLLECTED') return 'Sudah Diambil'
  if (status === 'RECEIVED') return 'Diterima Lab'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Dijadwalkan Ulang'
  return status
}

function statusClass(status: string) {
  if (status === 'RECEIVED') return 'bg-success/15 text-success'
  if (status === 'COLLECTED') return 'bg-info/15 text-info'
  if (status === 'REJECTED') return 'bg-error/15 text-error'
  if (status === 'RESCHEDULED') return 'bg-warning/15 text-warning'
  return 'bg-muted text-muted'
}
</script>

<template>
  <Table class="table-fixed">
    <TableHeader class="sticky top-0 z-10 bg-elevated">
      <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
        <TableHead
          v-for="header in headerGroup.headers"
          :key="header.id"
          :class="{
            'w-[19%]': header.column.id === 'patient',
            'w-[11%]': header.column.id === 'examDate',
            'w-[20%]': header.column.id === 'sample',
            'w-[14%]': ['collection', 'receive'].includes(header.column.id),
            'w-[12%]': header.column.id === 'status',
            'w-[10%]': header.column.id === 'action'
          }"
        >
          <FlexRender
            v-if="!header.isPlaceholder"
            :render="header.column.columnDef.header"
            :props="header.getContext()"
          />
        </TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      <TableRow v-if="loading">
        <TableCell :colspan="columns.length" class="h-64 text-center text-muted">
          Memuat history sample collection...
        </TableCell>
      </TableRow>

      <TableRow v-else-if="!table.getRowModel().rows.length">
        <TableCell :colspan="columns.length" class="h-64 text-center text-muted">
          Tidak ada history sample collection.
        </TableCell>
      </TableRow>

      <TableRow
        v-for="tableRow in table.getRowModel().rows"
        v-else
        :key="tableRow.id"
      >
        <TableCell
          v-for="cell in tableRow.getVisibleCells()"
          :key="cell.id"
          class="break-words align-top"
        >
          <template v-if="cell.column.id === 'patient'">
            <p class="font-medium text-highlighted">
              {{ patientName(tableRow.original) }}
            </p>
            <p class="text-xs text-muted">
              {{ tableRow.original.queueEntry?.registration?.patient?.PatientId || '-' }}
              · {{ tableRow.original.queueEntry?.queueCode || '-' }}
            </p>
          </template>

          <template v-else-if="cell.column.id === 'examDate'">
            {{ tableRow.original.queueEntry?.registration?.examDate || '-' }}
          </template>

          <template v-else-if="cell.column.id === 'sample'">
            <p class="font-medium text-highlighted">
              {{ tableRow.original.sampleType?.name || 'Sample' }}
            </p>
            <p class="text-xs text-muted">
              {{ tableRow.original.items?.map(item => item.item?.name || item.item?.code).filter(Boolean).join(', ') || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ tableRow.original.tubeCount ?? 1 }} tabung · {{ tableRow.original.barcode || 'Tanpa barcode' }}
            </p>
          </template>

          <template v-else-if="cell.column.id === 'collection'">
            <p>{{ tableRow.original.collectedByUser?.name || '-' }}</p>
            <p class="text-xs text-muted">
              {{ formatDateTime(tableRow.original.collectedAt) }}
            </p>
          </template>

          <template v-else-if="cell.column.id === 'receive'">
            <p>{{ tableRow.original.receivedByUser?.name || '-' }}</p>
            <p class="text-xs text-muted">
              {{ formatDateTime(tableRow.original.receivedAt) }}
            </p>
          </template>

          <span
            v-else-if="cell.column.id === 'status'"
            class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
            :class="statusClass(tableRow.original.status)"
          >
            {{ statusLabel(tableRow.original.status) }}
          </span>

          <button
            v-else-if="cell.column.id === 'action'"
            type="button"
            class="inline-flex cursor-pointer items-center rounded-md border border-default bg-elevated px-2.5 py-1.5 text-xs font-medium text-highlighted hover:bg-muted"
            @click="emit('detail', tableRow.original)"
          >
            Detail
          </button>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
