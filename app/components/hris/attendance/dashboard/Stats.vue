<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'

type StatItem = {
  title: string
  value: string
  icon: string
  badge: string
  color: BadgeProps['color']
}

const stats: StatItem[] = [
  {
    title: 'Present Today',
    value: '1,248',
    icon: 'i-lucide-user-check',
    badge: '+2%',
    color: 'primary'
  },
  {
    title: 'Late Arrivals',
    value: '42',
    icon: 'i-lucide-history',
    badge: '+12%',
    color: 'error'
  },
  {
    title: 'On Leave',
    value: '26',
    icon: 'i-lucide-calendar-x',
    badge: 'Avg: 18',
    color: 'success'
  },
  {
    title: 'Overtime Hours',
    value: '114.5',
    icon: 'i-lucide-clock-plus',
    badge: '78h',
    color: 'warning'
  }
]
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    <UCard
      v-for="stat in stats"
      :key="stat.title"
      class="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div class="flex min-h-[140px] flex-col justify-between gap-6">
        <div class="flex items-center justify-between gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            :class="{
              'bg-primary/10 text-primary': stat.color === 'primary',
              'bg-error/10 text-error': stat.color === 'error',
              'bg-success/10 text-success': stat.color === 'success',
              'bg-warning/10 text-warning': stat.color === 'warning'
            }"
          >
            <UIcon
              :name="stat.icon"
              class="size-6"
            />
          </div>

          <UBadge
            :color="stat.color"
            variant="soft"
            size="lg"
            class="shrink-0"
          >
            {{ stat.badge }}
          </UBadge>
        </div>

        <div class="space-y-1">
          <p class="text-sm font-medium text-muted">
            {{ stat.title }}
          </p>

          <h3 class="text-3xl font-bold tracking-tight text-highlighted">
            {{ stat.value }}
          </h3>
        </div>
      </div>
    </UCard>
  </div>
</template>
