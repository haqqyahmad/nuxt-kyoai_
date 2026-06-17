<!-- app/components/hris/leaves/detail/AdminNotesCard.vue -->

<script setup lang="ts">
const model = defineModel<string>({
  default: ''
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start gap-3">
        <div
          class="flex size-10 items-center justify-center rounded-lg bg-primary/10"
        >
          <UIcon
            name="i-lucide-message-square-text"
            class="size-5 text-primary"
          />
        </div>

        <div>
          <h2 class="font-semibold text-highlighted">
            Catatan Admin
          </h2>

          <p class="mt-1 text-sm text-muted">
            Catatan ini akan disimpan sebagai informasi tambahan saat
            permohonan cuti disetujui atau ditolak.
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <UTextarea
        v-model="model"
        class="w-full"
        :ui="{
          base: 'bg-muted/30'
        }"
        :rows="5"
        autoresize
        placeholder="Tambahkan catatan admin..."
      />

      <div class="flex items-center justify-between text-xs text-muted">
        <span>
          Opsional
        </span>

        <span>
          {{ model.length }} karakter
        </span>
      </div>
    </div>
  </UCard>
</template>
