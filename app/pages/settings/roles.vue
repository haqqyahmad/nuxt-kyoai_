<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const api = useApi()
const toast = useToast()

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

const { data: rolesData, pending, refresh } = await useAsyncData<Role[]>(
  'roles',
  async () => {
    const res = await api.get('/settings/roles')
    return res.data.data ?? res.data ?? []
  },
  { default: () => [] }
)

const data = computed(() => [...rolesData.value].sort((a, b) => a.id - b.id))

const modalOpen = ref(false)
const saving = ref(false)
const deleting = ref(false)
const table = useTemplateRef('table')
const columnFilters = ref([{ id: 'name', value: '' }])
const selectedDeleteRoleId = ref<number | null>(null)
const isDeleteModalOpen = ref(false)
const editingRoleId = ref<number | null>(null)
const form = reactive({
  name: ''
})

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
    accessorKey: 'permissions',
    header: 'Permissions',
    cell: ({ row }) => row.original.permissions.length
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

function resetForm() {
  form.name = ''
  editingRoleId.value = null
}

function openCreateModal() {
  resetForm()
  modalOpen.value = true
}

function openEditModal(role: Role) {
  form.name = role.name
  editingRoleId.value = role.id
  modalOpen.value = true
}

async function submitRole() {
  if (!form.name.trim() || saving.value) return

  saving.value = true
  try {
    const payload = {
      name: form.name.trim()
    }

    if (editingRoleId.value) {
      await api.put(`/settings/roles/${editingRoleId.value}`, payload)
    } else {
      await api.post('/settings/roles', payload)
    }

    toast.add({
      title: 'Berhasil',
      description: editingRoleId.value
        ? 'Role berhasil diperbarui'
        : 'Role berhasil ditambahkan',
      color: 'success'
    })

    modalOpen.value = false
    resetForm()
    await refresh()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan role'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function deleteRole(id: number) {
  if (deleting.value) return

  deleting.value = true
  try {
    await api.delete(`/settings/roles/${id}`)
    toast.add({
      title: 'Berhasil',
      description: 'Role berhasil dihapus',
      color: 'success'
    })
    await refresh()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus role'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

function openDeleteRole(id: number) {
  selectedDeleteRoleId.value = id
  isDeleteModalOpen.value = true
}

async function handleDeleteById() {
  if (!selectedDeleteRoleId.value) return

  await deleteRole(selectedDeleteRoleId.value)
  selectedDeleteRoleId.value = null
  isDeleteModalOpen.value = false
}
</script>

<template>
  <div class="w-full max-w-2xl">
    <UPageCard
      title="Roles"
      description="Kelola daftar role yang digunakan di sistem."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Add Role"
        color="neutral"
        variant="outline"
        icon="i-lucide-plus"
        class="w-fit lg:ms-auto"
        @click="openCreateModal"
      />
    </UPageCard>

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
        <div class="flex items-center justify-between gap-2 w-full">
          <div class="space-y-0.5">
            <h2 class="text-base font-semibold">
              Role List
            </h2>
            <p class="text-sm text-muted">
              Total {{ data.length }} role tersedia.
            </p>
          </div>

          <UInput
            :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string"
            icon="i-lucide-search"
            placeholder="Search roles..."
            class="max-w-xs"
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)"
          />
        </div>
      </template>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        :data="data"
        :columns="columns"
        :loading="pending"
      >
        <template #permissions-cell="{ row }">
          <UButton
            :label="String(row.original.permissions.length)"
            icon="i-lucide-link"
            color="primary"
            variant="ghost"
            size="xs"
            :to="`/settings/permissions?roleId=${row.original.id}`"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openEditModal(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="xs"
              :disabled="deleting"
              @click="openDeleteRole(row.original.id)"
            />
          </div>
        </template>

        <template #empty>
          <div class="py-12 text-center">
            <UIcon name="i-lucide-shield-question" class="mx-auto mb-3 size-10 text-muted" />
            <p class="font-medium text-highlighted">
              Belum ada role
            </p>
            <p class="mt-1 text-sm text-muted">
              Tambahkan role baru dari tombol Add Role.
            </p>
          </div>
        </template>
      </UTable>
    </UPageCard>

    <UModal v-model:open="modalOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <UCard :ui="{ body: 'p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-lg font-semibold">
                  {{ editingRoleId ? 'Edit Role' : 'Add Role' }}
                </h2>
                <p class="text-sm text-muted">
                  {{ editingRoleId ? 'Perbarui role yang dipilih.' : 'Tambahkan role baru untuk akses sistem.' }}
                </p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="modalOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4 p-6" @submit.prevent="submitRole">
            <UFormField label="Role Name" required>
              <UInput
                v-model="form.name"
                placeholder="Contoh: HC Doctor External"
                class="w-full"
                autofocus
              />
            </UFormField>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
              <UButton
                color="neutral"
                variant="soft"
                type="button"
                @click="modalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                type="submit"
                :loading="saving"
              >
                {{ editingRoleId ? 'Update' : 'Save' }}
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <BaseDeleteModal
      v-model:open="isDeleteModalOpen"
      :count="1"
      entity="role"
      @confirm="handleDeleteById"
    />
  </div>
</template>
