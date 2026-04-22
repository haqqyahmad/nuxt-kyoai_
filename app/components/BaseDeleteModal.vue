<script setup lang="ts">
const $props = withDefaults(
  defineProps<{
    count?: number
    entity?: string
    title?: string
    description?: string
  }>(),
  {
    count: 1,
    entity: 'item'
  }
)

const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const open = ref(false)

function onSubmit() {
  emit('confirm')
  open.value = false
}

const computedTitle = computed(() => {
  if ($props.title) return $props.title
  return `Delete ${$props.count} ${$props.entity}${$props.count > 1 ? 's' : ''}`
})

const computedDescription = computed(() => {
  if ($props.description) return $props.description
  return 'Are you sure? This action cannot be undone.'
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="computedTitle"
    :description="computedDescription"
  >
    <!-- 🔥 trigger bebas -->
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          variant="solid"
          loading-auto
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>