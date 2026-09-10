<script setup lang="ts">
import DetailDrawer from './components/DetailDrawer.vue'
import DentalResultPanel from './components/DentalResultPanel.vue'
import PhysicalResultPanel from './components/PhysicalResultPanel.vue'
import HistoryTimeline from './components/HistoryTimeline.vue'
import DoctorTestPanel from '~/components/rooms/DoctorTestPanel.vue'

type DetailResult = NonNullable<
  InstanceType<typeof DetailDrawer>['$props']['result']
>
type StructuredResult = DetailResult & {
  item?: (DetailResult['item'] & { rendererKey?: string | null }) | null
  doctorExam?: { rendererKey?: string | null } | null
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const { isExternalDoctor } = await useCurrentUser()

const result = ref<StructuredResult | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const auditLoading = ref(false)
const auditEntries = ref<any[]>([])

async function loadAudit() {
  if (!examId.value) return
  auditLoading.value = true
  try {
    const res = await api.get(`/audit/DentalExam/${examId.value}`)
    const payload = res.data?.data ?? res.data ?? []
    auditEntries.value = Array.isArray(payload) ? payload : []
  } catch {
    auditEntries.value = []
  } finally {
    auditLoading.value = false
  }
}

function getQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? '')
  return typeof value === 'string' ? value : ''
}

const department = computed(() => getQueryValue(route.query.department))
const isDental = computed(() => department.value.toLowerCase() === 'dental')
const doctorTestKeys = ['VISUAL_FIELD_TEST', 'ROMBERG_TEST', 'TINNEL_TEST', 'PHALLEN_TEST', 'RECTAL_EXAMINATION']
const isPhysical = computed(() => Boolean(result.value?.doctorExam)
  && (result.value?.item?.rendererKey === 'PHYSICAL_EXAMINATION'
    || result.value?.doctorExam?.rendererKey === 'PHYSICAL_EXAMINATION'))
const isDoctorTestResult = computed(() => Boolean(result.value?.doctorExam)
  && doctorTestKeys.includes(String(result.value?.doctorExam?.rendererKey)))
const examId = computed(() => getQueryValue(route.query.examId))
const roomTypeId = computed(() => getQueryValue(route.query.roomTypeId))

const patient = computed(() => (result.value as any)?.patient ?? null)
const patientName = computed(() =>
  [patient.value?.firstName, patient.value?.middleName, patient.value?.lastName]
    .filter(Boolean)
    .join(' ') || '-'
)
const patientGender = computed(() =>
  patient.value?.gender === 'MALE'
    ? 'Male'
    : patient.value?.gender === 'FEMALE'
      ? 'Female'
      : patient.value?.gender || '-'
)
const patientAge = computed(() => {
  const dob = patient.value?.dob
  if (!dob) return '-'
  const birth = new Date(dob)
  const ref = (result.value as any)?.checkinAt ? new Date((result.value as any).checkinAt) : new Date()
  if (Number.isNaN(birth.getTime())) return '-'
  let age = ref.getFullYear() - birth.getFullYear()
  if (ref.getMonth() < birth.getMonth() || (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate())) age--
  return `${Math.max(age, 0)} years`
})
const patientDob = computed(() => {
  const dob = patient.value?.dob
  if (!dob) return '-'
  const d = new Date(dob)
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
})

async function loadResult() {
  loading.value = true
  error.value = null

  try {
    const params: Record<string, string | number> = {
      page: 1,
      limit: 1,
      groupBy: isExternalDoctor.value ? 'item' : 'exam'
    }

    if (isExternalDoctor.value) {
      params.examItemId = String(route.params.id)
    } else if (examId.value) {
      params.examId = examId.value
    } else {
      params.examItemId = String(route.params.id)
    }

    if (department.value) {
      params.department = department.value
    }

    if (roomTypeId.value) {
      params.roomTypeId = roomTypeId.value
    }

    const response = await api.get('/mcu/exams/results', {
      params
    })
    const payload = response.data?.data ?? response.data
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : []

    result.value = rows[0] ?? null
    if (!result.value) error.value = 'Result not found or inaccessible.'
    if (isDental.value) await loadAudit()
  } catch (value: unknown) {
    const response = typeof value === 'object' && value && 'response' in value
      ? (value as { response?: { data?: { message?: string } } }).response
      : undefined
    error.value = response?.data?.message || 'Failed to load result detail.'
    result.value = null
  } finally {
    loading.value = false
  }
}

