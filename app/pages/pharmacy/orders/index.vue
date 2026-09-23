<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Table } from '@tanstack/table-core'
import type { PharmacyOrderGroup } from '~/types/outpatient'
import { PRESCRIPTION_STATUS_LABEL, formatDateTime } from '~/constants/outpatient'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const api = useApi()
const router = useRouter()

const statusFilter = ref('ALL')
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const { data: groups, refresh, pending } = await useAsyncData(
  'pharmacy-orders',
  async () => {
    const res = await api.get('/outpatient/pharmacy/orders', {
      params: {
        status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
        search: search.value || undefined,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined
      }
    })
    return res.data.data as PharmacyOrderGroup[]
  }
)

watch([statusFilter, search, dateFrom, dateTo], () => refresh())

const rows = computed(() => groups.value ?? [])

function orderStatuses(group: PharmacyOrderGroup) {
  return [...new Set(group.orders.map(o => o.status))]
}

function lastActivity(group: PharmacyOrderGroup) {
  const stamps = group.orders.map(o => o.sentAt || o.createdAt).filter(Boolean) as string[]
  if (!stamps.length) return null
  return stamps.sort().at(-1) ?? null
}

function openDetail(group: PharmacyOrderGroup) {
  router.push(`/pharmacy/orders/${group.encounter.id}`)
}

const table = useTemplateRef<{ tableApi: Table<PharmacyOrderGroup> }>('table')
const currentPage = ref(1)
const currentPageSize = computed({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (v: number) => {
    table.value?.tableApi?.setPageSize(v)
    currentPage.value = 1
  }
})
watch(() => table.value?.tableApi?.getState().pagination.pageIndex, (idx) => {
  currentPage.value = (idx ?? 0) + 1
}, { immediate: true })
watch(currentPage, (page) => {
  table.value?.tableApi?.setPageIndex(page - 1)
})

const columns: TableColumn<PharmacyOrderGroup>[] = [
  {
    id: 'queue',
    header: 'Kode Antrian',
    cell: ({ row }) => h('div', {}, [
      h('div', { class: 'font-semibold text-highlighted' }, row.original.encounter.queueCode),
      h('div', { class: 'font-mono text-[10px] text-muted' }, `ID ${row.original.encounter.id}`)
    ])
  },
  {
    id: 'patient',
    header: 'Pasien',
    cell: ({ row }) => h('div', {}, [
      h('div', { class: 'font-medium' }, row.original.encounter.patient?.fullName ?? '-'),
      h('div', { class: 'text-xs text-muted' }, row.original.encounter.patient?.patientCode ?? '')
    ])
  },
  {
    id: 'service',
    header: 'Layanan',
    cell: ({ row }) => row.original.encounter.registration?.serviceType ?? '-'
  },
  {
    id: 'orders',
    header: 'Order',
    cell: ({ row }) => h(UBadge, { label: `${row.original.orders.length} order`, color: 'neutral', variant: 'subtle' })
  },
  {
    id: 'additional',
    header: 'Tambahan',
    cell: ({ row }) => row.original.hasAdditional
      ? h(UBadge, { label: 'Ada Tambahan', color: 'warning', variant: 'subtle', icon: 'i-lucide-flag' })
      : h('span', { class: 'text-xs text-muted' }, '-')
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => h('div', { class: 'flex flex-wrap gap-1' }, row.original.orders.length
      ? orderStatuses(row.original).map(status =>
          h(UBadge, {
            label: PRESCRIPTION_STATUS_LABEL[status] || status,
            color: 'neutral',
            variant: 'subtle'
          })
        )
      : [h('span', { class: 'text-xs text-muted' }, '-')])
  },
  {
    id: 'lastAt',
    header: 'Terakhir',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, formatDateTime(lastActivity(row.original)))
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UButton, {
      label: 'Detail',
      icon: 'i-lucide-arrow-right',
      size: 'xs',
      variant: 'subtle',
      onClick: () => openDetail(row.original)
    }))
  }
]
</script>

<template>
  <UDashboardPanel id="pharmacy-orders">
    <template #header>
      <UDashboardNavbar title="Farmasi — Order Obat">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari pasien / kode antrian..."
            class="max-w-sm"
          />
          <USelect
            v-model="statusFilter"
            :items="[
              { value: 'ALL', label: 'Semua status' },
              { value: 'SENT', label: 'Terkirim' },
              { value: 'PARTIAL', label: 'Sebagian' },
              { value: 'COMPLETED', label: 'Selesai' }
            ]"
            class="w-44"
          />
          <UInput v-model="dateFrom" type="date" class="w-40" />
          <UInput v-model="dateTo" type="date" class="w-40" />
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            @click="refresh()"
          />
        </div>

        <UTable
          ref="table"
          :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
          sticky
          class="w-full"
          :loading="pending"
          :data="rows"
          :columns="columns"
          :ui="{ base: 'table-fixed border-separate border-spacing-0', thead: '[&>tr]:bg-elevated/50', th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r', td: 'border-b border-default' }"
        />

        <div class="flex items-center justify-between gap-3">
          <div class="text-sm text-muted">
            {{ rows.length }} kode antrian
          </div>
          <div class="flex items-center gap-1.5">
            <USelect
              v-model="currentPageSize"
              :items="[{ label: '10', value: 10 }, { label: '20', value: 20 }, { label: '50', value: 50 }]"
              class="w-20"
            />
            <UPagination v-model:page="currentPage" :items-per-page="currentPageSize" :total="rows.length" />
          </div>
        </div>

        <div v-if="!pending && !rows.length" class="rounded-lg border border-default py-10 text-center text-muted">
          Belum ada order obat.
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
