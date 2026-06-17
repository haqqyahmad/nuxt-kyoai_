<!-- app/components/hris/leaves/detail/ReasonCard.vue -->

<script setup lang="ts">
defineProps<{
  reason: string
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="flex size-10 items-center justify-center rounded-lg bg-primary/10"
        >
          <UIcon
            name="i-lucide-message-square-quote"
            class="size-5 text-primary"
          />
        </div>

        <div>
          <h2 class="font-semibold text-highlighted">
            Alasan Pengajuan
          </h2>

          <p class="text-sm text-muted">
            Keterangan yang diberikan oleh karyawan saat mengajukan cuti.
          </p>
        </div>
      </div>
    </template>

    <div
      class="rounded-xl border border-default bg-muted/30 p-5"
    >
      <div class="flex gap-3">
        <UIcon
          name="i-lucide-quote"
          class="mt-1 size-5 shrink-0 text-primary"
        />

        <p class="leading-7 text-highlighted">
          {{ reason || 'Tidak ada alasan yang diberikan.' }}
        </p>
      </div>
    </div>
  </UCard>
</template>
