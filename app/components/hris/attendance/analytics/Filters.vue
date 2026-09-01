<script setup lang="ts">
const filters = reactive({
  dateRange: 'Oct 01, 2023 - Oct 31, 2023',
  department: 'All Departments',
  employmentType: 'Full-time'
})
</script>

<template>
  <UCard>
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Attendance Tracking
        </h1>

        <p class="mt-1 text-sm text-muted">
          Monitor real-time punctuality and organizational presence metrics.
        </p>
      </div>

      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Date Range">
          <UInput
            v-model="filters.dateRange"
            icon="i-lucide-calendar-days"
            class="w-64"
          />
        </UFormField>

        <UFormField label="Department">
          <USelect
            v-model="filters.department"
            :items="[
              'All Departments',
              'Engineering',
              'Marketing',
              'Operations'
            ]"
            class="w-44"
          />
        </UFormField>

        <UFormField label="Employment Type">
          <USelect
            v-model="filters.employmentType"
            :items="[
              'Full-time',
              'Contract',
              'Part-time'
            ]"
            class="w-40"
          />
        </UFormField>

        <UButton icon="i-lucide-filter">
          Apply Filters
        </UButton>
      </div>
    </div>
  </UCard>
</template>
