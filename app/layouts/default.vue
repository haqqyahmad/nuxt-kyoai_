<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const open = ref(false)

// State untuk menu yang aktif terbuka
const activeOpenMenu = ref<string | null>(null)

// State untuk semua menu trigger
const menuOpenState = ref({
  'Master Data': false,
  'Front Office': false,
  'Settings': false,
  'Items': false
})

// Update active menu berdasarkan route
const updateActiveMenu = () => {
  const currentPath = route.path

  // Reset semua menu state
  menuOpenState.value = {
    'Master Data': false,
    'Front Office': false,
    'Settings': false,
    'Items': false
  }

  if (currentPath.startsWith('/customer')
    || currentPath.startsWith('/patients')
    || currentPath.startsWith('/users')
    || currentPath.startsWith('/items')) {
    activeOpenMenu.value = 'Master Data'
    menuOpenState.value['Master Data'] = true
  } else if (currentPath.startsWith('/front-office')) {
    activeOpenMenu.value = 'Front Office'
    menuOpenState.value['Front Office'] = true
  } else if (currentPath.startsWith('/settings')) {
    activeOpenMenu.value = 'Settings'
    menuOpenState.value['Settings'] = true
  } else {
    activeOpenMenu.value = null
  }
}

// Watch route changes
watch(() => route.path, () => {
  updateActiveMenu()
}, { immediate: true })

// Fungsi untuk update menu state ketika user klik
const updateMenuState = (menuName: string, isOpen: boolean) => {
  menuOpenState.value[menuName] = isOpen
}

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
      // Gunakan activeOpenMenu untuk kontrol defaultOpen
      open: menuOpenState.value['Master Data'],
      onUpdateOpen: (val: boolean) => updateMenuState('Master Data', val),
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
        },
        {
          label: 'Items',
          to: '/items'
        }
        // {
        //   label: 'Items',
        //   type: 'trigger',
        //   open: menuOpenState.value['Items'],
        //   onUpdateOpen: (val: boolean) => updateMenuState('Items', val),
        //   children: [
        //     {
        //       label: 'MCU',
        //       to: '/items/mcu'
        //     }
        //   ]
        // }
      ]
    },
    {
      label: 'Front Office',
      icon: 'i-lucide-users',
      type: 'trigger',
      open: menuOpenState.value['Front Office'],
      onUpdateOpen: (val: boolean) => updateMenuState('Front Office', val),
      children: [
        {
          label: 'Temp Registration',
          to: '/front-office/registration-temp'
        },
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
      open: menuOpenState.value['Settings'],
      onUpdateOpen: (val: boolean) => updateMenuState('Settings', val),
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
            :key="`nav-${route.path}`"
            :collapsed="collapsed"
            :items="links[0]"
            orientation="vertical"
            tooltip
            popover
          />

          <UNavigationMenu
            :key="`nav-bottom-${route.path}`"
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
