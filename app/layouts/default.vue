<!-- app/layouts/default.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { restrictedRoles as restrictedRolesList, getAllowedRoutes, externalDoctorAllowedRoutes, roleDefaultDepartment } from '~/constants/menu'

const route = useRoute()
const toast = useToast()
const { permissions, roles, isExternalDoctor, allowedResultDepartmentCodes, isSuperAdmin } = await useCurrentUser()
const { hasRouteAccess } = useRoutePermission()

const restrictedRoles = restrictedRolesList

const isRestrictedUser = computed(() =>
  !isSuperAdmin.value && roles.value.some(r => restrictedRoles.includes(r))
)

const currentRoleName = computed(() => roles.value[0] ?? '')
const userDefaultDepartment = computed(() => roleDefaultDepartment[currentRoleName.value.toLowerCase()] || null)

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
  'Departments': [
    '/departments/medical',
    '/departments'
  ],
  'Medical': [
    '/medical/master-grading',
    '/questionnaire',
    '/rooms',
    '/rooms/types',
    '/services'
  ],
  'Examination': [
    '/rooms/assignments',
    '/rooms/queue',
    '/rooms/sample-collection'
  ],
  'Results': [
    '/result/exam-results',
    '/result/exam-status',
    '/result/exam-results?department=lab',
    '/result/exam-results?department=radiology',
    '/result/exam-results?department=nurse',
    '/result/exam-results?department=dokter',
    '/result/exam-results?department=dental',
    '/result/doctor-result',
    '/result/mr-review'
  ],
  'Lab': [
    '/rooms/sample-reception'
  ],
  'Items': [
    '/items/mcu',
    '/items/groups',
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

function normalizeMenuPath(path: string) {
  return path.split(/[?#]/, 1)[0] || '/'
}

function collectItemRoutes(item: NavigationMenuItem): string[] {
  if (typeof item.to === 'string') return [normalizeMenuPath(item.to)]
  if (item.children) return (item.children as NavigationMenuItem[]).flatMap(collectItemRoutes)
  return []
}

function filterSidebarItems(items: NavigationMenuItem[]): NavigationMenuItem[] {
  const userRole = roles.value[0] ?? ''

  return items.reduce<NavigationMenuItem[]>((acc, item) => {
    if (isExternalDoctor.value) {
      const routes = collectItemRoutes(item)
      const allowed = routes.some(r => externalDoctorAllowedRoutes.includes(r))
      if (!allowed) return acc

      if (item.children) {
        const filtered = filterSidebarItems(item.children as NavigationMenuItem[])
        if (filtered.length > 0) {
          acc.push({ ...item, children: filtered })
        }
        return acc
      }

      acc.push(item)
      return acc
    }

    if (isRestrictedUser.value) {
      const allowedRoutes = getAllowedRoutes(userRole)
      const routes = collectItemRoutes(item)
      const allowed = routes.some(r => allowedRoutes.includes(r))
      if (!allowed) return acc
    }

    if (item.children) {
      const filtered = filterSidebarItems(item.children as NavigationMenuItem[])
      if (filtered.length > 0) {
        acc.push({ ...item, children: filtered })
      }
      return acc
    }

    if (typeof item.to === 'string') {
      if (hasRouteAccess(normalizeMenuPath(item.to), permissions.value)) {
        acc.push(item)
      }
      return acc
    }

    acc.push(item)
    return acc
  }, [])
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
  Items: ['Medical'],
  Departments: ['Master Data'],
  Results: [],
  Lab: []
}

const activeResultDepartment = computed(() => {
  const department = route.query.department
  const value = Array.isArray(department) ? department[0] : department

  return typeof value === 'string' ? value.toLowerCase() : ''
})

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
  () => route.fullPath,
  updateActiveMenu,
  { immediate: true }
)

const canAccessAllResults = computed(() => isSuperAdmin.value)

function canAccessResultDepartment(code?: string) {
  if (!code) return true
  return canAccessAllResults.value
    || isExternalDoctor.value
    || allowedResultDepartmentCodes.value.includes(code.toUpperCase())
}

// Fungsi untuk update menu state ketika user klik
const updateMenuState = (menuName: string, isOpen: boolean) => {
  menuOpenState.value[menuName] = isOpen
}

const links = computed<NavigationMenuItem[][]>(() => [
  filterSidebarItems([
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
          type: 'trigger',
          open: menuOpenState.value['Departments'],
          onUpdateOpen: (val: boolean) => updateMenuState('Departments', val),
          children: [
            {
              label: 'Medical',
              icon: 'i-lucide-stethoscope',
              to: '/departments/medical'
            },
            {
              label: 'Non Medical',
              icon: 'i-lucide-building',
              to: '/departments'
            }
          ]
        },
        {
          label: 'Patients',
          to: '/patients'
        },
        {
          label: 'Users',
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
              label: 'List Items',
              to: '/items/mcu'
            },
            {
              label: 'Master Group',
              to: '/items/groups'
            },
            {
              label: 'Sample Types',
              to: '/items/sample-types'
            }
          ]
        },
        {
          label: 'Master Grade',
          icon: 'i-lucide-clipboard-list',
          to: '/medical/master-grading'
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
          label: 'Room Types',
          to: '/rooms/types'
        },
        {
          label: 'Services',
          to: '/services'
        }
      ]
    },
    {
      label: 'Examination',
      icon: 'i-lucide-stethoscope',
      type: 'trigger',
      // Gunakan activeOpenMenu untuk kontrol defaultOpen
      open: menuOpenState.value['Examination'],
      onUpdateOpen: (val: boolean) => updateMenuState('Examination', val),
      children: [
        {
          label: 'Room Assignment',
          to: '/rooms/assignments'
        },
        {
          label: 'Room Queue',
          to: '/rooms/queue'
        },
        ...(permissions.value.includes('sample:collect')
          ? [{ label: 'Sample Collection', to: '/rooms/sample-collection' }]
          : [])
      ]
    },
    {
      label: 'Results',
      icon: 'i-lucide-file-check-2',
      type: 'trigger',
      open: menuOpenState.value['Results'],
      onUpdateOpen: (val: boolean) => updateMenuState('Results', val),
      children: [
        ...(isExternalDoctor.value ? [{ label: 'Pekerjaan Dokter Luar', to: '/result/exam-results', active: true }] : []),
        {
          label: 'Hasil Exam Lab',
          to: '/result/exam-results?department=lab',
          active: activeResultDepartment.value === 'lab',
          resultDepartmentCode: 'LAB'
        },
        {
          label: 'Hasil Exam Radiology',
          to: '/result/exam-results?department=radiology',
          active: activeResultDepartment.value === 'radiology',
          resultDepartmentCode: 'RAD'
        },
        {
          label: 'Hasil Exam Nurse',
          to: '/result/exam-results?department=nurse',
          active: activeResultDepartment.value === 'nurse',
          resultDepartmentCode: 'NURSE'
        },
        {
          label: 'Hasil Exam Dokter',
          to: '/result/exam-results?department=dokter',
          active: activeResultDepartment.value === 'dokter',
          resultDepartmentCode: 'DOK'
        },
        {
          label: 'Hasil Exam Dental',
          to: '/result/exam-results?department=dental',
          active: activeResultDepartment.value === 'dental',
          resultDepartmentCode: 'DENTAL'
        },
        {
          label: 'Doctor Result MCU',
          to: '/result/doctor-result',
          active: route.path.startsWith('/result/doctor-result')
        },
        {
          label: 'MR Review',
          to: '/result/mr-review',
          active: route.path.startsWith('/result/mr-review')
        },
        {
          label: 'Persetujuan Hasil',
          icon: 'i-lucide-inbox',
          to: '/result/department-approval',
          active: route.path.startsWith('/result/department-approval')
        },
        {
          label: 'Status Examination',
          icon: 'i-lucide-activity',
          to: '/result/exam-status',
          active: route.path.startsWith('/result/exam-status')
        }
      ].filter((item) => {
        if (isExternalDoctor.value) return !item.resultDepartmentCode
        // Superadmin: akses sesuai departemen
        if (canAccessAllResults.value || isExternalDoctor.value) {
          return canAccessResultDepartment(item.resultDepartmentCode)
        }
        // Role lain: hanya akses departemen default
        if (userDefaultDepartment.value) {
          return item.resultDepartmentCode === userDefaultDepartment.value
        }
        return canAccessResultDepartment(item.resultDepartmentCode)
      })
    },
    {
      label: 'Lab',
      icon: 'i-lucide-flask-conical',
      type: 'trigger',
      open: menuOpenState.value['Lab'],
      onUpdateOpen: (val: boolean) => updateMenuState('Lab', val),
      children: permissions.value.includes('sample:receive')
        ? [
            {
              label: 'Sample Receive',
              to: '/rooms/sample-reception'
            }
          ]
        : []
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
        },
        {
          label: 'Hasil Questionnaire',
          to: '/front-office/questionnaire-results'
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
              label: 'Attendance Report',
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
          label: 'National Holidays',
          to: '/hris/national-holidays'
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
  ]),
  []
])

