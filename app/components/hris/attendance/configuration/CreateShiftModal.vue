<!-- app/components/hris/attendance/configuration/CreateShiftModal.vue -->

<script setup lang="ts">
type ShiftStatus = 'active' | 'inactive'

type ShiftTemplateDay = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type WorkingHour = {
  start_time: string
  end_time: string
  days: number[]
}

const open = defineModel<boolean>('open', {
  default: false
})

const emit = defineEmits<{
  created: []
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)

const days = [
  { label: 'M', name: 'Mon', fullName: 'Monday', day_of_week: 1 },
  { label: 'T', name: 'Tue', fullName: 'Tuesday', day_of_week: 2 },
  { label: 'W', name: 'Wed', fullName: 'Wednesday', day_of_week: 3 },
  { label: 'T', name: 'Thu', fullName: 'Thursday', day_of_week: 4 },
  { label: 'F', name: 'Fri', fullName: 'Friday', day_of_week: 5 },
  { label: 'S', name: 'Sat', fullName: 'Saturday', day_of_week: 6 },
  { label: 'S', name: 'Sun', fullName: 'Sunday', day_of_week: 7 }
]

const defaultWorkingHour = (): WorkingHour => ({
  start_time: '08:00',
  end_time: '17:00',
  days: []
})

const form = reactive({
  name: '',
  description: '',
  status: 'active' as ShiftStatus,
  workingHours: [defaultWorkingHour()] as WorkingHour[]
})

const previewShiftDays = computed<ShiftTemplateDay[]>(() => {
  return days.map((day) => {
    const workingHour = form.workingHours.find(hour =>
      hour.days.includes(day.day_of_week)
    )

    return {
      day_of_week: day.day_of_week,
      start_time: workingHour ? workingHour.start_time : null,
      end_time: workingHour ? workingHour.end_time : null,
      is_working: !!workingHour
    }
  })
})

const totalWorkingDays = computed(() => {
  return previewShiftDays.value.filter(day => day.is_working).length
})

function addWorkingHour() {
  form.workingHours.push(defaultWorkingHour())
}

function removeWorkingHour(index: number) {
  if (form.workingHours.length <= 1) return
  form.workingHours.splice(index, 1)
}

function isDaySelected(hour: WorkingHour, dayOfWeek: number) {
  return hour.days.includes(dayOfWeek)
}

function toggleDay(hour: WorkingHour, dayOfWeek: number) {
  if (hour.days.includes(dayOfWeek)) {
    hour.days = hour.days.filter(day => day !== dayOfWeek)
    return
  }

  form.workingHours.forEach((item) => {
    item.days = item.days.filter(day => day !== dayOfWeek)
  })

  hour.days.push(dayOfWeek)
}

function setWeekdays(hour: WorkingHour) {
  const weekdays = [1, 2, 3, 4, 5]

  form.workingHours.forEach((item) => {
    item.days = item.days.filter(day => !weekdays.includes(day))
  })

  hour.days = [...new Set([...hour.days, ...weekdays])]
}

function clearWorkingHourDays(hour: WorkingHour) {
  hour.days = []
}

function clearAllDays() {
  form.workingHours.forEach((hour) => {
    hour.days = []
  })
}

function getDayName(dayOfWeek: number) {
  return days.find(day => day.day_of_week === dayOfWeek)?.fullName ?? '-'
}

function getPreviewDay(dayOfWeek: number) {
  return previewShiftDays.value.find(day => day.day_of_week === dayOfWeek)
}

function calculateHours(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) return 0

  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute

  if (endTotal <= startTotal) return 0

  return (endTotal - startTotal) / 60
}

function applyOfficeHour() {
  form.name = 'Shift Normal'
  form.description = 'Shift normal Senin-Jumat 08:00-17:00'
  form.workingHours = [
    {
      start_time: '08:00',
      end_time: '17:00',
      days: [1, 2, 3, 4, 5]
    }
  ]
}

function applyMorningShift() {
  form.name = 'Shift Pagi'
  form.description = 'Shift pagi 07:00-15:00'
  form.workingHours = [
    {
      start_time: '07:00',
      end_time: '15:00',
      days: [1, 2, 3, 4, 5, 6]
    }
  ]
}

