<!-- app/components/questionnaire/Shared/EmptyQuestion.vue -->
<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <div
    class="
      text-sm
      text-muted
      italic
    "
  >
    {{ text }}
  </div>
</template>
