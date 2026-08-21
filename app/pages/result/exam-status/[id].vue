<script setup lang="ts">
type ExamItemDepartment = { id: string, name: string, code?: string | null } | null

type ExamInput = {
  id: string
  label: string
  inputType: string
  uom?: string | null
}

type ExamItem = {
  id: string
  source: 'paket' | 'additional'
  sortOrder: number
  workStatus: string
  workStartedAt?: string | null
  workDoneAt?: string | null
  workUpdatedBy?: number | null
  resultStatus: string
  templateSnapshotAt?: string | null
  resultSubmittedAt?: string | null
  resultSubmittedBy?: number | null
  roomExamItems?: Array<{
    id: string
    status: string
    startAt?: string | null
    doneAt?: string | null
    updatedAt?: string | null
  }>
  externalAssignment?: {
    status?: string | null
    assignedAt?: string | null
    filledAt?: string | null
    assignedExternalUserId?: number | null
  } | null
  item: {
    id: string
    code?: string | null
    name: string
    resultTiming?: 'inline' | 'deferred' | null
    externalResult?: boolean
    externalProcessSlaDays?: number | null
    department?: ExamItemDepartment
    group?: { id: string, name: string } | null
    inputans?: ExamInput[]
  }
}

type Registration = {
  id: number
  id_reg: string
  examDate: string
  statusRegistration: string
  serviceType: string
  patient?: {
    id: string
    patientCode: string
    patientName: string
    firstName: string
    middleName?: string
    lastName: string
    gender: string
  } | null
  exam?: {
    id: string
    status: string
    paket?: { id: string, name: string } | null
    examItems: ExamItem[]
  } | null
}

const route = useRoute()
const api = useApi()
const router = useRouter()

const idReg = computed(() => String(route.params.id ?? ''))

const userNameMap = ref<Record<number, string>>({})

const { data: reg, pending: loading, error: loadError, refresh } = await useAsyncData<Registration | null>(
  `exam-status-${idReg.value}`,
  async () => {
    if (!idReg.value) return null
    try {
      const res = await api.get(`/registration/number/${idReg.value}`)
      return res.data?.data ?? res.data ?? null
    } catch {
      return null
    }
  },
  { default: () => null }
)

async function loadUsers() {
  try {
    const res = await api.get('/users', { params: { limit: 500 } })
    const payload = res.data?.data ?? res.data ?? []
    const rows = Array.isArray(payload) ? payload : []
    userNameMap.value = Object.fromEntries(rows.map((user: any) => [Number(user.id), user.name || user.email || `User #${user.id}`]))
  } catch {
    userNameMap.value = {}
  }
}

function getUserName(id?: number | null) {
  if (!id) return '-'
  return userNameMap.value[id] ?? `User #${id}`
}

onMounted(loadUsers)

