<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import ItemExamTemplate from '~/components/item/ItemExamTemplate.vue'
import { useRoomTypes } from '~/composables/useRoomTypes'
import { RENDERER_OPTIONS } from '~/constants/exam-renderers'
import type { RendererKey } from '~/types/physical'

const emit = defineEmits<{
  success: []
}>()

const props = defineProps<{
  item?: {
    id: string
    code: string
    name: string
    resultTiming: 'inline' | 'deferred'
    rendererKey?: RendererKey | null
    externalResult?: boolean
    requiresAttachmentForDone?: boolean
    departmentId: string | null
    roomTypeId: string
    groupId: string | null
    price: number
    description: string | null
    isActive: boolean
  } | null
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const api = useApi()
const toast = useToast()
const { roomTypeOptions } = await useRoomTypes()

const loading = ref(false)
const activeTab = ref('info')
const createdItemId = ref<string | null>(null)
const itemCreated = ref(false)
const creatingItem = ref(false)

type ItemGroup = {
  id: string
  code?: string | null
  name: string
  parentId: string | null
  sortOrder?: number
}

type Department = {
  id: string
  code?: string | null
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
  rendererKey: 'GENERIC' as RendererKey,
  externalResult: false,
  externalProcessSlaDays: 3,
  requiresAttachmentForDone: false,
  departmentId: '',
  roomTypeId: '',
  groupId: '',
  subgroupId: '',
  price: 0,
  description: '',
  isActive: true
})

/** Existing item codes, untuk menghitung sequence berikutnya per prefix */
const existingCodes = ref<string[]>([])

async function loadExistingCodes() {
  try {
    const res = await api.get('/mcu/items', { params: { page: 1, limit: 1000 } })
    const payload = res.data?.data ?? res.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    existingCodes.value = (list as Array<{ code: string }>)
      .map(item => item.code)
      .filter(Boolean)
  } catch {
    existingCodes.value = []
  }
}

/** Singkatan huruf kapital (3 huruf) dari nama group/subgroup */
function abbr(name: string, len = 3) {
  const letters = (name || '').toUpperCase().replace(/[^A-Z]/g, '')
  return letters.slice(0, len)
}

/** Prefix kode: DEPT-GROUP-SUBGROUP berdasarkan pilihan */
const codePrefix = computed(() => {
  const dept = (departments.value ?? []).find(d => d.id === form.departmentId)
  if (!dept) return ''
  const parts = [dept.code || abbr(dept.name)]
  const group = groups.value.find(g => g.id === form.groupId)
  if (group) parts.push(group.code ? group.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : abbr(group.name))
  const subgroup = groups.value.find(g => g.id === form.subgroupId)
  if (subgroup) parts.push(subgroup.code ? subgroup.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : abbr(subgroup.name))
  return parts.filter(Boolean).join('-')
})

/** Nomor urut berikutnya: max existing di prefix + 1 */
const nextSequence = computed(() => {
  const prefix = codePrefix.value
  if (!prefix) return 1
  let max = 0
  for (const code of existingCodes.value) {
    const m = code.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
})

/** Kode otomatis: {prefix}-{seq}, padding 4 (mis. LAB-HEM-0004) */
const autoCode = computed(() => {
  if (!codePrefix.value) return ''
  return `${codePrefix.value}-${String(nextSequence.value).padStart(4, '0')}`
})

function refreshAutoCode() {
  if (props.item || itemCreated.value) return // edit mode / item sudah dibuat: jangan timpa kode
  if (autoCode.value) form.code = autoCode.value
}

watch(
  [() => form.departmentId, () => form.groupId, () => form.subgroupId],
  () => {
    refreshAutoCode()
  }
)

// Populate form when editing
watch(() => props.item, (item) => {
  if (item) {
    form.code = item.code
    form.name = item.name
    form.resultTiming = item.resultTiming
    form.rendererKey = item.rendererKey ?? 'GENERIC'
    form.externalResult = Boolean(item.externalResult)
    form.externalProcessSlaDays = item.externalProcessSlaDays ?? 3
    form.requiresAttachmentForDone = Boolean(item.requiresAttachmentForDone)
    form.departmentId = item.departmentId || ''
    form.roomTypeId = item.roomTypeId
    form.groupId = item.groupId || ''
    form.price = item.price || 0
    form.description = item.description || ''
    form.isActive = item.isActive
    // For edit mode, item is already created
    createdItemId.value = item.id
    itemCreated.value = true
  }
}, { immediate: true, deep: true })

const rootGroups = computed(() =>
  groups.value
    .filter(group => !group.parentId)
    .slice()
    .sort(sortBySequence)
)

const selectedRootGroup = computed(() =>
  groups.value.find(group => group.id === form.groupId) ?? null
)

const selectedSubgroup = computed(() =>
  groups.value.find(group => group.id === form.subgroupId) ?? null
)

const subgroupOptions = computed(() => {
  if (!selectedRootGroup.value) return []
  return groups.value
    .filter(group => group.parentId === selectedRootGroup.value.id)
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
    form.subgroupId
    && selectedSubgroup.value
    && selectedSubgroup.value.parentId !== form.groupId
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

const isValid = computed(() => form.code.trim() && form.name.trim() && form.departmentId && form.roomTypeId)

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
    disabled: false // Always enabled, but will auto-save if needed
  }
])

