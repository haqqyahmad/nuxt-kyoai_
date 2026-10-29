<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { toDepartmentMenuKey } from '~/constants/menu'

type Department = {
  id: string
  name: string
  code: string
}

type Patient = {
  id: string | number
  PatientId?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
}

type ExamResult = {
  id: string
  queueCode: string
  registrationNo?: string | null
  queueEntryId: string
  patient?: Patient | null
  item?: {
    id: string
    name?: string | null
    code?: string | null
    department?: Department | null
    roomType?: Department | null
    sampleCode?: string | null
    sampleName?: string | null
  } | null
  resultTiming?: 'inline' | 'deferred'
  status?: 'pending' | 'completed'
  resultStatus?: string | null
  departmentResultStatus?: string | null
  departmentCurrentStepOrder?: number | null
  itemApproved?: boolean | null
  itemApprovedAt?: string | null
  isExternalResult?: boolean | null
  externalStatus?: string | null
  openRevision?: boolean | null
  checkinAt?: string | null
  examDate?: string | null
  completedAt?: string | null
  createdAt?: string
  exam?: {
    id: string
  } | null
}

type StatusGroupKey = 'all' | 'needs_action' | 'pending_approval' | 'returned' | 'external' | 'approved'
type StatusGroup = Exclude<StatusGroupKey, 'all'>

type ExamGroup = {
  examId: string
  registrationNo: string
  patient: Patient | null
  items: ExamResult[]
  submittedCount: number
  approvedCount: number
  departments: Department[]
  status: string
  statusGroup: StatusGroup
  examDate?: string | null
  checkinAt?: string | null
}

type ItemSection = {
  key: string
  sampleCode: string | null
  sampleName: string | null
  items: ExamResult[]
}

const PAGE_SIZE = 100
const MAX_ROWS = 2000

const api = useApi()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { isExternalDoctor, allowedResultDepartments, isSuperAdmin } = await useCurrentUser()
const { roomTypes, pending: roomTypesPending } = await useRoomTypes()

const loading = ref(false)
const results = ref<ExamResult[]>([])
const serverTotal = ref(0)
const truncated = ref(false)

const departmentFilter = ref<string>('all')
const roomTypeFilter = ref<string>('all')
const statusGroup = ref<StatusGroupKey>('all')
const resultTypeFilter = ref<'inline' | 'deferred' | 'all'>('all')
const dateFromFilter = ref<string>('')
const dateToFilter = ref<string>('')
const searchQuery = ref<string>('')

const page = ref(1)
const limit = ref(10)
const filtersOpen = ref(false)
const expandedGroups = ref<string[]>([])

const departments = ref<Department[]>([])
const departmentsLoading = ref(false)

const initialExamId = ref('')
const initialRegistrationId = ref('')
const isBootstrapping = ref(true)
const isApplyingMenuDepartment = ref(false)
const menuDepartmentCode = ref<string | null>(null)

const menuDepartmentCodes: Record<string, string> = {
  lab: 'LAB',
  radiology: 'RAD',
  nurse: 'NURSE',
  dokter: 'DOK',
  dental: 'DENTAL'
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
let loadToken = 0

const departmentItems = computed(() => [
  { label: 'All Departments', value: 'all' },
  ...departments.value.map(department => ({ label: department.name, value: department.id }))
])

const roomTypeItems = computed(() => [
  { label: 'All Room Types', value: 'all' },
  ...roomTypes.value.map(roomType => ({
    label: `${roomType.code} - ${roomType.name}`,
    value: roomType.id
  }))
])

const statusGroupOrder: StatusGroup[] = ['needs_action', 'pending_approval', 'returned', 'external', 'approved']

const dateRangeInvalid = computed(() => Boolean(
  dateFromFilter.value
  && dateToFilter.value
  && dateFromFilter.value > dateToFilter.value
))

const activeFilterCount = computed(() => {
  let count = 0
  if (departmentFilter.value !== 'all') count++
  if (roomTypeFilter.value !== 'all') count++
  if (resultTypeFilter.value !== 'all') count++
  if (statusGroup.value !== 'all') count++
  if (dateFromFilter.value) count++
  if (dateToFilter.value) count++
  if (searchQuery.value.trim()) count++
  return count
})

const showDepartmentColumn = computed(() => departmentFilter.value === 'all' && !menuDepartmentCode.value)

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }
  return fallback
}

function formatPatientName(patient?: Patient | null) {
  if (!patient) return '-'
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ') || '-'
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date)
}

