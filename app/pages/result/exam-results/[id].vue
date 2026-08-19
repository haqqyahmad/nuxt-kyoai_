<script setup lang="ts">
import DetailDrawer from './components/DetailDrawer.vue'
import DentalResultPanel from './components/DentalResultPanel.vue'

type DetailResult = NonNullable<
  InstanceType<typeof DetailDrawer>['$props']['result']
>

const route = useRoute()
const router = useRouter()
const api = useApi()
const { isExternalDoctor } = await useCurrentUser()

const result = ref<DetailResult | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

function getQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? '')
  return typeof value === 'string' ? value : ''
}

const department = computed(() => getQueryValue(route.query.department))
const isDental = computed(() => department.value.toLowerCase() === 'dental')
const examId = computed(() => getQueryValue(route.query.examId))
const roomTypeId = computed(() => getQueryValue(route.query.roomTypeId))

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
    if (!result.value) error.value = 'Result tidak ditemukan atau tidak dapat diakses.'
  } catch (value: unknown) {
    const response = typeof value === 'object' && value && 'response' in value
      ? (value as { response?: { data?: { message?: string } } }).response
      : undefined
    error.value = response?.data?.message || 'Gagal memuat detail result.'
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
          title="Detail result tidak tersedia"
          :description="error"
          class="max-w-xl"
        />
      </div>

      <!-- Dental: editor + view khusus dental -->
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
        <div class="p-4">
          <DentalResultPanel
            :exam-id="examId"
            :exam-item-id="String(route.params.id)"
            :room-type-id="roomTypeId"
            :department-id="(result as any)?.item?.department?.id"
            :result-status="(result as any)?.departmentResultStatus"
            :submitted-by="(result as any)?.exam?.resultSubmittedBy"
            @approved="loadResult"
          />
        </div>
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
