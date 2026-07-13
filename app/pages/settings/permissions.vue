<script setup lang="ts">
import { upperFirst } from 'scule'

const api = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()

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

type PermissionGroup = {
  key: string
  label: string
  permissions: Permission[]
}

type DocumentType = {
  id: number
  key: string
  label: string
  sortOrder?: number
  isActive?: boolean
}

type PermissionAction = {
  key: string
  label: string
}

const DEFAULT_ACTIONS: PermissionAction[] = [
  { key: 'select', label: 'Select' },
  { key: 'read', label: 'Read' },
  { key: 'write', label: 'Write' },
  { key: 'create', label: 'Create' },
  { key: 'delete', label: 'Delete' },
  { key: 'print', label: 'Print' },
  { key: 'email', label: 'Email' },
  { key: 'report', label: 'Report' },
  { key: 'export', label: 'Export' },
  { key: 'share', label: 'Share' },
  { key: 'import', label: 'Import' },
  { key: 'only-if-creator', label: 'Only If Creator' }
]
const ACTION_STORAGE_KEY = 'settings.permission.actions'

const { data: permissionsData, refresh: refreshPermissions } = await useAsyncData<Permission[]>(
  'permissions',
  async () => {
    const res = await api.get('/settings/permissions')
    return res.data.data ?? res.data ?? []
  },
  { default: () => [] }
)

const { data: documentTypesData, refresh: refreshDocumentTypes } = await useAsyncData<DocumentType[]>(
  'settings-document-types',
  async () => {
    try {
      const res = await api.get('/settings/document-types')
      return res.data.data ?? res.data ?? []
    } catch {
      return []
    }
  },
  { default: () => [] }
)

const { data: rolesData, refresh: refreshRoles } = await useAsyncData<Role[]>(
  'settings-roles',
  async () => {
    const res = await api.get('/settings/roles')
    return res.data.data ?? res.data ?? []
  },
  { default: () => [] }
)

const selectedRoleId = ref(typeof route.query.roleId === 'string' ? route.query.roleId : '')
const selectedDocumentType = ref('all')
const documentTypeModalOpen = ref(false)
const actionManagerOpen = ref(false)
const saving = ref(false)

const documentTypeForm = reactive({
  key: '',
  label: ''
})
const actionForm = reactive({
  key: '',
  label: ''
})
const editingActionKey = ref('')
const actionCatalog = ref<PermissionAction[]>([...DEFAULT_ACTIONS])

const data = computed(() => [...permissionsData.value].sort((a, b) => a.id - b.id))
const documentTypes = computed(() =>
  [...documentTypesData.value]
    .filter(item => item.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label))
)
const roles = computed(() => [...rolesData.value].sort((a, b) => a.id - b.id))
const actions = computed(() => [...actionCatalog.value])

const selectedRole = computed(() => {
  if (!roles.value.length) return null
  if (!selectedRoleId.value) return roles.value[0] ?? null
  return roles.value.find(role => String(role.id) === selectedRoleId.value) ?? roles.value[0] ?? null
})

watch(
  () => route.query.roleId,
  (value) => {
    if (typeof value === 'string' && value !== selectedRoleId.value) {
      selectedRoleId.value = value
    }
  },
  { immediate: true }
)

watch(selectedRoleId, (value) => {
  const current = typeof route.query.roleId === 'string' ? route.query.roleId : ''
  if (value === current) return

  router.replace({
    query: {
      ...route.query,
      roleId: value || undefined
    }
  })
})

function loadActions() {
  if (!import.meta.client) return

  const saved = localStorage.getItem(ACTION_STORAGE_KEY)
  if (!saved) return

  try {
    const parsed = JSON.parse(saved) as PermissionAction[]
    if (Array.isArray(parsed) && parsed.length) {
      actionCatalog.value = parsed
    }
  } catch {
    actionCatalog.value = [...DEFAULT_ACTIONS]
  }
}

