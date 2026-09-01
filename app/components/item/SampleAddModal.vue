<!-- app/components/item/SampleAddModal.vue -->
<script setup lang="ts">
import { reactive, computed, watch } from 'vue'

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const api = useApi()
const toast = useToast()

const loading = ref(false)

const form = reactive({
  code: '',
  name: '',
  description: '',
  isActive: true
})

const isValid = computed(() =>
  form.code.trim() && form.name.trim()
)

function resetAll() {
  form.code = ''
  form.name = ''
  form.description = ''
  form.isActive = true
}

watch(open, (val) => {
  if (!val) resetAll()
})

async function submit() {
  if (!isValid.value || loading.value) return

  loading.value = true

  try {
    await api.post('/medical/exams/sample-types', {
      code: form.code,
      name: form.name,
      description: form.description,
      isActive: form.isActive
    })

    toast.add({
      title: 'Berhasil',
      description: 'Sample berhasil ditambahkan',
      color: 'success'
    })

    emit('success')
    open.value = false
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menambahkan sample',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">
                Add New Sample
              </h2>
              <p class="text-sm text-muted">
                Tambahkan sample baru
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
          </div>
        </template>

        <div class="p-6">
          <form class="space-y-5" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Sample Code" required>
                <UInput
                  v-model="form.code"
                  placeholder="EX: LAB001"
                  class="w-full"
                  autofocus
                />
              </UFormField>

              <UFormField label="Sample Name" required>
                <UInput
                  v-model="form.name"
                  placeholder="Input sample name"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField label="Description">
                <UTextarea
                  v-model="form.description"
                  :rows="3"
                  placeholder="Input description..."
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Status">
                <div class="flex h-10 items-center">
                  <USwitch v-model="form.isActive" label="Active" />
                </div>
              </UFormField>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
              <UButton
                color="neutral"
                variant="soft"
                @click="open = false"
              >
                Cancel
              </UButton>

              <UButton
                type="submit"
                :loading="loading"
                :disabled="!isValid"
                icon="i-lucide-plus"
              >
                Simpan
              </UButton>
            </div>
          </form>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
