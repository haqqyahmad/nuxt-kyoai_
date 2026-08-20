<script setup lang="ts">
import { ref, computed, watch } from 'vue'

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
  queueEntryId: string
  patient?: Patient | null
  item?: {
    id: string
    name?: string | null
    code?: string | null
    department?: Department | null
    roomType?: Department | null
    inputans?: Array<{
      id: string
      label: string
      inputType: 'number' | 'string' | 'selected' | 'calculated'
      uom?: string | null
      allowBlank?: boolean
      opsis?: Array<{
        id: string
        label: string
        value: string
      }>
      nilaiNormalNum?: Array<{
        id: string
        gender?: string | null
        ageMin?: number | null
        ageMax?: number | null
        normalLow?: number | null
        normalHigh?: number | null
        criticalLow?: number | null
        criticalHigh?: number | null
      }>
      nilaiNormalSel?: Array<{
        id: string
        gender?: string | null
        ageMin?: number | null
        ageMax?: number | null
        opsi?: {
          id: string
          label: string
          value: string
        } | null
      }>
    }>
  } | null
  resultTiming?: 'inline' | 'deferred'
  status?: 'pending' | 'completed'
  checkinAt?: string | null
  completedAt?: string | null
  createdAt?: string
  exam?: {
    id: string
    results?: Array<{
      inputanId: string
      valueString?: string | null
      valueNumber?: number | null
      valueSelected?: string | null
      valueCalculated?: number | null
      grading?: 'NORMAL' | 'ABNORMAL_INC' | 'ABNORMAL_DEC' | null
    }>
  } | null
  workHistory?: Array<{
    timestamp: string
    action: string
    actor?: string | null
    details?: string | null
  }>
}

const api = useApi()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { roles, isExternalDoctor, allowedResultDepartments, isSuperAdmin } = await useCurrentUser()
const { roomTypes, pending: roomTypesPending } = await useRoomTypes()

// State
const loading = ref(false)
const results = ref<ExamResult[]>([])

// Filters
const departmentFilter = ref<string>('all')
const roomTypeFilter = ref<string>('all')
const statusFilter = ref<'pending' | 'completed' | 'all'>('all')
const resultTypeFilter = ref<'inline' | 'deferred' | 'all'>('all')
const dateFromFilter = ref<string>('')
const dateToFilter = ref<string>('')
const searchQuery = ref<string>('')

// Pagination
const page = ref(1)
const limit = ref(50)
const total = ref(0)

// Departments list
const departments = ref<Department[]>([])
const departmentsLoading = ref(false)

const departmentItems = computed(() => [
  { label: 'All Departments', value: 'all' },
  ...departments.value.map((d) => ({ label: d.name, value: d.id })),
])

const roomTypeItems = computed(() => [
  { label: 'All Room Types', value: 'all' },
  ...roomTypes.value.map(roomType => ({
    label: `${roomType.code} - ${roomType.name}`,
    value: roomType.id
  }))
])
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
    .join(' ')
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString))
}

function getStatusColor(status?: string) {
  if (status === 'completed' || status === 'DEPARTMENT_APPROVED' || status === 'SUBMITTED_TO_DOCTOR') return 'success'
  if (status === 'pending' || status === 'DEPARTMENT_REVIEW') return 'warning'
  if (status === 'RETURNED_TO_DEPARTMENT') return 'error'
  if (status === 'DRAFT') return 'neutral'
  return 'neutral'
}

function getStatusLabel(status?: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'pending') return 'Pending'
  if (status === 'DEPARTMENT_REVIEW') return 'Menunggu Approval'
  if (status === 'DEPARTMENT_APPROVED') return 'Approved'
  if (status === 'SUBMITTED_TO_DOCTOR') return 'Dikirim ke Dokter'
  if (status === 'RETURNED_TO_DEPARTMENT') return 'Dikembalikan'
  if (status === 'DRAFT') return 'Draft'
  return status || '-'
}

function getTypeLabel(type?: string) {
  if (type === 'inline') return 'Inline'
  if (type === 'deferred') return 'Deferred'
  return '-'
}

function getDepartmentLabel(dept?: Department | null) {
  if (!dept) return '-'
  return `${dept.code} - ${dept.name}`
}

function getResultDate(result: ExamResult) {
  const source = result.checkinAt || result.createdAt || ''
  const date = new Date(source)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

function getQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? '')
  if (typeof value === 'string') return value
  return ''
}

