<script setup lang="ts">
const route = useRoute()
const api = useApi()

definePageMeta({
  layout: false,
  middleware: 'auth'
})

type ExamItem = {
  id: string
  workStatus?: string | null
  roomExamItems?: Array<{ status: string }>
  item: {
    id: string
    code?: string | null
    name: string
    department?: { id?: string, name?: string | null } | null
  }
}

type SampleCollection = {
  status: string
  items?: Array<{ itemId: string }>
}

type Registration = {
  id: number
  id_reg: string
  examDate: string
  serviceType: string
  serviceNumber: string
  statusRegistration: string
  queue: {
    queueCode: string
    queueNumber: number
    sampleCollections?: SampleCollection[]
  } | null
  patient: {
    patientCode: string
    patientName: string
    gender?: string | null
    dob?: string | null
    photoUrl?: string | null
  } | null
  branch: { nameBranch: string } | null
  company: { customerName: string } | null
  exam: { examItems: ExamItem[] } | null
}

const registeringId = String(route.params.id ?? '')

const { data: reg, refresh } = await useAsyncData(
  `queue-search-${registeringId}`,
  () => api.get(`/registration/number/${registeringId}`).then(r => r.data.data as Registration)
)

const SERVICE_LABEL: Record<string, string> = {
  Laboratorium: 'Laboratory',
  DoctorConsultation: 'Doctor Consultation',
  MCU: 'MCU (Medical Checkup)',
  Vaccine: 'Vaccine',
  Antigen: 'Antigen',
  PCR: 'PCR',
  VitaminInjection: 'Vitamin Injection',
  Pharmacy: 'Pharmacy',
  Dental: 'Dental'
}

const DEPT_ICON: Record<string, string> = {
  Laboratorium: 'i-lucide-flask-conical',
  Radiologi: 'i-lucide-scan',
  Nurse: 'i-lucide-heart-pulse',
  Dokter: 'i-lucide-stethoscope',
  Dental: 'i-lucide-smile'
}

function deptIcon(name: string) {
  return DEPT_ICON[name] ?? 'i-lucide-stethoscope'
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url
  let base = useRuntimeConfig().public.apiBase || ''
  base = base.replace(/\/+$/, '').replace(/\/api$/, '')
  return base ? `${base}${url}` : url
}

const patientPhotoUrl = computed(() => resolveMediaUrl(reg.value?.patient?.photoUrl))

function patientAgeLabel(dob?: string | null) {
  if (!dob) return ''
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return ''
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
  return years >= 0 && years < 130 ? `${years} y` : ''
}

