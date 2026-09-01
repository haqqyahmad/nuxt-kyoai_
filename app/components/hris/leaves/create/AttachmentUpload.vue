<!-- app/components/hris/leaves/create/RequestForm.vue -->

<script setup lang="ts">
const model = defineModel<File | null>({
  default: null
})

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const accept = '.png,.jpg,.jpeg,.pdf'
const maxSize = 5 * 1024 * 1024

const toast = useToast()

function validateFile(file: File) {
  if (file.size > maxSize) {
    toast.add({
      title: 'File terlalu besar',
      description: 'Ukuran maksimal file adalah 5MB.',
      color: 'error'
    })

    return false
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']

  if (!allowedTypes.includes(file.type)) {
    toast.add({
      title: 'Format file tidak didukung',
      description: 'Gunakan file PNG, JPG, JPEG, atau PDF.',
      color: 'error'
    })

    return false
  }

  return true
}

function setFile(file?: File) {
  if (!file) return
  if (!validateFile(file)) return

  model.value = file
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  setFile(target.files?.[0])
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  setFile(event.dataTransfer?.files?.[0])
}

function removeFile() {
  model.value = null

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <UFormField label="Lampiran Pendukung (Opsional)">
    <div
      class="cursor-pointer rounded-xl border-2 border-dashed border-default bg-muted/30 p-6 transition hover:bg-muted/50"
      :class="isDragging ? 'border-primary bg-primary/10' : ''"
      @click="fileInput?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop="onDrop"
    >
      <div
        v-if="!model"
        class="flex flex-col items-center justify-center gap-3 text-center"
      >
        <div class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UIcon
            name="i-lucide-cloud-upload"
            class="size-6"
          />
        </div>

        <div>
          <p class="font-semibold text-highlighted">
            Klik atau seret file ke sini
          </p>

          <p class="text-sm text-muted">
            PNG, JPG, JPEG, atau PDF. Maksimal 5MB.
          </p>
        </div>
      </div>

      <div
        v-else
        class="flex items-center justify-between gap-4"
        @click.stop
      >
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-file" />
          </div>

          <div class="min-w-0">
            <p class="truncate font-medium text-highlighted">
              {{ model.name }}
            </p>

            <p class="text-sm text-muted">
              {{ (model.size / 1024 / 1024).toFixed(2) }} MB
            </p>
          </div>
        </div>

        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          @click="removeFile"
        />
      </div>

      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        class="hidden"
        @change="onFileChange"
      >
    </div>
  </UFormField>
</template>
