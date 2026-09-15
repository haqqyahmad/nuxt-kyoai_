import type { NavigationMenuItem } from '@nuxt/ui'

export type MenuItem = NavigationMenuItem

export const restrictedAllowedRoutes: string[] = [
  '/',
  '/rooms/assignments',
  '/rooms/queue',
  '/rooms/sample-reception',
  '/result/exam-results',
  '/result/doctor-result',
  '/result/exam-status',
  '/result/mr-review',
  '/rooms/queue-work',
  '/settings',
  '/settings/roles',
  '/settings/permissions',
  '/settings/security',
  '/settings/members',
  '/settings/notifications'
]

export const frontOfficeAllowedRoutes: string[] = [
  '/',
  '/front-office/registration-temp',
  '/front-office/registration-patient',
  '/front-office/questionnaire-results',
  '/settings',
  '/settings/security',
  '/settings/notifications'
]

export const queueSearchAllowedRoutes: string[] = [
  '/queue-search'
]

export function getAllowedRoutes(roleName: string): string[] {
  if (roleName === 'queue-search') return queueSearchAllowedRoutes
  if (roleName === 'front-office') return frontOfficeAllowedRoutes
  return restrictedAllowedRoutes
}

export const externalDoctorAllowedRoutes: string[] = [
  '/result/exam-results',
  '/settings',
  '/settings/security'
]

export const restrictedRoles: string[] = [
  'petugas-lab',
  'petugas-radiologi',
  'dokter',
  'dokter-gigi',
  'nurse',
  'front-office',
  'queue-search'
]

export const externalRoles: string[] = [
  'dokter-external'
]

export const roleDefaultDepartment: Record<string, string> = {
  'petugas-lab': 'LAB',
  'petugas-radiologi': 'RAD',
  'nurse': 'NURSE',
  'dokter': 'DOK',
  'dokter-gigi': 'DENTAL'
}

