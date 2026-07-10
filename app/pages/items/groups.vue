<script setup lang="ts">
type Department = {
  id: string,
  name: string,
  code?: string | null
}

type GroupNode = {
  id: string,
  departmentId: string,
  name: string,
  code?: string | null,
  parentId: string | null,
  sortOrder: number,
  items?: Array<{ id: string; code: string; name: string; isActive?: boolean }>
  children?: GroupNode[]
}

type GroupFormState = {
  departmentId: string,
  name: string,
  code: string,
  parentId: string,
  sortOrder: number
}

const api = useApi()
const toast = useToast()

const departments = ref<Department[]>([])
const selectedDepartmentId = ref('')
const groupTree = ref<GroupNode[]>([])
const loadingDepartments = ref(false)
const loadingGroups = ref(false)
const saving = ref(false)
const deleting = ref(false)
const isModalOpen = ref(false)
const editingId = ref<string | null>(null)

const form = reactive<GroupFormState>({
  departmentId: '',
  name: '',
  code: '',
  parentId: '',
  sortOrder: 0
})

const departmentOptions = computed(() => departments.value.map((dep) => ({
  label: dep.name,
  value: dep.id
})))

const flatGroups = computed(() => {
  const rows: Array<GroupNode & { depth: number; path: string }> = []

  const walk = (nodes: GroupNode[], depth = 0, ancestors: string[] = []) => {
    for (const node of nodes) {
      const path = [...ancestors, node.name]
      rows.push({
        ...node,
        depth,
        path: path.join(' > ')
      })

      if (node.children?.length) {
        walk(node.children, depth + 1, path)
      }
    }
  }

  walk(groupTree.value)
  return rows
})

function collectDescendantIds(nodes: GroupNode[], targetId: string, found = new Set<string>()) {
  for (const node of nodes) {
    if (node.id === targetId) {
      const stack = [...(node.children ?? [])]
      while (stack.length) {
        const current = stack.pop()
        if (!current || found.has(current.id)) continue
        found.add(current.id)
        if (current.children?.length) {
          stack.push(...current.children)
        }
      }
      return found
    }

    if (node.children?.length) {
      collectDescendantIds(node.children, targetId, found)
    }
  }

  return found
}

const parentGroupOptions = computed(() => {
  const blockedIds = editingId.value
    ? new Set([editingId.value, ...collectDescendantIds(groupTree.value, editingId.value)])
    : new Set<string>()

  return flatGroups.value
    .filter((group) => group.departmentId === form.departmentId)
    .filter((group) => !blockedIds.has(group.id))
    .map((group) => ({
      label: group.path,
      value: group.id
    }))
})

const parentGroupSelectionError = computed(() => {
  if (!form.departmentId) return ''
  if (form.parentId && !parentGroupOptions.value.some((group) => group.value === form.parentId)) {
    return 'Parent group tidak valid untuk department atau posisi hierarchy ini.'
  }
  return ''
})

function resetForm() {
  form.departmentId = selectedDepartmentId.value || ''
  form.name = ''
  form.code = ''
  form.parentId = ''
  form.sortOrder = 0
  editingId.value = null
}

async function fetchDepartments() {
  loadingDepartments.value = true
  try {
    const res = await api.get('/medical/departments')
    const payload = res.data?.data
    departments.value = Array.isArray(payload) ? payload : []
    if (!selectedDepartmentId.value) {
      selectedDepartmentId.value = departments.value[0]?.id ?? ''
    }
  } finally {
    loadingDepartments.value = false
  }
}

async function fetchGroups() {
  if (!selectedDepartmentId.value) {
    groupTree.value = []
    return
  }

  loadingGroups.value = true
  try {
    const res = await api.get('/medical/groups', {
      params: { departmentId: selectedDepartmentId.value }
    })
    const payload = res.data?.data
    groupTree.value = Array.isArray(payload) ? payload : []
  } catch (error: unknown) {
    groupTree.value = []
    const message = error instanceof Error ? error.message : 'Gagal memuat group'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    loadingGroups.value = false
  }
}

function openCreate(parentId: string | null = null) {
  resetForm()
  form.departmentId = selectedDepartmentId.value || ''
  form.parentId = parentId || ''
  editingId.value = null
  isModalOpen.value = true
}

function openEdit(node: GroupNode) {
  form.departmentId = node.departmentId
  form.name = node.name
  form.code = node.code ?? ''
  form.parentId = node.parentId ?? ''
  form.sortOrder = node.sortOrder ?? 0
  editingId.value = node.id
  isModalOpen.value = true
}

