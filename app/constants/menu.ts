import type { NavigationMenuItem } from '@nuxt/ui'

export type MenuItem = NavigationMenuItem

export const restrictedAllowedRoutes: string[] = [
  '/',
  '/rooms/assignments',
  '/rooms/queue',
  '/rooms/sample-collection',
  '/rooms/exam-results',
  '/rooms/queue-work',
  '/settings',
  '/settings/roles',
  '/settings/permissions',
  '/settings/security',
  '/settings/members',
  '/settings/notifications'
]

export const externalDoctorAllowedRoutes: string[] = [
  '/rooms/exam-results',
  '/settings',
  '/settings/security'
]

export const restrictedRoles: string[] = [
  'petugas-lab',
  'petugas-radiologi',
  'dokter',
  'nurse'
]

export const externalRoles: string[] = [
  'dokter-external'
]

export function buildMenuTree(): MenuItem[] {
  return [
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
            { label: 'Medical', icon: 'i-lucide-stethoscope', to: '/departments/medical' },
            { label: 'Non Medical', icon: 'i-lucide-building', to: '/departments' }
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
        {
          label: 'Hasil Exam Lab',
          to: '/rooms/exam-results?department=lab',
          resultDepartmentCode: 'LAB'
        },
        {
          label: 'Hasil Exam Radiology',
          to: '/rooms/exam-results?department=radiology',
          resultDepartmentCode: 'RAD'
        },
        {
          label: 'Hasil Exam Nurse',
          to: '/rooms/exam-results?department=nurse',
          resultDepartmentCode: 'NURSE'
        },
        {
          label: 'Hasil Exam Dokter',
          to: '/rooms/exam-results?department=dokter',
          resultDepartmentCode: 'DOK'
        },
        {
          label: 'Hasil Exam Dental',
          to: '/rooms/exam-results?department=dental',
          resultDepartmentCode: 'DENTAL'
        }
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
}
