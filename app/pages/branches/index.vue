<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { useClipboard, useDebounceFn } from '@vueuse/core'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const api = useApi()
const toast = useToast()
const { copy } = useClipboard()

type Branch = {
  id: string
  branchId: string
  nameBranch: string
  addressBranch: string
  createdAt: string
}

const { data: branches, refresh } = await useAsyncData('branches', () =>
  api.get('/branch?limit=100').then(res => res.data.data)
)

const data = computed(() => branches.value ?? [])

const columnFilters = ref([
  {
    id: 'nameBranch',
    value: ''
  }
])
const columnVisibility = ref()
const rowSelection = ref({})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

const search = ref('')

const updateSearch = useDebounceFn((value: string) => {
  table.value?.tableApi
    ?.getColumn('nameBranch')
    ?.setFilterValue(value || undefined)
}, 300)

watch(search, (value) => {
  updateSearch(value)
})

async function deleteSelectedBranches() {
  const selectedRows
    = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []

  if (!selectedRows.length) return

  try {
    await Promise.all(
      selectedRows.map((row: any) => api.delete(`/branch/${row.original.id}`))
    )

    toast.add({
      title: 'Berhasil',
      description: 'Data branch berhasil dihapus',
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

function getRowItems(row: Row<Branch>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Edit Branch',
      icon: 'i-lucide-edit',
      to: `/branches/${row.original.id}`
    },
    {
      type: 'separator'
    },
    {
      label: 'Copy user ID',
      icon: 'i-lucide-copy',
      onSelect() {
        copy(row.original.id.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Branch copied to clipboard'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'View Branch Details',
      icon: 'i-lucide-list'
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete Branch',
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        try {
          await api.delete(`/branch/${row.original.id}`)

          toast.add({
            title: 'Success',
            description: 'Branch deleted successfully',
            color: 'success'
          })

          await refresh()
        } catch (err: any) {
          toast.add({
            title: 'Error',
            description: err?.message || 'Failed to delete branch',
            color: 'error'
          })
        }
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
    header: 'ID',
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
          h('p', { class: 'font-medium text-highlighted' }, row.original.nameBranch)
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

const currentPage = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (page: number) => {
    pagination.value = {
      ...pagination.value,
      pageIndex: page - 1
    }
  }
})

const currentPageSize = computed({
  get: () => pagination.value.pageSize,
  set: (value: number) => {
    pagination.value = {
      pageIndex: 0,
      pageSize: value
    }
  }
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
          v-model="search"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search branch..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <BaseDeleteModal
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="branch"
            @confirm="deleteSelectedBranches"
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
                      ?.toggleVisibility(!!checked);
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault();
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
        v-model:pagination="pagination"
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
            :items-per-page="pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
