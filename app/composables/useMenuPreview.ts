import type { NavigationMenuItem } from '@nuxt/ui'

type PreviewOptions = {
  isRestricted?: boolean
  isExternal?: boolean
  allowedResultDepartments?: string[]
}

const restrictedAllowedRoutes = [
  '/',
  '/rooms/assignments',
  '/rooms/queue',
  '/rooms/sample-collection',
  '/rooms/sample-reception',
  '/rooms/exam-results',
  '/rooms/queue-work',
  '/settings',
  '/settings/roles',
  '/settings/permissions',
  '/settings/security',
  '/settings/members',
  '/settings/notifications'
]

const externalDoctorAllowedRoutes = [
  '/rooms/exam-results',
  '/settings',
  '/settings/security'
]

function normalizePath(path: string): string {
  return path.split(/[?#]/, 1)[0] || '/'
}

function collectRoutes(item: NavigationMenuItem): string[] {
  if (typeof item.to === 'string') return [normalizePath(item.to)]
  if (item.children) return (item.children as NavigationMenuItem[]).flatMap(collectRoutes)
  return []
}

function checkRouteAccess(path: string, permissions: string[], docTypeKeys: string[]): boolean {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return true

  const candidates = new Set<string>()
  candidates.add(parts.join('-'))
  if (parts.length > 0) {
    candidates.add(parts[parts.length - 1]!)
  }
  if (parts.length >= 2) {
    candidates.add(parts.slice(-2).reverse().join('-'))
  }
  for (const part of parts) {
    candidates.add(part)
  }

  for (const candidate of candidates) {
    if (docTypeKeys.includes(candidate)) {
      return permissions.some(p => p.startsWith(`${candidate}:`))
    }
    if (candidate.endsWith('s') && docTypeKeys.includes(candidate.slice(0, -1))) {
      return permissions.some(p => p.startsWith(`${candidate.slice(0, -1)}:`))
    }
  }

  return true
}

function filterMenuItems(
  items: NavigationMenuItem[],
  permissions: string[],
  docTypeKeys: string[],
  options: PreviewOptions
): NavigationMenuItem[] {
  return items.reduce<NavigationMenuItem[]>((acc, item) => {
    if (options.isExternal) {
      const routes = collectRoutes(item)
      const allowed = routes.some(r => externalDoctorAllowedRoutes.includes(r))
      if (!allowed) return acc

      if (item.children) {
        const filtered = filterMenuItems(item.children as NavigationMenuItem[], permissions, docTypeKeys, options)
        if (filtered.length > 0) {
          acc.push({ ...item, children: filtered })
        }
        return acc
      }
      acc.push(item)
      return acc
    }

    if (options.isRestricted) {
      const routes = collectRoutes(item)
      const allowed = routes.some(r => restrictedAllowedRoutes.includes(r))
      if (!allowed) return acc
    }

    if (item.children) {
      const filtered = filterMenuItems(item.children as NavigationMenuItem[], permissions, docTypeKeys, options)
      if (filtered.length > 0) {
        acc.push({ ...item, children: filtered })
      }
      return acc
    }

    if (typeof item.to === 'string') {
      if (checkRouteAccess(normalizePath(item.to), permissions, docTypeKeys)) {
        acc.push(item)
      }
      return acc
    }

    acc.push(item)
    return acc
  }, [])
}

export function useMenuPreview() {
  const allMenuItems: NavigationMenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'i-lucide-house',
      to: '/'
    },
    {
      label: 'Master Data',
      icon: 'i-lucide-hard-drive',
      children: [
        { label: 'Branches', to: '/branches' },
        { label: 'Customers', to: '/customer' },
        {
          label: 'Departments',
          children: [
            { label: 'Medical', to: '/departments/medical' },
            { label: 'Non Medical', to: '/departments' }
          ]
        },
        { label: 'Patients', to: '/patients' },
        { label: 'Users', to: '/users' }
      ]
    },
    {
      label: 'Medical',
      icon: 'i-lucide-briefcase-medical',
      children: [
        {
          label: 'Items',
          children: [
            { label: 'List Items', to: '/items/mcu' },
            { label: 'Master Group', to: '/items/groups' },
            { label: 'Sample Types', to: '/items/sample-types' }
          ]
        },
        { label: 'Questionnaire', to: '/questionnaire' },
        { label: 'Rooms', to: '/rooms' },
        { label: 'Room Types', to: '/rooms/types' },
        { label: 'Services', to: '/services' }
      ]
    },
    {
      label: 'Examination',
      icon: 'i-lucide-stethoscope',
      children: [
        { label: 'Room Assignment', to: '/rooms/assignments' },
        { label: 'Room Queue', to: '/rooms/queue' },
        { label: 'Sample Collection', to: '/rooms/sample-collection' }
      ]
    },
    {
      label: 'Results',
      icon: 'i-lucide-file-check-2',
      children: [
        { label: 'Hasil Exam Lab', to: '/rooms/exam-results?department=lab' },
        { label: 'Hasil Exam Radiology', to: '/rooms/exam-results?department=radiology' },
        { label: 'Hasil Exam Nurse', to: '/rooms/exam-results?department=nurse' },
        { label: 'Hasil Exam Dokter', to: '/rooms/exam-results?department=dokter' },
        { label: 'Hasil Exam Dental', to: '/rooms/exam-results?department=dental' }
      ]
    },
    {
      label: 'Lab',
      icon: 'i-lucide-flask-conical',
      children: [
        { label: 'Sample Receive', to: '/rooms/sample-reception' }
      ]
    },
    {
      label: 'Front Office',
      icon: 'i-lucide-users',
      children: [
        { label: 'Temp Registration', to: '/front-office/registration-temp' },
        { label: 'Patient Appointment', to: '/front-office/registration-patient' }
      ]
    },
    {
      label: 'HRIS',
      icon: 'i-lucide-file-user',
      children: [
        { label: 'Dashboard HRIS', to: '/hris' },
        { label: 'Employees', to: '/hris/employees' },
        {
          label: 'Attendance',
          children: [
            { label: 'Dashboard Attendance', to: '/hris/attendance' },
            { label: 'Attendance Analytics', to: '/hris/attendance/analytics' },
            { label: 'Attendance Report', to: '/hris/attendance/tracking' },
            { label: 'Shift Configuration', to: '/hris/attendance/shift-configuration' },
            { label: 'Shift Schedule', to: '/hris/attendance/shift-schedule' }
          ]
        },
        { label: 'National Holidays', to: '/hris/national-holidays' },
        { label: 'Leave Management', to: '/hris/leaves' },
        { label: 'Reimbursement', to: '/hris/reimbursement' },
        { label: 'Recruitment', to: '/hris/recruitment' }
      ]
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ]

  function getMenuPreview(
    permissions: string[],
    docTypeKeys: string[],
    options: PreviewOptions = {}
  ): NavigationMenuItem[] {
    return filterMenuItems(allMenuItems, permissions, docTypeKeys, options)
  }

  function isMenuVisible(
    menuPath: string,
    permissions: string[],
    docTypeKeys: string[],
    options: PreviewOptions = {}
  ): boolean {
    const preview = filterMenuItems(allMenuItems, permissions, docTypeKeys, options)
    const routes = preview.flatMap(collectRoutes)
    return routes.includes(normalizePath(menuPath))
  }

  return {
    getMenuPreview,
    isMenuVisible,
    allMenuItems
  }
}
