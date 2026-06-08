<!-- app/components/hris/attendance/dashboard/ChangeValueModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})

const form = reactive({
  employee: '',
  date: '',
  field: '',
  value: '',
  reason: ''
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Change Attendance Value"
    description="Ubah nilai absensi karyawan secara manual."
  >
    <template #body>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Employee">
          <USelect
            v-model="form.employee"
            :items="['Andi Saputra', 'Budi Mahendra', 'Citra Ningsih']"
            placeholder="Pilih karyawan"
          />
        </UFormField>

        <UFormField label="Date">
          <UInput v-model="form.date" type="date" />
        </UFormField>

        <UFormField label="Field">
          <USelect
            v-model="form.field"
            :items="['Scan In', 'Scan Out', 'Status', 'Overtime', 'Reason']"
            placeholder="Pilih field"
          />
        </UFormField>

        <UFormField label="New Value">
          <UInput v-model="form.value" placeholder="Masukkan nilai baru" />
        </UFormField>

        <UFormField label="Reason" class="md:col-span-2">
          <UTextarea
            v-model="form.reason"
            placeholder="Alasan perubahan data..."
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="open = false">
          Cancel
        </UButton>

        <UButton icon="i-lucide-save" @click="open = false">
          Save Changes
        </UButton>
      </div>
    </template>
  </UModal>
</template>
