<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const open = ref(false)

// Update active menu berdasarkan route
const menuGroups: Record<string, string[]> = {
  'Master Data': [
    '/customer',
    '/patients',
    '/users',
    '/items',
    '/questionnaire',
    '/packages'
  ],
  'Front Office': [
    '/front-office'
  ],
  'Settings': [
    '/settings'
  ]
  // 'Items': [
  //   '/item-category',
  //   '/item-group'
  // ]
}

// State untuk menu yang aktif terbuka
const activeOpenMenu = ref<string | null>(null)

// generate otomatis state menu
const menuOpenState = ref<Record<string, boolean>>(
  Object.fromEntries(
    Object.keys(menuGroups).map(key => [key, false])
  )
)

const updateActiveMenu = () => {
  const currentPath = route.path

  // reset semua
  Object.keys(menuOpenState.value).forEach((key) => {
    menuOpenState.value[key] = false
  })

  // cari menu aktif
  const activeMenu = Object.entries(menuGroups).find(([_, paths]) =>
    paths.some(path => currentPath.startsWith(path))
  )?.[0] || null

  activeOpenMenu.value = activeMenu

  // buka menu aktif
  if (activeMenu) {
    menuOpenState.value[activeMenu] = true
  }
}

watch(
  () => route.path,
  updateActiveMenu,
  { immediate: true }
)

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
        },
        {
          label: 'Questionnaire',
          to: '/questionnaire'
        },
        {
          label: 'Service Packages',
          to: '/packages'
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