function applyEveningShift() {
  form.name = 'Shift Siang'
  form.description = 'Shift siang 15:00-23:00'
  form.workingHours = [
    {
      start_time: '15:00',
      end_time: '23:00',
      days: [1, 2, 3, 4, 5, 6]
    }
  ]
}

function applyNightShift() {
  form.name = 'Shift Malam'
  form.description = 'Shift malam 23:00-07:00'
  form.workingHours = [
    {
      start_time: '23:00',
      end_time: '07:00',
      days: [1, 2, 3, 4, 5, 6]
    }
  ]
}

function validateForm() {
  if (!form.name.trim()) {
    toast.add({
      title: 'Validasi',
      description: 'Nama shift wajib diisi.',
      color: 'warning'
    })

    return false
  }

  if (!totalWorkingDays.value) {
    toast.add({
      title: 'Validasi',
      description: 'Minimal pilih 1 hari kerja.',
      color: 'warning'
    })

    return false
  }

  const invalidHour = form.workingHours.find(hour =>
    calculateHours(hour.start_time, hour.end_time) <= 0
  )

  if (invalidHour) {
    toast.add({
      title: 'Validasi',
      description: 'Jam masuk harus lebih kecil dari jam pulang.',
      color: 'warning'
    })

    return false
  }

  return true
}

function resetForm() {
  Object.assign(form, {
    name: '',
    description: '',
    status: 'active',
    workingHours: [defaultWorkingHour()]
  })
}

