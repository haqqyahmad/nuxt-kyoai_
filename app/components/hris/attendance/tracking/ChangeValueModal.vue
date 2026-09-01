<!-- app/components/hris/attendance/tracking/ChangeValueModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})

const emit = defineEmits<{
  saved: []
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)

const fieldItems = [
  { label: 'Scan In', value: 'checkin_time' },
  { label: 'Scan Out', value: 'checkout_time' },
  { label: 'Status', value: 'status' },
  { label: 'Overtime Minutes', value: 'ot_minutes' },
  { label: 'Type Lembur', value: 'overtime_type' },
  { label: 'Reason', value: 'reason' }
]

const statusItems = [
  { label: 'Present', value: 'PRESENT' },
  { label: 'Late', value: 'LATE' },
  { label: 'Absent', value: 'ABSENT' },
  { label: 'Off', value: 'OFF' },
  { label: 'Holiday', value: 'HOLIDAY' },
  { label: 'Sick', value: 'SICK' },
  { label: 'Leave', value: 'LEAVE' },
  { label: 'Permit', value: 'PERMIT' }
]

const overtimeTypeItems = [
  { label: 'Lembur Depan', value: 'front' },
  { label: 'Lembur Belakang', value: 'back' },
  { label: 'Depan & Belakang', value: 'both' }
]

const form = reactive({
  employee_id: '',
  date: '',
  field: '',
  value: '',
  reason: ''
})

const valueInputType = computed(() => {
  if (form.field === 'checkin_time' || form.field === 'checkout_time') {
    return 'time'
  }

  if (form.field === 'ot_minutes') {
    return 'number'
  }

  return 'text'
})

function resetForm() {
  Object.assign(form, {
    employee_id: '',
    date: '',
    field: '',
    value: '',
    reason: ''
  })
}

function validateForm() {
  if (!form.employee_id) {
    toast.add({
      title: 'Validasi',
      description: 'Employee wajib diisi.',
      color: 'warning'
    })

    return false
  }

  if (!form.date) {
    toast.add({
      title: 'Validasi',
      description: 'Tanggal wajib diisi.',
      color: 'warning'
    })

    return false
  }

  if (!form.field) {
    toast.add({
      title: 'Validasi',
      description: 'Field wajib dipilih.',
      color: 'warning'
    })

    return false
  }

  if (!form.value) {
    toast.add({
      title: 'Validasi',
      description: 'Nilai baru wajib diisi.',
      color: 'warning'
    })

    return false
  }

  if (!form.reason.trim()) {
    toast.add({
      title: 'Validasi',
      description: 'Alasan perubahan wajib diisi.',
      color: 'warning'
    })

    return false
  }

  return true
}

async function submit() {
  if (loading.value) return
  if (!validateForm()) return

  loading.value = true

  try {
    const payload = {
      employee_id: Number(form.employee_id),
      date: form.date,
      field: form.field,
      value: form.value,
      reason: form.reason
    }

    await api('/hris/attendance/change-value', {
      method: 'POST',
      data: payload
    })

    toast.add({
      title: 'Berhasil',
      description: 'Attendance value berhasil diubah.',
      color: 'success'
    })

    emit('saved')
    open.value = false
    resetForm()
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal mengubah attendance value.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(
  () => form.field,
  () => {
    form.value = ''
  }
)

watch(open, (value) => {
  if (!value) resetForm()
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Change Attendance Value"
    description="Ubah nilai absensi karyawan secara manual."
    :ui="{
      content: 'sm:max-w-2xl'
    }"
  >
    <template #body>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Employee ID" required>
          <UInput
            v-model="form.employee_id"
            type="number"
            placeholder="Contoh: 2"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Date" required>
          <UInput
            v-model="form.date"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Field" required>
          <USelect
            v-model="form.field"
            :items="fieldItems"
            placeholder="Pilih field"
            class="w-full"
          />
        </UFormField>

        <UFormField label="New Value" required>
          <USelect
            v-if="form.field === 'status'"
            v-model="form.value"
            :items="statusItems"
            placeholder="Pilih status"
            class="w-full"
          />

          <USelect
            v-else-if="form.field === 'overtime_type'"
            v-model="form.value"
            :items="overtimeTypeItems"
            placeholder="Pilih type lembur"
            class="w-full"
          />

          <UInput
            v-else
            v-model="form.value"
            :type="valueInputType"
            placeholder="Masukkan nilai baru"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Reason"
          required
          class="md:col-span-2"
        >
          <UTextarea
            v-model="form.reason"
            placeholder="Alasan perubahan data..."
            :rows="4"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="outline"
          class="justify-center"
          :disabled="loading"
          @click="open = false"
        >
          Cancel
        </UButton>

        <UButton
          icon="i-lucide-save"
          class="justify-center"
          :loading="loading"
          :disabled="loading"
          @click="submit"
        >
          Save Changes
        </UButton>
      </div>
    </template>
  </UModal>
</template>