function genderLabel(gender?: string | null) {
  if (gender === 'MALE') return 'Male'
  if (gender === 'FEMALE') return 'Female'
  return ''
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

const REG_STATUS_COLOR: Record<string, 'success' | 'info' | 'neutral' | 'warning' | 'error'> = {
  Open: 'success',
  Checkin: 'info',
  CheckOut: 'neutral',
  Reschedule: 'warning',
  PartialExam: 'warning',
  Cancel: 'error'
}

function getSampleCollectionsForItem(itemId: string) {
  return (reg.value?.queue?.sampleCollections ?? []).filter(collection =>
    collection.items?.some(item => item.itemId === itemId)
  )
}

function getExamItemStatus(ei: ExamItem) {
  const samples = getSampleCollectionsForItem(ei.item.id)
  if (samples.length > 0) {
    const roomStatuses = ei.roomExamItems?.map(item => item.status) ?? []
    if (roomStatuses.includes('REFUSED')) return 'REFUSED'
    if (ei.workStatus === 'DONE') return 'DONE'
    if (samples.every(s => s.status === 'RECEIVED')) return 'DONE'
    if (roomStatuses.includes('RESCHEDULED')) return 'RESCHEDULED'
    if (samples.some(s => s.status === 'RESCHEDULED')) return 'RESCHEDULED'
    if (samples.some(s => s.status === 'REJECTED')) return 'REJECTED'
    return 'WAITING_SAMPLE'
  }

  const statuses = ei.roomExamItems?.map(item => item.status) ?? []
  if (statuses.includes('DONE')) return 'DONE'
  if (statuses.includes('IN_PROGRESS')) return 'IN_PROGRESS'
  if (statuses.includes('CALLED')) return 'CALLED'
  if (statuses.includes('RETEXT')) return 'RETEXT'
  if (statuses.includes('REFUSED')) return 'REFUSED'
  if (statuses.includes('RESCHEDULED')) return 'RESCHEDULED'
  if (statuses.includes('SKIPPED')) return 'SKIPPED'
  if (ei.workStatus === 'RETEXT') return 'RETEXT'
  return statuses[0] ?? 'PENDING'
}

function statusLabel(status: string) {
  if (status === 'DONE') return 'Done'
  if (status === 'IN_PROGRESS') return 'In Progress'
  if (status === 'CALLED') return 'Called'
  if (status === 'SKIPPED') return 'Skipped'
  if (status === 'RESCHEDULED') return 'Rescheduled'
  if (status === 'REFUSED') return 'Rejected'
  if (status === 'RETEXT') return 'Retest'
  if (status === 'WAITING_SAMPLE') return 'Waiting Sample'
  if (status === 'REJECTED') return 'Sample Rejected'
  return 'Waiting'
}

function statusColor(status: string): 'success' | 'info' | 'neutral' | 'warning' | 'error' {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'REFUSED' || status === 'REJECTED') return 'error'
  if (status === 'RETEXT' || status === 'WAITING_SAMPLE') return 'warning'
  return 'neutral'
}

function statusIcon(status: string) {
  if (status === 'DONE') return 'i-lucide-check-circle-2'
  if (status === 'IN_PROGRESS') return 'i-lucide-loader-circle'
  if (status === 'CALLED') return 'i-lucide-bell'
  if (status === 'REFUSED' || status === 'REJECTED') return 'i-lucide-ban'
  if (status === 'RETEXT') return 'i-lucide-rotate-ccw'
  if (status === 'WAITING_SAMPLE') return 'i-lucide-test-tube'
  if (status === 'RESCHEDULED') return 'i-lucide-calendar-clock'
  if (status === 'SKIPPED') return 'i-lucide-skip-forward'
  return 'i-lucide-clock'
}

function isProcessing(status: string) {
  return status === 'IN_PROGRESS' || status === 'CALLED' || status === 'RETEXT'
}

function isAttention(status: string) {
  return status === 'REFUSED' || status === 'REJECTED'
}

const groupedItems = computed(() => {
  const items = reg.value?.exam?.examItems ?? []
  const map = new Map<string, { name: string, done: number, total: number, items: { name: string, status: string }[] }>()

  for (const ei of items) {
    const dept = ei.item.department?.name ?? 'Lainnya'
    if (!map.has(dept)) map.set(dept, { name: dept, done: 0, total: 0, items: [] })
    const status = getExamItemStatus(ei)
    const group = map.get(dept)!
    group.total += 1
    if (status === 'DONE') group.done += 1
    group.items.push({ name: ei.item.name, status })
  }

  return [...map.values()]
})

const totalItems = computed(() => reg.value?.exam?.examItems?.length ?? 0)

const stats = computed(() => {
  let done = 0
  let process = 0
  let waiting = 0
  let attention = 0

  for (const ei of reg.value?.exam?.examItems ?? []) {
    const status = getExamItemStatus(ei)
    if (status === 'DONE') done += 1
    else if (isProcessing(status)) process += 1
    else if (isAttention(status)) attention += 1
    else waiting += 1
  }

  return { done, process, waiting, attention }
})

const progress = computed(() =>
  totalItems.value === 0 ? 0 : Math.round((stats.value.done / totalItems.value) * 100)
)

const allDone = computed(() => totalItems.value > 0 && stats.value.done === totalItems.value)

const patientMeta = computed(() =>
  [genderLabel(reg.value?.patient?.gender), patientAgeLabel(reg.value?.patient?.dob)]
    .filter(Boolean)
    .join(' · ')
)

