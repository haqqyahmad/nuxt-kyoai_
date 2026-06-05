<!-- app/components/hris/attendance/dashboard/TrackingFilters.vue -->

<script setup lang="ts">
const form = reactive({
  branch: 'All Branches',
  department: 'Customer Support',
  name: '',
  dateRange: 'Oct 01, 2024 - Oct 31, 2024'
})
</script>

<template>
  <UCard>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UFormField label="Branch">
        <USelect
          v-model="form.branch"
          :items="['All Branches', 'Jakarta', 'Cikarang', 'Karawang']"
        />
      </UFormField>

      <UFormField label="Department">
        <USelect
          v-model="form.department"
          :items="['Customer Support', 'Engineering', 'Operations', 'HR', 'Finance']"
        />
      </UFormField>

      <UFormField label="Name">
        <UInput
          v-model="form.name"
          placeholder="Enter name..."
        />
      </UFormField>

      <UFormField label="Date Range">
        <UInput v-model="form.dateRange" />
      </UFormField>
    </div>
  </UCard>
</template>
