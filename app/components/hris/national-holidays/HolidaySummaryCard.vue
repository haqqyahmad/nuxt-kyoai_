<!-- app/components/hris/national-holidays/HolidaySummaryCard.vue -->

<script setup lang="ts">
type NationalHoliday = {
  id: number
  date: string
  name: string
  description: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const props = defineProps<{
  holidays: NationalHoliday[]
}>()

const totalHolidays = computed(() => props.holidays.length)

const totalActive = computed(() => {
  return props.holidays.filter(holiday => holiday.is_active).length
})

const totalInactive = computed(() => {
  return props.holidays.filter(holiday => !holiday.is_active).length
})
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h3 class="font-semibold text-highlighted">
          Holiday Summary
        </h3>

        <p class="mt-1 text-sm text-muted">
          Ringkasan data hari libur nasional.
        </p>
      </div>
    </template>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-default bg-muted/30 p-4">
        <p class="text-xs font-semibold text-muted">
          Total Holidays
        </p>

        <p class="mt-1 text-2xl font-bold text-highlighted">
          {{ totalHolidays }}
        </p>
      </div>

      <div class="rounded-xl border border-default bg-muted/30 p-4">
        <p class="text-xs font-semibold text-muted">
          National
        </p>

        <p class="mt-1 text-2xl font-bold text-highlighted">
          {{ totalHolidays }}
        </p>
      </div>

      <div class="rounded-xl border border-default bg-muted/30 p-4">
        <p class="text-xs font-semibold text-muted">
          Active
        </p>

        <p class="mt-1 text-2xl font-bold text-highlighted">
          {{ totalActive }}
        </p>
      </div>

      <div class="rounded-xl border border-default bg-muted/30 p-4">
        <p class="text-xs font-semibold text-muted">
          Inactive
        </p>

        <p class="mt-1 text-2xl font-bold text-highlighted">
          {{ totalInactive }}
        </p>
      </div>
    </div>
  </UCard>
</template>