function isStatusMatchFilter(filter: string, status: string) {
  if (filter === 'completed') {
    return ['completed', 'DEPARTMENT_APPROVED', 'SUBMITTED_TO_DOCTOR'].includes(status)
  }
  if (filter === 'pending') {
    return ['pending', 'DRAFT', 'DEPARTMENT_REVIEW', 'RETURNED_TO_DEPARTMENT'].includes(status)
  }
  return true
}

function applyRouteFilters() {
  const departmentId = getQueryValue(route.query.departmentId)
  const department = getQueryValue(route.query.department).toLowerCase()
  const status = getQueryValue(route.query.status)
  const resultTiming = getQueryValue(route.query.resultTiming)
  const roomTypeId = getQueryValue(route.query.roomTypeId)
  const examId = getQueryValue(route.query.examId)
  const registrationId = getQueryValue(route.query.registrationId)

  departmentFilter.value = departmentId || 'all'
  menuDepartmentCode.value = menuDepartmentCodes[department] || null
  statusFilter.value = status === 'pending' || status === 'completed' ? status : 'all'
  resultTypeFilter.value = resultTiming === 'inline' || resultTiming === 'deferred'
    ? resultTiming
    : 'all'
  roomTypeFilter.value = roomTypeId || 'all'
  initialExamId.value = examId
  initialRegistrationId.value = registrationId
}

function applyMenuDepartmentSelection() {
  if (!menuDepartmentCode.value) return

  const matched = departments.value.find(
    department => department.code.toUpperCase() === menuDepartmentCode.value
  )
  departmentFilter.value = matched?.id || 'all'
}

function syncRouteFilters() {
  const query: Record<string, string> = {}
  const menuDepartment = Object.entries(menuDepartmentCodes).find(
    ([, code]) => code === menuDepartmentCode.value
  )?.[0]

  if (menuDepartment) query.department = menuDepartment
  else if (departmentFilter.value && departmentFilter.value !== 'all') query.departmentId = departmentFilter.value
  if (roomTypeFilter.value !== 'all') query.roomTypeId = roomTypeFilter.value
  if (statusFilter.value !== 'all') query.status = statusFilter.value
  if (resultTypeFilter.value !== 'all') query.resultTiming = resultTypeFilter.value
  if (dateFromFilter.value) query.dateFrom = dateFromFilter.value
  if (dateToFilter.value) query.dateTo = dateToFilter.value
  if (initialExamId.value) query.examId = initialExamId.value
  if (initialRegistrationId.value) query.registrationId = initialRegistrationId.value

  void router.replace({ query })
}

// Computed filters
const filteredResults = computed(() => {
  return (results.value || []).filter((result) => {
    // Department filter
    if (departmentFilter.value && departmentFilter.value !== 'all') {
      if (result.item?.department?.id !== departmentFilter.value) return false
    } else if (
      menuDepartmentCode.value
      && result.item?.department?.code?.toUpperCase() !== menuDepartmentCode.value
    ) {
      return false
    }

    if (roomTypeFilter.value !== 'all' && result.item?.roomType?.id !== roomTypeFilter.value) {
      return false
    }

    // Status filter
    if (statusFilter.value !== 'all' && !isStatusMatchFilter(statusFilter.value, result.status)) {
      return false
    }

    // Result type filter
    if (resultTypeFilter.value !== 'all' && result.resultTiming !== resultTypeFilter.value) {
      return false
    }

    // Date filters
    if (dateFromFilter.value) {
      const resultDate = getResultDate(result)
      if (resultDate < dateFromFilter.value) return false
    }

    if (dateToFilter.value) {
      const resultDate = getResultDate(result)
      if (resultDate > dateToFilter.value) return false
    }

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      const patientName = formatPatientName(result.patient).toLowerCase()
      const patientId = result.patient?.PatientId?.toLowerCase() || ''
      const queueCode = result.queueCode?.toLowerCase() || ''
      const itemName = result.item?.name?.toLowerCase() || ''

      if (!patientName.includes(query) &&
          !patientId.includes(query) &&
          !queueCode.includes(query) &&
          !itemName.includes(query)) {
        return false
      }
    }

    return true
  })
})

// Load departments
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
      color: 'error',
    })
  } finally {
    departmentsLoading.value = false
  }
}

