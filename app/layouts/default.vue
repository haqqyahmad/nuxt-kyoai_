<!-- app/layouts/default.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const open = ref(false)
const openPrivacyPolicy = ref(false)

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
    '/questionnaire',
    '/rooms',
    '/services'
  ],
  'Items': [
    '/items/mcu',
    '/items/sample-types'
  ],
  'Front Office': [
    '/front-office'
  ],
  'Settings': [
    '/settings'
  ],
  'HRIS': [
    '/hris',
    '/hris/employees',
    '/hris/leaves',
    '/hris/reimbursement',
    '/hris/recruitment'
    // '/hris/shifts'
  ],
  'Attendance': [
    '/hris/attendance',
    '/hris/attendance/analytics',
    '/hris/attendance/tracking',
    '/hris/attendance/shift-configuration',
    '/hris/attendance/shift-schedule'
  ]
}

// State untuk menu yang aktif terbuka
const activeOpenMenu = ref<string | null>(null)

// generate otomatis state menu
const menuOpenState = ref<Record<string, boolean>>(
  Object.fromEntries(
    Object.keys(menuGroups).map(key => [key, false])
  )
)

const parentMenus: Record<string, string[]> = {
  Attendance: ['HRIS'],
  Items: ['Medical']
}

const updateActiveMenu = () => {
  const currentPath = route.path

  // reset semua
  Object.keys(menuOpenState.value).forEach((key) => {
    menuOpenState.value[key] = false
  })

  // cari menu aktif
  const activeMenu = Object.entries(menuGroups)
    .sort((a, b) => {
      const maxA = Math.max(...a[1].map(path => path.length))
      const maxB = Math.max(...b[1].map(path => path.length))

      return maxB - maxA
    })
    .find(([_, paths]) =>
      paths.some(path =>
        currentPath === path || currentPath.startsWith(`${path}/`)
      )
    )?.[0] || null

  activeOpenMenu.value = activeMenu

  // buka menu aktif
  if (activeMenu) {
    menuOpenState.value[activeMenu] = true

    parentMenus[activeMenu]?.forEach((parent) => {
      menuOpenState.value[parent] = true
    })
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
          label: 'Departments',
          to: '/departments'
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
          type: 'trigger',
          open: menuOpenState.value['Items'],
          onUpdateOpen: (val: boolean) => updateMenuState('Items', val),
          children: [
            {
              label: 'MCU',
              to: '/items/mcu'
            },
            {
              label: 'Sample Types',
              to: '/items/sample-types'
            }
          ]
        },
        {
          label: 'Questionnaire',
          to: '/questionnaire'
        },
        {
          label: 'Rooms',
          to: '/rooms'
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
      label: 'HRIS',
      icon: 'i-lucide-file-user',
      type: 'trigger',
      open: menuOpenState.value['HRIS'],
      onUpdateOpen: (val: boolean) => updateMenuState('HRIS', val),
      children: [
        {
          label: 'Dashboard HRIS',
          to: '/hris'
        },
        {
          label: 'Employees',
          to: '/hris/employees'
        },
        // {
        //   label: 'Shift Management',
        //   to: '/hris/shifts'
        // },
        {
          label: 'Attendance',
          type: 'trigger',
          open: menuOpenState.value['Attendance'],
          onUpdateOpen: (val: boolean) => updateMenuState('Attendance', val),
          children: [
            {
              label: 'Dashboard Attendance',
              to: '/hris/attendance'
            },
            {
              label: 'Attendance Analytics',
              to: '/hris/attendance/analytics'
            },
            {
              label: 'Attendance Tracking',
              to: '/hris/attendance/tracking'
            },
            {
              label: 'Shift Configuration',
              to: '/hris/attendance/shift-configuration'
            },
            {
              label: 'Shift Schedule',
              to: '/hris/attendance/shift-schedule'
            }
          ]
        },
        {
          label: 'Leave Management',
          to: '/hris/leaves'
        },
        {
          label: 'Reimbursement',
          to: '/hris/reimbursement'
        },
        {
          label: 'Recruitment',
          to: '/hris/recruitment'
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

onMounted(() => {
  const cookie = useCookie<'accepted' | 'rejected' | null>('cookie-consent', {
    maxAge: 60 * 60 * 24 * 365,
    default: () => null
  })

  if (cookie.value) {
    return
  }

  const toastId = toast.add({
    title: 'Cookie Notice',
    description:
  'This website uses cookies to ensure you get the best experience on our website. Please review our Privacy Policy for more information.',
    duration: 0,
    close: false,
    actions: [
      {
        label: 'Privacy Policy',
        color: 'neutral',
        variant: 'ghost',
        onClick: () => {
          openPrivacyPolicy.value = true
        }
      },
      {
        label: 'Accept',
        color: 'primary',
        onClick: () => {
          cookie.value = 'accepted'
          toast.remove(toastId)
        }
      },
      {
        label: 'Opt out',
        color: 'neutral',
        onClick: () => {
          cookie.value = 'rejected'
          toast.remove(toastId)
        }
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

    <PrivacyPolicyModal
      v-model:open="openPrivacyPolicy"
    />
  </ClientOnly>
</template>
