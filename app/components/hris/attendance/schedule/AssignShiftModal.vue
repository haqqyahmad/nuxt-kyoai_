<!-- app/components/hris/attendance/schedule/AssignShiftModal.vue -->

<script setup lang="ts">
type ShiftTypeValue
  = | 'morning-shift'
    | 'evening-shift'
    | 'night-shift'
    | 'flexi-time'

type ShiftOption = {
  label: string
  value: ShiftTypeValue
  description: string
  type: 'FIXED' | 'FLEXI'
}

type EmployeeOption = {
  label: string
  value: number
  department: string
}

const emit = defineEmits<{
  refresh: []
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const toast = useToast()

const currentYear = new Date().getFullYear()
const loading = ref(false)

const years = Array.from({ length: 6 }, (_, index) => {
  const year = currentYear - 2 + index

  return {
    label: String(year),
    value: year
  }
})

const employees: EmployeeOption[] = [
  {
    label: 'John Doe',
    value: 3,
    department: 'Engineering'
  },
  {
    label: 'Sarah J.',
    value: 4,
    department: 'Operations'
  },
  {
    label: 'Mark R.',
    value: 5,
    department: 'Engineering'
  },
  {
    label: 'Elena P.',
    value: 6,
    department: 'HR'
  },
  {
    label: 'Andi Saputra',
    value: 7,
    department: 'Customer Support'
  }
]

const shiftOptions: ShiftOption[] = [
  {
    label: 'Morning Shift',
    value: 'morning-shift',
    description: 'Senin - Jumat 08:00 - 17:00',
    type: 'FIXED'
  },
  {
    label: 'Evening Shift',
    value: 'evening-shift',
    description: 'Senin - Jumat 14:00 - 23:00',
    type: 'FIXED'
  },
  {
    label: 'Night Shift',
    value: 'night-shift',
    description: 'Senin - Jumat 22:00 - 07:00',
    type: 'FIXED'
  },
  {
    label: 'Flexi-time',
    value: 'flexi-time',
    description: 'Core time 10:00 - 15:00, minimum 8 jam kerja',
    type: 'FLEXI'
  }
]

const form = reactive({
  employeeId: undefined as number | undefined,
  shiftType: undefined as ShiftTypeValue | undefined,
  year: currentYear
})

const selectedEmployee = computed(() => {
  return employees.find(employee => employee.value === form.employeeId)
})

const selectedShift = computed(() => {
  return shiftOptions.find(shift => shift.value === form.shiftType)
})

function resetForm() {
  Object.assign(form, {
    employeeId: undefined,
    shiftType: undefined,
    year: currentYear
  })
}

async function submit() {
  if (!form.employeeId || !form.shiftType) return

  loading.value = true

  try {
    await $fetch('/api/hris/attendance/assign-shift', {
      method: 'POST',
      body: {
        employee_id: form.employeeId,
        shift_type: form.shiftType,
        year: form.year
      }
    })

    toast.add({
      title: 'Berhasil',
      description: 'Shift karyawan berhasil disimpan.',
      color: 'success'
    })

    emit('refresh')

    open.value = false

    resetForm()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: 'Shift karyawan gagal disimpan.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (!value) {
    resetForm()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Shift"
    description="Tambahkan jadwal shift karyawan. Setelah disimpan, calendar akan mengambil ulang final shift view dari backend."
    :ui="{
      content: 'sm:max-w-2xl'
    }"
  >
    <template #body>
      <div class="space-y-5">
        <UFormField
          label="Employee"
          required
        >
          <USelect
            v-model="form.employeeId"
            :items="employees"
            label-key="label"
            value-key="value"
            placeholder="Pilih karyawan"
            class="w-full"
          />
        </UFormField>

        <div
          v-if="selectedEmployee"
          class="rounded-xl border border-default bg-muted/30 p-4"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-user-round"
              class="mt-0.5 size-5 text-primary"
            />

            <div>
              <p class="text-sm font-semibold text-highlighted">
                {{ selectedEmployee.label }}
              </p>

              <p class="mt-1 text-sm text-muted">
                Department: {{ selectedEmployee.department }}
              </p>
            </div>
          </div>
        </div>

        <UFormField
          label="Year"
          required
        >
          <USelect
            v-model="form.year"
            :items="years"
            placeholder="Pilih tahun"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Shift"
          required
        >
          <USelect
            v-model="form.shiftType"
            :items="shiftOptions"
            label-key="label"
            value-key="value"
            placeholder="Pilih shift"
            class="w-full"
          />
        </UFormField>

        <div
          v-if="selectedShift"
          class="rounded-xl border border-default bg-muted/30 p-4"
        >
          <div class="flex items-start gap-3">
            <UIcon
              :name="selectedShift.type === 'FLEXI'
                ? 'i-lucide-clock-3'
                : 'i-lucide-calendar-days'"
              class="mt-0.5 size-5 text-primary"
            />

            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-highlighted">
                  {{ selectedShift.label }}
                </p>

                <UBadge
                  :color="selectedShift.type === 'FLEXI' ? 'info' : 'primary'"
                  variant="soft"
                  size="xs"
                >
                  {{ selectedShift.type }}
                </UBadge>
              </div>

              <p class="mt-1 text-sm text-muted">
                {{ selectedShift.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-dashed border-default bg-muted/20 p-4">
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-info"
              class="mt-0.5 size-5 text-muted"
            />

            <div class="text-sm text-muted">
              <p>
                Preview tahunan tidak lagi dibuat di frontend.
              </p>

              <p class="mt-1">
                Backend akan generate schedule, lalu calendar membaca data dari final shift view.
              </p>
            </div>
          </div>
        </div>
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
          Batal
        </UButton>

        <UButton
          icon="i-lucide-save"
          class="justify-center"
          :loading="loading"
          :disabled="!form.employeeId || !form.shiftType"
          @click="submit"
        >
          Simpan Shift
        </UButton>
      </div>
    </template>
  </UModal>
</template>
