<!-- app/components/hris/leaves/ManualAttendanceModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})

const emit = defineEmits<{
  submit: [payload: {
    employee_id: number | null
    date: string
    checkin_time: string
    checkout_time: string
    notes: string
  }]
}>()

const form = reactive({
  employee_id: null as number | null,
  date: new Date().toISOString().slice(0, 10),
  checkin_time: '08:00',
  checkout_time: '17:00',
  notes: ''
})

const employees = [
  {
    label: 'Agus Setiawan',
    value: 1
  },
  {
    label: 'Rina Kusuma',
    value: 2
  },
  {
    label: 'Deni Nugraha',
    value: 3
  },
  {
    label: 'Siti Rahmawati',
    value: 4
  }
]

function submit() {
  emit('submit', {
    employee_id: form.employee_id,
    date: form.date,
    checkin_time: form.checkin_time,
    checkout_time: form.checkout_time,
    notes: form.notes
  })
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              Input Manual Kehadiran
            </h2>

            <p class="text-sm text-muted">
              Tambahkan data kehadiran karyawan secara manual.
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Karyawan">
            <USelect
              v-model="form.employee_id"
              :items="employees"
              placeholder="Pilih karyawan"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Tanggal">
            <UInput
              v-model="form.date"
              type="date"
            />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Jam Masuk">
              <UInput
                v-model="form.checkin_time"
                type="time"
              />
            </UFormField>

            <UFormField label="Jam Pulang">
              <UInput
                v-model="form.checkout_time"
                type="time"
              />
            </UFormField>
          </div>

          <UFormField label="Catatan">
            <UTextarea
              v-model="form.notes"
              placeholder="Contoh: Input manual karena mesin fingerprint offline"
              autoresize
            />
          </UFormField>
        </div>

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
              icon="i-lucide-save"
              @click="submit"
            >
              Simpan
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
