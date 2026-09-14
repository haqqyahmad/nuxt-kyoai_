<!-- app/layouts/default.vue -->
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { restrictedRoles as restrictedRolesList, getAllowedRoutes, externalDoctorAllowedRoutes, roleDefaultDepartment, buildMenuTree } from '~/constants/menu'

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
    '/rooms/sample-collection',
    '/queue-search'
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

type SidebarItem = NavigationMenuItem & {
  permission?: string
  resultDepartmentCode?: string
}

function canAccessResultDeptForMenu(code?: string) {
  if (!code) return true
  if (isExternalDoctor.value) return false
  if (canAccessAllResults.value) return canAccessResultDepartment(code)
  if (userDefaultDepartment.value) {
    if (allowedResultDepartmentCodes.value.length > 0) {
      return allowedResultDepartmentCodes.value.includes(code)
    }
    return code === userDefaultDepartment.value
  }
  return canAccessResultDepartment(code)
}

function buildNavItems(items: SidebarItem[]): NavigationMenuItem[] {
  return items.reduce<NavigationMenuItem[]>((acc, item) => {
    if (item.permission && !permissions.value.includes(item.permission)) return acc
    if (item.resultDepartmentCode && !canAccessResultDeptForMenu(item.resultDepartmentCode)) return acc

    const nav = { ...item } as SidebarItem

    if (Array.isArray(item.children) && item.children.length > 0) {
      nav.type = 'trigger'
      nav.open = menuOpenState.value[String(item.label)]
      nav.onUpdateOpen = (val: boolean) => updateMenuState(String(item.label), val)

      let children = buildNavItems(item.children as SidebarItem[])

      if (isExternalDoctor.value && item.label === 'Results') {
        children = [
          { label: 'Pekerjaan Dokter Luar', to: '/result/exam-results', active: true },
          ...children
        ]
      }

      if (children.length === 0) return acc
      nav.children = children
    } else if (item.resultDepartmentCode) {
      nav.active = activeResultDepartment.value === item.resultDepartmentCode.toLowerCase()
    } else if (typeof item.to === 'string') {
      const to = item.to
      nav.active = ['/result/doctor-result', '/result/mr-review', '/result/exam-status']
        .some(prefix => to.startsWith(prefix) && route.path.startsWith(prefix))
    }

    acc.push(nav)
    return acc
  }, [])
}

const links = computed<NavigationMenuItem[][]>(() => [
  filterSidebarItems(buildNavItems(buildMenuTree() as SidebarItem[])),
  []
])

// [FULL-WIDTH] State shared dari queue-work: jika true (seluruh item renderer
// custom: dental / physical), queue-work panel penuh tanpa sidebar aplikasi.
const fullWidthWorkState = useState<boolean>('queue-work-full', () => false)

const hideNavigationForExternalDoctor = computed(() => {
  if (!isExternalDoctor.value) return false
  return /^\/result\/exam-results\/[A-Za-z0-9_-]+$/.test(route.path)
})

const hideSidebar = computed(() => {
  // Sembunyikan sidebar di halaman detail doctor-result (full-width)
  if (/^\/rooms\/doctor-result\/[A-Za-z0-9_-]+$/.test(route.path)) return true
  // Sembunyikan sidebar di semua halaman detail exam-results (full-width)
  if (/^\/result\/exam-results\/[A-Za-z0-9_-]+$/.test(route.path)) return true
  // Sembunyikan untuk external doctor di halaman exam-results detail legacy
  if (hideNavigationForExternalDoctor.value) return true
  // Sembunyikan saat queue-work hanya berisi item renderer custom (full-width panel)
  if (/^\/rooms\/queue-work\/[A-Za-z0-9_-]+$/.test(route.path) && fullWidthWorkState.value) return true
  return false
})

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: links.value.flat()
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

    <BackToTop />
  </ClientOnly>
</template>
