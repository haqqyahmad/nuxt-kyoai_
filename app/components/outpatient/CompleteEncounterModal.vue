<script setup lang="ts">
defineProps<{
  label?: string | null
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    title="Complete encounter?"
  >
    <template #body>
      <div class="space-y-2">
        <p class="text-sm text-muted">
          Menyelesaikan encounter ini akan menandai registrasi sebagai
          <span class="font-semibold text-highlighted">Check Out</span>.
        </p>
        <p v-if="label" class="text-sm font-medium text-highlighted">
          {{ label }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="loading"
          @click="open = false"
        >
          Cancel
        </UButton>
        <UButton
          color="success"
          icon="i-lucide-check"
          :loading="loading"
          @click="emit('confirm')"
        >
          Complete
        </UButton>
      </div>
    </template>
  </UModal>
</template>
