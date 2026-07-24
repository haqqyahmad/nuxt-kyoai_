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

function statusColor(status: string): BadgeColor {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'neutral'
}

const columns: ColumnDef<SampleCollectionHistoryRow>[] = [
  {
    id: 'patient',
    header: 'Pasien',
    accessorFn: row => patientName(row),
    enableSorting: true
  },
  {
    id: 'examDate',
    header: 'Tanggal Exam',
    accessorFn: row => row.queueEntry?.registration?.examDate || '',
    enableSorting: true
  },
  {
    id: 'sample',
    header: 'Sample / Item',
    accessorFn: row => row.sampleType?.name || '',
    enableSorting: true
  },
  {
    id: 'collection',
    header: 'Collection',
    accessorFn: row => row.collectedByUser?.name || '',
    enableSorting: true
  },
  {
    id: 'receive',
    header: 'Receive',
    accessorFn: row => row.receivedByUser?.name || '',
    enableSorting: true
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true
  },
  {
    id: 'action',
    header: 'Aksi',
    enableSorting: false
  }
]

const tableData = computed(() => props.data)

const table = useVueTable({
  data: tableData,
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
            'w-[22%]': header.column.id === 'patient',
            'w-[12%]': header.column.id === 'examDate',
            'w-[20%]': header.column.id === 'sample',
            'w-[14%]': ['collection', 'receive', 'action'].includes(header.column.id),
            'w-[10%]': header.column.id === 'status'
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
        :key="tableRow.id"
        class="border-b border-default/50 transition-colors hover:bg-muted/30"
      >
        <td
          v-for="cell in tableRow.getVisibleCells()"
          :key="cell.id"
          class="px-4 py-3 align-top"
        >
          <template v-if="cell.column.id === 'patient'">
            <p class="font-medium text-highlighted">
              {{ patientName(tableRow.original) }}
            </p>
            <p class="text-xs text-muted">
              {{ tableRow.original.queueEntry?.registration?.id_reg || '-' }}
              · Queue {{ tableRow.original.queueEntry?.queueCode || '-' }}
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

          <UBadge
            v-else-if="cell.column.id === 'status'"
            :color="statusColor(tableRow.original.status)"
            variant="soft"
          >
            {{ statusLabel(tableRow.original.status) }}
          </UBadge>

          <template v-else-if="cell.column.id === 'action'">
            <UDropdownMenu
              :items="[[
                ...(tableRow.original.status === 'PENDING' && tableRow.original.queueEntry?.id ? [{
                  label: 'Lanjutkan',
                  icon: 'i-lucide-arrow-right',
                  onSelect: () => emit('navigate', tableRow.original)
                }] : []),
                {
                  label: 'Detail',
                  icon: 'i-lucide-eye',
                  onSelect: () => emit('detail', tableRow.original)
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
