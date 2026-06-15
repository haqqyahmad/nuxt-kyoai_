<!-- app/components/hris/attendance/tracking/UploadAttendanceModal.vue -->

<script setup lang="ts">
const api = useApi()
const toast = useToast()

const open = defineModel<boolean>('open', {
  default: false
})

const file = ref<File | null>(null)
const loading = ref(false)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

async function uploadAttendance() {
  if (!file.value) {
    toast.add({
      title: 'File belum dipilih',
      description: 'Silakan pilih file attendance terlebih dahulu.',
      color: 'warning'
    })
    return
  }

  loading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file.value)

    await api.post('/hris/attendance/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    toast.add({
      title: 'Upload attendance berhasil',
      color: 'success'
    })

    open.value = false
    file.value = null
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Upload attendance gagal',
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
    title="Upload Data Absensi"
    description="Upload file absensi dalam format TXT, CSV, atau XLSX."
  >
    <template #body>
      <div class="rounded-xl border-2 border-dashed border-default p-8 text-center">
        <UIcon name="i-lucide-upload-cloud" class="mx-auto size-12 text-primary" />

        <p class="mt-3 font-medium text-highlighted">
          Click or drag file to this area
        </p>

        <p class="mt-1 text-sm text-muted">
          Supports TXT, CSV, XLSX
        </p>

        <UInput
          type="file"
          class="mt-4"
          accept=".txt,.csv,.xlsx"
          @change="onFileChange"
        />

        <p v-if="file" class="mt-3 text-sm text-muted">
          Selected: <span class="font-medium text-highlighted">{{ file.name }}</span>
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="open = false"
        >
          Cancel
        </UButton>

        <UButton
          icon="i-lucide-upload"
          :loading="loading"
          @click="uploadAttendance"
        >
          Upload
        </UButton>
      </div>
    </template>
  </UModal>
</template>
