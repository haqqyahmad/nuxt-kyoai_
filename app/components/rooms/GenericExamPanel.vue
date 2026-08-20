<script setup lang="ts">
defineProps<{ item?: Record<string, unknown> }>()
</script>

<template>
  <UAlert
    color="neutral"
    variant="soft"
    title="Formulir standar"
    description="Gunakan inputan generik yang disediakan item ini."
  />
</template>
