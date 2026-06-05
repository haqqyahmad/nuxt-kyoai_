<!-- app/components/hris/attendance/dashboard/UploadShiftModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Upload Data Shift"
    description="Upload file jadwal shift dalam format CSV atau XLSX."
  >
    <template #body>
      <div class="rounded-xl border-2 border-dashed border-default p-8 text-center">
        <UIcon name="i-lucide-calendar-days" class="mx-auto size-12 text-primary" />

        <p class="mt-3 font-medium text-highlighted">
          Click or drag file to this area
        </p>

        <p class="mt-1 text-sm text-muted">
          Supports CSV, XLSX
        </p>

        <UInput
          type="file"
          class="mt-4"
          accept=".csv,.xlsx"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="open = false">
          Cancel
        </UButton>

        <UButton icon="i-lucide-upload">
          Upload Shift
        </UButton>
      </div>
    </template>
  </UModal>
</template>
