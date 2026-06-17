<!-- app/components/hris/leaves/AttendanceStats.vue -->

<script setup lang="ts">
const props = defineProps<{
  stats: {
    present: number
    presentPercent: number
    late: number
    latePercent: number
    absent: number
    absentPercent: number
    onLeave: number
  }
}>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <UCard>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-muted">
            Hadir
          </p>

          <UBadge color="success" variant="soft">
            {{ props.stats.presentPercent }}%
          </UBadge>
        </div>

        <p class="text-3xl font-bold text-highlighted">
          {{ props.stats.present }}
        </p>

        <UProgress
          :model-value="props.stats.presentPercent"
          color="success"
        />
      </div>
    </UCard>

    <UCard>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-muted">
            Terlambat
          </p>

          <UBadge color="warning" variant="soft">
            {{ props.stats.latePercent }}%
          </UBadge>
        </div>

        <p class="text-3xl font-bold text-highlighted">
          {{ props.stats.late }}
        </p>

        <UProgress
          :model-value="props.stats.latePercent"
          color="warning"
        />
      </div>
    </UCard>

    <UCard>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-muted">
            Absen
          </p>

          <UBadge color="error" variant="soft">
            {{ props.stats.absentPercent }}%
          </UBadge>
        </div>

        <p class="text-3xl font-bold text-highlighted">
          {{ props.stats.absent }}
        </p>

        <UProgress
          :model-value="props.stats.absentPercent"
          color="error"
        />
      </div>
    </UCard>

    <UCard>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-muted">
            Sedang Cuti
          </p>

          <UBadge color="primary" variant="soft">
            Hari ini
          </UBadge>
        </div>

        <p class="text-3xl font-bold text-highlighted">
          {{ props.stats.onLeave }}
        </p>

        <UProgress
          :model-value="props.stats.onLeave"
          color="primary"
        />
      </div>
    </UCard>
  </div>
</template>