function getStatusColor(status?: string) {
  if (status === 'completed' || status === 'DEPARTMENT_APPROVED' || status === 'SUBMITTED_TO_DOCTOR') return 'success'
  if (status === 'pending' || status === 'DEPARTMENT_REVIEW' || status === 'SUBMITTED' || status === 'PARTIAL') return 'warning'
  if (status === 'DEPARTMENT_RETURNED') return 'warning'
  if (status === 'EXTERNAL_PROCESSING') return 'warning'
  if (status === 'EXTERNAL_RETURNED') return 'error'
  if (status === 'EXTERNAL_ASSIGNED') return 'neutral'
  if (status === 'RETURNED_TO_DEPARTMENT' || status === 'RETURNED') return 'error'
  if (status === 'DRAFT' || status === 'READY' || status === 'NOT_READY') return 'neutral'
  return 'neutral'
}

function getStatusLabel(status?: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'pending') return 'Pending'
  if (status === 'DEPARTMENT_REVIEW') return 'Pending Approval'
  if (status === 'DEPARTMENT_APPROVED') return 'Approved'
  if (status === 'SUBMITTED_TO_DOCTOR') return 'Approved · Sent to Doctor'
  if (status === 'RETURNED_TO_DEPARTMENT') return 'Returned'
  if (status === 'DEPARTMENT_RETURNED') return 'Dept Returned'
  if (status === 'EXTERNAL_ASSIGNED') return 'Waiting External Doctor'
  if (status === 'EXTERNAL_PROCESSING') return 'External Doctor Working'
  if (status === 'EXTERNAL_RETURNED') return 'Returned to External Doctor'
  if (status === 'SUBMITTED') return 'Pending Approval'
  if (status === 'PARTIAL') return 'Partially Submitted'
  if (status === 'READY') return 'Ready'
  if (status === 'NOT_READY') return 'Not Ready'
  if (status === 'RETURNED') return 'Returned'
  if (status === 'DRAFT') return 'Draft'
  return status || '-'
}

function getRowStatus(result: ExamResult) {
  const itemStatus = result.resultStatus
  if (!itemStatus) return result.departmentResultStatus || result.status || ''
  if (result.isExternalResult) {
    if (result.externalStatus === 'PROCESSING') return 'EXTERNAL_PROCESSING'
    if (result.externalStatus === 'ASSIGNED') {
      return result.openRevision ? 'EXTERNAL_RETURNED' : 'EXTERNAL_ASSIGNED'
    }
  }
  if (itemStatus !== 'SUBMITTED') return itemStatus

  const departmentStatus = result.departmentResultStatus
  if (result.itemApproved) {
    return departmentStatus === 'SUBMITTED_TO_DOCTOR' ? 'SUBMITTED_TO_DOCTOR' : 'DEPARTMENT_APPROVED'
  }
  const isLabRow = String(result.item?.department?.code ?? '').toUpperCase() === 'LAB'
  if (!isLabRow) return 'SUBMITTED'
  if (departmentStatus === 'RETURNED_TO_DEPARTMENT') return 'DEPARTMENT_RETURNED'
  return departmentStatus || 'SUBMITTED'
}

function getTypeLabel(type?: string) {
  if (type === 'inline') return 'Inline'
  if (type === 'deferred') return 'Deferred'
  return '-'
}

function getDepartmentLabel(department?: Department | null) {
  if (!department) return '-'
  return `${department.code} - ${department.name}`
}

function getQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? '')
  if (typeof value === 'string') return value
  return ''
}

function statusGroupOf(status?: string | null): StatusGroup {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'EXTERNAL_ASSIGNED' || normalized === 'EXTERNAL_PROCESSING') return 'external'
  if (
    normalized === 'RETURNED'
    || normalized === 'DEPARTMENT_RETURNED'
    || normalized === 'RETURNED_TO_DEPARTMENT'
    || normalized === 'EXTERNAL_RETURNED'
  ) {
    return 'returned'
  }
  if (
    normalized === 'SUBMITTED'
    || normalized === 'DEPARTMENT_REVIEW'
    || normalized === 'PARTIAL'
    || normalized === 'PENDING'
  ) {
    return 'pending_approval'
  }
  if (
    normalized === 'DEPARTMENT_APPROVED'
    || normalized === 'SUBMITTED_TO_DOCTOR'
    || normalized === 'COMPLETED'
  ) {
    return 'approved'
  }
  return 'needs_action'
}

const groupStatusPriority = [
  'EXTERNAL_RETURNED',
  'RETURNED',
  'RETURNED_TO_DEPARTMENT',
  'DEPARTMENT_RETURNED',
  'SUBMITTED',
  'DEPARTMENT_REVIEW',
  'PARTIAL',
  'EXTERNAL_ASSIGNED',
  'EXTERNAL_PROCESSING',
  'NOT_READY',
  'DRAFT',
  'READY',
  'DEPARTMENT_APPROVED',
  'SUBMITTED_TO_DOCTOR',
  'completed',
  'pending'
]

