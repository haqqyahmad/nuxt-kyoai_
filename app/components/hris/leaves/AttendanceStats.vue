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

const cards = computed(() => [
  {
    title: 'Hadir',
    value: props.stats.present,
    percent: props.stats.presentPercent,
    icon: 'i-lucide-user-check',
    color: 'success' as const,
    label: `${props.stats.presentPercent}%`
  },
  {
    title: 'Terlambat',
    value: props.stats.late,
    percent: props.stats.latePercent,
    icon: 'i-lucide-clock-alert',
    color: 'warning' as const,
    label: `${props.stats.latePercent}%`
  },
  {
    title: 'Absen',
    value: props.stats.absent,
    percent: props.stats.absentPercent,
    icon: 'i-lucide-user-x',
    color: 'error' as const,
    label: `${props.stats.absentPercent}%`
  },
  {
    title: 'Sedang Cuti',
    value: props.stats.onLeave,
    percent: props.stats.onLeave,
    icon: 'i-lucide-calendar-days',
    color: 'primary' as const,
    label: 'Hari ini'
  }
])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <UCard
      v-for="card in cards"
      :key="card.title"
      class="overflow-hidden"
    >
      <div class="relative space-y-4">
        <UIcon
          :name="card.icon"
          class="absolute -right-4 -top-4 size-16 opacity-5"
        />

        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-lg"
              :class="{
                'bg-success/10 text-success': card.color === 'success',
                'bg-warning/10 text-warning': card.color === 'warning',
                'bg-error/10 text-error': card.color === 'error',
                'bg-primary/10 text-primary': card.color === 'primary'
              }"
            >
              <UIcon
                :name="card.icon"
                class="size-5"
              />
            </div>

            <p class="text-sm font-medium text-muted">
              {{ card.title }}
            </p>
          </div>

          <UBadge
            :color="card.color"
            variant="soft"
          >
            {{ card.label }}
          </UBadge>
        </div>

        <div>
          <p class="text-3xl font-bold tracking-tight text-highlighted">
            {{ card.value }}
          </p>

          <p class="mt-1 text-xs text-muted">
            Data ringkasan periode aktif
          </p>
        </div>

        <UProgress
          :model-value="card.percent"
          :color="card.color"
        />
      </div>
    </UCard>
  </div>
</template>
