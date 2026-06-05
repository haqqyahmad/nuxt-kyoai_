<script setup lang="ts">
useSeoMeta({
  title: 'Attendance Management',
  description: 'Dashboard attendance management HRIS.'
})

definePageMeta({
  middleware: 'auth'
})

const openManualEntry = ref(false)
const openExport = ref(false)
</script>

<template>
  <UDashboardPanel id="attendance">
    <template #header>
      <UDashboardNavbar title="Attendance Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UInput
            icon="i-lucide-search"
            placeholder="Search records..."
            class="w-64"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HrisAttendanceDashboardStats />

        <HrisAttendanceDashboardAttendanceSummaryCards />

        <HrisAttendanceDashboardActionBar
          @export="openExport = true"
          @manual-entry="openManualEntry = true"
        />

        <HrisAttendanceDashboardDailyLogsTable />
      </div>

      <HrisAttendanceDashboardManualEntryModal v-model:open="openManualEntry" />
      <HrisAttendanceDashboardExportAttendanceModal v-model:open="openExport" />
    </template>
  </UDashboardPanel>
</template>
