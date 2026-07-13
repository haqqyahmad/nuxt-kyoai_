<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const api = useApi()
const toast = useToast()

type PaketRow = {
  id: string
  paketName: string
  itemCount: number
  inputanCount: number
  firstItems: string[]
  isActive: boolean
  createdAt: string
}

function mapPaket(paket: any): PaketRow {
  const paketItems = Array.isArray(paket?.paketItems) ? paket.paketItems : []

  return {
    id: paket.id,
    paketName: paket.name,
    itemCount: paketItems.length,
    inputanCount: paketItems.reduce(
      (sum: number, paketItem: any) => sum + (paketItem.item?.inputans?.length ?? 0),
      0
    ),
    firstItems: paketItems
      .slice(0, 3)
      .map((paketItem: any) => paketItem.item?.name)
      .filter(Boolean),
    isActive: paket.isActive,
    createdAt: paket.createdAt
  }
}

const { data: paketData, refresh } = await useAsyncData('paket-mcu', () =>
  api.get('/mcu/pakets').then(res => (res.data.data ?? []).map(mapPaket))
)

const data = computed(() => paketData.value ?? [])

const columnFilters = ref([
  {
    id: 'paketName',
    value: ''
  }
])

const columnVisibility = ref()
const rowSelection = ref({})
const isDeleteModalOpen = ref(false)
const selectedDeleteId = ref<string | null>(null)

async function deletePaket(id: string) {
  try {
    await api.delete(`/mcu/pakets/${id}`)

    toast.add({
      title: 'Berhasil',
      description: 'Paket berhasil dihapus',
      color: 'success'
    })

    await refresh()
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus paket',
      color: 'error'
    })
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return

  await deletePaket(selectedDeleteId.value)
  selectedDeleteId.value = null
}

async function deleteSelectedRows() {
  const selectedRows
    = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []

  if (!selectedRows.length) return

  try {
    await Promise.all(
      selectedRows.map((row: any) => api.delete(`/mcu/pakets/${row.original.id}`))
    )

    toast.add({
      title: 'Berhasil',
      description: 'Data paket berhasil dihapus',
      color: 'success'
    })

    table.value?.tableApi?.resetRowSelection()
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus paket',
      color: 'error'
    })
  }
}

function getRowItems(row: Row<PaketRow>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'View paket detail',
      icon: 'i-lucide-eye',
      to: `/services/packages/${row.original.id}`
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete paket',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        selectedDeleteId.value = row.original.id
        isDeleteModalOpen.value = true
      }
    }
  ]
}

const columns: TableColumn<PaketRow>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
  {
    accessorKey: 'paketName',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Name',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col' }, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.paketName),
        h('p', { class: 'text-xs text-muted' }, `${row.original.itemCount} item • ${row.original.inputanCount} inputan`)
      ])
    }
  },
  {
    accessorKey: 'firstItems',
    header: 'Preview Item',
    cell: ({ row }) => {
      const firstItems = row.original.firstItems

      if (!firstItems.length) return '-'

      return h('div', { class: 'flex flex-col gap-1' }, [
        h('p', { class: 'text-sm text-highlighted truncate' }, firstItems.join(', ')),
        row.original.itemCount > firstItems.length
          ? h('p', { class: 'text-xs text-muted' }, `+${row.original.itemCount - firstItems.length} item lainnya`)
          : null
      ])
    }
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      const active = row.getValue('isActive') as boolean

      return h(UBadge, {
        label: active ? 'Active' : 'Inactive',
        color: active ? 'success' : 'error',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const value = row.getValue('createdAt') as string

      if (!value) return '-'

      return new Date(value).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end'
            },
            items: getRowItems(row)
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
]

const table = useTemplateRef('table')

const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi
        ?.getColumn('paketName')
        ?.getFilterValue() as string) || ''
    )
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn('paketName')
      ?.setFilterValue(value || undefined)
  }
})

const currentPage = ref(1)

const currentPageSize = computed({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (value: number) => {
    table.value?.tableApi?.setPageSize(value)
    currentPage.value = 1
  }
})

watch(
  () => table.value?.tableApi?.getState().pagination.pageIndex,
  (idx) => {
    currentPage.value = (idx ?? 0) + 1
  },
  { immediate: true }
)

watch(currentPage, (page) => {
  table.value?.tableApi?.setPageIndex(page - 1)
})
</script>

<template>
  <UDashboardPanel id="packages">
    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search paket MCU..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            icon="i-lucide-package-plus"
            color="primary"
            to="/services/packages/create"
          >
            New Package
          </UButton>

          <BaseDeleteModal
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="item paket"
            @confirm="deleteSelectedRows"
          >
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
              color="error"
              variant="subtle"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>
                  {{
                    table?.tableApi?.getFilteredSelectedRowModel().rows.length
                  }}
                </UKbd>
              </template>
            </UButton>
          </BaseDeleteModal>

          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi
                      ?.getColumn(column.id)
                      ?.toggleVisibility(!!checked)
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault()
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        sticky
        class="w-full"
        :data="data"
        :columns="columns"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }}
          of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s)
          selected.
        </div>

        <div class="flex items-center gap-1.5">
          <USelect
            v-model="currentPageSize"
            :items="[
              { label: '10 items', value: 10 },
              { label: '20 items', value: 20 },
              { label: '50 items', value: 50 },
              { label: 'All', value: 1000 }
            ]"
            class="w-32"
          />

          <UPagination
            v-model:page="currentPage"
            :items-per-page="currentPageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>

      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="paket"
        @confirm="handleDeleteById"
      />
    </template>
  </UDashboardPanel>
</template>
