<!-- app/app.vue -->
<script setup lang="ts">
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
 * SEO CONFIG PER PAGE
 */
const pageSeo: Record<string, { title: string, description: string }> = {
  '/': {
    title: 'Dashboard',
    description: 'Dashboard overview.'
  },

  '/branches': {
    title: 'Master Branches',
    description: 'Halaman untuk mengelola branch.'
  },

  '/customer': {
    title: 'Master Customers',
    description: 'Halaman untuk mengelola customer.'
  },

  '/departments': {
    title: 'Master Departments',
    description: 'Halaman untuk mengelola department.'
  },

  '/patients': {
    title: 'Master Patients',
    description: 'Halaman untuk mengelola patient.'
  },

  '/users': {
    title: 'Master Users',
    description: 'Halaman untuk mengelola user.'
  },

  '/items/mcu': {
    title: 'Items MCU',
    description: 'Halaman untuk mengelola item mcu.'
  },

  '/questionnaire': {
    title: 'Master Questionnaire',
    description: 'Halaman untuk mengelola questionnaire.'
  },

  '/packages': {
    title: 'Master Service Packages',
    description: 'Halaman untuk mengelola service packages.'
  },

  '/front-office/registration-temp': {
    title: 'Temp Registrastion | Front Office',
    description: 'Halaman untuk mengelola temp registration.'
  },

  '/front-office/registration-patient': {
    title: 'Patient Appointment | Front Office',
    description: 'Halaman untuk mengelola patient appointment.'
  },

  '/settings': {
    title: 'Profile',
    description: 'Halaman untuk mengelola profile user.'
  },

  '/settings/security': {
    title: 'Change Password',
    description: 'Halaman untuk mengubah password user.'
  },

  '/settings/roles': {
    title: 'Manage Roles Permissions',
    description: 'Halaman untuk mengelola permission dan akses role user.'
  },

  '/settings/permissions': {
    title: 'Permissions',
    description: 'Halaman untuk mengelola permissions.'
  }

}

/**
 * CURRENT PAGE SEO
 */
const currentSeo = computed(() => {
  return (
    pageSeo[route.path] || {
      title: 'Kyoai Medical Services',
      description: 'Medical management system.'
    }
  )
})

/**
 * AUTO SEO
 */
useSeoMeta({
  title: () => currentSeo.value.title,
  description: () => currentSeo.value.description,

  ogTitle: () => currentSeo.value.title,
  ogDescription: () => currentSeo.value.description,

  titleTemplate: title =>
    title
      ? `${title} - Kyoai Medical Services`
      : 'Kyoai Medical Services',

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
    <NuxtLoadingIndicator />

    <!-- Loading screen sebelum app siap -->
    <Transition name="fade">
      <div
        v-if="!isAppReady"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-[#1b1718]"
      >
        <div class="flex flex-col items-center gap-4">
          <!-- Spinner -->
          <div class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
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
