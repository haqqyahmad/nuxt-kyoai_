<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  closeOnOverlay?: boolean
  embedded?: boolean
  hideFooter?: boolean
}>(), {
  closeOnOverlay: true,
  embedded: false,
  hideFooter: false
})

const emit = defineEmits<{
  close: []
}>()

const canRender = computed(() => props.open)

function requestClose() {
  if (!props.closeOnOverlay) return
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (import.meta.client) {
      document.body.style.overflow = isOpen && !props.embedded ? 'hidden' : ''
    }
  },
  { immediate: true }
)

if (import.meta.client) {
  window.addEventListener('keydown', onKeydown)
}

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport to="body" :disabled="embedded">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="canRender"
        class="flex items-stretch justify-center"
        :class="embedded ? 'min-h-0 flex-1' : 'fixed inset-0 z-[100] sm:items-center sm:p-4'"
      >
        <div
          v-if="!embedded"
          class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          @click="requestClose"
        />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-[0.98] translate-y-2 sm:translate-y-0"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-[0.98] translate-y-2 sm:translate-y-0"
        >
          <div
            v-if="canRender"
            class="relative flex w-full flex-col bg-background"
            :class="embedded
              ? 'min-h-[calc(100dvh-4rem)] overflow-visible'
              : 'h-[100dvh] overflow-hidden ring-1 ring-border sm:h-[calc(100dvh-2rem)] sm:w-[min(1600px,calc(100vw-2rem))] sm:rounded-3xl sm:shadow-2xl'"
            @click.stop
          >
            <div
              v-if="$slots.header"
              class="shrink-0 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6"
              :class="embedded ? 'sticky top-0 z-20' : ''"
            >
              <slot name="header" />
            </div>

            <div
              class="min-h-0 flex-1"
              :class="embedded ? 'overflow-visible' : 'overflow-hidden'"
            >
              <slot name="body" />
            </div>

            <div
              v-if="$slots.footer && !hideFooter"
              class="shrink-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
