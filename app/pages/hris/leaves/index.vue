<!-- app/pages/hris/leaves/index.vue -->

<script setup lang="ts">
type LeaveType = 'annual' | 'sick' | 'special' | 'maternity'

type EmployeeOnLeave = {
  id: number
  name: string
  leave_type: LeaveType
  period: string
  color: string
}

// const toast = useToast()
const requestTable = ref()
// const openManualAttendance = ref(false)

const employeesOnLeave = ref<EmployeeOnLeave[]>([
  {
    id: 1,
    name: 'Siti Rahmawati',
    leave_type: 'annual',
    period: '12 - 15 Mar',
    color: 'bg-success'
  },
  {
    id: 2,
    name: 'Budi Santoso',
    leave_type: 'sick',
    period: '14 Mar',
    color: 'bg-error'
  },
  {
    id: 3,
    name: 'Maya Indah',
    leave_type: 'maternity',
    period: 'Mar - Mei',
    color: 'bg-primary'
  },
  {
    id: 4,
    name: 'Eko Prasetyo',
    leave_type: 'special',
    period: '14 Mar',
    color: 'bg-warning'
  }
])

// const stats = computed(() => ({
//   present: 432,
//   presentPercent: 96,
//   late: 18,
//   latePercent: 4,
//   absent: 12,
//   absentPercent: 2.6,
//   onLeave: employeesOnLeave.value.length
// }))

function bulkApproveLeave() {
  requestTable.value?.bulkApproveSelected()
}

// function submitManualAttendance(payload: unknown) {
//   console.log('Manual attendance payload:', payload)

//   toast.add({
//     title: 'Kehadiran manual tersimpan',
//     description: 'Data kehadiran manual berhasil disimpan.',
//     color: 'success'
//   })

//   openManualAttendance.value = false
// }
</script>

<template>
  <UDashboardPanel id="leave-management">
    <template #header>
      <UDashboardNavbar title="Manajemen Cuti & Izin">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <!-- <template #right>
          <UButton
            icon="i-lucide-plus"
            class="whitespace-nowrap"
            @click="openManualAttendance = true"
          >
            <span class="hidden sm:inline">
              Input Manual Kehadiran
            </span>

            <span class="sm:hidden">
              Input
            </span>
          </UButton>
        </template> -->
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HrisLeavesPageHeader />

        <HrisLeavesQuickActions @bulk-approve="bulkApproveLeave" />

        <div class="grid gap-6 xl:grid-cols-12">
          <div class="min-w-0 space-y-6 xl:col-span-8">
            <!-- <HrisLeavesAttendanceStats :stats="stats" /> -->

            <HrisLeavesRequestTable ref="requestTable" />
          </div>

          <div class="min-w-0 xl:col-span-4">
            <HrisLeavesEmployeesOnLeave :items="employeesOnLeave" />
          </div>
        </div>
      </div>

      <!-- <HrisLeavesManualAttendanceModal
        v-model:open="openManualAttendance"
        @submit="submitManualAttendance"
      /> -->
    </template>
  </UDashboardPanel>
</template>
