<script setup lang="ts">
type Department = {
  id: string
  code: string
  name: string
}

type User = {
  id: number
  name: string
  email: string
}

type UserResultAccess = {
  departmentId: string
  department?: Department | null
}

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const open = defineModel<boolean>('open')
const api = useApi()
const toast = useToast()

const departments = ref<Department[]>([])
const selectedDepartmentIds = ref<string[]>([])
const search = ref('')
const loadingData = ref(false)
const saving = ref(false)

const filteredDepartments = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return departments.value

  return departments.value.filter(department =>
    `${department.code} ${department.name}`.toLowerCase().includes(query)
  )
})

function toggleDepartment(departmentId: string) {
  selectedDepartmentIds.value = selectedDepartmentIds.value.includes(departmentId)
    ? selectedDepartmentIds.value.filter(id => id !== departmentId)
    : [...selectedDepartmentIds.value, departmentId]
}

function selectAllVisible() {
  selectedDepartmentIds.value = [
    ...new Set([
      ...selectedDepartmentIds.value,
      ...filteredDepartments.value.map(department => department.id)
    ])
  ]
}

async function loadData() {
  if (!props.user) return

  loadingData.value = true
  try {
    const [departmentResponse, accessResponse] = await Promise.all([
      api.get('/medical/departments'),
      api.get(`/users/${props.user.id}/result-access`)
    ])
    const departmentData = departmentResponse.data?.data ?? departmentResponse.data ?? []
    const accessData = accessResponse.data?.data ?? accessResponse.data ?? []

    departments.value = Array.isArray(departmentData) ? departmentData : []
    selectedDepartmentIds.value = Array.isArray(accessData)
      ? accessData
          .map((access: UserResultAccess) => access.departmentId)
          .filter(Boolean)
      : []
  } catch {
    departments.value = []
    selectedDepartmentIds.value = []
    toast.add({ title: 'Gagal memuat Result Access', color: 'error' })
  } finally {
    loadingData.value = false
  }
}

async function saveResultAccess() {
  if (!props.user || saving.value) return

  saving.value = true
  try {
    await api.put(`/users/${props.user.id}/result-access`, {
      departmentIds: selectedDepartmentIds.value
    })
    toast.add({ title: 'Result Access berhasil disimpan', color: 'success' })
    open.value = false
    clearNuxtData('current-user')
    emit('updated')
  } catch (error: unknown) {
    const response = error as { response?: { data?: { message?: string } } }
    toast.add({
      title: 'Gagal menyimpan Result Access',
      description: response.response?.data?.message ?? 'Terjadi kesalahan',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

watch(open, async (value) => {
  if (!value || !props.user) return
  search.value = ''
  selectedDepartmentIds.value = []
  await loadData()
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Result Access — ${user?.name ?? '-'}`"
    description="Pilih department hasil pemeriksaan yang boleh diakses user ini."
  >
    <template #body>
      <div v-if="loadingData" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
      </div>

      <div v-else class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari department..."
          />
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-check-check"
            @click="selectAllVisible"
          >
            Select visible
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-trash-2"
            @click="selectedDepartmentIds = []"
          >
            Clear
          </UButton>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-default p-3 text-sm">
          <span class="text-muted">Selected department</span>
          <UBadge
            :label="`${selectedDepartmentIds.length} department`"
            color="neutral"
            variant="subtle"
          />
        </div>

        <div
          v-if="!filteredDepartments.length"
          class="rounded-xl border border-dashed border-default p-6 text-center text-sm text-muted"
        >
          Tidak ada department yang cocok.
        </div>

        <div v-else class="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          <button
            v-for="department in filteredDepartments"
            :key="department.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-default p-3 text-left transition hover:border-primary/50"
            :class="selectedDepartmentIds.includes(department.id) ? 'border-primary bg-primary/5' : 'bg-transparent'"
            @click="toggleDepartment(department.id)"
          >
            <UCheckbox :model-value="selectedDepartmentIds.includes(department.id)" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ department.name }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ department.code }}
              </p>
            </div>
          </button>
        </div>

        <div class="flex justify-end gap-2 border-t border-default pt-4">
          <UButton color="neutral" variant="soft" @click="open = false">
            Batal
          </UButton>
          <UButton :loading="saving" @click="saveResultAccess">
            Simpan Access
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
