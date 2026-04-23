<script setup lang="ts">
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import RolePermissionsModal from '~/components/roles/RolePermissionsModal.vue'

const api = useApi()

type Permission = {
  id: number
  name: string
  description?: string
}

type RolePermission = {
  roleId: number
  permissionId: number
  permission: Permission
}

type Role = {
  id: number
  name: string
  createdAt: string
  permissions: RolePermission[]
}

const { data: rolesData, refresh } = await useAsyncData('roles', () =>
  api.get('/settings/roles').then(res => res.data.data)
)

const data = computed(() => rolesData.value ?? [])

const columns: TableColumn<Role>[] = [
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
  },
  {
    id: 'actions',
    header: 'Actions'
  }
]

const table = useTemplateRef('table')
</script>

<!-- <template>
  <UDashboardPanel id="settings">
    <div
      class="flex flex-col h-[calc(100vh-64px)] divide-y divide-accented w-full"
    >
      <div class="flex items-center gap-2 px-4 py-3.5">
        <UInput
          :model-value="
            table?.tableApi?.getColumn('name')?.getFilterValue() as string
          "
          class="max-w-sm min-w-[12ch]"
          placeholder="Filter names..."
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
                    ?.toggleVisibility(!!checked);
                },
                onSelect(e: Event) {
                  e.preventDefault();
                },
              }))
          "
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

      <UTable ref="table" :data="data" :columns="columns" sticky class="h-full">
        <template #actions-cell="{ row }">
          <RolePermissionsModal :role="row.original" @updated="refresh" />
        </template>

        <template #expanded="{ row }">
          <pre>{{ row.original }}</pre>
        </template>
      </UTable>

      <div class="px-4 py-3.5 text-sm text-muted">
        {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
        {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s)
        selected.
      </div>
    </div>
  </UDashboardPanel>
</template> -->

<template>
  <div>
    <!-- HEADER -->
    <UPageCard
      title="Roles"
      description="Manage roles and their permissions."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Manage Role Permissions"
        color="neutral"
        variant="outline"
        icon="i-lucide-shield-check"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <!-- TABLE CARD -->
    <UPageCard
      variant="subtle"
      :ui="{
        container: 'p-0 sm:p-0 gap-y-0',
        wrapper: 'items-stretch',
        header: 'p-4 mb-0 border-b border-default'
      }"
    >
      <!-- SEARCH + COLUMN FILTER -->
      <template #header>
        <div class="flex items-center gap-2 w-full">
          <UInput
            :model-value="
              table?.tableApi?.getColumn('name')?.getFilterValue() as string
            "
            icon="i-lucide-search"
            placeholder="Search roles..."
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
                      ?.toggleVisibility(!!checked);
                  },
                  onSelect(e: Event) {
                    e.preventDefault();
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

      <!-- TABLE -->
      <UTable ref="table" :data="data" :columns="columns">
        <template #actions-cell="{ row }">
          <RolePermissionsModal :role="row.original" @updated="refresh" />
        </template>

        <template #expanded="{ row }">
          <pre class="p-4 text-xs">{{ row.original }}</pre>
        </template>
      </UTable>
    </UPageCard>

    <!-- FOOTER -->
    <!-- <div class="text-sm text-muted mt-2 px-1">
      {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
      {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s)
      selected.
    </div> -->
  </div>
</template>
