<!-- app/components/hris/attendance/configuration/AssignedEmployeesTable.vue -->

<script setup lang="ts">
const emit = defineEmits<{
  add: []
}>()

const employees = [
  {
    name: 'Alex Lanson',
    department: 'Operations',
    date: 'Jan 12, 2024',
    status: 'Active'
  },
  {
    name: 'Beth Smith',
    department: 'Customer Care',
    date: 'Feb 05, 2024',
    status: 'Active'
  }
]
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          Assigned Employees
        </h3>

        <UButton
          icon="i-lucide-user-plus"
          size="sm"
          @click="emit('add')"
        >
          Add Employee
        </UButton>
      </div>
    </template>

    <UTable
      :data="employees"
      :columns="[
        { accessorKey: 'name', header: 'Employee' },
        { accessorKey: 'department', header: 'Department' },
        { accessorKey: 'date', header: 'Start Date' },
        { accessorKey: 'status', header: 'Status' }
      ]"
    />
  </UCard>
</template>
