<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'

type SummaryItem = {
  title: string
  value: number
  icon: string
  color: BadgeProps['color']
}

const summaries: SummaryItem[] = [
  {
    title: 'Present',
    value: 1248,
    icon: 'i-lucide-user-check',
    color: 'success'
  },
  {
    title: 'Late',
    value: 42,
    icon: 'i-lucide-clock-3',
    color: 'warning'
  },
  {
    title: 'Leave',
    value: 26,
    icon: 'i-lucide-calendar-minus',
    color: 'primary'
  },
  {
    title: 'Absent',
    value: 8,
    icon: 'i-lucide-user-x',
    color: 'error'
  }
]
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <UCard
      v-for="item in summaries"
      :key="item.title"
      class="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          :class="{
            'bg-success/10 text-success': item.color === 'success',
            'bg-warning/10 text-warning': item.color === 'warning',
            'bg-primary/10 text-primary': item.color === 'primary',
            'bg-error/10 text-error': item.color === 'error'
          }"
        >
          <UIcon
            :name="item.icon"
            class="size-6"
          />
        </div>

        <div class="min-w-0">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">
            {{ item.title }}
          </p>

          <p class="mt-1 text-2xl font-bold tracking-tight text-highlighted">
            {{ item.value.toLocaleString() }}
          </p>
        </div>
      </div>
    </UCard>

    <UCard class="col-span-1 sm:col-span-2 xl:col-span-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div class="flex h-full min-h-[88px] flex-col justify-center">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">
            Attendance Rate
          </p>

          <span class="text-lg font-bold text-success">
            96%
          </span>
        </div>

        <UProgress
          :model-value="96"
          color="success"
          class="mt-3"
        />

        <p class="mt-2 text-xs text-muted">
          Monthly Attendance Rate
        </p>
      </div>
    </UCard>
  </div>
</template>