export function buildMenuTree(): MenuItem[] {
  return [
    {
      label: 'Dashboard',
      icon: 'i-lucide-house',
      to: '/'
    },
    {
      label: 'Master Data',
      icon: 'i-lucide-database',
      children: [
        { label: 'Branches', icon: 'i-lucide-building-2', to: '/branches' },
        { label: 'Customers', icon: 'i-lucide-briefcase', to: '/customer' },
        {
          label: 'Departments',
          icon: 'i-lucide-network',
          children: [
            { label: 'Medical', icon: 'i-lucide-stethoscope', to: '/departments/medical' },
            { label: 'Non Medical', icon: 'i-lucide-building', to: '/departments' }
          ]
        },
        { label: 'Patients', icon: 'i-lucide-users', to: '/patients' },
        { label: 'Users', icon: 'i-lucide-user-cog', to: '/users' }
      ]
    },
    {
      label: 'Medical',
      icon: 'i-lucide-briefcase-medical',
      children: [
        {
          label: 'Items',
          icon: 'i-lucide-package',
          children: [
            { label: 'List Items', icon: 'i-lucide-list', to: '/items/mcu' },
            { label: 'Master Group', icon: 'i-lucide-folder-tree', to: '/items/groups' },
            { label: 'Sample Types', icon: 'i-lucide-test-tube-diagonal', to: '/items/sample-types' }
          ]
        },
        { label: 'Master Grade', icon: 'i-lucide-clipboard-list', to: '/medical/master-grading' },
        { label: 'Questionnaire', icon: 'i-lucide-clipboard-check', to: '/questionnaire' },
        { label: 'Rooms', icon: 'i-lucide-door-open', to: '/rooms' },
        { label: 'Room Types', icon: 'i-lucide-layout-grid', to: '/rooms/types' },
        { label: 'Services', icon: 'i-lucide-concierge-bell', to: '/services' }
      ]
    },
    {
      label: 'Examination',
      icon: 'i-lucide-stethoscope',
      children: [
        { label: 'Room Assignment', icon: 'i-lucide-clipboard-list', to: '/rooms/assignments' },
        { label: 'Room Queue', icon: 'i-lucide-list-ordered', to: '/rooms/queue' },
        { label: 'Queue Search', icon: 'i-lucide-scan-barcode', to: '/queue-search' }
      ]
    },
    {
      label: 'Results',
      icon: 'i-lucide-file-check-2',
      children: [
        {
          label: 'Hasil Exam Lab',
          icon: 'i-lucide-flask-conical',
          to: '/result/exam-results?department=lab',
          resultDepartmentCode: 'LAB'
        },
        {
          label: 'Hasil Exam Radiology',
          icon: 'i-lucide-scan',
          to: '/result/exam-results?department=radiology',
          resultDepartmentCode: 'RAD'
        },
        {
          label: 'Hasil Exam Nurse',
          icon: 'i-lucide-heart-pulse',
          to: '/result/exam-results?department=nurse',
          resultDepartmentCode: 'NURSE'
        },
        {
          label: 'Hasil Exam Dokter',
          icon: 'i-lucide-stethoscope',
          to: '/result/exam-results?department=dokter',
          resultDepartmentCode: 'DOK'
        },
        {
          label: 'Hasil Exam Dental',
          icon: 'i-lucide-smile',
          to: '/result/exam-results?department=dental',
          resultDepartmentCode: 'DENTAL'
        },
        {
          label: 'Doctor Result MCU',
          icon: 'i-lucide-clipboard-check',
          to: '/result/doctor-result',
          resultDepartmentCode: 'DOCTOR'
        },
        {
          label: 'MR Review',
          icon: 'i-lucide-file-search',
          to: '/result/mr-review'
        },
        {
          label: 'Status Examination',
          icon: 'i-lucide-activity',
          to: '/result/exam-status'
        }
      ]
    },
    {
      label: 'Lab',
      icon: 'i-lucide-flask-conical',
      children: [
        { label: 'Sample Receive', icon: 'i-lucide-package-open', to: '/rooms/sample-reception', permission: 'sample:receive' }
      ]
    },
    {
      label: 'Front Office',
      icon: 'i-lucide-users',
      children: [
        { label: 'Temp Registration', icon: 'i-lucide-clipboard-pen-line', to: '/front-office/registration-temp' },
        { label: 'Patient Appointment', icon: 'i-lucide-calendar-clock', to: '/front-office/registration-patient' },
        { label: 'Hasil Questionnaire', icon: 'i-lucide-clipboard-check', to: '/front-office/questionnaire-results' }
      ]
    },
    {
      label: 'HRIS',
      icon: 'i-lucide-file-user',
      children: [
        { label: 'Dashboard HRIS', icon: 'i-lucide-layout-dashboard', to: '/hris' },
        { label: 'Employees', icon: 'i-lucide-id-card', to: '/hris/employees' },
        {
          label: 'Attendance',
          icon: 'i-lucide-calendar-clock',
          children: [
            { label: 'Dashboard Attendance', icon: 'i-lucide-layout-dashboard', to: '/hris/attendance' },
            { label: 'Attendance Analytics', icon: 'i-lucide-chart-column', to: '/hris/attendance/analytics' },
            { label: 'Attendance Report', icon: 'i-lucide-file-spreadsheet', to: '/hris/attendance/tracking' },
            { label: 'Shift Configuration', icon: 'i-lucide-settings-2', to: '/hris/attendance/shift-configuration' },
            { label: 'Shift Schedule', icon: 'i-lucide-calendar-days', to: '/hris/attendance/shift-schedule' }
          ]
        },
        { label: 'National Holidays', icon: 'i-lucide-calendar-heart', to: '/hris/national-holidays' },
        { label: 'Leave Management', icon: 'i-lucide-plane', to: '/hris/leaves' },
        { label: 'Reimbursement', icon: 'i-lucide-receipt', to: '/hris/reimbursement' },
        { label: 'Recruitment', icon: 'i-lucide-user-search', to: '/hris/recruitment' }
      ]
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ]
}
