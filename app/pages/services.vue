<!-- app/pages/services.vue -->
<script setup lang="ts">
const route = useRoute()

if (route.path === '/services') {
  await navigateTo('/services/packages', { replace: true })
}
</script>

<template>
  <UDashboardPanel id="services" :ui="{ body: 'py-4 sm:py-6' }">
    <template #header>
      <AppNavbar title="Services">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="route.path === '/services/packages'"
            icon="i-lucide-package-plus"
            color="primary"
            to="/services/packages/create"
          >
            New Package
          </UButton>
        </template>
      </AppNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 w-full">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