function resetAll() {
  form.code = ''
  form.name = ''
  form.resultTiming = 'inline'
  form.rendererKey = 'GENERIC'
  form.externalResult = false
  form.externalProcessSlaDays = 3
  form.requiresAttachmentForDone = false
  form.departmentId = ''
  form.roomTypeId = ''
  form.groupId = ''
  form.subgroupId = ''
  form.price = 0
  form.description = ''
  form.isActive = true
  groups.value = []
  createdItemId.value = null
  itemCreated.value = false
  activeTab.value = 'info'
}

watch(open, (val) => {
  if (val) {
    void loadExistingCodes()
    if (!props.item) refreshAutoCode()
  }
  if (!val) {
    if (!props.item) {
      resetAll()
    } else {
      // In edit mode, just reset to original item data
      const item = props.item
      form.code = item.code
      form.name = item.name
      form.resultTiming = item.resultTiming
      form.rendererKey = item.rendererKey ?? 'GENERIC'
      form.externalResult = Boolean(item.externalResult)
      form.requiresAttachmentForDone = Boolean(item.requiresAttachmentForDone)
      form.departmentId = item.departmentId || ''
      form.roomTypeId = item.roomTypeId
      form.groupId = item.groupId || ''
      form.price = item.price || 0
      form.description = item.description || ''
      form.isActive = item.isActive
      createdItemId.value = item.id
      itemCreated.value = true
      activeTab.value = 'info'
    }
  }
})

// Auto-create item when switching to template tab (like edit mode)
async function ensureItemCreated() {
  if (itemCreated.value || creatingItem.value) return
  if (props.item) {
    // Already in edit mode, item exists
    itemCreated.value = true
    return
  }
  if (!isValid.value) {
    toast.add({
      title: 'Validasi gagal',
      description: 'Isi kode, nama, department, dan room type terlebih dahulu',
      color: 'error'
    })
    activeTab.value = 'info'
    return
  }

  creatingItem.value = true
  try {
    const res = await api.post('/mcu/items', {
      code: form.code,
      name: form.name,
      resultTiming: form.resultTiming,
      rendererKey: form.rendererKey,
      externalResult: form.externalResult,
      externalProcessSlaDays: form.externalProcessSlaDays,
      requiresAttachmentForDone: form.requiresAttachmentForDone,
      departmentId: form.departmentId || null,
      roomTypeId: form.roomTypeId,
      groupId: form.subgroupId || form.groupId || null,
      price: form.price,
      description: form.description,
      isActive: form.isActive
    })

    createdItemId.value = res.data.data?.id ?? res.data.id ?? null
    itemCreated.value = true

    toast.add({
      title: 'Item dibuat',
      description: 'Silakan konfigurasi template exam',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal membuat item',
      color: 'error'
    })
    activeTab.value = 'info'
  } finally {
    creatingItem.value = false
  }
}

// Watch for tab change to template - auto create item
watch(() => activeTab.value, async (newTab) => {
  if (newTab === 'template' && !itemCreated.value) {
    await ensureItemCreated()
  }
})

