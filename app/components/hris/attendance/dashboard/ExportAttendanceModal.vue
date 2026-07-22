<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'

type ExportFormat = 'Excel' | 'CSV' | 'PDF'

const open = defineModel<boolean>('open', {
  default: false
})

const df = new DateFormatter('id-ID', {
  dateStyle: 'medium'
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
  'Leave',
  'Absent',
  'Overtime'
]

const exportFormats: ExportFormat[] = [
  'Excel',
  'CSV',
  'PDF'
]

const form = reactive({
  dateFrom: null as CalendarDate | null,
  dateTo: null as CalendarDate | null,
  department: 'All Departments',
  status: 'All Statuses',
  format: 'Excel' as ExportFormat,
  includeOvertime: true,
  includeEmployeeDetails: true
})

const dateFromLabel = computed(() =>
  form.dateFrom
    ? df.format(form.dateFrom.toDate(getLocalTimeZone()))
    : 'Select Date'
)

const dateToLabel = computed(() =>
  form.dateTo
    ? df.format(form.dateTo.toDate(getLocalTimeZone()))
    : 'Select Date'
)

const isInvalidDateRange = computed(() => {
  if (!form.dateFrom || !form.dateTo) return false

  return form.dateTo.compare(form.dateFrom) < 0
})

const canExport = computed(() =>
  !!form.dateFrom
  && !!form.dateTo
  && !isInvalidDateRange.value
)

function submit() {
  if (!canExport.value) return

  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Export Attendance"
    description="Generate attendance report based on selected filters."
    :ui="{
      content: 'max-w-2xl'
    }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField label="Date From" required>
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
                <UCalendar v-model="form.dateFrom" />
              </template>
            </UPopover>
          </UFormField>

          <UFormField
            label="Date To"
            required
            :error="isInvalidDateRange ? 'Date To tidak boleh lebih kecil dari Date From' : undefined"
          >
            <UPopover>
              <UButton
                block
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar"
                class="justify-start"
                :class="isInvalidDateRange ? 'ring-1 ring-error' : ''"
              >
                {{ dateToLabel }}
              </UButton>

              <template #content>
                <UCalendar v-model="form.dateTo" />
              </template>
            </UPopover>
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField label="Department">
            <USelect
              v-model="form.department"
              :items="departments"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Attendance Status">
            <USelect
              v-model="form.status"
              :items="statuses"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <UFormField label="Export Format">
          <URadioGroup
            v-model="form.format"
            :items="exportFormats"
            orientation="horizontal"
          />
        </UFormField>

        <div class="rounded-lg border border-default p-4">
          <p class="mb-3 text-sm font-medium text-highlighted">
            Additional Options
          </p>

          <div class="space-y-3">
            <USwitch
              v-model="form.includeOvertime"
              label="Include Overtime Information"
            />

            <USwitch
              v-model="form.includeEmployeeDetails"
              label="Include Employee Details"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-muted">
          Export format: {{ form.format }}
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
            icon="i-lucide-download"
            :disabled="!canExport"
            @click="submit"
          >
            Export {{ form.format }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
