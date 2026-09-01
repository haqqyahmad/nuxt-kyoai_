<script setup lang="ts">
const stats = [
  {
    title: 'Avg. Punctuality Rate',
    value: '94.8%',
    icon: 'i-lucide-timer',
    badge: '+2.4%',
    color: 'success'
  },
  {
    title: 'Total Absenteeism',
    value: '3.2%',
    icon: 'i-lucide-user-x',
    badge: '1.1%',
    color: 'error'
  },
  {
    title: 'Overtime Total',
    value: '1,240h',
    icon: 'i-lucide-clock-plus',
    badge: 'Last 30 Days',
    color: 'primary'
  },
  {
    title: 'Top Department',
    value: 'Design',
    icon: 'i-lucide-award',
    badge: 'View All',
    color: 'warning'
  }
] as const
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    <UCard
      v-for="stat in stats"
      :key="stat.title"
    >
      <div class="flex min-h-32 flex-col justify-between">
        <div class="flex items-start justify-between">
          <div class="rounded-lg bg-muted p-2 text-primary">
            <UIcon :name="stat.icon" class="size-5" />
          </div>

          <UBadge
            :color="stat.color"
            variant="soft"
          >
            {{ stat.badge }}
          </UBadge>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">
            {{ stat.title }}
          </p>

          <h3 class="mt-1 text-3xl font-bold text-highlighted">
            {{ stat.value }}
          </h3>
        </div>
      </div>
    </UCard>
  </div>
</template>
