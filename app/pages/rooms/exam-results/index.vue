<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import DetailDrawer from './components/DetailDrawer.vue'

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

// State
const loading = ref(false)
const results = ref<ExamResult[]>([])
const selectedResult = ref<ExamResult | null>(null)
const isDetailOpen = ref(false)

// Filters
const departmentFilter = ref<string>('all')
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
const initialExamId = ref('')
const initialRegistrationId = ref('')
const isBootstrapping = ref(true)

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
  if (status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

function getStatusLabel(status?: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'pending') return 'Pending'
  return 'Unknown'
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

function applyRouteFilters() {
  const departmentId = getQueryValue(route.query.departmentId)
  const status = getQueryValue(route.query.status)
  const resultTiming = getQueryValue(route.query.resultTiming)
  const examId = getQueryValue(route.query.examId)
  const registrationId = getQueryValue(route.query.registrationId)

  departmentFilter.value = departmentId || 'all'
  statusFilter.value = status === 'pending' || status === 'completed' ? status : 'all'
  resultTypeFilter.value = resultTiming === 'inline' || resultTiming === 'deferred'
    ? resultTiming
    : 'all'
  initialExamId.value = examId
  initialRegistrationId.value = registrationId
}

function syncRouteFilters() {
  const query: Record<string, string> = {}

  if (departmentFilter.value && departmentFilter.value !== 'all') query.departmentId = departmentFilter.value
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
  return (results.value || []).filter(result => {
    // Department filter
    if (departmentFilter.value && departmentFilter.value !== 'all' && result.item?.department?.id !== departmentFilter.value) {
      return false
    }

    // Status filter
    if (statusFilter.value !== 'all' && result.status !== statusFilter.value) {
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
    }

    if (departmentFilter.value && departmentFilter.value !== 'all') {
      params.departmentId = departmentFilter.value
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
  if (!initialExamId.value || isDetailOpen.value) return

  const matched = results.value.find(result => result.exam?.id === initialExamId.value)
  if (matched) {
    selectedResult.value = matched
    isDetailOpen.value = true
  }
}, { immediate: true })

// View detail
async function viewDetail(result: ExamResult) {
  selectedResult.value = result
  isDetailOpen.value = true
}

// Handle result saved
async function handleResultSaved(result: ExamResult) {
  toast.add({
    title: 'Success',
    description: 'Result saved successfully',
    color: 'success',
  })
  
  // Refresh results list
  await loadResults()
}

// Reset filters
function resetFilters() {
  departmentFilter.value = 'all'
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
watch([departmentFilter, statusFilter, resultTypeFilter, dateFromFilter, dateToFilter], () => {
  if (isBootstrapping.value) return

  page.value = 1
  syncRouteFilters()
  loadResults()
})

// Load on mount
onMounted(async () => {
  applyRouteFilters()
  await Promise.all([
    loadDepartments(),
    loadResults(),
  ])
  isBootstrapping.value = false
})
</script>

<template>
  <UDashboardPanel id="exam-results">
    <template #header>
      <UDashboardNavbar
        title="Exam Results Management"
        subtitle="Manage inline and deferred exam results"
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
        <!-- Filters Section -->
        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-base font-semibold">Filters</h3>
              <UButton
                v-if="departmentFilter !== 'all' || statusFilter !== 'all' || resultTypeFilter !== 'all' || dateFromFilter || dateToFilter || searchQuery"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="resetFilters"
              >
                Reset All
              </UButton>
            </div>
          </template>

          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <!-- Search -->
            <UFormField label="Search">
              <UInput
                v-model="searchQuery"
                placeholder="Patient, Queue, Item..."
                icon="i-lucide-search"
              />
            </UFormField>

            <!-- Department Filter -->
            <UFormField label="Department">
              <USelect
                v-model="departmentFilter"
                :items="departmentItems"
                :loading="departmentsLoading"
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
            <UFormField label="Result Type">
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
            <UFormField label="Date Range">
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
              No exam results match your filter criteria. Try adjusting your filters.
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

  <!-- Detail Drawer/Modal -->
  <DetailDrawer
    :open="isDetailOpen"
    :result="selectedResult"
    @close="isDetailOpen = false"
    @result-saved="handleResultSaved"
  />
</template>
