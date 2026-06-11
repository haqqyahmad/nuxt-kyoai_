<!-- app/components/hris/attendance/schedule/ShiftHeader.vue -->

<script setup lang="ts">
type ViewMode = 'day' | 'week' | 'month'

const selectedDate = defineModel<Date | string>('selectedDate', {
  default: () => new Date()
})

const viewMode = defineModel<ViewMode>('viewMode', {
  default: 'week'
})

const emit = defineEmits<{
  assign: []
}>()

const viewModes: { label: string, value: ViewMode }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' }
]

function normalizeDate(value: Date | string) {
  return value instanceof Date ? new Date(value) : new Date(value)
}

function setSelectedDate(date: Date) {
  selectedDate.value = new Date(date)
}

function formatDate(date: Date) {
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getWeekRange(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day

  start.setDate(start.getDate() + diff)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return `${formatDate(start)} - ${formatDate(end)}`
}

const currentDate = computed(() => normalizeDate(selectedDate.value))

const title = computed(() => {
  if (viewMode.value === 'day') return formatDate(currentDate.value)

  if (viewMode.value === 'month') {
    return currentDate.value.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  return getWeekRange(currentDate.value)
})

function goPrevious() {
  const date = new Date(currentDate.value)

  if (viewMode.value === 'day') date.setDate(date.getDate() - 1)
  if (viewMode.value === 'week') date.setDate(date.getDate() - 7)
  if (viewMode.value === 'month') date.setMonth(date.getMonth() - 1)

  setSelectedDate(date)
}

function goNext() {
  const date = new Date(currentDate.value)

  if (viewMode.value === 'day') date.setDate(date.getDate() + 1)
  if (viewMode.value === 'week') date.setDate(date.getDate() + 7)
  if (viewMode.value === 'month') date.setMonth(date.getMonth() + 1)

  setSelectedDate(date)
}

function goToday() {
  setSelectedDate(new Date())
}
</script>

<template>
  <UCard
    variant="subtle"
    class="overflow-hidden"
  >
    <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0 space-y-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">
            Shift Schedule
          </p>

          <h2 class="mt-1 truncate text-2xl font-bold text-highlighted">
            {{ title }}
          </h2>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="soft"
            square
            @click="goPrevious"
          />

          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="soft"
            square
            @click="goNext"
          />

          <UButton
            icon="i-lucide-calendar-days"
            label="Today"
            color="neutral"
            variant="outline"
            @click="goToday"
          />
        </div>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="inline-flex rounded-xl bg-muted p-1">
          <button
            v-for="item in viewModes"
            :key="item.value"
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="viewMode === item.value
              ? 'bg-default text-highlighted shadow-sm'
              : 'text-muted hover:text-highlighted'"
            @click="viewMode = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <UButton
          icon="i-lucide-plus"
          size="lg"
          class="justify-center"
          @click="emit('assign')"
        >
          Assign Shift
        </UButton>
      </div>
    </div>
  </UCard>
</template>
