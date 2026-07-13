<!-- app/app.vue -->
<script setup lang="ts">
import { defaultSeo, pageSeo } from '~/constants/seo'

const route = useRoute()
const colorMode = useColorMode()

const color = computed(() =>
  colorMode.value === 'dark' ? '#1b1718' : 'white'
)

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  }
})

/**
 * AUTO SEO
 */
const seo = computed(() => pageSeo[route.path] || defaultSeo)

useSeoMeta({
  title: () => seo.value.title,
  description: () => seo.value.description,

  ogTitle: () => seo.value.title,
  ogDescription: () => seo.value.description,

  titleTemplate: title =>
    title
      ? `${title} - ${defaultSeo.title}`
      : defaultSeo.title,

  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterCard: 'summary_large_image'
})

// Loading state saat pertama kali mount
const isAppReady = ref(false)

onMounted(() => {
  isAppReady.value = true
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      color="#10b981"
      :height="3"
    />

    <Transition name="fade">
      <AppLoadingScreen
        v-if="!isAppReady"
        title="Menyiapkan dashboard"
        description="Membaca aset aplikasi, memuat data awal, dan menyiapkan navigasi."
      />
    </Transition>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
