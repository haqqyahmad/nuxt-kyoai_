<!-- app/components/hris/attendance/schedule/ShiftCoverageCard.vue -->

<script setup lang="ts">
type FinalShiftStatus = 'active' | 'off'

type FinalShiftItem = {
  employee_id: number
  employee_name?: string
  department?: string
  date: string
  shift_name?: string | null
  start_time: string | null
  end_time: string | null
  status: FinalShiftStatus
}

type FinalShiftResponse = {
  success: boolean
  message: string
  data: FinalShiftItem[]
}

const props = defineProps<{
  finalShiftResponse?: FinalShiftResponse
}>()

const activeShifts = computed(() => {
  return (props.finalShiftResponse?.data ?? [])
    .filter(item => item.status === 'active')
})

const offShifts = computed(() => {
  return (props.finalShiftResponse?.data ?? [])
    .filter(item => item.status === 'off')
})

const totalShifts = computed(() => {
  return activeShifts.value.length + offShifts.value.length
})

const coveragePercent = computed(() => {
  if (!totalShifts.value) return 0

  return Math.round((activeShifts.value.length / totalShifts.value) * 100)
})

const coverageStatus = computed(() => {
  if (coveragePercent.value >= 90) return 'Full Coverage'
  if (coveragePercent.value >= 70) return 'Good Coverage'

  return 'Low Coverage'
})

const coverageColor = computed(() => {
  if (coveragePercent.value >= 90) return 'success'
  if (coveragePercent.value >= 70) return 'warning'

  return 'error'
})

const doubleShiftCount = computed(() => {
  const map = new Map<string, number>()

  for (const item of activeShifts.value) {
    const key = `${item.employee_id}-${item.date}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return [...map.values()].filter(total => total > 1).length
})
</script>

<template>
  <UCard
    variant="subtle"
    class="overflow-hidden"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">
            Coverage
          </p>

          <h3 class="mt-1 font-semibold text-highlighted">
            Shift Coverage
          </h3>
        </div>

        <div class="rounded-xl bg-success/10 p-2 text-success">
          <UIcon
            name="i-lucide-users"
            class="size-5"
          />
        </div>
      </div>
    </template>

    <div class="space-y-5">
      <UAlert
        :color="coverageColor"
        variant="soft"
        icon="i-lucide-circle-check"
        :title="coverageStatus"
        :description="`${activeShifts.length} dari ${totalShifts} jadwal aktif pada periode ini.`"
      />

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-default p-3 ring-1 ring-default">
          <p class="text-xs text-muted">
            Active
          </p>

          <p class="mt-1 font-semibold text-highlighted">
            {{ activeShifts.length }} shifts
          </p>
        </div>

        <div class="rounded-2xl bg-default p-3 ring-1 ring-default">
          <p class="text-xs text-muted">
            Off
          </p>

          <p class="mt-1 font-semibold text-highlighted">
            {{ offShifts.length }} days
          </p>
        </div>
      </div>

      <div>
        <div class="mb-1 flex justify-between text-sm">
          <span class="text-muted">Coverage Rate</span>
          <strong class="text-highlighted">{{ coveragePercent }}%</strong>
        </div>

        <UProgress
          :model-value="coveragePercent"
          :color="coverageColor"
        />
      </div>

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">
          Alerts & Conflicts
        </p>

        <UAlert
          v-if="doubleShiftCount"
          color="warning"
          variant="soft"
          icon="i-lucide-clock"
          title="Double Shift"
          :description="`${doubleShiftCount} hari memiliki lebih dari 1 shift aktif untuk karyawan yang sama.`"
        />

        <UAlert
          v-else
          color="success"
          variant="soft"
          icon="i-lucide-circle-check"
          title="No Conflict"
          description="Tidak ada konflik double shift pada periode ini."
        />
      </div>
    </div>
  </UCard>
</template>
