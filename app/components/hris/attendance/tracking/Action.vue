<script setup lang="ts">
defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  view: []
  uploadAttendance: []
  changeValue: []
  print: []
  exportExcel: []
}>()
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <UButton
        icon="i-lucide-eye"
        :loading="loading"
        @click="emit('view')"
      >
        View
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-printer"
        @click="emit('print')"
      >
        Print
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-upload"
        @click="emit('uploadAttendance')"
      >
        Upload Absensi
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-download"
        @click="emit('exportExcel')"
      >
        Export Excel
      </UButton>

      <UButton
        color="success"
        icon="i-lucide-file-pen-line"
        @click="emit('changeValue')"
      >
        Change Value
      </UButton>
    </div>
  </div>
</template>
