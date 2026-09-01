<!-- app/components/questionnaire/Shared/DragHandle.vue -->

<script setup lang="ts">
withDefaults(
  defineProps<{
    section?: boolean
  }>(),
  {
    section: false
  }
)
</script>

<template>
  <div
    :class="[
      section
        ? 'section-drag-handle'
        : 'drag-handle',

      'cursor-grab',
      'active:cursor-grabbing',
      'text-muted',
      'hover:text-highlighted',
      'transition',
      'flex items-center justify-center'
    ]"
  >
    <UIcon
      name="i-lucide-grip-vertical"
      class="size-5"
    />
  </div>
</template>
