<!-- app/pages/hris/attendance/shift-configuration/index.vue -->

<script setup lang="ts">
const selectedShift = ref('Morning Shift')

const openCreateShift = ref(false)
const openAssignEmployee = ref(false)
</script>

<template>
  <UDashboardPanel
    id="shift-config"
    class="min-h-0"
  >
    <template #header>
      <UDashboardNavbar title="Shift Configuration">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            class="whitespace-nowrap"
            @click="openCreateShift = true"
          >
            <span class="hidden sm:inline">
              Create New Shift
            </span>

            <span class="sm:hidden">
              Create
            </span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
        <div class="mx-auto w-full max-w-7xl space-y-6">
          <div class="space-y-1">
            <p class="text-sm text-muted">
              Attendance / Shift Configuration
            </p>

            <h1 class="text-2xl font-semibold text-highlighted">
              Shift Configuration
            </h1>
          </div>

          <div class="grid min-w-0 gap-6 xl:grid-cols-12">
            <div class="min-w-0 space-y-6 xl:col-span-4">
              <HrisAttendanceConfigurationShiftList
                v-model="selectedShift"
              />

              <HrisAttendanceConfigurationShiftSummaryCard />
            </div>

            <div class="min-w-0 space-y-6 xl:col-span-8">
              <HrisAttendanceConfigurationShiftDetailForm
                :selected-shift="selectedShift"
              />

              <!-- <HrisAttendanceConfigurationAssignedEmployeesTable
                @add="openAssignEmployee = true"
              /> -->
            </div>
          </div>
        </div>
      </div>

      <HrisAttendanceConfigurationCreateShiftModal
        v-model:open="openCreateShift"
      />

      <!-- <HrisAttendanceConfigurationAssignEmployeeModal
        v-model:open="openAssignEmployee"
      /> -->
    </template>
  </UDashboardPanel>
</template>
