<script setup lang="ts">
type ShiftTemplateDay = {
  is_working: boolean
}

type ShiftTemplate = {
  id: number
  status: 'active' | 'inactive'
  shiftTemplateDays: ShiftTemplateDay[]
}

type MonthTemplate = {
  id: number
  status: 'active' | 'inactive'
  weeks: unknown[]
}

const props = defineProps<{
  shifts: ShiftTemplate[]
  monthTemplates?: MonthTemplate[]
}>()

const totalRegularShifts = computed(() => props.shifts.length)
const totalMonthlyTemplates = computed(() => props.monthTemplates?.length || 0)

const totalShifts = computed(() => {
  return totalRegularShifts.value + totalMonthlyTemplates.value
})

const activeShifts = computed(() => {
  const activeRegular = props.shifts.filter(shift => shift.status === 'active').length
  const activeMonthly = (props.monthTemplates ?? []).filter(template => template.status === 'active').length

  return activeRegular + activeMonthly
})

const inactiveShifts = computed(() => {
  const inactiveRegular = props.shifts.filter(shift => shift.status === 'inactive').length
  const inactiveMonthly = (props.monthTemplates ?? []).filter(template => template.status === 'inactive').length

  return inactiveRegular + inactiveMonthly
})

const totalWorkingDays = computed(() => {
  return props.shifts.reduce((total, shift) => {
    return total + (shift.shiftTemplateDays?.filter(day => day.is_working).length || 0)
  }, 0)
})

const totalRotationWeeks = computed(() => {
  return (props.monthTemplates ?? []).reduce((total, template) => {
    return total + (template.weeks?.length || 0)
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
          Shift and monthly template overview.
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

          <UBadge color="success" variant="soft">
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
            Total Items
          </p>

          <p class="mt-1 text-xl font-semibold text-highlighted">
            {{ totalShifts }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Regular Shifts
          </p>

          <p class="mt-1 text-xl font-semibold text-highlighted">
            {{ totalRegularShifts }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Monthly Templates
          </p>

          <p class="mt-1 text-xl font-semibold text-highlighted">
            {{ totalMonthlyTemplates }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Rotation Weeks
          </p>

          <p class="mt-1 text-xl font-semibold text-highlighted">
            {{ totalRotationWeeks }}
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
