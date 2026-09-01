<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'

const emit = defineEmits<{
  export: []
  manualEntry: []
}>()

const df = new DateFormatter('id-ID', {
  dateStyle: 'medium'
})

const filters = reactive({
  dateFrom: null as CalendarDate | null,
  dateTo: null as CalendarDate | null,
  department: 'All Departments',
  status: 'All Statuses'
})

const departments = [
  'All Departments',
  'Engineering',
  'Marketing',
  'Sales',
  'Operations'
]

const statuses = [
  'All Statuses',
  'Present',
  'Late',
  'Absent',
  'Leave',
  'Overtime'
]

const dateFromLabel = computed(() =>
  filters.dateFrom
    ? df.format(filters.dateFrom.toDate(getLocalTimeZone()))
    : 'Select Date'
)

const dateToLabel = computed(() =>
  filters.dateTo
    ? df.format(filters.dateTo.toDate(getLocalTimeZone()))
    : 'Select Date'
)
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UFormField label="Date From">
          <UPopover>
            <UButton
              block
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar"
              class="justify-start"
            >
              {{ dateFromLabel }}
            </UButton>

            <template #content>
              <UCalendar v-model="filters.dateFrom" />
            </template>
          </UPopover>
        </UFormField>

        <UFormField label="Date To">
          <UPopover>
            <UButton
              block
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar"
              class="justify-start"
            >
              {{ dateToLabel }}
            </UButton>

            <template #content>
              <UCalendar v-model="filters.dateTo" />
            </template>
          </UPopover>
        </UFormField>

        <UFormField label="Department">
          <USelect
            v-model="filters.department"
            :items="departments"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="filters.status"
            :items="statuses"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row xl:shrink-0">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          class="justify-center"
          @click="emit('export')"
        >
          Export Attendance
        </UButton>

        <UButton
          icon="i-lucide-plus-circle"
          class="justify-center"
          @click="emit('manualEntry')"
        >
          Manual Entry
        </UButton>
      </div>
    </div>
  </UCard>
</template>
