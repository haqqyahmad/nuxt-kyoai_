<script setup lang="ts">
defineProps<{
  total: number
  active: number
  inactive: number
  uniqueUsers: number
}>()
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <UCard variant="subtle">
      <p class="text-sm text-muted">
        Total Assignment
      </p>
      <p class="mt-1 text-2xl font-semibold text-highlighted">
        {{ total }}
      </p>
    </UCard>

    <UCard variant="subtle">
      <p class="text-sm text-muted">
        Assignment Aktif
      </p>
      <p class="mt-1 text-2xl font-semibold text-success">
        {{ active }}
      </p>
    </UCard>

    <UCard variant="subtle">
      <p class="text-sm text-muted">
        Assignment Nonaktif
      </p>
      <p class="mt-1 text-2xl font-semibold text-muted">
        {{ inactive }}
      </p>
    </UCard>

    <UCard variant="subtle">
      <p class="text-sm text-muted">
        Petugas Terlibat
      </p>
      <p class="mt-1 text-2xl font-semibold text-highlighted">
        {{ uniqueUsers }}
      </p>
    </UCard>
  </div>
</template>
