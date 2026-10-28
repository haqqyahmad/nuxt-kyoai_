<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open?: boolean
    count?: number
    entity?: string
    title?: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmColor?: 'error' | 'warning' | 'primary' | 'neutral'
    loading?: boolean
  }>(),
  {
    open: false,
    count: 1,
    entity: 'item',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmColor: 'error',
    loading: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
  'close': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const computedTitle = computed(() => {
  if (props.title) return props.title

  return `Delete ${props.count} ${props.entity}${props.count > 1 ? 's' : ''}`
})

const computedDescription = computed(() => {
  return props.description || 'Are you sure? This action cannot be undone.'
})

function closeModal() {
  if (props.loading) return

  isOpen.value = false
  emit('close')
}

function onConfirm() {
  if (props.loading) return

  emit('confirm')
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="computedTitle"
    :description="computedDescription"
  >
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          :label="cancelLabel"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="closeModal"
        />

        <UButton
          :label="confirmLabel"
          :color="confirmColor"
          variant="solid"
          :loading="loading"
          :disabled="loading"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