function combineGroupStatus(items: ExamResult[]) {
  const statuses = items.map(item => getRowStatus(item))
  for (const candidate of groupStatusPriority) {
    if (statuses.includes(candidate)) return candidate
  }
  return statuses[0] ?? 'NOT_READY'
}

const groups = computed<ExamGroup[]>(() => {
  const grouped = new Map<string, ExamResult[]>()
  for (const result of results.value) {
    const key = result.exam?.id || result.queueEntryId || result.registrationNo || result.id
    const bucket = grouped.get(key)
    if (bucket) bucket.push(result)
    else grouped.set(key, [result])
  }

  return [...grouped.entries()].map(([examId, items]) => {
    const first = items[0] as ExamResult
    const status = combineGroupStatus(items)
    const departmentMap = new Map<string, Department>()
    for (const item of items) {
      if (item.item?.department?.id) {
        departmentMap.set(item.item.department.id, item.item.department)
      }
    }
    return {
      examId,
      registrationNo: first.registrationNo || first.queueCode || '-',
      patient: first.patient ?? null,
      items,
      submittedCount: items.filter(item => item.resultStatus === 'SUBMITTED').length,
      approvedCount: items.filter((item) => {
        const rowStatus = getRowStatus(item)
        return rowStatus === 'DEPARTMENT_APPROVED' || rowStatus === 'SUBMITTED_TO_DOCTOR'
      }).length,
      departments: [...departmentMap.values()],
      status,
      statusGroup: statusGroupOf(status),
      examDate: first.examDate ?? null,
      checkinAt: first.checkinAt ?? first.createdAt ?? null
    }
  })
})

const statusCounts = computed<Record<StatusGroupKey, number>>(() => {
  const counts: Record<StatusGroupKey, number> = {
    all: 0,
    needs_action: 0,
    pending_approval: 0,
    returned: 0,
    external: 0,
    approved: 0
  }
  for (const group of groups.value) {
    counts.all++
    counts[group.statusGroup]++
  }
  return counts
})

const statusTabs = computed(() => {
  const labels: Record<StatusGroupKey, string> = {
    all: 'All',
    needs_action: 'Needs action',
    pending_approval: 'Pending approval',
    returned: 'Returned',
    external: 'External',
    approved: 'Approved'
  }
  return (['all', ...statusGroupOrder] as StatusGroupKey[]).map(key => ({
    key,
    label: labels[key],
    count: statusCounts.value[key]
  }))
})

const filteredGroups = computed(() => statusGroup.value === 'all'
  ? groups.value
  : groups.value.filter(group => group.statusGroup === statusGroup.value))

const totalPages = computed(() => Math.max(1, Math.ceil(filteredGroups.value.length / limit.value)))

const pageStart = computed(() => filteredGroups.value.length ? (page.value - 1) * limit.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * limit.value, filteredGroups.value.length))

const pagedGroups = computed(() => {
  const start = (page.value - 1) * limit.value
  return filteredGroups.value.slice(start, start + limit.value)
})

function progressPercent(group: ExamGroup) {
  if (!group.items.length) return 0
  return Math.round((group.submittedCount / group.items.length) * 100)
}

function groupPrimaryItem(group: ExamGroup) {
  const actionable = group.items.find((item) => {
    const key = statusGroupOf(getRowStatus(item))
    return key === 'needs_action' || key === 'returned' || key === 'external'
  })
  if (actionable) return actionable
  return group.items.find(item => statusGroupOf(getRowStatus(item)) === 'pending_approval') ?? group.items[0]
}

function itemSections(group: ExamGroup): ItemSection[] {
  const sections: ItemSection[] = []
  const sectionMap = new Map<string, ItemSection>()
  for (const item of group.items) {
    const sampleCode = item.item?.sampleCode ?? null
    const sampleName = item.item?.sampleName ?? null
    const key = `${sampleCode ?? ''}|${sampleName ?? ''}`
    let section = sectionMap.get(key)
    if (!section) {
      section = { key: `section-${sections.length}`, sampleCode, sampleName, items: [] }
      sectionMap.set(key, section)
      sections.push(section)
    }
    section.items.push(item)
  }
  return sections
}

function toggleGroup(examId: string) {
  const index = expandedGroups.value.indexOf(examId)
  if (index >= 0) expandedGroups.value.splice(index, 1)
  else expandedGroups.value.push(examId)
}

function isExpanded(examId: string) {
  return expandedGroups.value.includes(examId)
}

