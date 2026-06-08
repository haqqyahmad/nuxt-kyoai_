<!-- app/components/hris/attendance/configuration/ShiftDetailForm.vue -->

<script setup lang="ts">
type ShiftStatus = 'active' | 'inactive'

type ShiftTemplateDay = {
  id?: number
  template_id?: number
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type ShiftTemplate = {
  id: number
  name: string
  description: string | null
  status: ShiftStatus
  shiftTemplateDays: ShiftTemplateDay[]
}

type WorkingHour = {
  start_time: string
  end_time: string
  days: number[]
}

const props = defineProps<{
  shift: ShiftTemplate | null
}>()

const emit = defineEmits<{
  refresh: []
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

const form = reactive({
  id: null as number | null,
  name: '',
  description: '',
  status: 'active' as ShiftStatus,
  workingHours: [] as WorkingHour[]
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

function defaultWorkingHour(): WorkingHour {
  return {
    start_time: '08:00',
    end_time: '17:00',
    days: []
  }
}

function groupDaysToWorkingHours(templateDays: ShiftTemplateDay[]) {
  const workingDays = templateDays
    .filter(day => day.is_working)
    .sort((a, b) => a.day_of_week - b.day_of_week)

  const groups = new Map<string, WorkingHour>()

  workingDays.forEach((day) => {
    const key = `${day.start_time}-${day.end_time}`

    if (!groups.has(key)) {
      groups.set(key, {
        start_time: day.start_time || '08:00',
        end_time: day.end_time || '17:00',
        days: []
      })
    }

    groups.get(key)?.days.push(day.day_of_week)
  })

  return Array.from(groups.values())
}

watch(
  () => props.shift,
  (shift) => {
    if (!shift) {
      Object.assign(form, {
        id: null,
        name: '',
        description: '',
        status: 'active',
        workingHours: [defaultWorkingHour()]
      })

      return
    }

    const workingHours = groupDaysToWorkingHours(
      shift.shiftTemplateDays || []
    )

    Object.assign(form, {
      id: shift.id,
      name: shift.name,
      description: shift.description || '',
      status: shift.status,
      workingHours: workingHours.length
        ? workingHours
        : [defaultWorkingHour()]
    })
  },
  { immediate: true, deep: true }
)

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
  let endTotal = endHour * 60 + endMinute

  if (endTotal <= startTotal) {
    endTotal += 24 * 60
  }

  return (endTotal - startTotal) / 60
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
      description: 'Jam shift tidak valid.',
      color: 'warning'
    })

    return false
  }

  return true
}

async function saveChanges() {
  if (!form.id) return
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
      shiftTemplateDays,
      shift_template_days: shiftTemplateDays,
      days: shiftTemplateDays
    }

    await api(`/hris/shift/templates/${form.id}`, {
      method: 'PATCH',
      data: payload
    })

    toast.add({
      title: 'Berhasil',
      description: 'Shift berhasil diperbarui.',
      color: 'success'
    })

    emit('refresh')
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Shift gagal diperbarui.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="font-semibold text-highlighted">
            Shift Details
          </h3>

          <p class="mt-1 text-sm text-muted">
            Configure shift information and working hours.
          </p>
        </div>

        <UButton
          icon="i-lucide-save"
          class="justify-center"
          :loading="loading"
          :disabled="!form.id || loading"
          @click="saveChanges"
        >
          Save Changes
        </UButton>
      </div>
    </template>

    <div
      v-if="!shift"
      class="rounded-xl border border-dashed border-default p-8 text-center"
    >
      <p class="font-medium text-highlighted">
        Belum ada shift dipilih
      </p>

      <p class="mt-1 text-sm text-muted">
        Pilih shift dari daftar sebelah kiri.
      </p>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Shift Name">
          <UInput
            v-model="form.name"
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
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 class="text-sm font-semibold text-highlighted">
                Multiple Working Hours
              </h4>

              <p class="mt-1 text-xs text-muted">
                Satu hari hanya bisa masuk ke satu range.
              </p>
            </div>

            <UButton
              type="button"
              size="sm"
              variant="outline"
              icon="i-lucide-plus"
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

        <div class="lg:col-span-1">
          <div class="sticky top-0 space-y-3">
            <div>
              <h4 class="text-sm font-semibold text-highlighted">
                Preview Shift Days
              </h4>

              <p class="mt-1 text-xs text-muted">
                Preview hasil shift template days.
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
  </UCard>
</template>
