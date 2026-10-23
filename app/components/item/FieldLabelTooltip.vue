<script setup lang="ts">
const props = defineProps<{
  label?: string
  tooltip: string
  srLabel?: string
}>()
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <span v-if="props.label">{{ props.label }}</span>
    <UTooltip
      :text="props.tooltip"
      :content="{ side: 'top' }"
      :ui="{ content: 'max-w-xs', text: 'whitespace-normal' }"
    >
      <UIcon
        name="i-lucide-info"
        class="size-3.5 cursor-help text-muted"
        tabindex="0"
        :aria-label="props.srLabel || (props.label ? `Informasi ${props.label}` : 'Informasi')"
      />
    </UTooltip>
  </span>
</template>
