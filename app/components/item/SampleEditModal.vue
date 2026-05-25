<!-- app/components/item/SampleEditModal.vue -->
<script setup lang="ts">
import { reactive, computed, watch } from 'vue'

type SampleType = {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  sample: SampleType | null
}>()

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

watch(
  () => props.sample,
  (sample) => {
    if (!sample) return

    form.code = sample.code
    form.name = sample.name
    form.description = sample.description || ''
    form.isActive = sample.isActive
  },
  { immediate: true }
)

async function submit() {
  if (!props.sample?.id || !isValid.value || loading.value) return

  loading.value = true

  try {
    await api.put(`/medical/exams/sample-types/${props.sample.id}`, {
      code: form.code,
      name: form.name,
      description: form.description,
      isActive: form.isActive
    })

    toast.add({
      title: 'Berhasil',
      description: 'Sample berhasil diperbarui',
      color: 'success'
    })

    emit('success')
    open.value = false
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal memperbarui sample',
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
                Edit Sample
              </h2>
              <p class="text-sm text-muted">
                Perbarui data sample
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
                icon="i-lucide-save"
              >
                Update
              </UButton>
            </div>
          </form>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
