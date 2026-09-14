<!-- app/components/questionnaire/Builder/renderers/NumberRenderer.vue -->
<script setup lang="ts">
defineProps<{
  question?: unknown
}>()
</script>

<template>
  <UInput
    type="number"
    disabled
    placeholder="Number"
  />
</template>
