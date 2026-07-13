<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import ItemExamTemplate from '~/components/item/ItemExamTemplate.vue'

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const api = useApi()
const toast = useToast()

const loading = ref(false)
const activeTab = ref('info') // 'info' | 'template'
const createdItemId = ref<string | null>(null)

type ItemGroup = {
  id: string
  name: string
  parentId: string | null
  sortOrder?: number
}

type Department = {
  id: string
  name: string
  type?: 'office' | 'medical' | null
}

/**
 * fetch departments
 */
const { data: departments } = await useAsyncData('departments', async () => {
  const res = await api.get('/medical/departments')
  const payload = res.data.data as Department[] | undefined
  return Array.isArray(payload)
    ? payload.filter(department => department.type === 'medical')
    : []
})

/**
 * groups
 */
const groups = ref<ItemGroup[]>([])

const form = reactive({
  code: '',
  name: '',
  resultTiming: 'inline',
  departmentId: '',
  groupId: '',
  subgroupId: '',
  price: 0,
  description: '',
  isActive: true
})

const rootGroups = computed(() =>
  groups.value
    .filter((group) => !group.parentId)
    .slice()
    .sort(sortBySequence)
)

const selectedRootGroup = computed(() =>
  groups.value.find((group) => group.id === form.groupId) ?? null
)

const selectedSubgroup = computed(() =>
  groups.value.find((group) => group.id === form.subgroupId) ?? null
)

const subgroupOptions = computed(() => {
  if (!selectedRootGroup.value) return []
  return groups.value
    .filter((group) => group.parentId === selectedRootGroup.value.id)
    .slice()
    .sort(sortBySequence)
})

function sortBySequence(a: ItemGroup, b: ItemGroup) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
}

const hierarchySelectionError = computed(() => {
  if (!form.departmentId) return ''
  if (form.subgroupId && !form.groupId) {
    return 'Pilih group utama dulu sebelum memilih subgroup.'
  }
  if (form.groupId && !selectedRootGroup.value) {
    return 'Group utama tidak valid untuk department ini.'
  }
  if (form.subgroupId && !selectedSubgroup.value) {
    return 'Subgroup yang dipilih tidak ditemukan.'
  }
  if (
    form.subgroupId &&
    selectedSubgroup.value &&
    selectedSubgroup.value.parentId !== form.groupId
  ) {
    return 'Subgroup harus berada di bawah group yang dipilih.'
  }
  return ''
})

/**
 * load groups by department
 */
watch(
  () => form.departmentId,
  async (departmentId) => {
    form.groupId = ''
    form.subgroupId = ''
    if (!departmentId) {
      groups.value = []
      return
    }
    try {
      const res = await api.get(`/medical/group/${departmentId}`)
      const payload = res.data.data
      groups.value = Array.isArray(payload) ? payload : []
    } catch {
      groups.value = []
    }
  }
)

watch(
  () => form.groupId,
  () => {
    form.subgroupId = ''
  }
)

const isValid = computed(() => form.code.trim() && form.name.trim() && form.departmentId)

const resultTimingOptions = [
  { label: 'Inline', value: 'inline' },
  { label: 'Deferred', value: 'deferred' }
]

const tabs = computed(() => [
  {
    key: 'info',
    label: 'Info Item',
    icon: 'i-lucide-clipboard-list'
  },
  {
    key: 'template',
    label: 'Template Exam',
    icon: 'i-lucide-test-tube',
    disabled: !createdItemId.value
  }
])

function resetAll() {
  form.code = ''
  form.name = ''
  form.resultTiming = 'inline'
  form.departmentId = ''
  form.groupId = ''
  form.subgroupId = ''
  form.price = 0
  form.description = ''
  form.isActive = true
  groups.value = []
  createdItemId.value = null
  activeTab.value = 'info'
}

watch(open, (val) => {
  if (!val) resetAll()
})

