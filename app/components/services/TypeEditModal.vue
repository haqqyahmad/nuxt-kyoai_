<!-- app/components/services/TypeEditModal.vue -->
<script setup lang="ts">
type ServiceType = {
  id: string
  name: string
  icon: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  serviceType: ServiceType | null
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
  name: '',
  icon: '',
  description: '',
  isActive: true
})

const isValid = computed(() =>
  form.name.trim() && form.icon.trim()
)

watch(
  () => props.serviceType,
  (serviceType) => {
    if (!serviceType) return

    form.name = serviceType.name
    form.icon = serviceType.icon
    form.description = serviceType.description || ''
    form.isActive = serviceType.isActive
  },
  { immediate: true }
)

async function submit() {
  if (!props.serviceType?.id || !isValid.value || loading.value) return

  loading.value = true

  try {
    await api.put(`/medical/service-types/${props.serviceType.id}`, {
      name: form.name.trim(),
      icon: form.icon.trim(),
      description: form.description.trim(),
      isActive: form.isActive
    })

    toast.add({
      title: 'Berhasil',
      description: 'Service type berhasil diperbarui',
      color: 'success'
    })

    emit('success')
    open.value = false
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal memperbarui service type',
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
                Edit Service Type
              </h2>
              <p class="text-sm text-muted">
                Perbarui data jenis layanan
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
              <UFormField label="Name" required>
                <UInput
                  v-model="form.name"
                  placeholder="Input service type name"
                  class="w-full"
                  autofocus
                />
              </UFormField>

              <UFormField label="Status">
                <div class="flex h-10 items-center">
                  <USwitch
                    v-model="form.isActive"
                    label="Active"
                  />
                </div>
              </UFormField>

              <UFormField
                label="Icon"
                required
                class="md:col-span-2"
              >
                <BaseIconGridPicker v-model="form.icon" />
              </UFormField>

              <!-- <UFormField
                label="Description"
                class="md:col-span-2"
              >
                <UTextarea
                  v-model="form.description"
                  :rows="3"
                  placeholder="Input description..."
                  class="w-full"
                />
              </UFormField> -->
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
              <UButton
                type="button"
                color="neutral"
                variant="soft"
                @click="open = false"
              >
                Cancel
              </UButton>

              <UButton
                type="submit"
                :loading="loading"
                :disabled="!isValid || loading"
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