async function goBackToResults() {
  await router.push({
    path: '/result/exam-results',
    query: department.value ? { department: department.value } : {}
  })
}

onMounted(() => {
  void loadResult()
})
</script>

<template>
  <UDashboardPanel id="exam-result-detail">
    <template #body>
      <div v-if="loading" class="flex min-h-96 items-center justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      </div>

      <div v-else-if="error" class="flex min-h-96 items-center justify-center p-6">
        <UAlert
          color="error"
          variant="soft"
          title="Result detail unavailable"
          :description="error"
          class="max-w-xl"
        />
      </div>

      <!-- Dental: editor + dental-specific view -->
      <div v-else-if="isDental && examId" class="h-full overflow-auto">
        <div class="flex items-center gap-3 px-2 pt-2">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-arrow-left"
            @click="goBackToResults"
          >
            Back
          </UButton>
        </div>
        <div class="space-y-4 p-4">
          <DentalResultPanel
            :exam-id="examId"
            :exam-item-id="String(route.params.id)"
            :room-type-id="roomTypeId"
            :department-id="(result as any)?.item?.department?.id"
            :result-status="(result as any)?.departmentResultStatus"
            :submitted-by="(result as any)?.exam?.resultSubmittedBy"
            @approved="loadResult"
          />

          <HistoryTimeline
            :loading="auditLoading"
            :entries="auditEntries"
            :queue-code="(result as any)?.queueCode"
          />
        </div>
      </div>

      <!-- Physical Examination: structured DoctorExam, standard result view without grade -->
      <PhysicalResultPanel
        v-else-if="isPhysical && result"
        :result="result as any"
        @back="goBackToResults"
      />

      <!-- Doctor test items (Romberg/Tinnel/Phallen/Visual Field/Rectal) -->
      <div v-else-if="isDoctorTestResult && result" class="space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-arrow-left"
              @click="goBackToResults"
            >
              Back
            </UButton>
            <div>
              <h2 class="font-semibold text-highlighted">
                {{ (result as any).item?.name || 'Doctor Examination' }}
              </h2>
              <p class="text-xs text-muted">
                {{ patientName }} · {{ (result as any).item?.department?.name || '-' }}
              </p>
            </div>
          </div>
          <UBadge
            :color="(result.doctorExam as any)?.status === 'SUBMITTED' ? 'success' : 'warning'"
            variant="soft"
          >
            {{ (result.doctorExam as any)?.status || 'DRAFT' }}
          </UBadge>
        </div>

        <UCard>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div>
              <p class="text-xs text-muted">Patient Name</p>
              <p class="mt-1 font-semibold text-highlighted">{{ patientName }}</p>
              <p class="text-xs text-muted">{{ patient?.PatientId || '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Gender / Age</p>
              <p class="mt-1 font-semibold">{{ patientGender }} · {{ patientAge }}</p>
              <p class="text-xs text-muted">Born {{ patientDob }}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Company / Package</p>
              <p class="mt-1 font-semibold">{{ (result as any).company || '-' }}</p>
              <p class="text-xs text-muted">{{ (result as any).packageName || '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Examination</p>
              <p class="mt-1 font-semibold">{{ (result as any).exam?.examCode || '-' }}</p>
              <p class="text-xs text-muted">{{ (result as any).checkinAt ? new Date((result as any).checkinAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }}</p>
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted">Reg No.</p>
              <p class="mt-1 truncate font-mono text-xs font-semibold text-highlighted" :title="(result as any).queueCode || '-'">
                {{ (result as any).queueCode || '-' }}
              </p>
            </div>
          </div>
        </UCard>

        <DoctorTestPanel
          :exam-id="examId"
          :exam-item-id="(result.doctorExam as any)?.examItemId"
          disabled
        />
      </div>

      <!-- Non-dental: generic result drawer -->
      <DetailDrawer
        v-else
        :open="true"
        :result="result"
        embedded
        @close="goBackToResults"
        @result-saved="loadResult"
      />
    </template>
  </UDashboardPanel>
</template>