function formatDateTime(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return null
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}j ${minutes % 60}m`
  return `${minutes}m`
}

function getExamItemStatus(ei: ExamItem) {
  const statuses = ei.roomExamItems?.map(item => item.status) ?? []
  if (statuses.includes('DONE')) return 'DONE'
  if (statuses.includes('IN_PROGRESS')) return 'IN_PROGRESS'
  if (statuses.includes('CALLED')) return 'CALLED'
  if (statuses.includes('REFUSED')) return 'REFUSED'
  if (statuses.includes('SKIPPED')) return 'SKIPPED'
  if (statuses.includes('RESCHEDULED')) return 'RESCHEDULED'
  return statuses[0] ?? 'PENDING'
}

function getStatusLabel(s: string) {
  const map: Record<string, string> = {
    DONE: 'Selesai',
    IN_PROGRESS: 'Sedang dikerjakan',
    CALLED: 'Sudah dipanggil',
    PENDING: 'Menunggu',
    SKIPPED: 'Skip',
    RESCHEDULED: 'Reschedule',
    REFUSED: 'Ditolak',
  }
  return map[s] ?? s
}

function getStatusColor(s: string): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
  if (s === 'DONE') return 'success'
  if (s === 'IN_PROGRESS') return 'warning'
  if (s === 'CALLED') return 'info'
  if (['REFUSED', 'SKIPPED'].includes(s)) return 'error'
  return 'neutral'
}

function getResultStatusLabel(s: string) {
  const map: Record<string, string> = {
    NOT_READY: 'Belum siap',
    DRAFT: 'Draft',
    SUBMITTED: 'Tersubmit',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  }
  return map[s] ?? s
}

function getResultStatusColor(s: string): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
  if (s === 'APPROVED') return 'success'
  if (s === 'SUBMITTED') return 'info'
  if (s === 'DRAFT') return 'warning'
  if (s === 'REJECTED') return 'error'
  return 'neutral'
}

function getTimingLabel(t?: string | null) {
  if (t === 'deferred') return 'Deferred'
  if (t === 'inline') return 'Inline'
  return '-'
}

function getTimingColor(t?: string | null) {
  if (t === 'deferred') return 'warning' as const
  return 'info' as const
}

function getEarliestStart(ei: ExamItem) {
  const times = (ei.roomExamItems ?? []).map(r => r.startAt).filter((v): v is string => Boolean(v))
  return times.length ? times.reduce((a, b) => a < b ? a : b) : null
}

function getLatestDone(ei: ExamItem) {
  const times = (ei.roomExamItems ?? []).map(r => r.doneAt).filter((v): v is string => Boolean(v))
  return times.length ? times.reduce((a, b) => a > b ? a : b) : null
}

function getWorkDoneAt(ei: ExamItem) {
  return ei.workDoneAt ?? getLatestDone(ei)
}

function isRoomDone(ei: ExamItem) {
  return getExamItemStatus(ei) === 'DONE'
}

function isResultSent(ei: ExamItem) {
  return ['SUBMITTED', 'APPROVED'].includes(ei.resultStatus)
}

function isResultFinal(ei: ExamItem) {
  return ei.resultStatus === 'APPROVED'
}

function getExternalSlaDays(ei: ExamItem) {
  return ei.item.externalProcessSlaDays ?? 3
}

function getExternalDeadline(ei: ExamItem) {
  const assignedAt = ei.externalAssignment?.assignedAt
  if (!assignedAt) return null
  const deadline = new Date(assignedAt)
  deadline.setDate(deadline.getDate() + getExternalSlaDays(ei))
  return deadline
}

function isExternalOverdue(ei: ExamItem) {
  if (ei.externalAssignment?.status !== 'ASSIGNED') return false
  const deadline = getExternalDeadline(ei)
  return deadline ? new Date() > deadline : false
}

function getExternalSlaSummary(ei: ExamItem) {
  if (!ei.externalAssignment) return ''
  const days = getExternalSlaDays(ei)
  const deadline = getExternalDeadline(ei)
  if (!deadline) return ''
  const ms = deadline.getTime() - Date.now()
  if (ms <= 0) return `SLA ${days} hari — sudah lewat batas waktu`
  const hours = Math.floor(ms / 3600000)
  const d = Math.floor(hours / 24)
  return d > 0 ? `SLA ${days} hari — ${d} hari ${hours % 24} jam tersisa` : `SLA ${days} hari — ${hours} jam tersisa`
}

function getDeferredSummary(ei: ExamItem) {
  if (!isRoomDone(ei)) return 'Pemeriksaan room belum selesai.'
  if (!isResultSent(ei)) return 'Pemeriksaan selesai, hasil deferred belum dikirim.'
  if (!isResultFinal(ei)) return 'Hasil sudah dikirim, menunggu approval/finalisasi.'
  return 'Hasil sudah final.'
}

const examItems = computed(() => reg.value?.exam?.examItems ?? [])

const groupedByDept = computed(() => {
  const grouped = new Map<string, {
    deptName: string
    inlineItems: ExamItem[]
    deferredItems: ExamItem[]
  }>()

  for (const ei of examItems.value) {
    const deptName = ei.item.department?.name ?? 'Lainnya'
    if (!grouped.has(deptName)) {
      grouped.set(deptName, { deptName, inlineItems: [], deferredItems: [] })
    }
    const group = grouped.get(deptName)!
    if (ei.item.resultTiming === 'deferred') {
      group.deferredItems.push(ei)
    } else {
      group.inlineItems.push(ei)
    }
  }

  return [...grouped.values()]
})

const overallStats = computed(() => {
  const items = examItems.value
  const total = items.length
  const done = items.filter(ei => getExamItemStatus(ei) === 'DONE').length
  const inProgress = items.filter(ei => getExamItemStatus(ei) === 'IN_PROGRESS').length
  const pending = total - done - inProgress
  const inline = items.filter(ei => ei.item.resultTiming !== 'deferred').length
  const deferred = items.filter(ei => ei.item.resultTiming === 'deferred').length
  const submitted = items.filter(ei => ['SUBMITTED', 'APPROVED'].includes(ei.resultStatus)).length
  return { total, done, inProgress, pending, inline, deferred, submitted }
})
</script>

<template>
  <UDashboardPanel id="exam-status">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            @click="router.back()"
          />
          <h1 class="text-lg font-semibold ml-2">
            Status Examination
          </h1>
        </template>
        <template #right>
          <UBadge
            v-if="reg"
            :label="reg.statusRegistration"
            :color="reg.statusRegistration === 'Checkin' ? 'info' : reg.statusRegistration === 'CheckOut' ? 'success' : 'neutral'"
            variant="subtle"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="loading"
            @click="() => void refresh()"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex min-h-96 items-center justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      </div>

      <div v-else-if="loadError || !reg" class="flex min-h-96 items-center justify-center p-6">
        <UAlert
          color="error"
          variant="soft"
          title="Data tidak ditemukan"
          description="Registrasi tidak ditemukan atau gagal dimuat."
          class="max-w-xl"
        />
      </div>

      <div v-else class="w-full max-w-none py-6 px-4 space-y-6">
        <!-- Registration Info -->
        <div class="rounded-xl border border-default bg-default p-5">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="flex items-center gap-3">
                <code class="text-xl font-bold bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg">
                  {{ reg.id_reg }}
                </code>
                <UBadge
                  :label="reg.serviceType"
                  color="primary"
                  variant="soft"
                />
              </div>
              <p v-if="reg.patient" class="mt-2 text-sm text-muted">
                {{ reg.patient.patientName }} · {{ reg.patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan' }} · {{ reg.patient.patientCode }}
              </p>
              <p class="mt-1 text-xs text-muted">
                Exam Date: {{ reg.examDate }}
              </p>
            </div>

            <!-- Overall Stats -->
            <div class="grid grid-cols-3 gap-3">
              <div class="text-center rounded-lg border border-default bg-muted/20 px-4 py-2">
                <p class="text-2xl font-bold text-highlighted">{{ overallStats.done }}</p>
                <p class="text-[10px] font-medium uppercase text-muted">Selesai</p>
              </div>
              <div class="text-center rounded-lg border border-default bg-muted/20 px-4 py-2">
                <p class="text-2xl font-bold text-warning">{{ overallStats.inProgress }}</p>
                <p class="text-[10px] font-medium uppercase text-muted">Dikerjakan</p>
              </div>
              <div class="text-center rounded-lg border border-default bg-muted/20 px-4 py-2">
                <p class="text-2xl font-bold text-muted">{{ overallStats.pending }}</p>
                <p class="text-[10px] font-medium uppercase text-muted">Menunggu</p>
              </div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2 border-t border-default pt-3">
            <UBadge :label="`Total ${overallStats.total} item`" color="neutral" variant="subtle" />
            <UBadge :label="`Inline: ${overallStats.inline}`" color="info" variant="soft" size="sm" />
            <UBadge :label="`Deferred: ${overallStats.deferred}`" color="warning" variant="soft" size="sm" />
            <UBadge :label="`Tersubmit: ${overallStats.submitted}`" color="success" variant="soft" size="sm" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!examItems.length" class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center">
          <UIcon name="i-lucide-clipboard-list" class="mb-2 size-8 text-muted" />
          <p class="text-sm font-medium text-highlighted">Belum ada item pemeriksaan</p>
        </div>

        <!-- Per Department -->
        <div
          v-for="dept in groupedByDept"
          :key="dept.deptName"
          class="rounded-xl border border-default bg-default overflow-hidden"
        >
          <div class="px-5 py-4 border-b border-default bg-muted/10">
            <h3 class="font-semibold text-highlighted">{{ dept.deptName }}</h3>
            <p class="text-xs text-muted">
              {{ dept.inlineItems.length + dept.deferredItems.length }} item
              · {{ dept.inlineItems.filter(ei => getExamItemStatus(ei) === 'DONE').length + dept.deferredItems.filter(ei => getExamItemStatus(ei) === 'DONE').length }} selesai
            </p>
          </div>

          <!-- Inline Items -->
          <div v-if="dept.inlineItems.length" class="border-b border-default">
            <div class="px-5 py-2 bg-muted/5">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Inline — hasil diisi saat pemeriksaan
              </p>
            </div>
            <div class="divide-y divide-default">
              <div
                v-for="ei in dept.inlineItems"
                :key="ei.id"
                class="px-5 py-3.5"
              >
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-lg font-bold text-highlighted">{{ ei.item.name }}</p>
                      <UBadge
                        :label="getStatusLabel(getExamItemStatus(ei))"
                        :color="getStatusColor(getExamItemStatus(ei))"
                        variant="soft"
                        size="xs"
                      />
                      <UBadge
                        v-if="ei.item.externalResult"
                        label="External"
                        color="info"
                        variant="outline"
                        size="xs"
                      />
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span v-if="getEarliestStart(ei)">
                        Mulai {{ formatDateTime(getEarliestStart(ei)) }}
                      </span>
                      <span v-if="getLatestDone(ei)">
                        Selesai {{ formatDateTime(getLatestDone(ei)) }}
                      </span>
                      <span v-if="getEarliestStart(ei) && getLatestDone(ei)" class="text-primary font-medium">
                        ({{ formatDuration(getEarliestStart(ei), getLatestDone(ei)) }})
                      </span>
                      <span v-if="!getEarliestStart(ei) && !getLatestDone(ei)" class="italic">
                        Belum dikerjakan
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <UBadge
                      :label="`Result: ${getResultStatusLabel(ei.resultStatus)}`"
                      :color="getResultStatusColor(ei.resultStatus)"
                      variant="soft"
                      size="xs"
                    />
                    <span v-if="ei.templateSnapshotAt" class="text-[10px] text-muted">
                      Draft {{ formatDateTime(ei.templateSnapshotAt) }}
                    </span>
                  </div>
                </div>

                <!-- Sample Status -->
                <div
                  v-if="ei.roomExamItems?.some(r => ['COLLECTED', 'REJECTED', 'RESCHEDULED'].includes(r.status))"
                  class="mt-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-1.5 text-xs text-muted"
                >
                  Sample perlu perhatian —
                  {{ ei.roomExamItems?.find(r => r.status === 'REJECTED') ? 'ditolak' : ei.roomExamItems?.find(r => r.status === 'RESCHEDULED') ? 'dijadwalkan ulang' : 'menunggu diterima lab' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Deferred Items -->
          <div v-if="dept.deferredItems.length">
            <div class="px-5 py-2 bg-muted/5">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Deferred — hasil diinput terpisah
              </p>
            </div>
            <div class="divide-y divide-default">
              <div
                v-for="ei in dept.deferredItems"
                :key="ei.id"
                class="px-5 py-5"
              >
                <div class="rounded-2xl border border-warning/30 bg-warning/5 p-5">
                  <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-xl font-extrabold text-highlighted">{{ ei.item.name }}</p>
                        <UBadge label="Deferred" color="warning" variant="soft" size="sm" />
                        <UBadge
                          :label="getStatusLabel(getExamItemStatus(ei))"
                          :color="getStatusColor(getExamItemStatus(ei))"
                          variant="soft"
                          size="sm"
                        />
                        <UBadge
                          :label="`Result: ${getResultStatusLabel(ei.resultStatus)}`"
                          :color="getResultStatusColor(ei.resultStatus)"
                          variant="solid"
                          size="sm"
                        />
                      </div>
                      <p class="mt-2 text-sm font-medium text-muted">
                        {{ getDeferredSummary(ei) }}
                      </p>
                      <div v-if="isExternalOverdue(ei)" class="mt-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-xs text-error">
                        SLA {{ getExternalSlaDays(ei) }} hari terlampaui. Dikirim {{ formatDateTime(ei.externalAssignment?.assignedAt) }} — batas {{ formatDateTime(getExternalDeadline(ei)?.toISOString()) }}.
                      </div>
                      <div v-else-if="ei.externalAssignment?.status === 'ASSIGNED'" class="mt-2 rounded-lg border border-default bg-default px-3 py-2 text-xs text-muted">
                        {{ getExternalSlaSummary(ei) }}
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <UBadge
                        :label="isRoomDone(ei) ? 'Pemeriksaan selesai' : 'Pemeriksaan belum selesai'"
                        :color="isRoomDone(ei) ? 'success' : 'warning'"
                        variant="subtle"
                      />
                      <UBadge
                        :label="isResultSent(ei) ? 'Hasil sudah dikirim' : 'Hasil belum dikirim'"
                        :color="isResultSent(ei) ? 'info' : 'neutral'"
                        variant="subtle"
                      />
                      <UBadge
                        :label="isResultFinal(ei) ? 'Final' : 'Belum final'"
                        :color="isResultFinal(ei) ? 'success' : 'warning'"
                        variant="subtle"
                      />
                    </div>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div class="rounded-xl border border-default bg-default p-3">
                      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Mulai dikerjakan</p>
                      <p class="mt-1 text-sm font-bold text-highlighted">{{ formatDateTime(getEarliestStart(ei) || ei.workStartedAt) }}</p>
                    </div>
                    <div class="rounded-xl border border-default bg-default p-3">
                      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Selesai pemeriksaan</p>
                      <p class="mt-1 text-sm font-bold text-highlighted">{{ formatDateTime(getWorkDoneAt(ei)) }}</p>
                      <p v-if="formatDuration(getEarliestStart(ei) || ei.workStartedAt, getWorkDoneAt(ei))" class="mt-1 text-xs text-primary">
                        Durasi {{ formatDuration(getEarliestStart(ei) || ei.workStartedAt, getWorkDoneAt(ei)) }}
                      </p>
                    </div>
                    <div class="rounded-xl border border-default bg-default p-3">
                      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Hasil dikirim</p>
                      <p class="mt-1 text-sm font-bold text-highlighted">{{ formatDateTime(ei.resultSubmittedAt) }}</p>
                      <p class="mt-1 text-xs text-muted">Oleh: {{ getUserName(ei.resultSubmittedBy) }}</p>
                    </div>
                    <div class="rounded-xl border border-default bg-default p-3">
                      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Diproses / final</p>
                      <p class="mt-1 text-sm font-bold text-highlighted">{{ getResultStatusLabel(ei.resultStatus) }}</p>
                      <p v-if="ei.templateSnapshotAt" class="mt-1 text-xs text-muted">Snapshot {{ formatDateTime(ei.templateSnapshotAt) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
