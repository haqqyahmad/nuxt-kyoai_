<script setup lang="ts">
import DetailDrawer from './components/DetailDrawer.vue'

type DetailResult = NonNullable<
  InstanceType<typeof DetailDrawer>['$props']['result']
>

const route = useRoute()
const router = useRouter()
const api = useApi()

const result = ref<DetailResult | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

function getQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? '')
  return typeof value === 'string' ? value : ''
}

async function loadResult() {
  loading.value = true
  error.value = null

  try {
    const response = await api.get('/mcu/exams/results', {
      params: {
        examItemId: String(route.params.id),
        page: 1,
        limit: 1
      }
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
  const department = getQueryValue(route.query.department)
  await router.push({
    path: '/rooms/exam-results',
    query: department ? { department } : {}
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
