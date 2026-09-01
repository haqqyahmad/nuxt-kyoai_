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

function normalizeDate(value: Date | string) {
  return value instanceof Date
    ? new Date(value)
    : new Date(value)
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

const currentDate = computed(() => {
  return normalizeDate(selectedDate.value)
})

const title = computed(() => {
  if (viewMode.value === 'day') {
    return formatDate(currentDate.value)
  }

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
  <UCard>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    
<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
  <!-- DATE PICKER -->
  <UPopover>
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-calendar"
      class="justify-start min-w-[240px]"
    >
      {{ title }}
    </UButton>

    <template #content>
      <div class="p-2">
        <UCalendar
          v-model="selectedDate"
        />
      </div>
    </template>
  </UPopover>

  <!-- NAVIGATION -->
  <div class="flex items-center gap-2">
    <UButton
      icon="i-lucide-chevron-left"
      color="neutral"
      variant="outline"
      square
      @click="goPrevious"
    />

    <UButton
      icon="i-lucide-chevron-right"
      color="neutral"
      variant="outline"
      square
      @click="goNext"
    />

    <UButton
      label="Today"
      color="neutral"
      variant="outline"
      @click="goToday"
    />
  </div>
</div>



      <div class="flex flex-col gap-2 sm:flex-row">
        <UButtonGroup class="w-full sm:w-auto">
          <UButton
            label="Day"
            :color="viewMode === 'day' ? 'primary' : 'neutral'"
            :variant="viewMode === 'day' ? 'solid' : 'outline'"
            class="flex-1 sm:flex-none"
            @click="viewMode = 'day'"
          />

          <UButton
            label="Week"
            :color="viewMode === 'week' ? 'primary' : 'neutral'"
            :variant="viewMode === 'week' ? 'solid' : 'outline'"
            class="flex-1 sm:flex-none"
            @click="viewMode = 'week'"
          />

          <UButton
            label="Month"
            :color="viewMode === 'month' ? 'primary' : 'neutral'"
            :variant="viewMode === 'month' ? 'solid' : 'outline'"
            class="flex-1 sm:flex-none"
            @click="viewMode = 'month'"
          />
        </UButtonGroup>

        <UButton
          icon="i-lucide-plus"
          class="justify-center"
          @click="emit('assign')"
        >
          Assign Shift
        </UButton>
      </div>
    </div>
  </UCard>
</template>