function persistActions() {
  if (!import.meta.client) return
  localStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(actionCatalog.value))
}

onMounted(() => {
  loadActions()
})

watch(actionCatalog, () => {
  persistActions()
}, { deep: true })

watch(
  roles,
  (list) => {
    if (!selectedRoleId.value && list.length) {
      selectedRoleId.value = String(list[0].id)
    }
    if (selectedRoleId.value && !list.some(role => String(role.id) === selectedRoleId.value)) {
      selectedRoleId.value = String(list[0]?.id ?? '')
    }
  },
  { immediate: true }
)

function formatRuleName(name: string) {
  return name
    .replaceAll(':', ' ')
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normalizeAction(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .replaceAll(' ', '-')
}

function normalizeDocumentType(value: string) {
  return value.trim().replaceAll(/\s+/g, '-')
}

function parsePermissionName(name: string) {
  const [documentType = 'general', action = 'read'] = name.split(':')
  return {
    key: documentType,
    label: upperFirst(formatRuleName(documentType)),
    action: normalizeAction(action)
  }
}

const permissionGroups = computed<PermissionGroup[]>(() => {
  const map = new Map<string, PermissionGroup>()

  for (const documentType of documentTypes.value) {
    const key = documentType.key.trim()
    if (!key) continue

    map.set(key, {
      key,
      label: documentType.label,
      permissions: []
    })
  }

  for (const permission of data.value) {
    const parsed = parsePermissionName(permission.name)
    const group = map.get(parsed.key)

    if (!group) {
      map.set(parsed.key, {
        key: parsed.key,
        label: parsed.label,
        permissions: [permission]
      })
      continue
    }

    group.permissions.push(permission)
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
})

const visibleGroups = computed(() => {
  if (selectedDocumentType.value === 'all') return permissionGroups.value
  return permissionGroups.value.filter(group => group.key === selectedDocumentType.value)
})

const documentTypeOptions = computed(() => [
  { label: 'All Document Types', value: 'all' },
  ...permissionGroups.value.map(group => ({
    label: group.label,
    value: group.key
  }))
])

const roleOptions = computed(() =>
  roles.value.map(role => ({
    label: role.name,
    value: String(role.id)
  }))
)

function getPermissionSet(role: Role | null) {
  return new Set(role?.permissions.map(item => item.permissionId) ?? [])
}

function getPermissionForAction(group: PermissionGroup, actionKey: string) {
  return group.permissions.find((permission) => {
    const parsed = parsePermissionName(permission.name)
    return parsed.action === actionKey
  }) ?? null
}

function buildPermissionName(documentType: string, action: string) {
  return `${normalizeDocumentType(documentType)}:${normalizeAction(action)}`
}

function openDocumentTypeModal() {
  documentTypeForm.key = ''
  documentTypeForm.label = ''
  documentTypeModalOpen.value = true
}

function syncDocumentTypeLabel() {
  if (documentTypeForm.label.trim()) return
  documentTypeForm.label = formatRuleName(documentTypeForm.key)
}

async function submitDocumentType() {
  const key = normalizeDocumentType(documentTypeForm.key)
  const label = documentTypeForm.label.trim() || formatRuleName(key)

  if (!key || !label) return

  saving.value = true

  try {
    await api.post('/settings/document-types', {
      key,
      label,
      sortOrder: documentTypes.value.length,
      isActive: true
    })
    await refreshDocumentTypes()
    selectedDocumentType.value = key
    documentTypeModalOpen.value = false

    toast.add({
      title: 'Berhasil',
      description: 'Document type berhasil ditambahkan',
      color: 'success'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan document type'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

function resetActionForm() {
  actionForm.key = ''
  actionForm.label = ''
  editingActionKey.value = ''
}

function openActionManager() {
  resetActionForm()
  actionManagerOpen.value = true
}

function startEditAction(action: PermissionAction) {
  actionForm.key = action.key
  actionForm.label = action.label
  editingActionKey.value = action.key
  actionManagerOpen.value = true
}

function saveActionForm() {
  const key = normalizeAction(actionForm.key)
  const label = actionForm.label.trim()

  if (!key || !label) return

  const nextAction = { key, label }
  const existsIndex = actionCatalog.value.findIndex(item => item.key === key)

  if (editingActionKey.value) {
    const originalIndex = actionCatalog.value.findIndex(item => item.key === editingActionKey.value)
    if (originalIndex === -1) return

    if (key !== editingActionKey.value && existsIndex !== -1) {
      toast.add({
        title: 'Gagal',
        description: 'Action key sudah digunakan',
        color: 'error'
      })
      return
    }

    actionCatalog.value[originalIndex] = nextAction
  } else {
    if (existsIndex !== -1) {
      toast.add({
        title: 'Gagal',
        description: 'Action key sudah digunakan',
        color: 'error'
      })
      return
    }

    actionCatalog.value = [...actionCatalog.value, nextAction]
  }

  persistActions()
  actionManagerOpen.value = false
  resetActionForm()

  toast.add({
    title: 'Berhasil',
    description: 'Action berhasil disimpan',
    color: 'success'
  })
}

function deleteAction(key: string) {
  actionCatalog.value = actionCatalog.value.filter(item => item.key !== key)
  persistActions()
  if (editingActionKey.value === key) {
    resetActionForm()
  }
}

function restoreDefaultActions() {
  actionCatalog.value = [...DEFAULT_ACTIONS]
  persistActions()
  resetActionForm()
}

async function ensurePermission(name: string) {
  const existing = data.value.find(permission => permission.name === name)
  if (existing) return existing

  await api.post('/settings/permissions', { name })
  await refreshPermissions()

  const created = permissionsData.value.find(permission => permission.name === name)
  if (!created) {
    throw new Error('Permission tidak dapat dibuat')
  }

  return created
}

async function updateSelectedRolePermissionIds(permissionIds: number[]) {
  if (!selectedRole.value) return

  await api.post(`/settings/roles/${selectedRole.value.id}/permissions`, {
    permissionIds
  })
  await refreshRoles()
}

async function toggleAction(group: PermissionGroup, actionKey: string) {
  if (!selectedRole.value) return
  saving.value = true

  try {
    const permissionName = buildPermissionName(group.key, actionKey)
    const permission = await ensurePermission(permissionName)
    const currentIds = new Set(getPermissionSet(selectedRole.value))

    if (currentIds.has(permission.id)) {
      currentIds.delete(permission.id)
    } else {
      currentIds.add(permission.id)
    }

    await updateSelectedRolePermissionIds([...currentIds])
    toast.add({
      title: 'Berhasil',
      description: 'Permission role diperbarui',
      color: 'success'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui permission'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function clearGroupPermissions(group: PermissionGroup) {
  if (!selectedRole.value) return
  saving.value = true

  try {
    const currentIds = new Set(getPermissionSet(selectedRole.value))
    for (const action of actions.value) {
      const permission = getPermissionForAction(group, action.key)
      if (permission) currentIds.delete(permission.id)
    }

    await updateSelectedRolePermissionIds([...currentIds])
    toast.add({
      title: 'Berhasil',
      description: 'Rule berhasil dihapus dari role terpilih',
      color: 'success'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus rule'
    toast.add({
      title: 'Gagal',
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

function ruleActions(group: PermissionGroup) {
  const rolePermissionIds = getPermissionSet(selectedRole.value)
  return actions.value.map((action) => {
    const permission = getPermissionForAction(group, action.key)
    return {
      ...action,
      permissionId: permission?.id ?? null,
      checked: permission ? rolePermissionIds.has(permission.id) : false
    }
  })
}
</script>

<template>
  <UDashboardPanel id="permissions">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="w-full space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold text-highlighted">
              Role Permissions Manager
            </h1>
            <p class="mt-1 text-sm text-muted">
              Kelola rule permission per role dari satu layar.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-file-plus-2"
              class="bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              @click="openDocumentTypeModal"
            >
              Add DocType
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-sliders-horizontal"
              @click="openActionManager"
            >
              Manage Actions
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-user-check"
              to="/users"
            >
              Set User Role
            </UButton>
          </div>
        </div>

        <div class="rounded-xl border border-default bg-elevated/40 p-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <USelectMenu
              v-model="selectedDocumentType"
              :items="documentTypeOptions"
              value-key="value"
              label-key="label"
              class="lg:w-56"
              placeholder="Document Type"
            />

            <USelectMenu
              v-model="selectedRoleId"
              :items="roleOptions"
              value-key="value"
              label-key="label"
              class="lg:w-72"
              placeholder="Role"
            />

            <div class="ml-auto flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-lucide-shield-check" class="size-4" />
              {{ selectedRole?.name ?? 'No role selected' }}
            </div>
          </div>

          <div class="mt-4 overflow-hidden rounded-xl border border-default bg-background">
            <div class="grid grid-cols-[1.4fr_1fr_0.35fr_3fr_0.12fr] items-center gap-4 border-b border-default bg-elevated/70 px-4 py-3 text-sm font-semibold">
              <div>Document Type</div>
              <div>Role</div>
              <div>Level</div>
              <div>Permissions</div>
              <div />
            </div>

            <div class="max-h-[calc(100vh-320px)] overflow-y-auto">
              <div v-if="!visibleGroups.length" class="px-4 py-16 text-center">
                <UIcon name="i-lucide-shield-off" class="mx-auto mb-3 size-10 text-muted" />
                <p class="font-medium text-highlighted">
                  Tidak ada permission untuk ditampilkan
                </p>
                <p class="mt-1 text-sm text-muted">
                  Coba pilih document type lain atau tambahkan rule baru.
                </p>
              </div>

              <div
                v-for="group in visibleGroups"
                :key="group.key"
                class="grid grid-cols-[1.4fr_1fr_0.35fr_3fr_0.12fr] gap-4 border-b border-default px-4 py-5 last:border-b-0"
              >
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    {{ group.label }}
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    {{ group.permissions.length }} permission
                  </p>
                </div>

                <div class="min-w-0">
                  <p class="truncate font-medium text-highlighted">
                    {{ selectedRole?.name ?? '-' }}
                  </p>
                  <label class="mt-2 flex items-center gap-2 text-xs text-muted">
                    <UCheckbox :model-value="false" />
                    Only If Creator
                  </label>
                </div>

                <div class="pt-0.5 font-semibold text-highlighted">
                  {{ selectedRole?.id ?? '-' }}
                </div>

                <div>
                  <div class="grid grid-cols-2 gap-x-6 gap-y-4">
                    <label
                      v-for="action in ruleActions(group)"
                      :key="`${group.key}-${action.key}`"
                      class="flex items-center gap-2 text-sm text-highlighted"
                    >
                      <UCheckbox
                        :model-value="action.checked"
                        :disabled="saving || !selectedRole"
                        @update:model-value="toggleAction(group, action.key)"
                      />
                      <span>{{ action.label }}</span>
                    </label>
                  </div>
                </div>

                <div class="flex justify-end">
                  <UButton
                    color="error"
                    variant="solid"
                    icon="i-lucide-trash-2"
                    class="rounded-full"
                    :disabled="saving || !selectedRole"
                    @click="clearGroupPermissions(group)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UModal v-model:open="documentTypeModalOpen" :ui="{ content: 'sm:max-w-lg' }">
        <template #content>
          <UCard :ui="{ body: 'p-0' }">
            <template #header>
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold">
                    Add DocType
                  </h2>
                  <p class="text-sm text-muted">
                    Tambahkan document type yang belum memiliki permission.
                  </p>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  @click="documentTypeModalOpen = false"
                />
              </div>
            </template>

            <form class="space-y-4 p-6" @submit.prevent="submitDocumentType">
              <UFormField label="Key" required>
                <UInput
                  v-model="documentTypeForm.key"
                  placeholder="invoice"
                  class="w-full"
                  @blur="syncDocumentTypeLabel"
                />
              </UFormField>

              <UFormField label="Label" required>
                <UInput
                  v-model="documentTypeForm.label"
                  placeholder="Invoice"
                  class="w-full"
                />
              </UFormField>

              <div class="rounded-xl border border-default bg-elevated/40 p-4 text-sm">
                <p class="text-xs uppercase tracking-wide text-muted">
                  Preview
                </p>
                <p class="mt-1 font-medium text-highlighted">
                  {{ normalizeDocumentType(documentTypeForm.key) || '-' }}
                </p>
              </div>

              <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
                <UButton
                  color="neutral"
                  variant="soft"
                  type="button"
                  @click="documentTypeModalOpen = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="primary"
                  type="submit"
                  icon="i-lucide-save"
                  :loading="saving"
                >
                  Save
                </UButton>
              </div>
            </form>
          </UCard>
        </template>
      </UModal>

      <UModal
        v-model:open="actionManagerOpen"
        :ui="{ content: 'w-[calc(100vw-1rem)] sm:max-w-2xl h-[90dvh] overflow-hidden' }"
      >
        <template #content>
          <div class="flex h-[90dvh] min-h-0 w-full flex-col overflow-hidden rounded-xl border border-default bg-elevated shadow-xl">
            <div class="flex items-start justify-between gap-4 border-b border-default px-6 py-4">
              <div>
                <h2 class="text-lg font-semibold">
                  Manage Actions
                </h2>
                <p class="text-sm text-muted">
                  Tambah, ubah, atau hapus action yang dipakai pada matrix permission.
                </p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="actionManagerOpen = false"
              />
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <UFormField label="Action Key" required>
                    <UInput
                      v-model="actionForm.key"
                      placeholder="read"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Label" required>
                    <UInput
                      v-model="actionForm.label"
                      placeholder="Read"
                      class="w-full"
                    />
                  </UFormField>

                  <div class="flex items-end gap-2">
                    <UButton
                      color="primary"
                      type="button"
                      icon="i-lucide-save"
                      @click="saveActionForm"
                    >
                      {{ editingActionKey ? 'Update' : 'Add' }}
                    </UButton>
                    <UButton
                      color="neutral"
                      variant="soft"
                      type="button"
                      @click="restoreDefaultActions"
                    >
                      Reset
                    </UButton>
                  </div>
                </div>

                <div class="overflow-hidden rounded-xl border border-default bg-background">
                  <div class="max-h-[calc(90dvh-260px)] overflow-y-auto">
                    <table class="min-w-full border-collapse text-sm">
                      <thead class="sticky top-0 z-10 bg-background">
                        <tr class="border-b border-default">
                          <th class="border-r border-default px-4 py-3 text-left font-semibold last:border-r-0">
                            Key
                          </th>
                          <th class="border-r border-default px-4 py-3 text-left font-semibold last:border-r-0">
                            Label
                          </th>
                          <th class="px-4 py-3 text-right font-semibold">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr
                          v-for="action in actions"
                          :key="action.key"
                          class="border-b border-default last:border-b-0"
                        >
                          <td class="border-r border-default px-4 py-3 font-mono text-highlighted">
                            {{ action.key }}
                          </td>
                          <td class="border-r border-default px-4 py-3 text-highlighted">
                            {{ action.label }}
                          </td>
                          <td class="px-4 py-3">
                            <div class="flex justify-end gap-1.5">
                              <UButton
                                size="xs"
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-pencil"
                                @click="startEditAction(action)"
                              />
                              <UButton
                                size="xs"
                                color="error"
                                variant="ghost"
                                icon="i-lucide-trash-2"
                                @click="deleteAction(action.key)"
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
