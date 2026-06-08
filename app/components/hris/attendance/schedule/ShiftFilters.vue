<!-- app/components/hris/attendance/schedule/ShiftFilters.vue -->

<script setup lang="ts">
const department = defineModel<string>('department', {
  default: 'all'
})

const shiftType = defineModel<string>('shiftType', {
  default: 'all'
})

const departments = [
  { label: 'All Departments', value: 'all' },
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Operations', value: 'Operations' },
  { label: 'Customer Support', value: 'Customer Support' },
  { label: 'HR', value: 'HR' },
  { label: 'Finance', value: 'Finance' }
]

const shiftTypes = [
  { label: 'All Shift Types', value: 'all' },
  { label: 'Morning', value: 'Morning' },
  { label: 'Evening', value: 'Evening' },
  { label: 'Night', value: 'Night' },
  { label: 'Flexi-time', value: 'Flexi-time' },
  { label: 'OFF', value: 'OFF' }
]
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="grid gap-3 sm:grid-cols-2 lg:flex">
        <USelect
          v-model="department"
          :items="departments"
          label-key="label"
          value-key="value"
          class="w-full lg:w-52"
        />

        <USelect
          v-model="shiftType"
          :items="shiftTypes"
          label-key="label"
          value-key="value"
          class="w-full lg:w-52"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UBadge color="success" variant="soft">
          Morning
        </UBadge>
        <UBadge color="warning" variant="soft">
          Evening
        </UBadge>
        <UBadge color="primary" variant="soft">
          Night
        </UBadge>
        <UBadge color="info" variant="soft">
          Flexi-time
        </UBadge>
        <UBadge color="neutral" variant="soft">
          OFF
        </UBadge>
      </div>
    </div>
  </UCard>
</template>
