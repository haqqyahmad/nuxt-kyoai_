<script setup lang="ts">
type Department = {
  id: string,
  name: string,
  code?: string | null,
  type?: 'office' | 'medical' | null
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
const collapsedGroupIds = ref<Set<string>>(new Set())
const loadingDepartments = ref(false)
const loadingGroups = ref(false)
const saving = ref(false)
const deleting = ref(false)
const importing = ref(false)
const importFile = ref<HTMLInputElement | null>(null)
const importPreviewOpen = ref(false)
const importPreviewRows = ref<Array<{
  departmentCode: string
  name: string
  code: string
  parentCode: string
  parentName: string
  sortOrder: number
  error?: string
}>>([])
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

      if (node.children?.length && !collapsedGroupIds.value.has(node.id)) {
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
    const payload = res.data?.data as Department[] | undefined
    departments.value = Array.isArray(payload)
      ? payload.filter(department => department.type === 'medical')
      : []
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

function toggleCollapse(nodeId: string) {
  const next = new Set(collapsedGroupIds.value)
  if (next.has(nodeId)) {
    next.delete(nodeId)
  } else {
    next.add(nodeId)
  }
  collapsedGroupIds.value = next
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

  // Validasi defensif: parentId boleh string non-empty apa pun (backend validasi UUID/ID existing)
  const parentId = form.parentId && form.parentId.trim() ? form.parentId.trim() : null

  saving.value = true
  try {
    const payload = {
      departmentId: form.departmentId,
      name: form.name.trim(),
      code: form.code.trim() || null,
      parentId,
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

function downloadImportTemplate() {
  const department = departments.value.find(dep => dep.id === selectedDepartmentId.value)
  const groups = flatGroups.value.map((group) => {
    const parent = group.parentId
      ? flatGroups.value.find(item => item.id === group.parentId)
      : null
    return {
      departmentCode: department?.code || department?.name || '',
      name: group.name,
      code: group.code || '',
      parentCode: parent?.code || '',
      parentName: parent?.name || '',
      sortOrder: group.sortOrder ?? 0
    }
  })

  const template = {
    _instructions: 'Import group/subgroup. File ini berisi data group department aktif saat export. departmentCode boleh code atau nama department. parentCode/parentName kosong = root group.',
    groups: groups.length
      ? groups
      : [
          { departmentCode: department?.code || 'LAB', name: 'Hematologi', code: 'HEM', parentCode: '', parentName: '', sortOrder: 1 },
          { departmentCode: department?.code || 'LAB', name: 'Sub Hematologi', code: 'SHEM', parentCode: 'HEM', parentName: '', sortOrder: 1 }
        ]
  }
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `template-import-group-${department?.code || department?.name || 'data'}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

function norm(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
}

async function importGroups(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const json = JSON.parse(text) as { groups?: unknown[] } | unknown[]
    const rows = Array.isArray(json) ? json : json.groups
    if (!Array.isArray(rows)) throw new Error('Format tidak valid: butuh array pada key "groups"')

    importPreviewRows.value = rows.map((raw) => {
      const row = (raw ?? {}) as Record<string, unknown>
      return {
        departmentCode: String(row.departmentCode ?? '').trim(),
        name: String(row.name ?? '').trim(),
        code: String(row.code ?? '').trim(),
        parentCode: String(row.parentCode ?? '').trim(),
        parentName: String(row.parentName ?? '').trim(),
        sortOrder: Number(row.sortOrder ?? 0) || 0
      }
    })
    importPreviewOpen.value = true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'File tidak valid'
    toast.add({ title: 'Import gagal', description: message, color: 'error' })
  } finally {
    target.value = ''
  }
}

function removeImportRow(index: number) {
  importPreviewRows.value.splice(index, 1)
}

async function submitImportPreview() {
  if (importing.value || !importPreviewRows.value.length) return
  importing.value = true

  try {
    const errors: string[] = []
    let created = 0
    const localGroupsByDepartment = new Map<string, GroupNode[]>()

    async function getGroupsForDepartment(departmentId: string) {
      if (!localGroupsByDepartment.has(departmentId)) {
        const res = await api.get('/medical/groups', { params: { departmentId } })
        const payload = res.data?.data
        localGroupsByDepartment.set(departmentId, Array.isArray(payload) ? payload : [])
      }
      return localGroupsByDepartment.get(departmentId) ?? []
    }

    function flatten(nodes: GroupNode[]): GroupNode[] {
      return nodes.flatMap(node => [node, ...flatten(node.children ?? [])])
    }

    importPreviewRows.value.forEach(row => { row.error = '' })

    for (let i = 0; i < importPreviewRows.value.length; i++) {
      const row = importPreviewRows.value[i]!
      if (!row.name.trim()) { row.error = 'name wajib diisi'; errors.push(`Baris ${i + 1}: ${row.error}`); continue }

      const department = departments.value.find(dep => norm(dep.code) === norm(row.departmentCode) || norm(dep.name) === norm(row.departmentCode))
      if (!department) { row.error = `department "${row.departmentCode}" tidak ditemukan`; errors.push(`Baris ${i + 1}: ${row.error}`); continue }

      const currentGroups = await getGroupsForDepartment(department.id)
      const flat = flatten(currentGroups)
      let parentId: string | null = null
      if (row.parentCode || row.parentName) {
        const parent = flat.find(group => norm(group.code) === norm(row.parentCode) || norm(group.name) === norm(row.parentName))
        if (!parent) { row.error = `parent "${row.parentCode || row.parentName}" tidak ditemukan`; errors.push(`Baris ${i + 1}: ${row.error}`); continue }
        parentId = parent.id
      }

      try {
        const res = await api.post('/medical/groups', {
          departmentId: department.id,
          name: row.name.trim(),
          code: row.code.trim() || null,
          parentId,
          sortOrder: Number(row.sortOrder || 0)
        })
        const createdGroup = res.data?.data ?? res.data
        const list = localGroupsByDepartment.get(department.id) ?? []
        if (parentId) {
          const parent = flatten(list).find(group => group.id === parentId)
          if (parent) parent.children = [...(parent.children ?? []), createdGroup]
        } else {
          list.push(createdGroup)
        }
        localGroupsByDepartment.set(department.id, list)
        created += 1
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'gagal dibuat'
        row.error = message
        errors.push(`Baris ${i + 1} (${row.name}): ${message}`)
      }
    }

    if (created) toast.add({ title: 'Import berhasil', description: `${created} group dibuat`, color: 'success' })
    if (errors.length) toast.add({ title: 'Sebagian gagal', description: errors.slice(0, 5).join('\n'), color: 'warning' })
    if (!errors.length) importPreviewOpen.value = false
    await fetchGroups()
  } finally {
    importing.value = false
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
          <div class="flex items-center gap-2">
            <input
              ref="importFile"
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="importGroups"
            >
            <UButton
              icon="i-lucide-file-down"
              color="neutral"
              variant="outline"
              @click="downloadImportTemplate"
            >
              Template
            </UButton>
            <UButton
              icon="i-lucide-file-up"
              color="neutral"
              variant="outline"
              :loading="importing"
              @click="importFile?.click()"
            >
              Import
            </UButton>
            <UButton
              icon="i-lucide-plus"
              color="primary"
              @click="openCreate()"
            >
              Add Root Group
            </UButton>
          </div>
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
                    <UButton
                      v-if="node.children?.length"
                      :icon="collapsedGroupIds.has(node.id) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :aria-label="collapsedGroupIds.has(node.id) ? 'Buka subgroup' : 'Tutup subgroup'"
                      @click="toggleCollapse(node.id)"
                    />
                    <span v-else class="inline-block w-5" />
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

      <UModal v-model:open="importPreviewOpen" :ui="{ content: 'sm:max-w-6xl max-h-[90vh] overflow-hidden' }">
        <template #content>
          <UCard class="flex max-h-[90vh] flex-col" :ui="{ body: 'min-h-0 p-0', footer: 'shrink-0' }">
            <template #header>
              <div>
                <h2 class="text-lg font-semibold">Preview Import Group</h2>
                <p class="text-sm text-muted">Edit data dulu. Klik Import ke DB jika sudah benar.</p>
              </div>
            </template>

            <div class="max-h-[calc(90vh-11rem)] overflow-auto p-4">
              <div class="min-w-[980px] space-y-2">
                <div class="grid grid-cols-[140px_180px_120px_140px_180px_90px_90px] gap-2 text-xs font-semibold uppercase text-muted">
                  <span>Department</span>
                  <span>Name</span>
                  <span>Code</span>
                  <span>Parent Code</span>
                  <span>Parent Name</span>
                  <span>Sort</span>
                  <span>Aksi</span>
                </div>

                <div
                  v-for="(row, index) in importPreviewRows"
                  :key="index"
                  class="grid grid-cols-[140px_180px_120px_140px_180px_90px_90px] gap-2 rounded-lg border border-default p-2"
                  :class="row.error ? 'border-error/60 bg-error/5' : ''"
                >
                  <UInput v-model="row.departmentCode" size="sm" />
                  <UInput v-model="row.name" size="sm" />
                  <UInput v-model="row.code" size="sm" />
                  <UInput v-model="row.parentCode" size="sm" />
                  <UInput v-model="row.parentName" size="sm" />
                  <UInput v-model.number="row.sortOrder" type="number" size="sm" />
                  <UButton color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" @click="removeImportRow(index)" />
                  <p v-if="row.error" class="col-span-7 text-xs text-error">{{ row.error }}</p>
                </div>
              </div>
            </div>

            <template #footer>
              <div class="flex w-full justify-end gap-2">
                <UButton color="neutral" variant="soft" :disabled="importing" @click="importPreviewOpen = false">Batal</UButton>
                <UButton color="primary" icon="i-lucide-database" :loading="importing" :disabled="!importPreviewRows.length" @click="submitImportPreview">Import ke DB</UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

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
