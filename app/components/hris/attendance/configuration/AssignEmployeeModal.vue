<!-- app/components/hris/attendance/configuration/AssignEmployeeModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})

const form = reactive({
  employee: '',
  shift: 'Morning Shift',
  startDate: '',
  status: 'Active'
})

const employees = [
  'Alex Lanson',
  'Beth Smith',
  'Chris Miller',
  'Sarah J.',
  'Mark R.',
  'Elena P.'
]

const shifts = [
  'Morning Shift',
  'Evening Shift',
  'Night Shift',
  'Flexi-time'
]

const statuses = [
  'Active',
  'Scheduled',
  'Inactive'
]

function submit() {
  console.log(form)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Employee"
    description="Tambahkan karyawan ke shift yang dipilih."
  >
    <template #body>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Employee">
          <USelect
            v-model="form.employee"
            :items="employees"
            placeholder="Pilih karyawan"
          />
        </UFormField>

        <UFormField label="Shift">
          <USelect
            v-model="form.shift"
            :items="shifts"
          />
        </UFormField>

        <UFormField label="Shift Start Date">
          <UInput
            v-model="form.startDate"
            type="date"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="form.status"
            :items="statuses"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          @click="open = false"
        >
          Batal
        </UButton>

        <UButton
          icon="i-lucide-user-plus"
          @click="submit"
        >
          Assign Employee
        </UButton>
      </div>
    </template>
  </UModal>
</template>
