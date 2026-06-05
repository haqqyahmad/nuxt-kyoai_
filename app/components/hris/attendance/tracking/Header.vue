<!-- app/components/hris/attendance/dashboard/TrackingHeader.vue -->

<script setup lang="ts">
const emit = defineEmits<{
  uploadAttendance: []
  uploadShift: []
  changeValue: []
}>()
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Detailed Attendance Record
      </h1>

      <p class="mt-1 text-sm text-muted">
        Monitoring detail absensi, jadwal shift, overtime, dan status kehadiran.
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton icon="i-lucide-eye">
        View
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-printer"
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
        icon="i-lucide-calendar-days"
        @click="emit('uploadShift')"
      >
        Upload Shift
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-download"
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
