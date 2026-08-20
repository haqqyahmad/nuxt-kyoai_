<script setup lang="ts">
const visible = ref(false)

function getScrollElement() {
  // Nuxt UI dashboard biasanya scroll di window; fallback ke documentElement.
  const sc = document.scrollingElement || document.documentElement
  return sc
}

function onScroll() {
  const el = getScrollElement()
  visible.value = (el.scrollTop || window.scrollY || 0) > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
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
