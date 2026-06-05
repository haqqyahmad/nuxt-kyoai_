<!-- pages/hris/employees/index.vue -->

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const openAdd = ref(false)

const department = ref('Semua Departemen')
const status = ref('Semua Status')

function exportCsv() {
  console.log('Export CSV')
}
</script>

<template>
  <UDashboardPanel id="employees">
    <template #header>
      <UDashboardNavbar title="Employee Directory">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HrisEmployeesHeader
          @add="openAdd = true"
          @export="exportCsv"
        />

        <HrisEmployeesFilters
          v-model:department="department"
          v-model:status="status"
        />

        <HrisEmployeesTable
          :department="department"
          :status="status"
        />

        <HrisEmployeesAddModal
          v-model:open="openAdd"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