async function submit() {
  if (!isValid.value || loading.value) return
  if (hierarchySelectionError.value) {
    toast.add({
      title: 'Validasi gagal',
      description: hierarchySelectionError.value,
      color: 'error'
    })
    return
  }

  loading.value = true
  try {
    const res = await api.post('/mcu/items', {
      code: form.code,
      name: form.name,
      resultTiming: form.resultTiming,
      departmentId: form.departmentId || null,
      groupId: form.subgroupId || form.groupId || null,
      price: form.price,
      description: form.description,
      isActive: form.isActive
    })

    createdItemId.value = res.data.data?.id ?? res.data.id ?? null

    toast.add({
      title: 'Berhasil',
      description: 'Item berhasil ditambahkan. Lanjutkan konfigurasi template exam.',
      color: 'success'
    })

    // Auto switch to template tab
    activeTab.value = 'template'
    emit('success')
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menambahkan item',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function handleDone() {
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <!-- Header -->
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">
                {{ activeTab === 'info' ? 'Add Item' : 'Template Exam' }}
              </h2>
              <p class="text-sm text-muted">
                {{ activeTab === 'info' ? 'Tambahkan item layanan baru' : `Konfigurasi komponen pemeriksaan untuk item` }}
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
          </div>

          <!-- Tabs -->
          <div class="mt-4 flex gap-1 border-b border-default -mb-4 pb-0">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              :class="[
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : tab.disabled
                    ? 'border-transparent text-muted cursor-not-allowed opacity-50'
                    : 'border-transparent text-muted hover:text-default hover:border-default cursor-pointer'
              ]"
              :disabled="tab.disabled"
              @click="!tab.disabled && (activeTab = tab.key)"
            >
              <UIcon :name="tab.icon" class="size-4" />
              {{ tab.label }}
              <UBadge
                v-if="tab.key === 'template' && !createdItemId"
                label="Simpan item dulu"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </button>
          </div>
        </template>

        <!-- Tab: Info Item -->
        <div v-if="activeTab === 'info'" class="p-6">
          <form class="space-y-5" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Item Code" required>
                <UInput
                  v-model="form.code"
                  placeholder="EX: LAB001"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Department" required>
                <USelectMenu
                  v-model="form.departmentId"
                  :items="(departments || []).map((d: any) => ({ label: d.name, value: d.id }))"
                  value-key="value"
                  label-key="label"
                  placeholder="Select department"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Item Name" required>
                <UInput
                  v-model="form.name"
                  placeholder="Input item name"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Group">
                <USelectMenu
                  v-model="form.groupId"
                  :disabled="!form.departmentId"
                  :items="rootGroups.map((g: any) => ({ label: g.name, value: g.id }))"
                  value-key="value"
                  label-key="label"
                  placeholder="Select group"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Result Timing" required>
                <USelectMenu
                  v-model="form.resultTiming"
                  :items="resultTimingOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Select timing"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Info">
                <div class="flex h-10 items-center text-sm text-muted">
                  `inline` untuk hasil yang diisi saat pemeriksaan, `deferred` untuk hasil setelah room selesai.
                </div>
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Sub Group">
                <USelectMenu
                  v-model="form.subgroupId"
                  :disabled="!form.groupId"
                  :items="subgroupOptions.map((g: any) => ({ label: g.name, value: g.id }))"
                  value-key="value"
                  label-key="label"
                  placeholder="Select subgroup"
                  class="w-full"
                />
                <p v-if="hierarchySelectionError" class="mt-2 text-xs text-error">
                  {{ hierarchySelectionError }}
                </p>
              </UFormField>

              <UFormField label="Info">
                <div class="flex h-10 items-center text-sm text-muted">
                  Item akan disimpan ke subgroup jika dipilih, atau ke group utama jika tidak ada subgroup.
                </div>
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Price">
                <UInput
                  v-model="form.price"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Status">
                <div class="flex h-10 items-center">
                  <USwitch v-model="form.isActive" label="Active" />
                </div>
              </UFormField>
            </div>

            <UFormField label="Description">
              <UTextarea
                v-model="form.description"
                :rows="3"
                placeholder="Input description..."
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
              <UButton color="neutral" variant="soft" @click="open = false">
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="loading"
                :disabled="!isValid"
                icon="i-lucide-plus"
              >
                Simpan & Lanjut ke Template
              </UButton>
            </div>
          </form>
        </div>

        <!-- Tab: Template Exam -->
        <div v-else-if="activeTab === 'template'" class="p-6">
          <ItemExamTemplate
            v-if="createdItemId"
            :item-id="createdItemId"
          />

          <div class="flex items-center justify-end gap-2 border-t border-default pt-4 mt-4">
            <UButton color="neutral" variant="soft" @click="activeTab = 'info'">
              Kembali
            </UButton>
            <UButton icon="i-lucide-check" @click="handleDone">
              Selesai
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
