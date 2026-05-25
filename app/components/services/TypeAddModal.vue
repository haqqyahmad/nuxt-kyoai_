<!-- app/components/services/TypeAddModal.vue -->
<script setup lang="ts">
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

function resetAll() {
  form.name = ''
  form.icon = ''
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
    await api.post('/medical/service-types', {
      name: form.name.trim(),
      icon: form.icon.trim(),
      description: form.description.trim(),
      isActive: form.isActive
    })

    toast.add({
      title: 'Berhasil',
      description: 'Service type berhasil ditambahkan',
      color: 'success'
    })

    emit('success')
    open.value = false
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menambahkan service type',
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
                Add New Service Type
              </h2>
              <p class="text-sm text-muted">
                Tambahkan jenis layanan baru
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

              <UFormField
                label="Description"
                class="md:col-span-2"
              >
                <UTextarea
                  v-model="form.description"
                  placeholder="Input service type description"
                  class="w-full"
                  :rows="3"
                />
              </UFormField>
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
