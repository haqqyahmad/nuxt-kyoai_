<!-- app/components/hris/attendance/configuration/ShiftList.vue -->

<script setup lang="ts">
type ShiftTemplateDay = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type ShiftTemplate = {
  id: number
  name: string
  description: string | null
  status: 'active' | 'inactive'
  shiftTemplateDays: ShiftTemplateDay[]
}

defineProps<{
  shifts: ShiftTemplate[]
  loading?: boolean
}>()

const selected = defineModel<number | null>({
  default: null
})

const dayLabels: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun'
}

function formatSchedule(shift: ShiftTemplate) {
  const workingDays = shift.shiftTemplateDays
    ?.filter(day => day.is_working)
    ?.sort((a, b) => a.day_of_week - b.day_of_week) || []

  if (!workingDays.length) return 'No working days'

  return workingDays
    .map((day) => {
      return `${dayLabels[day.day_of_week]} ${day.start_time}-${day.end_time}`
    })
    .join(', ')
}
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-semibold text-highlighted">
            Active Shifts
          </h3>

          <p class="mt-1 text-sm text-muted">
            Select shift to view details.
          </p>
        </div>

        <UBadge
          color="primary"
          variant="soft"
          class="shrink-0"
        >
          {{ shifts.length }} Total
        </UBadge>
      </div>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <USkeleton
        v-for="item in 4"
        :key="item"
        class="h-24 w-full rounded-xl"
      />
    </div>

    <div
      v-else-if="!shifts.length"
      class="rounded-xl border border-dashed border-default p-6 text-center"
    >
      <p class="text-sm font-medium text-highlighted">
        Belum ada shift
      </p>

      <p class="mt-1 text-xs text-muted">
        Klik Create New Shift untuk membuat data shift.
      </p>
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <button
        v-for="shift in shifts"
        :key="shift.id"
        type="button"
        class="w-full rounded-xl border p-4 text-left transition"
        :class="selected === shift.id
          ? 'border-primary bg-primary/10'
          : 'border-default hover:bg-muted/50'"
        @click="selected = shift.id"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="truncate font-semibold text-highlighted">
                {{ shift.name }}
              </p>

              <UBadge
                :color="shift.status === 'active' ? 'success' : 'neutral'"
                variant="soft"
                size="xs"
              >
                {{ shift.status }}
              </UBadge>
            </div>

            <p class="mt-1 line-clamp-2 text-sm text-muted">
              {{ formatSchedule(shift) }}
            </p>

            <p class="mt-3 text-xs text-muted">
              {{ shift.shiftTemplateDays?.filter(day => day.is_working).length || 0 }}
              working days
            </p>
          </div>

          <UIcon
            v-if="selected === shift.id"
            name="i-lucide-circle-check"
            class="size-5 shrink-0 text-primary"
          />
        </div>
      </button>
    </div>
  </UCard>
</template>
