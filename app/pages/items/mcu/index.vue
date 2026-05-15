<!-- app/pages/items/mcu/index.vue -->
<script setup lang="ts">
import { h, resolveComponent, computed, ref } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import { getPaginationRowModel } from '@tanstack/table-core'
import ItemsAddModal from '~/components/item/ItemsAddModal.vue'
import ItemExamTemplateModal from '~/components/item/ItemExamTemplateModal.vue'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const api = useApi()
const toast = useToast()


type Department =
  | 'Laboratorium'
  | 'DoctorConsultation'
  | 'MCU'
  | 'Vaccine'
  | 'Antigen'
  | 'PCR'
  | 'VitaminInjection'
  | 'Pharmacy'
  | 'Dental'
  | 'Radiologi'

type Item = {
  id: string
  name: string
  code: string
  department: Department
  isActive?: boolean
  createdAt: string
}

const SERVICE_TYPE_LABEL: Record<Department, string> = {
  Laboratorium: 'Lab',
  DoctorConsultation: 'Consultation',
  MCU: 'MCU',
  Vaccine: 'Vaksin',
  Antigen: 'Antigen',
  PCR: 'PCR',
  VitaminInjection: 'Vitamin',
  Pharmacy: 'Farmasi',
  Dental: 'Gigi',
  Radiologi: 'Radiologi'
}

const SERVICE_TYPE_COLOR: Record<Department, any> = {
  Laboratory: 'success',
  DoctorConsultation: 'info',
  MCU: 'warning',
  Vaccine: 'success',
  Antigen: 'success',
  PCR: 'primary',
  VitaminInjection: 'secondary',
  Pharmacy: 'neutral',
  Dental: 'warning',
  Radiology: 'warning'
}

const {
  data: items,
  refresh,
  pending
} = await useAsyncData('items', async () => {
  const res = await api.get('/mcu/items')
  return res.data.data
})

const data = computed<Item[]>(() => items.value ?? [])
const isAddModalOpen = ref(false)
const columnFilters = ref([{ id: 'name', value: '' }])
const columnVisibility = ref({})
const rowSelection = ref({})

const table = useTemplateRef('table')

const selectedDeleteId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)

// ─── Exam Template Modal ───────────────────────────────────────────────────────
const isExamTemplateModalOpen = ref(false)
const selectedTemplateItem = ref<{ id: string; name: string } | null>(null)

function openExamTemplate(row: Row<Item>) {
  selectedTemplateItem.value = { id: row.original.id, name: row.original.name }
  isExamTemplateModalOpen.value = true
}
// ──────────────────────────────────────────────────────────────────────────────

async function deleteItem(id: string) {
  try {
    await api.delete(`/mcu/items/${id}`)
    toast.add({ title: 'Berhasil', description: 'Item berhasil dihapus', color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal menghapus item', color: 'error' })
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return
  await deleteItem(selectedDeleteId.value)
  selectedDeleteId.value = null
}

async function deleteSelectedItems() {
  const selectedRows = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []
  if (!selectedRows.length) return
  try {
    await Promise.all(
      selectedRows.map((row: Row<Item>) => api.delete(`/mcu/items/${row.original.id}`))
    )
    toast.add({ title: 'Berhasil', description: 'Data item berhasil dihapus', color: 'success' })
    table.value?.tableApi?.resetRowSelection()
    await refresh()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal menghapus data', color: 'error' })
  }
}

function sortableHeader(label: string, column: any) {
  const isSorted = column.getIsSorted()
  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    class: '-mx-2.5',
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    onClick: () => column.toggleSorting(isSorted === 'asc')
  })
}

function getRowItems(row: Row<Item>): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'View detail',
        icon: 'i-lucide-eye',
        to: `/items/mcu/${row.original.id}`
      },
      {
        label: 'Edit Template Exam',
        icon: 'i-lucide-test-tube',
        onSelect() {
          openExamTemplate(row)
        }
      }
    ],
    [
      {
        label: 'Delete item',
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect() {
          selectedDeleteId.value = row.original.id
          isDeleteModalOpen.value = true
        }
      }
    ]
  ]
}

const columns: TableColumn<Item>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(!!value),
        ariaLabel: 'Select row'
      })
  },
  {
    accessorKey: 'code',
    header: ({ column }) => sortableHeader('Code', column)
  },
  {
    accessorKey: 'name',
    header: ({ column }) => sortableHeader('Name', column),
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-medium text-highlighted' }, row.original.name),
        h('span', { class: 'text-xs text-muted' }, row.original.code)
      ])
  },
  {
    accessorKey: 'department',
    header: ({ column }) => sortableHeader('Department', column),
    cell: ({ row }) => {
      const department = row.original.department?.name as Department
      console.log('departmentss:', department)
      return h(UBadge, {
        label: SERVICE_TYPE_LABEL[department] ?? '-',
        color: SERVICE_TYPE_COLOR[department] ?? 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => sortableHeader('Status', column),
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.isActive ? 'Active' : 'Inactive',
        color: row.original.isActive ? 'success' : 'neutral',
        variant: 'subtle'
      })
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => sortableHeader('Created At', column),
    cell: ({ row }) => {
      const value = row.getValue('createdAt')
      if (!value) return '-'
      return new Date(value as string).toLocaleString('id-ID', {
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
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          { items: getRowItems(row), content: { align: 'end' } },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost'
            })
        )
      )
  }
]

const searchQuery = <any>computed({
  get: () =>
    (table.value?.tableApi?.getColumn('name')?.getFilterValue() as string) || '',
  set: (value: string) => {
    table.value?.tableApi?.getColumn('name')?.setFilterValue(value || undefined)
  }
})

const currentPageSize = <any>computed({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (value: number) => {
    table.value?.tableApi?.setPageSize(value)
  }
})
</script>

<template>
  <UDashboardPanel id="items">
    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search item..."
          class="max-w-sm"
        />

        <div class="flex items-center gap-2">
          <UButton
            label="Add Item"
            icon="i-lucide-plus"
            @click="isAddModalOpen = true"
          />

          <BaseDeleteModal
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="item"
            @confirm="deleteSelectedItems"
          >
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
              color="error"
              variant="soft"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
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
                    column.toggleVisibility(checked)
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
        :data="data"
        :columns="columns"
        :loading="pending"
        sticky
        class="w-full"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-3 border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-middle'
        }"
      />

      <div class="mt-4 flex items-center justify-between border-t border-default pt-4">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }}
          of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
          row(s) selected
        </div>

        <div class="flex items-center gap-2">
          <USelect
            v-model="currentPageSize"
            class="w-32"
            :items="[
              { label: '10 items', value: 10 },
              { label: '20 items', value: 20 },
              { label: '50 items', value: 50 },
              { label: 'All', value: 1000 }
            ]"
          />

          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>

      <!-- Delete single item modal -->
      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="item"
        @confirm="handleDeleteById"
      />

      <!-- Add item modal -->
      <ItemsAddModal
        v-model:open="isAddModalOpen"
        @success="refresh()"
      />

      <!-- Edit exam template modal -->
      <ItemExamTemplateModal
        v-if="selectedTemplateItem"
        v-model:open="isExamTemplateModalOpen"
        :item-id="selectedTemplateItem.id"
        :item-name="selectedTemplateItem.name"
        @close="selectedTemplateItem = null"
      />
    </template>
  </UDashboardPanel>
</template>