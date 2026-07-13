<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const wideSettingsPages = ['/settings/permissions']
const links = [
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: '/settings',
      exact: true
    },
    // {
    //   label: 'Members',
    //   icon: 'i-lucide-users',
    //   to: '/settings/members'
    // },
    {
      label: 'Notifications',
      icon: 'i-lucide-bell',
      to: '/settings/notifications'
    },
    {
      label: 'Security',
      icon: 'i-lucide-shield',
      to: '/settings/security'
    },
    {
      label: 'Roles',
      icon: 'i-lucide-circle-user-round',
      to: '/settings/roles'
    },
    {
      label: 'Permission',
      icon: 'i-lucide-shield-check',
      to: '/settings/permissions'
    }
  ]
] satisfies NavigationMenuItem[][]

const isWidePage = computed(() =>
  wideSettingsPages.some(path => route.path === path || route.path.startsWith(`${path}/`))
)
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Settings">
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
      <div
        :class="
          isWidePage
            ? 'flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full'
            : 'flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto'
        "
      >
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
