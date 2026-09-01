<!-- app/components/hris/employees/Header.vue -->

<script setup lang="ts">
const emit = defineEmits<{
  export: []
  add: []
}>()
</script>

<template>
  <div class="flex items-end justify-between">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Direktori Karyawan
      </h1>

      <p class="mt-1 text-sm text-muted">
        Kelola data seluruh karyawan perusahaan.
      </p>
    </div>

    <div class="flex gap-2">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-download"
        @click="emit('export')"
      >
        Export CSV
      </UButton>

      <UButton
        icon="i-lucide-user-plus"
        @click="emit('add')"
      >
        Tambah Karyawan
      </UButton>
    </div>
  </div>
</template>
