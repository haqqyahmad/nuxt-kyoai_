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
      <UDashboardNavbar title="Services">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 w-full">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