// Load exam results
async function loadResults() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      limit: limit.value,
      groupBy: isExternalDoctor.value ? 'item' : 'exam',
    }

    if (departmentFilter.value && departmentFilter.value !== 'all') {
      params.departmentId = departmentFilter.value
    } else if (menuDepartmentCode.value) {
      params.departmentCode = menuDepartmentCode.value
    }

    if (roomTypeFilter.value !== 'all') {
      params.roomTypeId = roomTypeFilter.value
    }

    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    if (resultTypeFilter.value !== 'all') {
      params.resultTiming = resultTypeFilter.value
    }

    if (initialExamId.value) {
      params.examId = initialExamId.value
    }

    if (initialRegistrationId.value) {
      params.registrationId = initialRegistrationId.value
    }

    const res = await api.get('/mcu/exams/results', { params })
    const payload = res.data?.data ?? res.data
    const meta = res.data?.meta ?? {}

    if (Array.isArray(payload)) {
      results.value = payload
      total.value = meta.total ?? payload.length
    } else if (payload?.data) {
      results.value = payload.data
      total.value = payload.total || 0
    } else {
      results.value = []
      total.value = 0
    }
  } catch (error) {
    toast.add({
      title: 'Failed to load results',
      description: getErrorMessage(error, 'Could not load exam results'),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

watch(results, () => {
  if (!initialExamId.value) return

  const matched = results.value.find(result => result.exam?.id === initialExamId.value)
  if (matched) {
    initialExamId.value = ''
    void viewDetail(matched)
  }
}, { immediate: true })

// View detail
async function viewDetail(result: ExamResult) {
  await router.push({
    path: `/result/exam-results/${result.id}`,
    query: isExternalDoctor.value
      ? {}
      : {
          department: getQueryValue(route.query.department),
          examId: result.exam?.id || '',
          ...(result.item?.roomType?.id ? { roomTypeId: result.item.roomType.id } : {})
        }
  })
}

// Reset filters
function resetFilters() {
  menuDepartmentCode.value = null
  departmentFilter.value = 'all'
  roomTypeFilter.value = 'all'
  statusFilter.value = 'all'
  resultTypeFilter.value = 'all'
  dateFromFilter.value = ''
  dateToFilter.value = ''
  searchQuery.value = ''
  initialExamId.value = ''
  initialRegistrationId.value = ''
  page.value = 1
  syncRouteFilters()
}

// Watch filters and reload
watch([departmentFilter, roomTypeFilter, statusFilter, resultTypeFilter, dateFromFilter, dateToFilter], () => {
  if (isBootstrapping.value || isApplyingMenuDepartment.value) return

  const selectedDepartment = departments.value.find(
    department => department.id === departmentFilter.value
  )
  const selectedCode = selectedDepartment?.code.toUpperCase() || null
  menuDepartmentCode.value = Object.values(menuDepartmentCodes).includes(selectedCode || '')
    ? selectedCode
    : null
  page.value = 1
  syncRouteFilters()
  loadResults()
})

watch(
  () => getQueryValue(route.query.department),
  async (department) => {
    if (isBootstrapping.value) return

    const nextDepartmentCode = menuDepartmentCodes[department.toLowerCase()] || null
    if (nextDepartmentCode === menuDepartmentCode.value) return

    isApplyingMenuDepartment.value = true
    menuDepartmentCode.value = nextDepartmentCode
    applyMenuDepartmentSelection()
    page.value = 1
    await nextTick()
    isApplyingMenuDepartment.value = false
    await loadResults()
  }
)

// Load on mount
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
      <UDashboardNavbar
        :title="isExternalDoctor ? 'Pekerjaan Dokter Luar' : 'Exam Results Management'"
        :subtitle="isExternalDoctor ? 'Hasil pemeriksaan yang ditugaskan kepada Anda' : 'Manage inline and deferred exam results'"
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
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="isExternalDoctor"
          icon="i-lucide-stethoscope"
          color="info"
          variant="soft"
          title="Workspace Dokter Luar"
          description="Hanya pemeriksaan yang ditugaskan kepada akun Anda yang ditampilkan. Isi hasil, simpan draft, lalu submit."
        />

        <!-- Filters Section -->
        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-base font-semibold">Filters</h3>
              <UButton
                v-if="departmentFilter !== 'all' || roomTypeFilter !== 'all' || statusFilter !== 'all' || resultTypeFilter !== 'all' || dateFromFilter || dateToFilter || searchQuery"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="resetFilters"
              >
                Reset All
              </UButton>
            </div>
          </template>

          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <!-- Search -->
            <UFormField label="Search">
              <UInput
                v-model="searchQuery"
                placeholder="Patient, Queue, Item..."
                icon="i-lucide-search"
              />
            </UFormField>

            <!-- Department Filter -->
            <UFormField v-if="!isExternalDoctor" label="Department">
              <USelect
                v-model="departmentFilter"
                :items="departmentItems"
                :loading="departmentsLoading"
              />
            </UFormField>


            <!-- Room Type Filter -->
            <UFormField v-if="!isExternalDoctor" label="Room Type">
              <USelect
                v-model="roomTypeFilter"
                :items="roomTypeItems"
                :loading="roomTypesPending"
                placeholder="Select room type"
                class="w-full"
              />
            </UFormField>
            <!-- Status Filter -->
            <UFormField label="Status">
              <USelect
                v-model="statusFilter"
                :items="[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Completed', value: 'completed' },
                ]"
              />
            </UFormField>

            <!-- Result Type Filter -->
            <UFormField v-if="!isExternalDoctor" label="Result Type">
              <USelect
                v-model="resultTypeFilter"
                :items="[
                  { label: 'All Types', value: 'all' },
                  { label: 'Inline', value: 'inline' },
                  { label: 'Deferred', value: 'deferred' },
                ]"
              />
            </UFormField>

            <!-- Date Range -->
            <UFormField v-if="!isExternalDoctor" label="Date Range">
              <div class="flex gap-2">
                <UInput
                  v-model="dateFromFilter"
                  type="date"
                  size="sm"
                  placeholder="From"
                />
                <UInput
                  v-model="dateToFilter"
                  type="date"
                  size="sm"
                  placeholder="To"
                />
              </div>
            </UFormField>
          </div>
        </UCard>

        <!-- Results Table -->
        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-base font-semibold">
                Results
                <span class="text-sm text-muted">({{ filteredResults.length }})</span>
              </h3>
            </div>
          </template>

          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="i in 5" :key="i" class="h-12 rounded-lg" />
          </div>

          <div v-else-if="!filteredResults.length" class="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-default bg-muted/20 p-8 text-center">
            <UIcon name="i-lucide-inbox" class="mb-3 size-10 text-muted" />
            <h3 class="text-base font-semibold text-highlighted">No results found</h3>
            <p class="mt-1 max-w-lg text-sm text-muted">
              {{ isExternalDoctor ? 'Belum ada pemeriksaan yang ditugaskan kepada Anda.' : 'No exam results match your filter criteria. Try adjusting your filters.' }}
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-default/70">
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Queue Code
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Patient
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Item
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Department
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Type
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Status
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Check-in
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default/50">
                <tr
                  v-for="result in filteredResults"
                  :key="result.id"
                  class="hover:bg-muted/40 transition"
                >
                  <td class="px-4 py-3 text-sm font-medium text-highlighted">
                    {{ result.queueCode }}
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <div class="flex flex-col gap-1">
                      <p class="font-medium text-highlighted">
                        {{ formatPatientName(result.patient) }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ result.patient?.PatientId || '-' }}
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <div class="flex flex-col gap-1">
                      <p class="font-medium text-highlighted">
                        {{ result.item?.name || '-' }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ result.item?.code || '-' }}
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <UBadge
                      :label="getDepartmentLabel(result.item?.department)"
                      color="neutral"
                      variant="soft"
                    />
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <UBadge
                      :label="getTypeLabel(result.resultTiming)"
                      :color="result.resultTiming === 'deferred' ? 'primary' : 'success'"
                      variant="soft"
                    />
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <UBadge
                      :label="getStatusLabel(result.status)"
                      :color="getStatusColor(result.status)"
                      variant="subtle"
                    />
                  </td>
                  <td class="px-4 py-3 text-sm text-muted">
                    {{ formatDateTime(result.checkinAt || result.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      @click="viewDetail(result)"
                    >
                      View
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <!-- Pagination -->
        <div v-if="filteredResults.length > 0" class="flex items-center justify-between rounded-lg border border-default/80 bg-default/50 p-4">
          <p class="text-sm text-muted">
            Showing {{ (page - 1) * limit + 1 }} to {{ Math.min(page * limit, total) }} of {{ total }} results
          </p>
          <div class="flex gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              :disabled="page === 1"
              @click="page--; loadResults()"
            >
              Previous
            </UButton>
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              :disabled="page * limit >= total"
              @click="page++; loadResults()"
            >
              Next
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

</template>
