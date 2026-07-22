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

type Department = {
  id: number
  kode_department: string
  nama_department: string
  description?: string | null
  status: boolean
}

const { data: departments, refresh } = await useAsyncData('dept-non-medical', () =>
  api.get('/master/departments').then(res => res.data.data as Department[])
)

const data = computed(() => departments.value ?? [])

const columnFilters = ref([{ id: 'nama_department', value: '' }])
const columnVisibility = ref()
const rowSelection = ref({})

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedEditData = ref<Department | null>(null)
const selectedDeleteId = ref<number | null>(null)

const form = reactive({ kode_department: '', nama_department: '', description: '', status: true })

function resetForm() {
  form.kode_department = ''; form.nama_department = ''; form.description = ''; form.status = true
}

function openAddModal() { resetForm(); isAddModalOpen.value = true }

function openEditModal(row: Department) {
  form.kode_department = row.kode_department; form.nama_department = row.nama_department
  form.description = row.description ?? ''; form.status = row.status
  selectedEditData.value = row; isEditModalOpen.value = true
}

function openDeleteModal(id: number) { selectedDeleteId.value = id; isDeleteModalOpen.value = true }

async function handleCreate() {
  try {
    await api.post('/master/departments', { ...form })
    toast.add({ title: 'Berhasil', description: 'Department berhasil ditambahkan', color: 'success' })
    isAddModalOpen.value = false; await refresh()
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menambahkan department', color: 'error' }) }
}

async function handleUpdate() {
  if (!selectedEditData.value) return
  try {
    await api.put(`/master/departments/${selectedEditData.value.id}`, { ...form })
    toast.add({ title: 'Berhasil', description: 'Department berhasil diperbarui', color: 'success' })
    isEditModalOpen.value = false; await refresh()
  } catch { toast.add({ title: 'Gagal', description: 'Gagal memperbarui department', color: 'error' }) }
}

async function handleDelete() {
  if (!selectedDeleteId.value) return
  try {
    await api.delete(`/master/departments/${selectedDeleteId.value}`)
    toast.add({ title: 'Berhasil', description: 'Department berhasil dihapus', color: 'success' })
    selectedDeleteId.value = null; isDeleteModalOpen.value = false; await refresh()
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menghapus department', color: 'error' }) }
}

const table = useTemplateRef('table')
const currentPage = ref(1)
const currentPageSize = computed({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (v: number) => { table.value?.tableApi?.setPageSize(v); currentPage.value = 1 }
})
watch(() => table.value?.tableApi?.getState().pagination.pageIndex, (idx) => { currentPage.value = (idx ?? 0) + 1 }, { immediate: true })
watch(currentPage, (page) => { table.value?.tableApi?.setPageIndex(page - 1) })

function getRowItems(row: Row<Department>) {
  return [
    { type: 'label' as const, label: 'Actions' },
    { label: 'Edit', icon: 'i-lucide-pencil', onSelect() { openEditModal(row.original) } },
    { type: 'separator' as const },
    { label: 'Delete', icon: 'i-lucide-trash', color: 'error' as const, onSelect() { openDeleteModal(row.original.id) } }
  ]
}

const columns: TableColumn<Department>[] = [
  { id: 'select', header: ({ table }) => h(UCheckbox, { 'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(), 'onUpdate:modelValue': (v: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!v) }), cell: ({ row }) => h(UCheckbox, { 'modelValue': row.getIsSelected(), 'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v) }) },
  { accessorKey: 'kode_department', enableSorting: true, header: ({ column }) => { const s = column.getIsSorted(); return h(UButton, { color: 'neutral', variant: 'ghost', label: 'Code', icon: s ? s === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-down', class: '-mx-2.5', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') }) }, cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.getValue('kode_department')) },
  { accessorKey: 'nama_department', enableSorting: true, header: ({ column }) => { const s = column.getIsSorted(); return h(UButton, { color: 'neutral', variant: 'ghost', label: 'Name', icon: s ? s === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-down', class: '-mx-2.5', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') }) }, cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('nama_department')) },
  { accessorKey: 'description', header: 'Description', cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.getValue('description') || '-') },
  { accessorKey: 'status', enableSorting: true, header: ({ column }) => { const s = column.getIsSorted(); return h(UButton, { color: 'neutral', variant: 'ghost', label: 'Status', icon: s ? s === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-down', class: '-mx-2.5', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc') }) }, cell: ({ row }) => h(UBadge, { label: row.getValue('status') ? 'Active' : 'Inactive', color: row.getValue('status') ? 'success' : 'neutral', variant: 'subtle' }) },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Created',
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
      const val = row.getValue('created_at')
      if (!val) return '-'
      try { return new Date(val as string).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
    }
  },
  { id: 'actions', cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, { content: { align: 'end' }, items: getRowItems(row) }, () => h(UButton, { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost' }))) }
]
</script>

<template>
  <UDashboardPanel id="dept-non-medical">
    <template #header>
      <UDashboardNavbar title="Departments (Non Medical)">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton label="Add Department" icon="i-lucide-plus" @click="openAddModal" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <div class="flex items-center gap-3">
          <UInput
            v-model="columnFilters[0].value"
            class="max-w-sm"
            icon="i-lucide-search"
            placeholder="Search department..."
          />
          <div class="ml-auto flex items-center gap-2 text-sm text-muted">
            <span>{{ Object.keys(rowSelection).length }} selected</span>
            <UButton
              v-if="Object.keys(rowSelection).length"
              label="Delete Selected"
              color="error"
              variant="subtle"
              size="sm"
            />
          </div>
        </div>
        <UTable
          ref="table"
          v-model:column-filters="columnFilters"
          v-model:column-visibility="columnVisibility"
          v-model:row-selection="rowSelection"
          :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
          sticky
          class="w-full"
          :data="data"
          :columns="columns"
          :ui="{ base: 'table-fixed border-separate border-spacing-0', thead: '[&>tr]:bg-elevated/50', th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r', td: 'border-b border-default' }"
        />
        <div class="flex items-center justify-between gap-3 pt-4">
          <div class="text-sm text-muted">
            {{ Object.keys(rowSelection).length }} of {{ data.length }} row(s) selected.
          </div>
          <div class="flex items-center gap-1.5">
            <USelect v-model="currentPageSize" :items="[{ label: '10', value: 10 }, { label: '20', value: 20 }, { label: '50', value: 50 }]" class="w-20" />
            <UPagination v-model:page="currentPage" :items-per-page="currentPageSize" :total="data.length" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="isAddModalOpen" :ui="{ content: 'sm:max-w-lg' }" :teleport="{ to: 'body' }">
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">
                Add Department
              </h2><p class="text-sm text-muted">
                Tambah department baru.
              </p>
            </div><UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="isAddModalOpen = false"
            />
          </div>
        </template>
        <form class="space-y-4 p-6" @submit.prevent="handleCreate">
          <UFormField label="Code" required>
            <UInput v-model="form.kode_department" class="w-full" />
          </UFormField>
          <UFormField label="Name" required>
            <UInput v-model="form.nama_department" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="form.description" class="w-full" />
          </UFormField>
          <UFormField label="Status">
            <USwitch v-model="form.status" label="Active" />
          </UFormField>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              color="neutral"
              variant="soft"
              type="button"
              @click="isAddModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="primary" type="submit">
              Save
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </UModal>

  <UModal v-model:open="isEditModalOpen" :ui="{ content: 'sm:max-w-lg' }" :teleport="{ to: 'body' }">
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">
                Edit Department
              </h2><p class="text-sm text-muted">
                Perbarui department.
              </p>
            </div><UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="isEditModalOpen = false"
            />
          </div>
        </template>
        <form class="space-y-4 p-6" @submit.prevent="handleUpdate">
          <UFormField label="Code" required>
            <UInput v-model="form.kode_department" class="w-full" />
          </UFormField>
          <UFormField label="Name" required>
            <UInput v-model="form.nama_department" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="form.description" class="w-full" />
          </UFormField>
          <UFormField label="Status">
            <USwitch v-model="form.status" label="Active" />
          </UFormField>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton
              color="neutral"
              variant="soft"
              type="button"
              @click="isEditModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="primary" type="submit">
              Update
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </UModal>

  <UModal v-model:open="isDeleteModalOpen" :ui="{ content: 'sm:max-w-sm' }" :teleport="{ to: 'body' }">
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div>
            <h2 class="text-lg font-semibold">
              Delete Department
            </h2><p class="text-sm text-muted">
              Yakin ingin menghapus department ini?
            </p>
          </div>
        </template>
        <div class="flex justify-end gap-2 p-6 border-t border-default">
          <UButton color="neutral" variant="soft" @click="isDeleteModalOpen = false">
            Cancel
          </UButton>
          <UButton color="error" @click="handleDelete">
            Delete
          </UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
