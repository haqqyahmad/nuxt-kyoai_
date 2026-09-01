<!-- app/components/hris/national-holidays/CreateHolidayModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})

const emit = defineEmits<{
  created: []
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)

const form = reactive({
  date: '',
  name: '',
  description: '',
  is_active: true
})

function resetForm() {
  Object.assign(form, {
    date: '',
    name: '',
    description: '',
    is_active: true
  })
}

function validateForm() {
  if (!form.name.trim()) {
    toast.add({
      title: 'Validasi',
      description: 'Nama holiday wajib diisi.',
      color: 'warning'
    })

    return false
  }

  if (!form.date) {
    toast.add({
      title: 'Validasi',
      description: 'Tanggal holiday wajib diisi.',
      color: 'warning'
    })

    return false
  }

  return true
}

async function submit() {
  if (loading.value) return
  if (!validateForm()) return

  loading.value = true

  try {
    const payload = {
      date: form.date,
      name: form.name,
      description: form.description,
      is_active: form.is_active
    }

    await api('/hris/national-holidays', {
      method: 'POST',
      data: payload
    })

    toast.add({
      title: 'Berhasil',
      description: 'National holiday berhasil dibuat.',
      color: 'success'
    })

    emit('created')

    open.value = false
    resetForm()
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'National holiday gagal dibuat.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (!value) {
    resetForm()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create National Holiday"
    description="Buat data libur nasional."
    :ui="{
      content: 'sm:max-w-2xl'
    }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Holiday Name"
            required
          >
            <UInput
              v-model="form.name"
              placeholder="Tahun Baru Masehi"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Holiday Date"
            required
          >
            <UInput
              v-model="form.date"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Status">
            <div class="flex h-10 items-center gap-3 rounded-md border border-default px-3">
              <USwitch v-model="form.is_active" />

              <span class="text-sm text-highlighted">
                {{ form.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </UFormField>

          <UFormField
            label="Description"
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="form.description"
              placeholder="Keterangan holiday"
              :rows="4"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="outline"
          class="justify-center"
          :disabled="loading"
          @click="open = false"
        >
          Batal
        </UButton>

        <UButton
          icon="i-lucide-save"
          class="justify-center"
          :loading="loading"
          :disabled="loading"
          @click="submit"
        >
          Simpan Holiday
        </UButton>
      </div>
    </template>
  </UModal>
</template>
