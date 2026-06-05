<!-- app/components/hris/attendance/configuration/ShiftSummaryCard.vue -->

<script setup lang="ts">
const summary = reactive({
  totalShifts: 4,
  totalEmployees: 95,
  assignedEmployees: 85,
  unassignedEmployees: 10
})

const coverageRate = computed(() => {
  if (summary.totalEmployees === 0) return 0

  return Math.round(
    (summary.assignedEmployees / summary.totalEmployees) * 100
  )
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
          Employee shift coverage overview.
        </p>
      </div>
    </template>

    <div class="space-y-5">
      <div>
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-sm text-muted">
              Coverage Rate
            </p>

            <h2 class="mt-1 text-3xl font-bold text-highlighted">
              {{ coverageRate }}%
            </h2>
          </div>

          <UBadge
            color="success"
            variant="soft"
          >
            {{ summary.assignedEmployees }} Assigned
          </UBadge>
        </div>

        <UProgress
          :model-value="coverageRate"
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
            {{ summary.totalShifts }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Employees
          </p>

          <p class="mt-1 text-xl font-semibold text-highlighted">
            {{ summary.totalEmployees }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Assigned
          </p>

          <p class="mt-1 text-xl font-semibold text-success">
            {{ summary.assignedEmployees }}
          </p>
        </div>

        <div class="rounded-xl border border-default p-3">
          <p class="text-xs text-muted">
            Unassigned
          </p>

          <p class="mt-1 text-xl font-semibold text-warning">
            {{ summary.unassignedEmployees }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
