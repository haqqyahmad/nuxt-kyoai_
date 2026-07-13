<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const api = useApi()
const toast = useToast()

type Branch = {
  id: string
  branchId: string
  nameBranch: string
  addressBranch: string
}

const { data: branches, refresh } = await useAsyncData('branches', () =>
  api.get('/branch?limit=100').then(res => res.data.data)
)

const data = computed(() => branches.value?.data ?? branches.value ?? [])

const columnFilters = ref([
  {
    id: 'nameBranch',
    value: ''
  }
])

const columnVisibility = ref()
const rowSelection = ref({})

const selectedDeleteId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const isBulkDeleteModalOpen = ref(false)
const selectedEditBranch = ref<Branch | null>(null)
const isEditModalOpen = ref(false)

async function deleteBranch(id: string) {
  try {
    await api.delete(`/branch/${id}`)

    toast.add({
      title: 'Berhasil',
      description: 'Branch berhasil dihapus',
      color: 'success'
    })

    await refresh()
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus branch',
      color: 'error'
    })
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return

  await deleteBranch(selectedDeleteId.value)
  selectedDeleteId.value = null
  isDeleteModalOpen.value = false
}

async function deleteSelectedBranches() {
  const selectedRows
    = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []

  if (!selectedRows.length) return

  try {
    await Promise.all(
      selectedRows.map((row: Row<Branch>) =>
        api.delete(`/branch/${row.original.id}`)
      )
    )

    toast.add({
      title: 'Berhasil',
      description: 'Data branch berhasil dihapus',
      color: 'success'
    })

    table.value?.tableApi?.resetRowSelection()
    isBulkDeleteModalOpen.value = false
    await refresh()
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus data branch',
      color: 'error'
    })
  }
}

function getRowItems(row: Row<Branch>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Edit Branch',
      icon: 'i-lucide-pencil',
      onSelect() {
        selectedEditBranch.value = row.original
        isEditModalOpen.value = true
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete Branch',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        selectedDeleteId.value = row.original.id
        isDeleteModalOpen.value = true
      }
    }
  ]
}

const columns: TableColumn<Branch>[] = [
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
    accessorKey: 'branchId',
    header: 'Branch ID',
    cell: ({ row }) => `#${row.getValue('branchId')}`
  },
  {
    accessorKey: 'nameBranch',
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
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', undefined, [
          h(
            'p',
            { class: 'font-medium text-highlighted' },
            row.original.nameBranch
          )
        ])
      ])
    }
  },
  {
    accessorKey: 'addressBranch',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Address',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => row.getValue('addressBranch') || '-'
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
        ?.getColumn('nameBranch')
        ?.getFilterValue() as string) || ''
    )
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn('nameBranch')
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
  <UDashboardPanel id="branches">
    <template #header>
      <UDashboardNavbar title="Branches">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <BranchesAddModal @created="refresh" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search by branch name..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            label="Delete"
            color="error"
            variant="subtle"
            icon="i-lucide-trash"
            @click="isBulkDeleteModalOpen = true"
          >
            <template #trailing>
              <UKbd>
                {{
                  table?.tableApi?.getFilteredSelectedRowModel().rows.length
                }}
              </UKbd>
            </template>
          </UButton>

          <BaseDeleteModal
            v-model:open="isBulkDeleteModalOpen"
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="branch"
            @confirm="deleteSelectedBranches"
          />

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
        entity="branch"
        @confirm="handleDeleteById"
      />

      <BranchesEditModal
        v-model:open="isEditModalOpen"
        :branch="selectedEditBranch"
        @success="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
