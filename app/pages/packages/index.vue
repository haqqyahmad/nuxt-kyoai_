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
  paketId: string
  paketName: string
  itemId: string
  itemCode: string
  itemName: string
  inputanCount: number
  isActive: boolean
  createdAt: string
}

function mapPaket(paket: any): PaketRow[] {
  return paket.paketItems.map((paketItem: any) => ({
    id: paketItem.id,
    paketId: paket.id,
    paketName: paket.name,
    itemId: paketItem.item?.id,
    itemCode: paketItem.item?.code,
    itemName: paketItem.item?.name,
    inputanCount: paketItem.item?.inputans?.length ?? 0,
    isActive: paket.isActive,
    createdAt: paket.createdAt
  }))
}

const { data: paketData, refresh } = await useAsyncData('paket-mcu', () =>
  api.get('/paket').then(res => res.data.data.flatMap(mapPaket))
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

async function deletePaketItem(id: string) {
  try {
    await api.delete(`/paket-item/${id}`)

    toast.add({
      title: 'Berhasil',
      description: 'Item paket berhasil dihapus',
      color: 'success'
    })

    await refresh()
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus item paket',
      color: 'error'
    })
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return

  await deletePaketItem(selectedDeleteId.value)
  selectedDeleteId.value = null
}

async function deleteSelectedRows() {
  const selectedRows
    = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []

  if (!selectedRows.length) return

  try {
    await Promise.all(
      selectedRows.map((row: any) => api.delete(`/paket-item/${row.original.id}`))
    )

    toast.add({
      title: 'Berhasil',
      description: 'Data item paket berhasil dihapus',
      color: 'success'
    })

    table.value?.tableApi?.resetRowSelection()
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus data',
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
      label: 'View detail',
      icon: 'i-lucide-eye',
      to: `/items/${row.original.itemId}`
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete item paket',
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
        label: 'Paket MCU',
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
        h('p', { class: 'text-xs text-muted' }, row.original.paketId)
      ])
    }
  },
  {
    accessorKey: 'itemCode',
    header: 'Item Code',
    cell: ({ row }) => row.getValue('itemCode') || '-'
  },
  {
    accessorKey: 'itemName',
    header: 'Item Name',
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col' }, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.itemName),
        h('p', { class: 'text-xs text-muted' }, row.original.itemId)
      ])
    }
  },
  {
    accessorKey: 'inputanCount',
    header: 'Total Input',
    cell: ({ row }) =>
      h(UBadge, {
        label: `${row.getValue('inputanCount')} input`,
        color: 'info',
        variant: 'subtle'
      })
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

const currentPageSize = computed({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (value: number) => {
    table.value?.tableApi?.setPageSize(value)
  }
})
</script>

<template>
  <UDashboardPanel id="paket-mcu">
    <template #header>
      <UDashboardNavbar title="Paket MCU">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            to="/paket-mcu/create"
          >
            New Paket
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search paket MCU..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
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
            :default-page="
              (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
            "
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>

      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="item paket"
        @confirm="handleDeleteById"
      />
    </template>
  </UDashboardPanel>
</template>
