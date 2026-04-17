<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { useClipboard } from '@vueuse/core'


const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const api = useApi()
const toast = useToast()
const { copy } = useClipboard()

type User = {
  id: number
  name: string
  email: string
  createdAt: string
}
const { data: users } = await api.get('/users')

const data = computed(() => users?.data ?? [])

const columns: TableColumn<User>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => row.getValue('name')
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.getValue('email')
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
      return new Date(row.getValue('createdAt')).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
]
const table = useTemplateRef('table')

function randomize() {
    console.log(data)
  data.value.id = [...data.value.id].sort(() => Math.random() - 0.5)
}
</script>

<template>
      <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
         <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      
        <div class="flex flex-col h-[calc(100vh-64px)] divide-y divide-accented w-full">
            <div class="flex items-center gap-2 px-4 py-3.5 overflow-x-auto">
              <UInput
                :model-value="(table?.tableApi?.getColumn('email')?.getFilterValue() as string)"
                class="max-w-sm min-w-[12ch]"
                placeholder="Filter emails..."
                @update:model-value="table?.tableApi?.getColumn('email')?.setFilterValue($event)"
              />
        
              <UButton color="neutral" label="Randomize" @click="randomize" />
        
              <UDropdownMenu
                :items="table?.tableApi?.getAllColumns().filter(column => column.getCanHide()).map(column => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                  },
                  onSelect(e: Event) {
                    e.preventDefault()
                  }
                }))"
                :content="{ align: 'end' }"
              >
                <UButton
                  label="Columns"
                  color="neutral"
                  variant="outline"
                  trailing-icon="i-lucide-chevron-down"
                  class="ml-auto"
                  aria-label="Columns select dropdown"
                />
              </UDropdownMenu>
            </div>
        
            <UTable
              ref="table"
              :data="data"
              :columns="columns"
              sticky
              class="h-full"
            >
              <template #expanded="{ row }">
                <pre>{{ row.original }}</pre>
              </template>
            </UTable>
        
            <div class="px-4 py-3.5 text-sm text-muted">
              {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
              {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
            </div>
          </div>
      
      </UDashboardPanel>
</template>