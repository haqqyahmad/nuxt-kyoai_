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

/**
 * fetch departments
 */
const { data: departments } = await useAsyncData('departments', async () => {
  const res = await api.get('/medical/departments')
  return res.data.data
})

/**
 * groups
 */
const groups = ref<any[]>([])

const form = reactive({
  code: '',
  name: '',
  departmentId: '',
  groupId: '',
  price: 0,
  description: '',
  isActive: true
})

/**
 * load groups by department
 */
watch(
  () => form.departmentId,
  async (departmentId) => {
    form.groupId = ''
    if (!departmentId) {
      groups.value = []
      return
    }
    try {
      const res = await api.get(`/medical/group/${departmentId }` )
      groups.value = res.data.data
    } catch {
      groups.value = []
    }
  }
)

const isValid = computed(() => form.code.trim() && form.name.trim() && form.departmentId)

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
  form.departmentId = ''
  form.groupId = ''
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
  loading.value = true
  try {
    const res = await api.post('/mcu/items', {
      code: form.code,
      name: form.name,
      departmentId: form.departmentId || null,
      groupId: form.groupId || null,
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
                  :items="groups.map((g: any) => ({ label: g.name, value: g.id }))"
                  value-key="value"
                  label-key="label"
                  placeholder="Select group"
                  class="w-full"
                />
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