async function submit() {
  if (loading.value) return
  if (!validateForm()) return

  loading.value = true

  try {
    const shiftTemplateDays = previewShiftDays.value.map(day => ({
      day_of_week: day.day_of_week,
      start_time: day.is_working ? day.start_time : null,
      end_time: day.is_working ? day.end_time : null,
      is_working: day.is_working
    }))

    const payload = {
      name: form.name,
      description: form.description,
      status: form.status,

      // untuk backend camelCase
      shiftTemplateDays,

      // untuk backend snake_case
      shift_template_days: shiftTemplateDays,

      // untuk backend yang masih baca req.body.days
      days: shiftTemplateDays
    }

    await api('/hris/shift/templates', {
      method: 'POST',
      data: payload
    })

    toast.add({
      title: 'Berhasil',
      description: 'Shift berhasil dibuat.',
      color: 'success'
    })

    emit('created')

    open.value = false
    resetForm()
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Shift gagal dibuat.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create New Shift"
    description="Buat konfigurasi shift kerja baru."
    :ui="{
      content: 'sm:max-w-6xl'
    }"
  >
    <template #body>
      <div class="max-h-[70vh] overflow-y-auto pr-1">
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="space-y-6 lg:col-span-2">
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Shift Name">
                <UInput
                  v-model="form.name"
                  placeholder="Shift Siang"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Status">
                <USelect
                  v-model="form.status"
                  :items="[
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' }
                  ]"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Description"
                class="sm:col-span-2"
              >
                <UTextarea
                  v-model="form.description"
                  placeholder="Shift normal Senin-Jumat 08:00-17:00"
                  :rows="3"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-highlighted">
                Quick Template
              </h4>

              <div class="flex flex-wrap gap-2">
                <UButton
                  type="button"
                  size="xs"
                  variant="soft"
                  @click="applyOfficeHour"
                >
                  Office Hour
                </UButton>

                <UButton
                  type="button"
                  size="xs"
                  variant="soft"
                  @click="applyMorningShift"
                >
                  Morning
                </UButton>

                <UButton
                  type="button"
                  size="xs"
                  variant="soft"
                  @click="applyEveningShift"
                >
                  Evening
                </UButton>

                <UButton
                  type="button"
                  size="xs"
                  variant="soft"
                  @click="applyNightShift"
                >
                  Night
                </UButton>

                <UButton
                  type="button"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-rotate-ccw"
                  @click="clearAllDays"
                >
                  Clear All
                </UButton>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 class="text-sm font-semibold text-highlighted">
                    Multiple Working Hours
                  </h4>

                  <p class="mt-1 text-xs text-muted">
                    Tambahkan beberapa range jam kerja. Satu hari hanya bisa masuk ke satu range.
                  </p>
                </div>

                <UButton
                  type="button"
                  size="sm"
                  variant="outline"
                  icon="i-lucide-plus"
                  class="justify-center"
                  @click="addWorkingHour"
                >
                  Add Hours
                </UButton>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(hour, index) in form.workingHours"
                  :key="index"
                  class="space-y-4 rounded-xl border border-default bg-muted/30 p-4"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-highlighted">
                        Time Range {{ index + 1 }}
                      </p>

                      <p class="mt-1 text-xs text-muted">
                        {{ hour.days.length }} hari dipilih
                      </p>
                    </div>

                    <UButton
                      color="error"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-trash-2"
                      :disabled="form.workingHours.length === 1"
                      @click="removeWorkingHour(index)"
                    />
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <UFormField label="Start Time">
                      <UInput
                        v-model="hour.start_time"
                        type="time"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField label="End Time">
                      <UInput
                        v-model="hour.end_time"
                        type="time"
                        class="w-full"
                      />
                    </UFormField>
                  </div>

                  <UFormField label="Assigned Days">
                    <div class="space-y-3">
                      <div class="flex flex-wrap gap-2">
                        <UButton
                          v-for="day in days"
                          :key="day.day_of_week"
                          type="button"
                          :color="isDaySelected(hour, day.day_of_week) ? 'primary' : 'neutral'"
                          :variant="isDaySelected(hour, day.day_of_week) ? 'solid' : 'outline'"
                          square
                          class="size-10"
                          :title="day.fullName"
                          @click="toggleDay(hour, day.day_of_week)"
                        >
                          {{ day.label }}
                        </UButton>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        <UButton
                          type="button"
                          size="xs"
                          variant="soft"
                          icon="i-lucide-calendar-days"
                          @click="setWeekdays(hour)"
                        >
                          Senin - Jumat
                        </UButton>

                        <UButton
                          type="button"
                          size="xs"
                          color="neutral"
                          variant="outline"
                          icon="i-lucide-rotate-ccw"
                          @click="clearWorkingHourDays(hour)"
                        >
                          Clear Days
                        </UButton>
                      </div>
                    </div>
                  </UFormField>

                  <div
                    v-if="hour.days.length"
                    class="flex flex-wrap gap-2"
                  >
                    <UBadge
                      v-for="dayOfWeek in hour.days"
                      :key="dayOfWeek"
                      color="primary"
                      variant="soft"
                    >
                      {{ getDayName(dayOfWeek) }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-1">
            <div class="sticky top-0 space-y-3">
              <div>
                <h4 class="text-sm font-semibold text-highlighted">
                  Preview Shift Days
                </h4>

                <p class="mt-1 text-xs text-muted">
                  Preview hasil payload shiftTemplateDays.
                </p>
              </div>

              <div class="overflow-hidden rounded-xl border border-default">
                <div
                  v-for="day in days"
                  :key="day.day_of_week"
                  class="border-b border-default px-4 py-3 text-sm last:border-b-0"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-highlighted">
                        {{ day.fullName }}
                      </p>

                      <p class="mt-1 text-xs text-muted">
                        <template v-if="getPreviewDay(day.day_of_week)?.is_working">
                          {{ getPreviewDay(day.day_of_week)?.start_time }}
                          -
                          {{ getPreviewDay(day.day_of_week)?.end_time }}
                        </template>

                        <template v-else>
                          Libur
                        </template>
                      </p>

                      <p
                        v-if="getPreviewDay(day.day_of_week)?.is_working"
                        class="mt-1 text-xs text-muted"
                      >
                        {{
                          calculateHours(
                            getPreviewDay(day.day_of_week)?.start_time,
                            getPreviewDay(day.day_of_week)?.end_time
                          )
                        }}
                        jam kerja
                      </p>
                    </div>

                    <UBadge
                      :color="getPreviewDay(day.day_of_week)?.is_working ? 'success' : 'neutral'"
                      variant="soft"
                    >
                      {{ getPreviewDay(day.day_of_week)?.is_working ? 'Working' : 'Off' }}
                    </UBadge>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-default bg-muted/30 p-4">
                <p class="text-xs font-semibold text-highlighted">
                  Total Working Days
                </p>

                <p class="mt-1 text-2xl font-bold text-highlighted">
                  {{ totalWorkingDays }}
                </p>

                <p class="mt-1 text-xs text-muted">
                  dari 7 hari
                </p>
              </div>
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
          :disabled="loading"
          @click="submit"
        >
          Simpan Shift
        </UButton>
      </div>
    </template>
  </UModal>
</template>
