<!-- app/components/questionnaire/Shared/QuestionTypeBadge.vue -->
<script setup lang="ts">
defineProps<{
  type: string
}>()
</script>

<template>
  <UBadge
    color="neutral"
    variant="outline"
  >
    {{ type }}
  </UBadge>
</template>