function applyRouteFilters() {
  const department = getQueryValue(route.query.department).toLowerCase()
  const departmentId = getQueryValue(route.query.departmentId)
  const resultTiming = getQueryValue(route.query.resultTiming)
  const requestedStatusGroup = getQueryValue(route.query.statusGroup)
  const requestedPage = Number(getQueryValue(route.query.page))

  menuDepartmentCode.value = menuDepartmentCodes[department] ?? null
  departmentFilter.value = departmentId || 'all'
  roomTypeFilter.value = getQueryValue(route.query.roomTypeId) || 'all'
  resultTypeFilter.value = resultTiming === 'inline' || resultTiming === 'deferred' ? resultTiming : 'all'
  statusGroup.value = ['needs_action', 'pending_approval', 'returned', 'external', 'approved'].includes(requestedStatusGroup)
    ? requestedStatusGroup as StatusGroupKey
    : 'all'
  dateFromFilter.value = getQueryValue(route.query.dateFrom)
  dateToFilter.value = getQueryValue(route.query.dateTo)
  searchQuery.value = getQueryValue(route.query.search)
  page.value = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1
  initialExamId.value = getQueryValue(route.query.examId)
  initialRegistrationId.value = getQueryValue(route.query.registrationId)
}

function applyMenuDepartmentSelection() {
  if (!menuDepartmentCode.value) return
  const matched = departments.value.find(
    department => department.code.toUpperCase() === menuDepartmentCode.value
  )
  departmentFilter.value = matched?.id || 'all'
}

function updateMenuDepartmentFromSelection() {
  const selected = departments.value.find(department => department.id === departmentFilter.value)
  const selectedCode = selected?.code?.toUpperCase() || ''
  menuDepartmentCode.value = Object.values(menuDepartmentCodes).includes(selectedCode) ? selectedCode : null
}

function syncRouteFilters() {
  const query: Record<string, string> = {}
  const menuDepartment = Object.entries(menuDepartmentCodes).find(
    ([, code]) => code === menuDepartmentCode.value
  )?.[0]

  if (menuDepartment) query.department = menuDepartment
  else if (departmentFilter.value !== 'all') query.departmentId = departmentFilter.value
  if (roomTypeFilter.value !== 'all') query.roomTypeId = roomTypeFilter.value
  if (statusGroup.value !== 'all') query.statusGroup = statusGroup.value
  if (resultTypeFilter.value !== 'all') query.resultTiming = resultTypeFilter.value
  if (dateFromFilter.value) query.dateFrom = dateFromFilter.value
  if (dateToFilter.value) query.dateTo = dateToFilter.value
  if (searchQuery.value.trim()) query.search = searchQuery.value.trim()
  if (page.value > 1) query.page = String(page.value)
  if (initialExamId.value) query.examId = initialExamId.value
  if (initialRegistrationId.value) query.registrationId = initialRegistrationId.value

  void router.replace({ query })
}

async function loadDepartments() {
  departmentsLoading.value = true
  try {
    if (!isSuperAdmin.value) {
      departments.value = allowedResultDepartments.value
        .filter((department): department is Department => Boolean(
          department.id && department.code && department.name
        ))
      return
    }

    const res = await api.get('/medical/departments')
    departments.value = res.data?.data || res.data || []
  } catch (error) {
    toast.add({
      title: 'Failed to load departments',
      description: getErrorMessage(error, 'Could not load departments'),
      color: 'error'
    })
  } finally {
    departmentsLoading.value = false
  }
}

function buildListParams() {
  const params: Record<string, unknown> = { view: 'list' }

  if (departmentFilter.value !== 'all') {
    params.departmentId = departmentFilter.value
  } else if (menuDepartmentCode.value) {
    params.departmentCode = menuDepartmentCode.value
  }

  if (roomTypeFilter.value !== 'all') params.roomTypeId = roomTypeFilter.value
  if (resultTypeFilter.value !== 'all') params.resultTiming = resultTypeFilter.value
  if (dateFromFilter.value) params.dateFrom = dateFromFilter.value
  if (dateToFilter.value) params.dateTo = dateToFilter.value
  if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
  if (initialExamId.value) params.examId = initialExamId.value
  if (initialRegistrationId.value) params.registrationId = initialRegistrationId.value

  return params
}