// Auto-return ke layar input
const COUNTDOWN_SECONDS = 20
const countdown = ref(COUNTDOWN_SECONDS)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  countdown.value = COUNTDOWN_SECONDS
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer)
      navigateTo('/queue-search')
    }
  }, 1000)
}

function scanAgain() {
  if (countdownTimer) clearInterval(countdownTimer)
  navigateTo('/queue-search')
}

const refreshing = ref(false)
async function refreshBoard() {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  startCountdown()
  refreshTimer = setInterval(refreshBoard, 12000)
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col bg-default text-default">
    <div class="h-full w-full flex flex-col">
      <!-- HEADER -->
      <header class="shrink-0 relative overflow-hidden border-b border-default">
        <div class="absolute inset-0 bg-gradient-to-r from-secondary/15 via-primary/5 to-transparent" />
        <div class="relative px-6 py-4 flex flex-wrap items-center gap-5">
          <img src="/logo.png" alt="Kyoai Medical Services" class="h-12 w-auto shrink-0">

          <div class="relative shrink-0">
            <img
              v-if="patientPhotoUrl"
              :src="patientPhotoUrl"
              :alt="reg?.patient?.patientName"
              class="h-20 w-20 rounded-2xl object-cover ring-2 ring-secondary/40 shadow-sm"
            >
            <div
              v-else
              class="h-20 w-20 rounded-2xl bg-muted ring-2 ring-default flex items-center justify-center"
            >
              <UIcon name="i-lucide-user" class="text-3xl text-muted" />
            </div>
          </div>

          <div class="min-w-0">
            <p class="text-2xl font-bold leading-tight truncate">
              {{ reg?.patient?.patientName ?? '-' }}
            </p>
            <p v-if="patientMeta" class="text-sm text-muted">
              {{ patientMeta }}
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <UBadge variant="subtle" color="primary" icon="i-lucide-id-card">
                RM {{ reg?.patient?.patientCode ?? '-' }}
              </UBadge>
              <UBadge variant="subtle" color="secondary" icon="i-lucide-ticket">
                Locker {{ reg?.serviceNumber ?? '-' }}
              </UBadge>
              <UBadge variant="subtle" color="neutral" icon="i-lucide-stethoscope">
                {{ SERVICE_LABEL[reg?.serviceType ?? ''] ?? reg?.serviceType ?? '-' }}
              </UBadge>
            </div>
          </div>

          <div class="ml-auto text-right">
            <p class="text-[11px] uppercase tracking-wide text-muted">
              Queue Number
            </p>
            <p class="text-4xl font-black leading-none text-secondary">
              {{ reg?.queue?.queueCode ?? '-' }}
            </p>
            <div class="mt-2 flex items-center justify-end gap-2">
              <UBadge
                :color="REG_STATUS_COLOR[reg?.statusRegistration ?? ''] ?? 'neutral'"
                variant="subtle"
                size="lg"
              >
                {{ reg?.statusRegistration ?? '-' }}
              </UBadge>
            </div>
            <p class="mt-1 text-xs text-muted">
              {{ formatDate(reg?.examDate) }}
            </p>
          </div>
        </div>

        <!-- INFO STRIP -->
        <div class="relative px-6 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-building-2" />
            {{ reg?.branch?.nameBranch ?? '-' }}
          </span>
          <span v-if="reg?.company?.customerName" class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-briefcase" />
            {{ reg.company.customerName }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-hash" />
            {{ reg?.id_reg ?? '-' }}
          </span>
        </div>
      </header>

      <!-- SUMMARY -->
      <section class="shrink-0 px-6 py-3 border-b border-default flex flex-wrap items-center gap-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <div class="w-24 rounded-xl border border-default bg-elevated px-3 py-2">
            <p class="text-[11px] text-muted">
              Done
            </p>
            <p class="text-xl font-bold text-success">
              {{ stats.done }}
            </p>
          </div>
          <div class="w-24 rounded-xl border border-default bg-elevated px-3 py-2">
            <p class="text-[11px] text-muted">
              In Progress
            </p>
            <p class="text-xl font-bold text-warning">
              {{ stats.process }}
            </p>
          </div>
          <div class="w-24 rounded-xl border border-default bg-elevated px-3 py-2">
            <p class="text-[11px] text-muted">
              Waiting
            </p>
            <p class="text-xl font-bold text-info">
              {{ stats.waiting }}
            </p>
          </div>
          <div class="w-24 rounded-xl border border-default bg-elevated px-3 py-2">
            <p class="text-[11px] text-muted">
              Attention
            </p>
            <p class="text-xl font-bold text-error">
              {{ stats.attention }}
            </p>
          </div>
        </div>

        <div class="flex-1 min-w-48">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-medium">Examination Progress</span>
            <span class="text-sm font-bold">{{ progress }}%</span>
          </div>
          <UProgress
            :model-value="progress"
            :color="allDone ? 'success' : 'primary'"
            size="lg"
          />
        </div>

        <UButton
          size="md"
          variant="soft"
          icon="i-lucide-refresh-cw"
          :loading="refreshing"
          @click="refreshBoard"
        >
          Refresh
        </UButton>
      </section>

      <!-- DEPARTMENTS (no-scroll: ekstra item menambah kolom, bukan scroll) -->
      <main class="flex-1 min-h-0 overflow-hidden px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 content-start auto-rows-min">
        <UCard
          v-for="group in groupedItems"
          :key="group.name"
          :ui="{ body: 'p-4' }"
          class="border border-default"
        >
          <div class="flex items-center gap-2 mb-3">
            <div class="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UIcon :name="deptIcon(group.name)" class="text-lg" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ group.name }}
              </p>
              <p class="text-[11px] text-muted">
                {{ group.done }}/{{ group.total }} done
              </p>
            </div>
            <UBadge
              v-if="group.total > 0 && group.done === group.total"
              class="ml-auto shrink-0"
              color="success"
              variant="subtle"
              size="sm"
              icon="i-lucide-check-circle-2"
            >
              Complete
            </UBadge>
          </div>

          <UProgress
            :model-value="group.total === 0 ? 0 : Math.round((group.done / group.total) * 100)"
            :color="group.done === group.total ? 'success' : 'primary'"
            size="xs"
            class="mb-3"
          />

          <ul class="space-y-1.5">
            <li
              v-for="(item, index) in group.items"
              :key="index"
              class="flex items-center justify-between gap-2 text-xs"
            >
              <span class="flex items-center gap-1.5 min-w-0">
                <UIcon
                  :name="statusIcon(item.status)"
                  :class="[
                    'shrink-0',
                    statusColor(item.status) === 'success' ? 'text-success' : '',
                    statusColor(item.status) === 'warning' ? 'text-warning' : '',
                    statusColor(item.status) === 'info' ? 'text-info' : '',
                    statusColor(item.status) === 'error' ? 'text-error' : 'text-muted'
                  ]"
                />
                <span class="truncate">{{ item.name }}</span>
              </span>
              <UBadge
                :color="statusColor(item.status)"
                variant="subtle"
                size="sm"
                class="shrink-0"
              >
                {{ statusLabel(item.status) }}
              </UBadge>
            </li>
          </ul>
        </UCard>

        <div v-if="groupedItems.length === 0" class="col-span-full flex flex-col items-center justify-center text-muted py-10">
          <UIcon name="i-lucide-clipboard-x" class="text-4xl mb-2" />
          No examination items yet
        </div>
      </main>

      <!-- FOOTER -->
      <footer class="shrink-0 px-6 py-3 border-t border-default bg-elevated flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="relative h-10 w-10 rounded-full border-2 border-secondary/30 flex items-center justify-center">
            <span class="text-sm font-bold text-secondary">{{ countdown }}</span>
          </div>
          <p class="text-sm text-muted">
            Returning to search in <span class="font-semibold text-default">{{ countdown }}</span>s
          </p>
        </div>
        <UButton
          color="secondary"
          size="lg"
          icon="i-lucide-scan-barcode"
          @click="scanAgain"
        >
          Scan Again
        </UButton>
      </footer>
    </div>
  </div>
</template>
