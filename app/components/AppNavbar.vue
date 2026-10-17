<script setup lang="ts">
import { useSlots } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  title?: string
  subtitle?: string
}>()

const slots = useSlots()
const forwardedSlots = computed(() =>
  Object.keys(slots).filter(name => name !== 'title')
)
</script>

<template>
  <UDashboardNavbar v-bind="$attrs" :title="title">
    <template #title>
      <slot name="title">
        <div v-if="title || subtitle" class="flex min-w-0 flex-col leading-tight">
          <span v-if="title" class="truncate">{{ title }}</span>
          <span v-if="subtitle" class="truncate text-xs font-normal text-muted">
            {{ subtitle }}
          </span>
        </div>
      </slot>
    </template>

    <template
      v-for="name in forwardedSlots"
      #[name]="slotProps"
    >
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </UDashboardNavbar>
</template>