async function loadResults() {
  const token = ++loadToken
  loading.value = true
  try {
    const params = buildListParams()
    const collected: ExamResult[] = []
    let total = 0
    let fetchPage = 1

    while (collected.length < MAX_ROWS) {
      const res = await api.get('/mcu/exams/results', {
        params: { ...params, page: fetchPage, limit: PAGE_SIZE }
      })
      const payload = res.data?.data ?? res.data
      const rows: ExamResult[] = Array.isArray(payload) ? payload : (payload?.data ?? [])
      const meta = res.data?.meta ?? payload?.meta ?? {}

      total = Number(meta.total ?? rows.length)
      collected.push(...rows)

      if (rows.length < PAGE_SIZE || collected.length >= total) break
      fetchPage++
    }

    if (token !== loadToken) return

    serverTotal.value = total
    truncated.value = collected.length >= MAX_ROWS && total > collected.length
    results.value = collected.slice(0, MAX_ROWS)

    if (initialExamId.value) {
      const matched = results.value.find(result => result.exam?.id === initialExamId.value)
      if (matched) {
        initialExamId.value = ''
        void viewDetail(matched)
      }
    }
  } catch (error) {
    if (token !== loadToken) return
    results.value = []
    serverTotal.value = 0
    truncated.value = false
    toast.add({
      title: 'Failed to load results',
      description: getErrorMessage(error, 'Could not load exam results'),
      color: 'error'
    })
  } finally {
    if (token === loadToken) loading.value = false
  }
}

async function viewDetail(result: ExamResult) {
  const departmentCode = toDepartmentMenuKey(result.item?.department?.code)
    || getQueryValue(route.query.department)

  await router.push({
    path: `/result/exam-results/${result.id}`,
    query: isExternalDoctor.value
      ? {}
      : {
          department: departmentCode,
          examId: result.exam?.id || '',
          ...(result.item?.roomType?.id ? { roomTypeId: result.item.roomType.id } : {})
        }
  })
}

function openGroup(group: ExamGroup) {
  const target = groupPrimaryItem(group)
  if (target) void viewDetail(target)
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function applyDatePreset(preset: 'today' | '7d' | '30d' | 'month') {
  const today = new Date()
  const end = formatInputDate(today)

  if (preset === 'today') {
    dateFromFilter.value = end
    dateToFilter.value = end
    return
  }

  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    dateFromFilter.value = formatInputDate(start)
    dateToFilter.value = end
    return
  }

  const start = new Date(today)
  start.setDate(start.getDate() - (preset === '7d' ? 6 : 29))
  dateFromFilter.value = formatInputDate(start)
  dateToFilter.value = end
}

async function resetFilters() {
  if (searchTimer) clearTimeout(searchTimer)
  isBootstrapping.value = true
  menuDepartmentCode.value = null
  departmentFilter.value = 'all'
  roomTypeFilter.value = 'all'
  statusGroup.value = 'all'
  resultTypeFilter.value = 'all'
  dateFromFilter.value = ''
  dateToFilter.value = ''
  searchQuery.value = ''
  initialExamId.value = ''
  initialRegistrationId.value = ''
  page.value = 1
  expandedGroups.value = []
  await nextTick()
  isBootstrapping.value = false
  await router.replace({ query: {} })
  await loadResults()
}

watch(searchQuery, () => {
  if (isBootstrapping.value) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    syncRouteFilters()
    void loadResults()
  }, 350)
})

watch([departmentFilter, roomTypeFilter, resultTypeFilter, dateFromFilter, dateToFilter], async () => {
  if (isBootstrapping.value || isApplyingMenuDepartment.value) return
  if (dateRangeInvalid.value) return
  updateMenuDepartmentFromSelection()
  page.value = 1
  syncRouteFilters()
  await loadResults()
})

watch(statusGroup, () => {
  if (isBootstrapping.value) return
  page.value = 1
  syncRouteFilters()
})

watch(page, () => {
  if (isBootstrapping.value) return
  syncRouteFilters()
})

