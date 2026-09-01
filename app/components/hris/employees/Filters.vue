<!-- app/components/hris/employees/Filters.vue -->

<script setup lang="ts">
const department = defineModel<string>('department')
const status = defineModel<string>('status')
</script>

<template>
  <UCard>
    <div class="grid gap-4 md:grid-cols-3">
      <UFormField label="Departemen">
        <USelect
          v-model="department"
          :items="[
            'Semua Departemen',
            'Teknologi',
            'SDM',
            'Keuangan',
            'Marketing'
          ]"
        />
      </UFormField>

      <UFormField label="Status">
        <USelect
          v-model="status"
          :items="[
            'Semua Status',
            'Aktif',
            'Kontrak',
            'Cuti'
          ]"
        />
      </UFormField>

      <div class="flex items-end">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-sliders-horizontal"
        >
          Filter Lanjutan
        </UButton>
      </div>
    </div>
  </UCard>
</template>
