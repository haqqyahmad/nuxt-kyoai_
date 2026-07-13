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
const modalOpen = ref(false)
const actionManagerOpen = ref(false)
const saving = ref(false)

const form = reactive({
  documentType: '',
  action: 'read',
  roleId: ''
})
const actionForm = reactive({
  key: '',
  label: ''
})
const editingActionKey = ref('')
const actionCatalog = ref<PermissionAction[]>([...DEFAULT_ACTIONS])

const data = computed(() => [...permissionsData.value].sort((a, b) => a.id - b.id))
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
    if (!form.roleId && list.length) {
      form.roleId = String(list[0].id)
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
  return value.trim().toLowerCase().replaceAll(/\s+/g, '-')
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

function openRuleModal() {
  form.documentType = selectedDocumentType.value === 'all'
    ? permissionGroups.value[0]?.key ?? ''
    : selectedDocumentType.value
  form.action = 'read'
  form.roleId = String(selectedRole.value?.id ?? roles.value[0]?.id ?? '')
  modalOpen.value = true
}

async function submitRule() {
  if (!form.documentType || !form.action || !form.roleId) return
  saving.value = true

  try {
    const permissionName = buildPermissionName(form.documentType, form.action)
    const permission = await ensurePermission(permissionName)
    const role = roles.value.find(item => item.id === Number(form.roleId))
    const targetRole = role ?? selectedRole.value
    if (!targetRole) throw new Error('Role tidak ditemukan')

    const currentIds = new Set(getPermissionSet(targetRole))
    currentIds.add(permission.id)
    await api.post(`/settings/roles/${targetRole.id}/permissions`, {
      permissionIds: [...currentIds]
    })
    await refreshRoles()

    toast.add({
      title: 'Berhasil',
      description: 'Rule baru berhasil ditambahkan',
      color: 'success'
    })

    modalOpen.value = false
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan rule'
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

function rowLevel(index: number) {
  return index
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
              to="/settings/roles"
            >
              Set User Role
            </UButton>
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-plus"
              class="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              @click="openRuleModal"
            >
              Add A New Rule
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
                v-for="(group, index) in visibleGroups"
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
                  {{ rowLevel(index) }}
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

      <UModal v-model:open="modalOpen" :ui="{ content: 'sm:max-w-lg max-h-[85vh] overflow-y-auto' }">
        <template #content>
          <UCard :ui="{ body: 'p-0' }">
            <template #header>
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold">
                    Add A New Rule
                  </h2>
                  <p class="text-sm text-muted">
                    Tambahkan permission baru ke role terpilih.
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

            <form class="space-y-4 p-6" @submit.prevent="submitRule">
              <div class="grid grid-cols-1 gap-4">
                <UFormField label="Document Type" required>
                  <USelectMenu
                    v-model="form.documentType"
                    :items="permissionGroups.map(group => ({ label: group.label, value: group.key }))"
                    value-key="value"
                    label-key="label"
                    placeholder="Pilih document type"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Action" required>
                  <USelectMenu
                    v-model="form.action"
                    :items="actions.map(action => ({ label: action.label, value: action.key }))"
                    value-key="value"
                    label-key="label"
                    placeholder="Pilih action"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Role" required>
                  <USelectMenu
                    v-model="form.roleId"
                    :items="roleOptions"
                    value-key="value"
                    label-key="label"
                    placeholder="Pilih role"
                    class="w-full"
                  />
                </UFormField>

                <div class="rounded-xl border border-default bg-elevated/40 p-4 text-sm">
                  <p class="text-xs uppercase tracking-wide text-muted">
                    Rule Preview
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ buildPermissionName(form.documentType, form.action) || '-' }}
                  </p>
                </div>
              </div>

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
