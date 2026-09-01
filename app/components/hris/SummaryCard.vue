<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    value: string
    icon: string
    badge?: string
    color?: 'primary' | 'success' | 'warning' | 'error'
  }>(),
  {
    color: 'primary'
  }
)

const iconBg = computed(() => {
  return {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error'
  }[props.color]
})
</script>

<template>
  <UCard
    :ui="{
      root: 'transition-all duration-200 hover:ring-1 hover:ring-primary hover:shadow-lg'
    }"
  >
    <div class="flex min-h-32 flex-col justify-between">
      <div class="flex items-start justify-between">
        <div
          :class="iconBg"
          class="rounded-lg p-2"
        >
          <UIcon
            :name="icon"
            class="size-6"
          />
        </div>

        <UBadge
          v-if="badge"
          :color="color"
          variant="soft"
        >
          {{ badge }}
        </UBadge>
      </div>

      <div class="mt-5">
        <p
          class="text-muted text-xs font-semibold uppercase tracking-wider"
        >
          {{ title }}
        </p>

        <h2
          class="text-highlighted mt-1 text-3xl font-bold"
        >
          {{ value }}
        </h2>
      </div>
    </div>
  </UCard>
</template>
