<script setup lang="ts">
type Role = {
  id: number
  name: string
  permissions: Array<{
    permission: { name: string }
  }>
}

const props = defineProps<{
  open: boolean
  roles: Role[]
  recommendedPermissions: Record<string, string[]>
  onApply: (roleId: number, roleName: string) => Promise<void>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'applied': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const selectedRoles = ref<Set<number>>(new Set())
const processingRoles = ref<Set<number>>(new Set())
const processedRoles = ref<Set<number>>(new Set())
const isProcessing = ref(false)

const roleData = computed(() => {
  return props.roles.map(role => {
    const roleName = role.name.toLowerCase()
    const recommended = props.recommendedPermissions[roleName] || []
    const currentPermissions = role.permissions.map(p => p.permission.name)
    const hasRecommendation = recommended.length > 0

    const extraPermissions = currentPermissions.filter(
      p => !recommended.includes(p) && !recommended.some(r => r === '*:*')
    )

    const missingPermissions = recommended.filter(
      p => !currentPermissions.includes(p) && !currentPermissions.includes('*:*')
    )

    return {
      ...role,
      roleName,
      hasRecommendation,
      currentCount: currentPermissions.length,
      recommendedCount: recommended.length,
      extraCount: extraPermissions.length,
      missingCount: missingPermissions.length,
      needsCleanup: extraPermissions.length > 0 || missingPermissions.length > 0
    }
  }).filter(r => r.hasRecommendation)
})

const selectedCount = computed(() => selectedRoles.value.size)
const needsCleanupCount = computed(() => roleData.value.filter(r => r.needsCleanup).length)

function toggleRole(roleId: number) {
  if (selectedRoles.value.has(roleId)) {
    selectedRoles.value.delete(roleId)
  } else {
    selectedRoles.value.add(roleId)
  }
  selectedRoles.value = new Set(selectedRoles.value)
}

function selectAll() {
  const allIds = roleData.value.filter(r => r.needsCleanup).map(r => r.id)
  selectedRoles.value = new Set(allIds)
}

function deselectAll() {
  selectedRoles.value = new Set()
}

async function applyCleanup() {
  if (isProcessing.value || selectedRoles.value.size === 0) return

  isProcessing.value = true
  processingRoles.value = new Set(selectedRoles.value)
  processedRoles.value = new Set()

  for (const roleId of selectedRoles.value) {
    const role = roleData.value.find(r => r.id === roleId)
    if (!role) continue

    try {
      await props.onApply(roleId, role.name)
      processedRoles.value.add(roleId)
    } catch (error) {
      console.error(`Failed to apply permissions for ${role.name}:`, error)
    } finally {
      processingRoles.value.delete(roleId)
      processingRoles.value = new Set(processingRoles.value)
    }
  }

  isProcessing.value = false
  emit('applied')
  selectedRoles.value = new Set()
}

function getRoleStatus(role: typeof roleData.value[0]) {
  if (processingRoles.value.has(role.id)) return 'processing'
  if (processedRoles.value.has(role.id)) return 'done'
  if (role.needsCleanup) return 'needs-cleanup'
  return 'ok'
}

function getRoleStatusColor(role: typeof roleData.value[0]) {
  const status = getRoleStatus(role)
  if (status === 'processing') return 'info'
  if (status === 'done') return 'success'
  if (status === 'needs-cleanup') return 'warning'
  return 'neutral'
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-warning/10">
          <UIcon name="i-lucide-broom" class="size-5 text-warning" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            Bulk Permission Cleanup
          </h3>
          <p class="text-sm text-muted">
            Reset permission role ke rekomendasi dalam satu kali aksi
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-muted">{{ selectedCount }} dipilih</span>
            <span class="text-muted">·</span>
            <span class="text-muted">{{ needsCleanupCount }} perlu cleanup</span>
          </div>
          <div class="flex gap-2">
            <UButton
              label="Pilih yang Perlu Cleanup"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="selectAll"
            />
            <UButton
              label="Batal Pilihan"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="deselectAll"
            />
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="role in roleData"
            :key="role.id"
            class="flex items-center gap-3 rounded-lg border border-default p-3 transition-colors"
            :class="{
              'border-primary/50 bg-primary/5': selectedRoles.has(role.id),
              'opacity-60': getRoleStatus(role) === 'done'
            }"
          >
            <input
              type="checkbox"
              :checked="selectedRoles.has(role.id)"
              :disabled="getRoleStatus(role) === 'processing' || getRoleStatus(role) === 'done'"
              class="size-4 rounded border-default text-primary focus:ring-primary"
              @change="toggleRole(role.id)"
            >

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-highlighted">{{ role.name }}</span>
                <UBadge
                  :color="getRoleStatusColor(role)"
                  variant="soft"
                  size="xs"
                >
                  {{ getRoleStatus(role) === 'processing' ? 'Processing...' : getRoleStatus(role) === 'done' ? 'Done' : `${role.extraCount} extra` }}
                </UBadge>
              </div>
              <p class="text-xs text-muted mt-0.5">
                {{ role.currentCount }} current → {{ role.recommendedCount }} recommended
              </p>
            </div>
          </div>
        </div>

        <p v-if="roleData.length === 0" class="py-8 text-center text-sm text-muted">
          Tidak ada role yang memiliki rekomendasi permission.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted">
          {{ selectedCount }} role akan di-reset ke permission rekomendasi
        </p>
        <div class="flex gap-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="soft"
            :disabled="isProcessing"
            @click="isOpen = false"
          />
          <UButton
            label="Apply Cleanup"
            color="warning"
            :loading="isProcessing"
            :disabled="selectedCount === 0 || isProcessing"
            @click="applyCleanup"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