async function saveGroup() {
  if (saving.value) return
  if (!form.departmentId || !form.name.trim()) return
  if (parentGroupSelectionError.value) {
    toast.add({
      title: 'Validasi gagal',
      description: parentGroupSelectionError.value,
      color: 'error'
    })
    return
  }

  saving.value = true
  try {
    const payload = {
      departmentId: form.departmentId,
      name: form.name.trim(),
      code: form.code.trim() || null,
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder || 0)
    }

    if (editingId.value) {
      await api.put(`/medical/groups/${editingId.value}`, payload)
      toast.add({
        title: 'Berhasil',
        description: 'Group berhasil diperbarui',
        color: 'success'
      })
    } else {
      await api.post('/medical/groups', payload)
      toast.add({
        title: 'Berhasil',
        description: 'Group berhasil ditambahkan',
        color: 'success'
      })
    }

    isModalOpen.value = false
    await fetchGroups()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan group'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function deleteGroup(node: GroupNode) {
  if (deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/medical/groups/${node.id}`)
    toast.add({
      title: 'Berhasil',
      description: 'Group berhasil dihapus',
      color: 'success'
    })
    await fetchGroups()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus group'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

watch(selectedDepartmentId, async (val) => {
  if (!val) {
    groupTree.value = []
    return
  }
  await fetchGroups()
})

watch(
  () => form.departmentId,
  (val) => {
    if (!editingId.value) {
      form.parentId = ''
    }
    if (!val) form.parentId = ''
  }
)

onMounted(async () => {
  await fetchDepartments()
  if (selectedDepartmentId.value) {
    await fetchGroups()
  }
})
</script>

<template>
  <UDashboardPanel id="item-groups">
    <template #header>
      <UDashboardNavbar title="Master Group Lab">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            @click="openCreate()"
          >
            Add Root Group
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/30 p-4 md:flex-row md:items-end md:justify-between">
          <div class="space-y-1">
            <p class="text-sm font-medium">Pilih Department</p>
            <p class="text-xs text-muted">Hierarchy group dan subgroup mengikuti department aktif.</p>
          </div>

          <div class="flex flex-col gap-2 md:flex-row md:items-end">
            <USelectMenu
              v-model="selectedDepartmentId"
              :items="departmentOptions"
              value-key="value"
              label-key="label"
              placeholder="Select department"
              class="min-w-72"
            />
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-refresh-cw"
              :loading="loadingGroups"
              @click="fetchGroups()"
            >
              Refresh
            </UButton>
          </div>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">Group & Subgroup</h2>
                <p class="text-sm text-muted">Tambah root group atau child subgroup sesuai struktur lab.</p>
              </div>
              <UBadge
                :label="`${flatGroups.length} node`"
                color="primary"
                variant="subtle"
              />
            </div>
          </template>

          <div v-if="loadingDepartments || loadingGroups" class="flex items-center justify-center py-16">
            <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
          </div>

          <div v-else-if="!flatGroups.length" class="py-16 text-center">
            <UIcon name="i-lucide-folder-plus" class="size-10 text-muted mx-auto mb-3" />
            <p class="font-medium">Belum ada group</p>
            <p class="text-sm text-muted mt-1">Klik Add Root Group untuk mulai membuat hierarchy.</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="node in flatGroups"
              :key="node.id"
              class="rounded-lg border border-default bg-background px-4 py-3"
              :style="{ marginLeft: `${node.depth * 20}px` }"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <UIcon
                      :name="node.depth === 0 ? 'i-lucide-folder' : 'i-lucide-folder-tree'"
                      class="size-4 text-primary"
                    />
                    <p class="font-medium">{{ node.name }}</p>
                    <UBadge v-if="node.code" :label="node.code" size="xs" color="neutral" variant="subtle" />
                  </div>
                  <p class="text-xs text-muted mt-1">
                    {{ node.path }}
                  </p>
                  <div class="flex flex-wrap gap-2 mt-2 text-xs text-muted">
                    <span>Sort: {{ node.sortOrder }}</span>
                    <span v-if="node.items?.length">Items: {{ node.items.length }}</span>
                    <span v-if="node.children?.length">Children: {{ node.children.length }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" @click="openCreate(node.id)">
                    Subgroup
                  </UButton>
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="openEdit(node)" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="deleteGroup(node)" />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <UModal v-model:open="isModalOpen" :ui="{ content: 'sm:max-w-xl' }">
        <template #content>
          <UCard :ui="{ body: 'p-0' }">
            <template #header>
              <div>
                <h2 class="text-lg font-semibold">
                  {{ editingId ? 'Edit Group' : 'Add Group' }}
                </h2>
                <p class="text-sm text-muted">
                  {{ editingId ? 'Perbarui group atau subgroup yang dipilih.' : 'Buat root group atau child subgroup.' }}
                </p>
              </div>
            </template>

            <div class="p-6 space-y-4">
              <UFormField label="Department" required>
                <USelectMenu
                  v-model="form.departmentId"
                  :items="departmentOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Select department"
                  class="w-full"
                  :disabled="!!editingId"
                />
              </UFormField>

              <UFormField label="Parent Group">
                <USelectMenu
                  v-model="form.parentId"
                  :items="parentGroupOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Root group"
                  class="w-full"
                />
                <p v-if="parentGroupSelectionError" class="mt-2 text-xs text-error">
                  {{ parentGroupSelectionError }}
                </p>
              </UFormField>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField label="Group Name" required>
                  <UInput v-model="form.name" placeholder="Contoh: HEMATOLOGY" class="w-full" />
                </UFormField>

                <UFormField label="Code">
                  <UInput v-model="form.code" placeholder="Contoh: HEM" class="w-full" />
                </UFormField>
              </div>

              <UFormField label="Sort Order">
                <UInput v-model="form.sortOrder" type="number" min="0" class="w-full" />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex items-center justify-end gap-2">
                <UButton color="neutral" variant="soft" @click="isModalOpen = false">
                  Cancel
                </UButton>
                <UButton color="primary" :loading="saving" @click="saveGroup">
                  Save
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
