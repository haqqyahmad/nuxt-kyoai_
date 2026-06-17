<!-- app/components/hris/leaves/detail/ApprovalActions.vue -->

<script setup lang="ts">
defineProps<{
  loading: 'approve' | 'reject' | null
}>()

const emit = defineEmits<{
  approve: []
  reject: []
}>()
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="font-semibold text-highlighted">
          Tindakan Persetujuan
        </h2>

        <p class="mt-1 text-sm text-muted">
          Tinjau kembali detail pengajuan cuti sebelum menyetujui atau menolak permohonan.
        </p>
      </div>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <UButton
          icon="i-lucide-x-circle"
          color="error"
          variant="outline"
          size="lg"
          :loading="loading === 'reject'"
          :disabled="!!loading"
          @click="emit('reject')"
        >
          Tolak Permohonan
        </UButton>

        <UButton
          icon="i-lucide-check-circle"
          color="success"
          size="lg"
          :loading="loading === 'approve'"
          :disabled="!!loading"
          @click="emit('approve')"
        >
          Setujui Permohonan
        </UButton>
      </div>
    </div>
  </UCard>
</template>
