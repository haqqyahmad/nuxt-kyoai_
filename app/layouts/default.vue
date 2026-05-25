<!-- app/layouts/default.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const open = ref(false)

// Update active menu berdasarkan route
const menuGroups: Record<string, string[]> = {
  'Master Data': [
    '/branches',
    '/customer',
    '/departments',
    '/patients',
    '/users'
  ],
  'Medical': [
    '/items',
    '/questionnaire',
    '/services'
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
          label: 'Branches',
          to: '/branches'
        },
        {
          label: 'Customers',
          to: '/customer'
        },
        {
          label: 'Departments'
          // to: '/departments'
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
      label: 'Medical',
      icon: 'i-lucide-briefcase-medical',
      type: 'trigger',
      // Gunakan activeOpenMenu untuk kontrol defaultOpen
      open: menuOpenState.value['Medical'],
      onUpdateOpen: (val: boolean) => updateMenuState('Medical', val),
      children: [
        {
          label: 'Items',
          to: '/items'
        },
        {
          label: 'Questionnaire',
          to: '/questionnaire'
        },
        {
          label: 'Services',
          to: '/services'
        }
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
      to: '/settings'
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
