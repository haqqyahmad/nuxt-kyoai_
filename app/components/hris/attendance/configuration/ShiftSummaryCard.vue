<!-- app/components/hris/attendance/configuration/ShiftSummaryCard.vue -->

<script setup lang="ts">
type ShiftTemplateDay = {
  is_working: boolean
}

type ShiftTemplate = {
  id: number
  status: 'active' | 'inactive'
  shiftTemplateDays: ShiftTemplateDay[]
}

const props = defineProps<{
  shifts: ShiftTemplate[]
}>()

const totalShifts = computed(() => props.shifts.length)

const activeShifts = computed(() => {
  return props.shifts.filter(shift => shift.status === 'active').length
})

const inactiveShifts = computed(() => {
  return props.shifts.filter(shift => shift.status === 'inactive').length
})

const totalWorkingDays = computed(() => {
  return props.shifts.reduce((total, shift) => {
    return total + (shift.shiftTemplateDays?.filter(day => day.is_working).length || 0)
  }, 0)
})

const activeRate = computed(() => {
  if (!totalShifts.value) return 0

  return Math.round((activeShifts.value / totalShifts.value) * 100)
})
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h3 class="font-semibold text-highlighted">
          Shift Summary
        </h3>

        <p class="mt-1 text-sm text-muted">
          Shift template overview.
        </p>
      </div>
    </template>

    <div class="space-y-5">
      <div>
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-sm text-muted">
              Active Rate
            </p>

            <h2 class="mt-1 text-3xl font-bold text-highlighted">
              {{ activeRate }}%
            </h2>
          </div>

          <UBadge
            color="success"
            variant="soft"
          >
            {{ activeShifts }} Active
          </UBadge>
        </div>

        <UProgress
          :model-value="activeRate"
          color="success"
          class="mt-4"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Total Shifts
          </p>

          <p class="mt-1 text-xl font-semibold text-highlighted">
            {{ totalShifts }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Working Days
          </p>

          <p class="mt-1 text-xl font-semibold text-highlighted">
            {{ totalWorkingDays }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Active
          </p>

          <p class="mt-1 text-xl font-semibold text-success">
            {{ activeShifts }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Inactive
          </p>

          <p class="mt-1 text-xl font-semibold text-warning">
            {{ inactiveShifts }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