// [DENTAL] State shared dari queue-work: jika true, queue-work panel penuh tanpa sidebar
const dentalWorkState = useState<boolean>('queue-work-dental', () => false)

const hideNavigationForExternalDoctor = computed(() => {
  if (!isExternalDoctor.value) return false
  return /^\/rooms\/exam-results\/[A-Za-z0-9_-]+$/.test(route.path)
})

const hideSidebar = computed(() => {
  // Sembunyikan sidebar di halaman detail doctor-result (full-width)
  if (/^\/rooms\/doctor-result\/[A-Za-z0-9_-]+$/.test(route.path)) return true
  // Sembunyikan sidebar di semua halaman detail exam-results (full-width)
  if (/^\/result\/exam-results\/[A-Za-z0-9_-]+$/.test(route.path)) return true
  // Sembunyikan untuk external doctor di halaman exam-results detail legacy
  if (hideNavigationForExternalDoctor.value) return true
  // Sembunyikan saat queue-work hanya berisi item dental (full-width panel)
  if (/^\/rooms\/queue-work\/[A-Za-z0-9_-]+$/.test(route.path) && dentalWorkState.value) return true
  return false
})

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
        v-if="!hideSidebar"
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

      <UDashboardSearch v-if="!hideNavigationForExternalDoctor && !hideSidebar" :groups="groups" />

      <slot />

      <NotificationsSlideover />
    </UDashboardGroup>

    <PrivacyPolicyModal
      v-model:open="openPrivacyPolicy"
    />
  </ClientOnly>
</template>
