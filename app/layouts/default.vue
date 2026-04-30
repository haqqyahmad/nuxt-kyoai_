<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const open = ref(false)

const links = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-house',
      to: '/'
    },
    {
      label: 'Master Data',
      icon: 'i-lucide-hard-drive',
      type: 'trigger',

      // 🔥 AUTO OPEN
      defaultOpen: route.path.startsWith('/customer')
        || route.path.startsWith('/patients')
        || route.path.startsWith('/users'),

      children: [
        {
          label: 'Customers',
          to: '/customer'
        },
        {
          label: 'Patients',
          to: '/patients'
        },
        {
          label: 'User',
          to: '/users'
        }
      ]
    },
    {
      label: 'Front Office',
      icon: 'i-lucide-users',
      type: 'trigger',

      // 🔥 INI YANG KAMU BUTUH
      defaultOpen: route.path.startsWith('/front-office'),

      children: [
        {
          label: 'Patient Appointment',
          to: '/front-office/registration-patient'
        }
      ]
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      type: 'trigger',

      defaultOpen: route.path.startsWith('/settings'),

      children: [
        { label: 'General', to: '/settings', exact: true },
        { label: 'Members', to: '/settings/members' },
        { label: 'Notifications', to: '/settings/notifications' },
        { label: 'Security', to: '/settings/security' },
        { label: 'Roles', to: '/settings/roles' }
      ]
    }
  ],
  []
])

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: links.value.flat()
  },
  {
    id: 'code',
    label: 'Code',
    items: [
      {
        id: 'source',
        label: 'View page source',
        icon: 'i-simple-icons-github',
        to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
        target: '_blank'
      }
    ]
  }
])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title:
      'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [
      {
        label: 'Accept',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          cookie.value = 'accepted'
        }
      },
      {
        label: 'Opt out',
        color: 'neutral',
        variant: 'ghost'
      }
    ]
  })
})
</script>

<template>
  <ClientOnly>
    <UDashboardGroup unit="rem">
      <UDashboardSidebar
        id="default"
        v-model:open="open"
        collapsible
        resizable
        class="bg-elevated/25"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >
        <template #header="{ collapsed }">
          <TeamsMenu :collapsed="collapsed" />
        </template>

        <template #default="{ collapsed }">
          <UDashboardSearchButton
            :collapsed="collapsed"
            class="bg-transparent ring-default"
          />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links[0]"
            orientation="vertical"
            tooltip
            popover
          />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links[1]"
            orientation="vertical"
            tooltip
            class="mt-auto"
          />
        </template>

        <template #footer="{ collapsed }">
          <UserMenu :collapsed="collapsed" />
        </template>
      </UDashboardSidebar>

      <UDashboardSearch :groups="groups" />

      <slot />

      <NotificationsSlideover />
    </UDashboardGroup>
  </ClientOnly>
</template>
