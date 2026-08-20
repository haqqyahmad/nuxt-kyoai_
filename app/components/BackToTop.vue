<script setup lang="ts">
const visible = ref(false)
let scroller: Element | null = null

function onScroll(event: Event) {
  const target = event.target as Element
  const top = target.scrollTop || (target as any).scrollY || 0
  if (top > 300) {
    scroller = target
    visible.value = true
  } else if (target === scroller) {
    visible.value = false
  }
}

function scrollToTop() {
  if (scroller) {
    scroller.scrollTo?.({ top: 0, behavior: 'smooth' })
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  // Capture phase menangkap scroll dari elemen container APAPUN (panel internal).
  document.addEventListener('scroll', onScroll, { capture: true, passive: true })
  visible.value = (document.scrollingElement?.scrollTop || 0) > 300
})

onBeforeUnmount(() => document.removeEventListener('scroll', onScroll, true))
</script>

<template>
  <UButton
    icon="i-lucide-arrow-up"
    color="primary"
    size="lg"
    aria-label="Kembali ke atas"
    class="fixed bottom-5 right-5 z-50 rounded-full shadow-lg transition-opacity duration-200"
    :class="visible ? 'opacity-100' : 'pointer-events-none opacity-0'"
    @click="scrollToTop"
  />
</template>
