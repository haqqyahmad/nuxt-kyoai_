<script setup lang="ts">
useSeoMeta({
  title: 'Attendance Analytics',
  description: 'Analytics attendance HRIS.'
})

definePageMeta({
  middleware: 'auth'
})

const openDetail = ref(false)
</script>

<template>
  <UDashboardPanel id="attendance-analytics">
    <template #header>
      <UDashboardNavbar title="Attendance Analytics">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UInput
            icon="i-lucide-search"
            placeholder="Search analytics..."
            class="w-64"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HrisAttendanceAnalyticsFilters />

        <HrisAttendanceAnalyticsStats />

        <div class="grid gap-6 xl:grid-cols-12">
          <div class="xl:col-span-8">
            <HrisAttendanceAnalyticsMonthlyTrendChart />
          </div>

          <div class="xl:col-span-4">
            <HrisAttendanceAnalyticsLateArrivalReasons />
          </div>
        </div>

        <HrisAttendanceAnalyticsAttendanceAnomaliesTable
          @detail="openDetail = true"
        />
      </div>

      <HrisAttendanceAnalyticsEmployeeAnomalyDetailModal
        v-model:open="openDetail"
      />
    </template>
  </UDashboardPanel>
</template>
