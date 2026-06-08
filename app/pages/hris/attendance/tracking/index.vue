<!-- pages/hris/attendance/index.vue -->

<script setup lang="ts">
useSeoMeta({
  title: 'Attendance Tracking',
  description: 'Detail attendance record HRIS.'
})

definePageMeta({
  middleware: 'auth'
})

const openUploadAttendance = ref(false)
const openUploadShift = ref(false)
const openChangeValue = ref(false)
</script>

<template>
  <UDashboardPanel id="attendance-tracking">
    <template #header>
      <UDashboardNavbar title="Attendance Tracking">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HrisAttendanceTrackingHeader
          @upload-attendance="openUploadAttendance = true"
          @upload-shift="openUploadShift = true"
          @change-value="openChangeValue = true"
        />

        <HrisAttendanceTrackingFilters />

        <HrisAttendanceTrackingAttendanceTable />

        <HrisAttendanceTrackingAttendanceSummary />
      </div>

      <HrisAttendanceTrackingUploadAttendanceModal v-model:open="openUploadAttendance" />
      <HrisAttendanceTrackingUploadShiftModal v-model:open="openUploadShift" />
      <HrisAttendanceTrackingChangeValueModal v-model:open="openChangeValue" />
    </template>
  </UDashboardPanel>
</template>
