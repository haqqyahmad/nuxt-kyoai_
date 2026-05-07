<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const links = [
  [
    {
      label: 'MCU',
      icon: 'i-lucide-clipboard',
      to: '/items/mcu',
      exact: true
    }
  ],
  [
    {
      label: 'Documentation',
      icon: 'i-lucide-book-open',
      to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
      target: '_blank'
    }
  ]
] satisfies NavigationMenuItem[][]
console.log('path', route.path)

const linkHidden = ['/settings/roles', '/settings/roles/new']
</script>

<template>
  <UDashboardPanel id="items" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Items">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <!-- <UDashboardToolbar v-if="!route.path.includes('/settings/roles')"> -->
      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- <div
        :class="
          !route.path.includes('/settings/roles')
            ? 'flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto'
            : 'w-full h-full'
        "
      > -->
      <div
        class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto"
      >
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