watch(limit, () => {
  if (isBootstrapping.value) return
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

watch(
  () => getQueryValue(route.query.department),
  async (department) => {
    if (isBootstrapping.value) return

    const nextDepartmentCode = menuDepartmentCodes[department.toLowerCase()] || null
    if (nextDepartmentCode === menuDepartmentCode.value) return

    isApplyingMenuDepartment.value = true
    menuDepartmentCode.value = nextDepartmentCode
    departmentFilter.value = 'all'
    applyMenuDepartmentSelection()
    page.value = 1
    await nextTick()
    isApplyingMenuDepartment.value = false
    await loadResults()
  }
)

onMounted(async () => {
  applyRouteFilters()
  await loadDepartments()
  applyMenuDepartmentSelection()
  await loadResults()
  isBootstrapping.value = false
})
</script>

<template>
  <UDashboardPanel id="exam-results">
    <template #header>
      <AppNavbar
        :title="isExternalDoctor ? 'External Doctor Workspace' : 'Exam Results Management'"
        :subtitle="isExternalDoctor ? 'Examinations assigned to you' : 'Manage inline and deferred exam results'"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="loading || departmentsLoading"
            @click="loadResults"
          >
            Refresh
          </UButton>
        </template>
      </AppNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="isExternalDoctor"
          icon="i-lucide-stethoscope"
          color="info"
          variant="soft"
          title="External Doctor Workspace"
          description="Only examinations assigned to your account are shown. Fill in results, save draft, then submit."
        />

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold">
                  Filters
                </h3>
                <UBadge
                  v-if="activeFilterCount"
                  :label="String(activeFilterCount)"
                  color="primary"
                  variant="subtle"
                  size="sm"
                />
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  v-if="activeFilterCount"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  @click="resetFilters"
                >
                  Reset All
                </UButton>
                <UButton
                  class="md:hidden"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-filter"
                  :aria-expanded="filtersOpen"
                  @click="filtersOpen = !filtersOpen"
                >
                  {{ filtersOpen ? 'Hide' : 'Show' }}
                </UButton>
              </div>
            </div>
          </template>

          <div :class="filtersOpen ? 'block' : 'hidden md:block'">
            <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <UFormField label="Search" class="sm:col-span-2 lg:col-span-1">
                <div class="flex w-full gap-2">
                  <UInput
                    v-model="searchQuery"
                    placeholder="Patient, reg. no., item..."
                    icon="i-lucide-search"
                    class="flex-1"
                  />
                  <UButton
                    v-if="searchQuery"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="soft"
                    aria-label="Clear search"
                    @click="searchQuery = ''"
                  />
                </div>
              </UFormField>

              <UFormField v-if="!isExternalDoctor" label="Department">
                <USelect
                  v-model="departmentFilter"
                  :items="departmentItems"
                  :loading="departmentsLoading"
                  class="w-full"
                />
              </UFormField>

              <UFormField v-if="!isExternalDoctor" label="Room Type">
                <USelect
                  v-model="roomTypeFilter"
                  :items="roomTypeItems"
                  :loading="roomTypesPending"
                  placeholder="Select room type"
                  class="w-full"
                />
              </UFormField>

              <UFormField v-if="!isExternalDoctor" label="Result Type">
                <USelect
                  v-model="resultTypeFilter"
                  :items="[
                    { label: 'All Types', value: 'all' },
                    { label: 'Inline', value: 'inline' },
                    { label: 'Deferred', value: 'deferred' }
                  ]"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-if="!isExternalDoctor"
                label="Exam Date"
                class="sm:col-span-2"
                :error="dateRangeInvalid ? 'From date must be on or before To date.' : undefined"
              >
                <div class="flex w-full flex-col gap-2">
                  <div class="flex w-full gap-2">
                    <UInput
                      v-model="dateFromFilter"
                      type="date"
                      size="sm"
                      class="flex-1"
                      :max="dateToFilter || undefined"
                      aria-label="From date"
                    />
                    <UInput
                      v-model="dateToFilter"
                      type="date"
                      size="sm"
                      class="flex-1"
                      :min="dateFromFilter || undefined"
                      aria-label="To date"
                    />
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="applyDatePreset('today')"
                    >
                      Today
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="applyDatePreset('7d')"
                    >
                      Last 7 days
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="applyDatePreset('30d')"
                    >
                      Last 30 days
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="applyDatePreset('month')"
                    >
                      This month
                    </UButton>
                  </div>
                </div>
              </UFormField>
            </div>
          </div>
        </UCard>

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold">
                  Results
                  <span class="text-sm font-normal text-muted">({{ filteredGroups.length }})</span>
                </h3>
                <p class="text-xs text-muted">
                  {{ results.length }} of {{ serverTotal || results.length }} items loaded
                </p>
              </div>
              <UButton
                v-if="activeFilterCount && !loading && results.length"
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="resetFilters"
              >
                Reset filters
              </UButton>
            </div>
          </template>

          <UAlert
            v-if="truncated"
            icon="i-lucide-info"
            color="warning"
            variant="soft"
            title="Partial data shown"
            description="Only the first 2,000 items are loaded. Narrow your filters or search to see the rest."
            class="mb-4"
          />

          <div class="mb-4 flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="tab in statusTabs"
              :key="tab.key"
              type="button"
              class="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition"
              :class="statusGroup === tab.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-default/70 text-muted hover:bg-muted/40 hover:text-highlighted'"
              @click="statusGroup = tab.key"
            >
              {{ tab.label }}
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                :class="statusGroup === tab.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted'"
              >{{ tab.count }}</span>
            </button>
          </div>

          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="i in 6" :key="i" class="h-14 rounded-lg" />
          </div>

          <div
            v-else-if="!filteredGroups.length"
            class="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 p-8 text-center"
          >
            <UIcon name="i-lucide-inbox" class="mb-3 size-10 text-muted" />
            <h3 class="text-base font-semibold text-highlighted">
              No results found
            </h3>
            <p class="mt-1 max-w-lg text-sm text-muted">
              {{ isExternalDoctor
                ? 'No examinations assigned to you match these filters.'
                : 'No exam results match your filter criteria. Try adjusting your filters.' }}
            </p>
            <UButton
              class="mt-4"
              size="sm"
              color="neutral"
              variant="soft"
              @click="resetFilters"
            >
              Reset filters
            </UButton>
          </div>

          <div v-else class="hidden overflow-x-auto md:block">
            <table class="w-full">
              <thead>
                <tr class="border-b border-default/70 bg-elevated/40">
                  <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Patient / Registration No.
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Exam
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Progress
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Status
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Exam Date
                  </th>
                  <th class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default/50">
                <template v-for="group in pagedGroups" :key="group.examId">
                  <tr
                    class="cursor-pointer transition hover:bg-muted/40"
                    @click="toggleGroup(group.examId)"
                  >
                    <td class="px-3 py-3 text-sm">
                      <div class="flex items-start gap-2">
                        <UIcon
                          :name="isExpanded(group.examId) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                          class="mt-0.5 size-4 shrink-0 text-muted"
                        />
                        <div class="min-w-0">
                          <p
                            class="max-w-[200px] truncate font-medium text-highlighted"
                            :title="formatPatientName(group.patient)"
                          >
                            {{ formatPatientName(group.patient) }}
                          </p>
                          <p class="whitespace-nowrap text-xs text-muted">
                            {{ group.patient?.PatientId || '-' }}
                          </p>
                          <p class="whitespace-nowrap text-xs text-muted">
                            {{ group.registrationNo }}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-sm">
                      <p class="font-medium text-highlighted">
                        {{ group.items.length }} item{{ group.items.length === 1 ? '' : 's' }}
                      </p>
                      <p class="max-w-[220px] truncate text-xs text-muted">
                        {{ group.items.slice(0, 2).map(item => item.item?.name || '-').join(', ') }}{{ group.items.length > 2 ? ` +${group.items.length - 2}` : '' }}
                      </p>
                      <p v-if="showDepartmentColumn" class="max-w-[220px] truncate text-xs text-muted">
                        {{ group.departments.length ? group.departments.map(department => department.code).join(' · ') : '-' }}
                      </p>
                    </td>
                    <td class="px-3 py-3 text-sm">
                      <div class="flex items-center gap-2">
                        <div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            class="h-full rounded-full bg-primary"
                            :style="{ width: `${progressPercent(group)}%` }"
                          />
                        </div>
                        <span class="text-xs text-muted">{{ progressPercent(group) }}%</span>
                      </div>
                      <p class="mt-1 text-xs text-muted">
                        {{ group.submittedCount }}/{{ group.items.length }} submitted
                      </p>
                    </td>
                    <td class="px-3 py-3 text-sm">
                      <UBadge
                        :label="getStatusLabel(group.status)"
                        :color="getStatusColor(group.status)"
                        variant="subtle"
                      />
                    </td>
                    <td class="whitespace-nowrap px-3 py-3 text-sm text-muted">
                      {{ formatDate(group.examDate || group.checkinAt) }}
                    </td>
                    <td class="px-3 py-3 text-right" @click.stop>
                      <UButton
                        size="xs"
                        color="primary"
                        variant="soft"
                        @click="openGroup(group)"
                      >
                        View
                      </UButton>
                    </td>
                  </tr>
                  <tr v-if="isExpanded(group.examId)">
                    <td colspan="6" class="bg-muted/20 px-4 py-3">
                      <div class="flex flex-col gap-3">
                        <template v-for="section in itemSections(group)" :key="section.key">
                          <div class="flex flex-col gap-1.5">
                            <p
                              v-if="section.sampleCode || section.sampleName"
                              class="text-[11px] font-bold uppercase tracking-wide text-primary"
                            >
                              {{ section.sampleCode }}{{ section.sampleCode && section.sampleName ? ' — ' : '' }}{{ section.sampleName }}
                            </p>
                            <button
                              v-for="item in section.items"
                              :key="item.id"
                              type="button"
                              class="flex items-center justify-between gap-3 rounded-lg border border-default/60 bg-default px-3 py-2 text-left transition hover:bg-muted/40"
                              @click="viewDetail(item)"
                            >
                              <span class="min-w-0 flex-1">
                                <span class="block truncate text-sm font-medium text-highlighted">
                                  {{ item.item?.name || '-' }}
                                </span>
                                <span class="block truncate text-xs text-muted">
                                  {{ item.item?.code || '-' }}
                                  · {{ getDepartmentLabel(item.item?.department) }}
                                  · {{ getTypeLabel(item.resultTiming) }}
                                </span>
                              </span>
                              <UBadge
                                :label="getStatusLabel(getRowStatus(item))"
                                :color="getStatusColor(getRowStatus(item))"
                                variant="subtle"
                                class="shrink-0"
                              />
                            </button>
                          </div>
                        </template>
                        <UButton
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          class="self-start"
                          icon="i-lucide-chevron-up"
                          @click="toggleGroup(group.examId)"
                        >
                          Collapse
                        </UButton>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <div v-if="!loading && filteredGroups.length" class="space-y-3 md:hidden">
            <div
              v-for="group in pagedGroups"
              :key="group.examId"
              class="overflow-hidden rounded-xl border border-default/70 bg-default"
            >
              <div class="space-y-2 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-highlighted">
                      {{ formatPatientName(group.patient) }}
                    </p>
                    <p class="truncate text-xs text-muted">
                      {{ group.registrationNo }} · {{ group.patient?.PatientId || '-' }}
                    </p>
                  </div>
                  <UBadge
                    :label="getStatusLabel(group.status)"
                    :color="getStatusColor(group.status)"
                    variant="subtle"
                    class="shrink-0"
                  />
                </div>

                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{{ group.items.length }} item{{ group.items.length === 1 ? '' : 's' }}</span>
                  <span>·</span>
                  <span>{{ formatDate(group.examDate || group.checkinAt) }}</span>
                  <template v-if="group.departments.length">
                    <span>·</span>
                    <span>{{ group.departments.map(department => department.code).join(' · ') }}</span>
                  </template>
                </div>

                <div class="flex items-center gap-2">
                  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full bg-primary"
                      :style="{ width: `${progressPercent(group)}%` }"
                    />
                  </div>
                  <span class="text-xs text-muted">{{ progressPercent(group) }}%</span>
                </div>
                <p class="text-xs text-muted">
                  {{ group.submittedCount }}/{{ group.items.length }} submitted · {{ group.approvedCount }} approved
                </p>

                <div class="flex gap-2 pt-1">
                  <UButton
                    block
                    size="sm"
                    color="primary"
                    variant="soft"
                    @click="openGroup(group)"
                  >
                    View result
                  </UButton>
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="soft"
                    :icon="isExpanded(group.examId) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    :aria-label="isExpanded(group.examId) ? 'Collapse items' : 'Expand items'"
                    @click="toggleGroup(group.examId)"
                  >
                    Items
                  </UButton>
                </div>
              </div>

              <div v-if="isExpanded(group.examId)" class="space-y-3 border-t border-default/60 p-4">
                <template v-for="section in itemSections(group)" :key="section.key">
                  <div class="space-y-1.5">
                    <p
                      v-if="section.sampleCode || section.sampleName"
                      class="text-[11px] font-bold uppercase tracking-wide text-primary"
                    >
                      {{ section.sampleCode }}{{ section.sampleCode && section.sampleName ? ' — ' : '' }}{{ section.sampleName }}
                    </p>
                    <button
                      v-for="item in section.items"
                      :key="item.id"
                      type="button"
                      class="flex w-full items-start justify-between gap-3 rounded-lg border border-default/60 bg-elevated/30 px-3 py-2 text-left transition hover:bg-muted/40"
                      @click="viewDetail(item)"
                    >
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium text-highlighted">
                          {{ item.item?.name || '-' }}
                        </span>
                        <span class="block truncate text-xs text-muted">
                          {{ item.item?.code || '-' }} · {{ getTypeLabel(item.resultTiming) }}
                        </span>
                      </span>
                      <UBadge
                        :label="getStatusLabel(getRowStatus(item))"
                        :color="getStatusColor(getRowStatus(item))"
                        variant="subtle"
                        class="shrink-0"
                      />
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </UCard>

        <div
          v-if="filteredGroups.length > 0"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default/80 bg-default/50 p-4"
        >
          <div class="flex flex-wrap items-center gap-3">
            <USelect
              v-model="limit"
              :items="[
                { label: '10 / page', value: 10 },
                { label: '20 / page', value: 20 },
                { label: '50 / page', value: 50 }
              ]"
              class="w-36"
              size="sm"
            />
            <p class="text-sm text-muted">
              Showing {{ pageStart }} – {{ pageEnd }} of {{ filteredGroups.length }} exam{{ filteredGroups.length === 1 ? '' : 's' }}
            </p>
          </div>
          <UPagination
            v-model:page="page"
            :items-per-page="limit"
            :total="filteredGroups.length"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
