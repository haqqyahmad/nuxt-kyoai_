<script setup lang="ts">
type ShiftType = 'FIXED' | 'FLEXI'

type WorkingHour = {
  startTime: string
  endTime: string
  days: string[]
}

type FlexiConfig = {
  minimumWorkHours: number
  coreStartTime: string
  coreEndTime: string
  days: string[]
}

type ShiftForm = {
  name: string
  description: string
  type: ShiftType
  workingHours: WorkingHour[]
  flexiConfig: FlexiConfig
  breakTime: number
  gracePeriod: number
  overtimeThreshold: number
}

const props = defineProps<{
  selectedShift: string
}>()

const days = [
  { label: 'M', name: 'Mon', value: 'monday' },
  { label: 'T', name: 'Tue', value: 'tuesday' },
  { label: 'W', name: 'Wed', value: 'wednesday' },
  { label: 'T', name: 'Thu', value: 'thursday' },
  { label: 'F', name: 'Fri', value: 'friday' },
  { label: 'S', name: 'Sat', value: 'saturday' },
  { label: 'S', name: 'Sun', value: 'sunday' }
]

const defaultWorkingHour = (): WorkingHour => ({
  startTime: '',
  endTime: '',
  days: []
})

const defaultFlexiConfig = (): FlexiConfig => ({
  minimumWorkHours: 8,
  coreStartTime: '10:00',
  coreEndTime: '15:00',
  days: []
})

const shiftData: Record<string, ShiftForm> = {
  'Morning Shift': {
    name: 'Morning Shift',
    description: 'Regular morning working shift.',
    type: 'FIXED',
    workingHours: [
      {
        startTime: '08:00',
        endTime: '16:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      {
        startTime: '08:00',
        endTime: '13:00',
        days: ['saturday']
      }
    ],
    flexiConfig: defaultFlexiConfig(),
    breakTime: 60,
    gracePeriod: 15,
    overtimeThreshold: 60
  },

  'Evening Shift': {
    name: 'Evening Shift',
    description: 'Evening operational shift.',
    type: 'FIXED',
    workingHours: [
      {
        startTime: '14:00',
        endTime: '23:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }
    ],
    flexiConfig: defaultFlexiConfig(),
    breakTime: 60,
    gracePeriod: 15,
    overtimeThreshold: 60
  },

  'Night Shift': {
    name: 'Night Shift',
    description: 'Night operational shift.',
    type: 'FIXED',
    workingHours: [
      {
        startTime: '22:00',
        endTime: '07:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }
    ],
    flexiConfig: defaultFlexiConfig(),
    breakTime: 60,
    gracePeriod: 15,
    overtimeThreshold: 60
  },

  'Flexi-time': {
    name: 'Flexi-time',
    description: 'Flexible working schedule with core time.',
    type: 'FLEXI',
    workingHours: [],
    flexiConfig: {
      minimumWorkHours: 8,
      coreStartTime: '10:00',
      coreEndTime: '15:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    breakTime: 60,
    gracePeriod: 0,
    overtimeThreshold: 60
  }
}

const form = reactive<ShiftForm>({
  name: '',
  description: '',
  type: 'FIXED',
  workingHours: [defaultWorkingHour()],
  flexiConfig: defaultFlexiConfig(),
  breakTime: 60,
  gracePeriod: 15,
  overtimeThreshold: 60
})

watch(
  () => props.selectedShift,
  (shiftName) => {
    const selected = shiftData[shiftName]

    if (!selected) return

    Object.assign(form, {
      ...selected,
      workingHours: selected.workingHours.map(hour => ({
        ...hour,
        days: [...hour.days]
      })),
      flexiConfig: {
        ...selected.flexiConfig,
        days: [...selected.flexiConfig.days]
      }
    })
  },
  { immediate: true }
)

function addWorkingHour() {
  form.workingHours.push(defaultWorkingHour())
}

function removeWorkingHour(index: number) {
  if (form.workingHours.length <= 1) return

  form.workingHours.splice(index, 1)
}

function toggleDay(hour: WorkingHour, value: string) {
  hour.days = hour.days.includes(value)
    ? hour.days.filter(item => item !== value)
    : [...hour.days, value]
}

function toggleFlexiDay(value: string) {
  form.flexiConfig.days = form.flexiConfig.days.includes(value)
    ? form.flexiConfig.days.filter(item => item !== value)
    : [...form.flexiConfig.days, value]
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

        <div class="flex flex-col gap-2 sm:flex-row">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-copy"
            class="justify-center"
          >
            Duplicate
          </UButton>

          <UButton
            icon="i-lucide-save"
            class="justify-center"
          >
            Save Changes
          </UButton>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Shift Name">
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Shift Type">
          <USelect
            v-model="form.type"
            :items="[
              { label: 'Fixed Shift', value: 'FIXED' },
              { label: 'Flexi Time', value: 'FLEXI' }
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

      <div
        v-if="form.type === 'FIXED'"
        class="space-y-4"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 class="text-sm font-semibold text-highlighted">
              Working Hours
            </h4>

            <p class="mt-1 text-xs text-muted">
              Add one or more time ranges for this shift.
            </p>
          </div>

          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-plus"
            class="w-full justify-center sm:w-auto"
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
              <p class="text-sm font-semibold text-highlighted">
                Time Range {{ index + 1 }}
              </p>

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
                  v-model="hour.startTime"
                  type="time"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="End Time">
                <UInput
                  v-model="hour.endTime"
                  type="time"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Assigned Days">
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="day in days"
                  :key="day.value"
                  type="button"
                  :color="hour.days.includes(day.value) ? 'primary' : 'neutral'"
                  :variant="hour.days.includes(day.value) ? 'solid' : 'outline'"
                  square
                  class="size-10"
                  :title="day.name"
                  @click="toggleDay(hour, day.value)"
                >
                  {{ day.label }}
                </UButton>
              </div>
            </UFormField>
          </div>
        </div>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div>
          <h4 class="text-sm font-semibold text-highlighted">
            Flexi Core Time
          </h4>

          <p class="mt-1 text-xs text-muted">
            Employees can work flexibly but must be present during core time.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Minimum Work Hours">
            <UInput
              v-model.number="form.flexiConfig.minimumWorkHours"
              type="number"
              trailing="hours"
              class="w-full"
            />
          </UFormField>

          <div />

          <UFormField label="Core Start Time">
            <UInput
              v-model="form.flexiConfig.coreStartTime"
              type="time"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Core End Time">
            <UInput
              v-model="form.flexiConfig.coreEndTime"
              type="time"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Working Days"
            class="sm:col-span-2"
          >
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="day in days"
                :key="day.value"
                type="button"
                :color="form.flexiConfig.days.includes(day.value) ? 'primary' : 'neutral'"
                :variant="form.flexiConfig.days.includes(day.value) ? 'solid' : 'outline'"
                square
                class="size-10"
                :title="day.name"
                @click="toggleFlexiDay(day.value)"
              >
                {{ day.label }}
              </UButton>
            </div>
          </UFormField>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Break Time">
          <UInput
            v-model.number="form.breakTime"
            type="number"
            trailing="minutes"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="form.type === 'FIXED'"
          label="Grace Period"
        >
          <USelect
            v-model="form.gracePeriod"
            :items="[0, 5, 10, 15, 30]"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="form.type === 'FIXED'"
          label="Overtime Threshold"
        >
          <UInput
            v-model.number="form.overtimeThreshold"
            type="number"
            trailing="minutes"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
