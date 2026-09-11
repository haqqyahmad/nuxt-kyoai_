<script setup lang="ts">
const props = withDefaults(defineProps<{
  value?: string | null
  height?: number
  showText?: boolean
}>(), {
  value: null,
  height: 54,
  showText: true
})

const svg = computed(() =>
  props.value
    ? code39Svg(props.value, { height: props.height, showText: props.showText })
    : ''
)
</script>

<template>
  <div v-if="value && svg" class="inline-block max-w-full overflow-x-auto">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="svg" />
  </div>
  <span v-else class="text-xs text-muted">-</span>
</template>
