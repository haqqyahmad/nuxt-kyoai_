<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'

const props = defineProps<{
  examId: string | null
}>()

const api = useApi()
const toast = useToast()

interface MealInfo {
  status: string
  mealDurationMinutes: number | null
  startedAt?: string | null
  completedAt?: string | null
  prerequisites: { total: number, done: number, remaining: number }
}

const meal = ref<MealInfo | null>(null)
const loading = ref(false)
const acting = ref(false)
const now = ref(Date.now())
let pollingTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

// Sisa waktu meal berlangsung (countdown dari startedAt + durasi).
const remainingText = computed(() => {
  if (!meal.value || meal.value.status !== 'IN_PROGRESS') return ''
  const started = meal.value.startedAt ? new Date(meal.value.startedAt).getTime() : 0
  const durationMs = (meal.value.mealDurationMinutes ?? 0) * 60 * 1000
  if (!started || !durationMs) return ''
  const remaining = Math.max(0, started + durationMs - now.value)
  const totalSec = Math.floor(remaining / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

function shortTime(value: string | undefined | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

async function fetchMeal() {
  if (!props.examId || loading.value) return
  loading.value = true
  try {
    const res = await api.get(`/medical/exams/${props.examId}/meal`)
    meal.value = res.data?.data ?? null
  } catch {
    meal.value = null
  } finally {
    loading.value = false
  }
}

// Auto-complete dikerjakan worker BE (timer durasi). Polling biar badge
// ikut update status tanpa reload. Clock 1s nge-update countdown display.
function startPolling() {
  stopPolling()
  if (meal.value?.status === 'IN_PROGRESS') {
    now.value = Date.now()
    clockTimer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
    pollingTimer = setInterval(() => {
      void fetchMeal()
    }, 15000)
  }
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
}

async function action(endpoint: string, successMsg: string) {
  if (!props.examId || acting.value) return
  acting.value = true
  try {
    await api.post(`/medical/exams/${props.examId}${endpoint}`)
    toast.add({ title: 'Berhasil', description: successMsg, color: 'success' })
    await fetchMeal()
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } }
    toast.add({
      title: 'Gagal',
      description: axiosError?.response?.data?.message || 'Operasi meal gagal',
      color: 'error'
    })
  } finally {
    acting.value = false
  }
}

watch(meal, () => {
  startPolling()
})

watch(() => props.examId, (v) => {
  meal.value = null
  if (v) void fetchMeal()
}, { immediate: true })

onUnmounted(() => {
  stopPolling()
})

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

const statusMeta: Record<string, { label: string, color: BadgeColor, icon: string }> = {
  NOT_READY: { label: 'Meal: Belum Siap', color: 'neutral', icon: 'i-lucide-lock' },
  READY: { label: 'Meal: Siap', color: 'warning', icon: 'i-lucide-utensils' },
  IN_PROGRESS: { label: 'Meal: In Progress', color: 'info', icon: 'i-lucide-loader' },
  COMPLETED: { label: 'Meal: Selesai', color: 'success', icon: 'i-lucide-check' },
  SKIPPED: { label: 'Meal: Dilih', color: 'neutral', icon: 'i-lucide-skip-forward' }
}
</script>

<template>
  <div
    v-if="meal"
    class="flex flex-wrap items-center gap-2"
  >
    <UBadge
      :color="statusMeta[meal.status]?.color ?? 'neutral'"
      :icon="statusMeta[meal.status]?.icon"
      variant="subtle"
    >
      {{ statusMeta[meal.status]?.label ?? meal.status }}
      <template v-if="meal.status === 'NOT_READY' && meal.prerequisites.total > 0">
        ({{ meal.prerequisites.done }}/{{ meal.prerequisites.total }})
      </template>
      <template v-else-if="meal.status === 'IN_PROGRESS' && remainingText">
        · {{ remainingText }}
      </template>
      <template v-else-if="meal.mealDurationMinutes != null">
        · {{ meal.mealDurationMinutes }} mnt
      </template>
    </UBadge>

    <span v-if="shortTime(meal.startedAt)" class="text-xs text-muted">
      Mulai {{ shortTime(meal.startedAt) }}
    </span>
    <span v-if="meal.status === 'COMPLETED' && shortTime(meal.completedAt)" class="text-xs text-muted">
      · Selesai {{ shortTime(meal.completedAt) }}
    </span>

    <UButton
      v-if="meal.status === 'READY'"
      size="xs"
      color="warning"
      :loading="acting"
      @click="action('/meal/start', 'Meal dimulai')"
    >
      Start Meal
    </UButton>
    <UButton
      v-if="meal.status === 'IN_PROGRESS'"
      size="xs"
      color="primary"
      :loading="acting"
      @click="action('/meal/complete', 'Meal selesai')"
    >
      Complete Meal
    </UButton>
  </div>
</template>
