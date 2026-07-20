<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'

type AttendanceStatus = 'Present' | 'Late' | 'Leave' | 'Absent' | 'Overtime'

const open = defineModel<boolean>('open', {
  default: false
})

const employees = [
  'Alex Rivera',
  'Sarah Chen',
  'Jordan Smith',
  'Michael Tan',
  'Emily Watson'
]

const statuses: AttendanceStatus[] = [
  'Present',
  'Late',
  'Leave',
  'Absent',
  'Overtime'
]

const statusConfig: Record<AttendanceStatus, {
  color: BadgeProps['color']
  icon: string
}> = {
  Present: {
    color: 'success',
    icon: 'i-lucide-check-circle'
  },
  Late: {
    color: 'warning',
    icon: 'i-lucide-clock'
  },
  Leave: {
    color: 'primary',
    icon: 'i-lucide-calendar-minus'
  },
  Absent: {
    color: 'error',
    icon: 'i-lucide-x-circle'
  },
  Overtime: {
    color: 'warning',
    icon: 'i-lucide-clock-plus'
  }
}

const form = reactive({
  employee: '',
  date: '',
  clockIn: '',
  clockOut: '',
  status: '' as AttendanceStatus | '',
  notes: ''
})

const isTimeRequired = computed(() =>
  form.status === 'Present'
  || form.status === 'Late'
  || form.status === 'Overtime'
)

const isInvalidTimeRange = computed(() => {
  if (!form.clockIn || !form.clockOut) return false

  return form.clockOut <= form.clockIn
})

const totalHours = computed(() => {
  if (!isTimeRequired.value || !form.clockIn || !form.clockOut || isInvalidTimeRange.value) {
    return '0h 0m'
  }

  const [inHour, inMinute] = form.clockIn.split(':').map(Number)
  const [outHour, outMinute] = form.clockOut.split(':').map(Number)

  const inTotal = inHour * 60 + inMinute
  const outTotal = outHour * 60 + outMinute
  const diff = outTotal - inTotal

  const hours = Math.floor(diff / 60)
  const minutes = diff % 60

  return `${hours}h ${minutes}m`
})

const canSave = computed(() => {
  if (!form.employee || !form.date || !form.status) return false

  if (isTimeRequired.value) {
    return !!form.clockIn && !!form.clockOut && !isInvalidTimeRange.value
  }

  return true
})

watch(
  () => form.status,
  (status) => {
    if (status === 'Leave' || status === 'Absent') {
      form.clockIn = ''
      form.clockOut = ''
    }
  }
)

watch(open, (value) => {
  if (!value) {
    resetForm()
  }
})

function resetForm() {
  form.employee = ''
  form.date = ''
  form.clockIn = ''
  form.clockOut = ''
  form.status = ''
  form.notes = ''
}

function submit() {
  if (!canSave.value) return

  await api.post('/hris/attendance/manual', {
    totalHours: totalHours.value,
    notes: form.notes
  })

  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Manual Attendance Entry"
    description="Tambahkan data attendance secara manual."
    :ui="{
      content: 'max-w-2xl'
    }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Employee" required>
            <USelect
              v-model="form.employee"
              :items="employees"
              placeholder="Select employee"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Date" required>
            <UInput
              v-model="form.date"
              type="date"
              icon="i-lucide-calendar"
            />
          </UFormField>

          <UFormField
            label="Clock In"
            :required="isTimeRequired"
          >
            <UInput
              v-model="form.clockIn"
              type="time"
              icon="i-lucide-clock"
              :disabled="!isTimeRequired"
            />
          </UFormField>

          <UFormField
            label="Clock Out"
            :required="isTimeRequired"
            :error="isInvalidTimeRange ? 'Clock Out harus lebih besar dari Clock In' : undefined"
          >
            <UInput
              v-model="form.clockOut"
              type="time"
              icon="i-lucide-clock-3"
              :disabled="!isTimeRequired"
            />
          </UFormField>
        </div>

        <UFormField label="Status" required>
          <USelect
            v-model="form.status"
            :items="statuses"
            placeholder="Select status"
            class="w-full"
          />
        </UFormField>

        <div
          class="rounded-xl border border-default bg-muted/40 p-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-medium text-highlighted">
                Attendance Summary
              </p>

              <p class="text-xs text-muted">
                Total hours will be calculated automatically.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UBadge
                v-if="form.status"
                :color="statusConfig[form.status].color"
                :icon="statusConfig[form.status].icon"
                variant="soft"
              >
                {{ form.status }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="outline"
                icon="i-lucide-timer"
              >
                {{ totalHours }}
              </UBadge>
            </div>
          </div>
        </div>

        <UFormField label="Notes">
          <UTextarea
            v-model="form.notes"
            placeholder="Catatan tambahan..."
            :rows="4"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-muted">
          Required fields must be completed.
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="open = false"
          >
            Cancel
          </UButton>

          <UButton
            icon="i-lucide-save"
            :disabled="!canSave"
            @click="submit"
          >
            Save Entry
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
