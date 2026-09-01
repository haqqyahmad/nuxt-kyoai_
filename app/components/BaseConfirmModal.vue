<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    count?: number
    entity?: string
    title?: string
    description?: string
    disabled?: boolean
    variant?: 'danger' | 'success' | 'warning' // 👈 TARUH DI SINI
  }>(),
  {
    count: 1,
    entity: 'item',
    variant: 'warning' // 👈 optional default
  }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
}>()

function close() {
  emit('update:open', false)
}

function onSubmit() {
  emit('confirm')
  close()
}

const computedTitle = computed(() => {
  if (props.title) return props.title
  return `Delete ${props.count} ${props.entity}${props.count > 1 ? 's' : ''}`
})

const computedDescription = computed(() => {
  if (props.description) return props.description
  return 'Are you sure? This action cannot be undone.'
})

const buttonColor = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'error'
    case 'success':
      return 'success'
    default:
      return 'warning'
  }
})
</script>

<template>
  <UModal
    :open="props.open"
    :title="computedTitle"
    :description="computedDescription"
    @update:open="(val) => emit('update:open', val)"
  >
    <!-- 🔥 trigger bebas -->
    <slot />

    <template #body>
      <div class="space-y-4">
        <!-- 🔥 slot tambahan -->
        <slot name="content" />

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            :color="buttonColor"
            variant="subtle"
            @click="close()"
          />
          <UButton
            label="Confirm"
            :color="buttonColor"
            variant="solid"
            loading-auto
            :disabled="props.disabled"
            @click="onSubmit"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
