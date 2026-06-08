<!-- app/components/hris/attendance/configuration/ShiftList.vue -->

<script setup lang="ts">
type Shift = {
  name: string
  schedule: string
  employees: number
}

const selected = defineModel<string>({
  default: 'Morning Shift'
})

const shifts: Shift[] = [
  {
    name: 'Morning Shift',
    schedule: 'Mon-Fri 08:00-16:00, Sat 08:00-13:00',
    employees: 42
  },
  {
    name: 'Evening Shift',
    schedule: 'Mon-Fri 14:00-23:00',
    employees: 28
  },
  {
    name: 'Night Shift',
    schedule: 'Mon-Fri 22:00-07:00',
    employees: 15
  },
  {
    name: 'Flexi-time',
    schedule: 'Mon-Fri • Core Time 10:00-15:00 • Min 8 Hours',
    employees: 10
  }
]
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

    <div class="space-y-3">
      <button
        v-for="shift in shifts"
        :key="shift.name"
        type="button"
        class="w-full rounded-xl border p-4 text-left transition"
        :class="selected === shift.name
          ? 'border-primary bg-primary/10'
          : 'border-default hover:bg-muted/50'"
        @click="selected = shift.name"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-semibold text-highlighted">
              {{ shift.name }}
            </p>

            <p class="mt-1 line-clamp-2 text-sm text-muted">
              {{ shift.schedule }}
            </p>

            <p class="mt-3 text-xs text-muted">
              {{ shift.employees }} Employees
            </p>
          </div>

          <UIcon
            v-if="selected === shift.name"
            name="i-lucide-circle-check"
            class="size-5 shrink-0 text-primary"
          />
        </div>
      </button>
    </div>
  </UCard>
</template>