// Handle tab click - for template tab, ensure item is created
function handleTabClick(tab: { key: string, disabled: boolean }) {
  if (tab.disabled) return
  if (tab.key === 'template' && !itemCreated.value) {
    ensureItemCreated()
  } else {
    activeTab.value = tab.key
  }
}

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
    if (!itemCreated.value) {
      // First time save - create item
      const res = await api.post('/mcu/items', {
        code: form.code,
        name: form.name,
        resultTiming: form.resultTiming,
        rendererKey: form.rendererKey,
        externalResult: form.externalResult,
        externalProcessSlaDays: form.externalProcessSlaDays,
        requiresAttachmentForDone: form.requiresAttachmentForDone,
        departmentId: form.departmentId || null,
        roomTypeId: form.roomTypeId,
        groupId: form.subgroupId || form.groupId || null,
        price: form.price,
        description: form.description,
        isActive: form.isActive
      })

      createdItemId.value = res.data.data?.id ?? res.data.id ?? null
      itemCreated.value = true

      toast.add({
        title: 'Berhasil',
        description: 'Item berhasil ditambahkan. Lanjutkan konfigurasi template exam.',
        color: 'success'
      })

      // Auto switch to template tab
      activeTab.value = 'template'
    } else {
      // Item already exists - update it
      await api.put(`/mcu/items/${createdItemId.value}`, {
        code: form.code,
        name: form.name,
        resultTiming: form.resultTiming,
        rendererKey: form.rendererKey,
        externalResult: form.externalResult,
        externalProcessSlaDays: form.externalProcessSlaDays,
        requiresAttachmentForDone: form.requiresAttachmentForDone,
        departmentId: form.departmentId || null,
        roomTypeId: form.roomTypeId,
        groupId: form.subgroupId || form.groupId || null,
        price: form.price,
        description: form.description,
        isActive: form.isActive
      })

      toast.add({
        title: 'Berhasil',
        description: 'Item berhasil diperbarui',
        color: 'success'
      })
    }
    emit('success')
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menyimpan item',
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
    :ui="{ content: 'sm:max-w-5xl h-[90vh]' }"
  >
    <template #content>
      <UCard
        class="h-full flex flex-col"
        :ui="{ body: 'p-0 flex-1 min-h-0 overflow-hidden' }"
      >
        <!-- Header -->
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">
                {{ props.item ? 'Edit Item' : activeTab === 'info' ? 'Add Item' : 'Template Exam' }}
              </h2>
              <p class="text-sm text-muted">
                {{ props.item ? 'Perbarui data item' : activeTab === 'info' ? 'Tambahkan item layanan baru' : `Konfigurasi komponen pemeriksaan untuk item` }}
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
              @click="handleTabClick(tab)"
            >
              <UIcon :name="tab.icon" class="size-4" />
              {{ tab.label }}
              <UBadge
                v-if="tab.key === 'template' && !itemCreated"
                label="Auto-save dulu"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </button>
          </div>
        </template>

        <!-- BODY -->
        <div class="overflow-y-auto h-full px-6 py-4">
          <!-- Tab: Info Item -->
          <div v-if="activeTab === 'info'" class="space-y-5">
            <form @submit.prevent="submit">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField label="Item Code" required>
                  <UInput
                    v-model="form.code"
                    :placeholder="props.item ? 'EX: LAB001' : autoCode || 'Pilih department/group untuk kode otomatis'"
                    class="w-full"
                  />
                  <p
                    v-if="!props.item && autoCode && form.code !== autoCode"
                    class="mt-1 text-xs text-muted"
                  >
                    Kode otomatis: <code class="font-mono text-primary">{{ autoCode }}</code>
                  </p>
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
                <UFormField label="Room Type" required>
                  <USelectMenu
                    v-model="form.roomTypeId"
                    :items="roomTypeOptions"
                    value-key="value"
                    label-key="label"
                    placeholder="Select room type"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Kewajiban PDF">
                  <div class="flex h-10 items-center">
                    <UCheckbox v-model="form.requiresAttachmentForDone" label="PDF wajib sebelum item selesai" />
                  </div>
                </UFormField>

                <UFormField label="Info">
                  <div class="flex h-10 items-center text-sm text-muted">
                    Item wajib tahu room type yang boleh dimasuki saat check-in.
                  </div>
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

                <UFormField label="Renderer" description="Tampilan input custom saat pemeriksaan (item dokter).">
                  <USelectMenu
                    v-model="form.rendererKey"
                    :items="RENDERER_OPTIONS"
                    value-key="value"
                    label-key="label"
                    placeholder="Select renderer"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Hasil dokter luar">
                  <div class="flex h-10 items-center">
                    <UCheckbox v-model="form.externalResult" label="Dikerjakan oleh dokter luar" />
                  </div>
                </UFormField>
                <UFormField
                  label="SLA Proses Dokter Luar (hari)"
                  description="Alert muncul jika hasil belum diproses melewati batas hari setelah dikirim ke dokter."
                >
                  <UInput
                    v-model="form.externalProcessSlaDays"
                    type="number"
                    min="0"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Kewajiban PDF">
                  <div class="flex h-10 items-center">
                    <UCheckbox v-model="form.requiresAttachmentForDone" label="PDF wajib sebelum item selesai" />
                  </div>
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

                <UFormField label="Kewajiban PDF">
                  <div class="flex h-10 items-center">
                    <UCheckbox v-model="form.requiresAttachmentForDone" label="PDF wajib sebelum item selesai" />
                  </div>
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
                  :icon="itemCreated ? 'i-lucide-save' : 'i-lucide-plus'"
                >
                  {{ itemCreated ? 'Simpan Perubahan' : 'Simpan & Lanjut ke Template' }}
                </UButton>
              </div>
            </form>
          </div>

          <!-- Tab: Template Exam -->
          <div v-else-if="activeTab === 'template'" class="space-y-4">
            <div v-if="creatingItem" class="flex items-center justify-center py-12">
              <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
              <span class="ml-2 text-sm text-muted">Membuat item...</span>
            </div>
            <ItemExamTemplate
              v-else-if="createdItemId"
              :item-id="createdItemId"
            />
            <div v-else class="flex flex-col items-center justify-center py-12 border border-dashed border-default rounded-lg text-center">
              <UIcon name="i-lucide-test-tube-diagonal" class="size-10 text-muted mb-3" />
              <p class="font-medium text-sm">
                Klik tab Info Item dan isi data terlebih dahulu
              </p>
              <p class="text-xs text-muted mt-1">
                Item akan otomatis dibuat saat Anda beralih ke tab ini
              </p>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4 mt-4">
              <UButton color="neutral" variant="soft" @click="activeTab = 'info'">
                Kembali
              </UButton>
              <UButton icon="i-lucide-check" @click="handleDone">
                Selesai
              </UButton>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <template #footer>
          <div class="flex justify-end">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-check"
              @click="handleDone"
            >
              Tutup
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
