<script setup lang="ts">
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/vue-table'

const api = useApi()
const toast = useToast()

type Permission = {
  id: number
  name: string
}

const {
  data: permissionsData,
  pending,
  error,
  refresh
} = await useAsyncData<Permission[]>('permissions', async () => {
  const res = await api.get('/settings/permissions')

  return res.data.data ?? res.data ?? []
}, {
  default: () => []
})

const data = computed(() => {
  return [...permissionsData.value].sort((a, b) => a.id - b.id)
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 5
})

const modalOpen = ref(false)
const saving = ref(false)

const form = reactive({
  name: ''
})

function formatPermission(name: string) {
  return name
    .replaceAll(':', ' ')
    .replaceAll('-', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function submitPermission() {
  if (!form.name) return

  saving.value = true

  try {
    await api.post('/settings/permissions', {
      name: form.name
    })

    toast.add({
      title: 'Permission berhasil ditambahkan',
      color: 'success'
    })

    form.name = ''
    modalOpen.value = false

    await refresh()
  } catch {
    toast.add({
      title: 'Gagal menambahkan permission',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

const columns: TableColumn<Permission>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => formatPermission(row.getValue('name'))
  },
  {
    id: 'actions',
    header: 'Actions'
  }
]

const table = useTemplateRef('table')
</script>

<template>
  <div>
    <!-- HEADER -->
    <UPageCard
      title="Permissions"
      description="Manage permissions."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Add New Permission"
        color="neutral"
        variant="outline"
        icon="i-lucide-shield-plus"
        class="w-fit lg:ms-auto"
        @click="modalOpen = true"
      />
    </UPageCard>

    <!-- MODAL ADD PERMISSION -->
    <UModal v-model:open="modalOpen" title="Add New Permission">
      <template #body>
        <form class="space-y-4" @submit.prevent="submitPermission">
          <UFormField label="Permission Name" required>
            <UInput
              v-model="form.name"
              placeholder="Contoh: user:create"
              class="w-full"
              autofocus
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              type="button"
              @click="modalOpen = false"
            />

            <UButton
              label="Save"
              color="primary"
              type="submit"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- TABLE CARD -->
    <UPageCard
      variant="subtle"
      :ui="{
        container: 'p-0 sm:p-0 gap-y-0',
        wrapper: 'items-stretch',
        header: 'p-4 mb-0 border-b border-default',
        body: 'p-0 sm:p-0'
      }"
    >
      <template #header>
        <div class="flex items-center gap-2 w-full">
          <UInput
            :model-value="
              table?.tableApi?.getColumn('name')?.getFilterValue() as string
            "
            icon="i-lucide-search"
            placeholder="Search permissions..."
            autofocus
            class="w-full"
            @update:model-value="
              table?.tableApi?.getColumn('name')?.setFilterValue($event)
            "
          />

          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi
                      ?.getColumn(column.id)
                      ?.toggleVisibility(!!checked)
                  },
                  onSelect(e: Event) {
                    e.preventDefault()
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </template>

      <UAlert
        v-if="error"
        title="Gagal memuat permissions"
        color="error"
        variant="soft"
        class="m-4"
      />

      <UTable
        ref="table"
        v-model:pagination="pagination"
        :data="data"
        :columns="columns"
        :loading="pending"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
      >
        <template #actions-cell="">
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>

        <template #expanded="{ row }">
          <pre class="p-4 text-xs">{{ row.original }}</pre>
        </template>
      </UTable>

      <!-- PAGINATION -->
      <div class="flex items-center justify-between gap-3 border-t border-default px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">Rows per page</span>

          <USelect
            :model-value="pagination.pageSize"
            :items="[5, 10, 20, 50]"
            class="w-20"
            @update:model-value="(value) => {
              pagination.pageSize = Number(value)
              pagination.pageIndex = 0
              table?.tableApi?.setPageSize(Number(value))
              table?.tableApi?.setPageIndex(0)
            }"
          />
        </div>

        <UPagination
          :page="pagination.pageIndex + 1"
          :items-per-page="pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          @update:page="(page) => {
            pagination.pageIndex = page - 1
            table?.tableApi?.setPageIndex(page - 1)
          }"
        />
      </div>
    </UPageCard>

    <!-- FOOTER -->
    <div class="text-sm text-muted mt-2 px-1">
      Showing
      {{ table?.tableApi?.getPaginationRowModel().rows.length || 0 }}
      of
      {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
      data
    </div>
  </div>
</template>
