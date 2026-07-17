<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  activeRoomSession: {
    id: string
    roomId?: string | null
    roomTypeId?: string | null
  } | null
  isSuperAdmin?: boolean
}>()

const api = useApi()
const toast = useToast()
const { session: roomSession } = await useRoomSession()

type SampleUser = { id: number, name: string, email?: string | null }
type ReceptionSample = {
  id: string
  status: string
  tubeCount?: number | null
  barcode?: string | null
  collectedAt?: string | null
  receivedAt?: string | null
  takenBy?: number | null
  takenAt?: string | null
  takenByUser?: SampleUser | null
  collectedByUser?: SampleUser | null
  receivedByUser?: SampleUser | null
  sampleType?: { id: string, name?: string | null } | null
  queueEntry?: {
    id: string
    queueCode?: string | null
    registration?: {
      id: number
      id_reg?: string | null
      patient?: {
        id: number
        PatientId?: string | null
        firstName?: string | null
        middleName?: string | null
        lastName?: string | null
        gender?: string | null
        dob?: string | null
      } | null
    } | null
  } | null
  items?: Array<{ id: string, item?: { id: string, code?: string | null, name?: string | null } | null }>
}

const samples = ref<ReceptionSample[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const actionLoading = ref<Record<string, boolean>>({})

async function loadSamples() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, unknown> = {
      status: 'PENDING,COLLECTED',
      limit: 100,
      page: 1,
      _: Date.now()
    }
    // Filter by roomTypeId from active room session
    if (props.activeRoomSession?.roomTypeId) {
      params.roomTypeId = props.activeRoomSession.roomTypeId
    }
    const res = await api.get('/medical/exams/queue/samples', { params })
    const payload = res.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    samples.value = list as ReceptionSample[]
  } catch {
    error.value = 'Gagal memuat antrian sample reception.'
  } finally {
    loading.value = false
  }
}

function formatPatient(p?: ReceptionSample['queueEntry']): string {
  const pt = p?.registration?.patient
  if (!pt) return '-'
  return [pt.firstName, pt.middleName, pt.lastName].filter(Boolean).join(' ') || '-'
}

function formatDateTime(s?: string | null) {
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function getSampleStatusLabel(status: string) {
  if (status === 'PENDING') return 'Belum diambil'
  if (status === 'COLLECTED') return 'Sudah diambil'
  if (status === 'RECEIVED') return 'Diterima & diverifikasi'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return status
}

const sessionActive = computed(() => Boolean(roomSession.value?.id) && !roomSession.value?.endedAt)
const myUserId = computed(() => (roomSession.value as { userId?: number } | null)?.userId ?? null)

function isTakenByMe(s: ReceptionSample) {
  return s.takenBy != null && (s.takenBy === myUserId.value || isSuperAdmin.value)
}

function canAct(s: ReceptionSample) {
  return sessionActive.value && (s.takenBy == null || isTakenByMe(s))
}

async function take(s: ReceptionSample) {
  if (!sessionActive.value) {
    toast.add({ title: 'Sesi room belum aktif', description: 'Masuk ke room dulu.', color: 'warning' })
    return
  }
  actionLoading.value = { ...actionLoading.value, [s.id]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${s.id}/take`)
    toast.add({ title: 'Berhasil', description: 'Sample collection diambil.', color: 'success' })
    await loadSamples()
  } catch {
    toast.add({ title: 'Gagal mengambil', description: 'Collection mungkin sudah diambil petugas lain.', color: 'error' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [s.id]: false }
  }
}

async function release(s: ReceptionSample) {
  actionLoading.value = { ...actionLoading.value, [s.id]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${s.id}/release`)
    toast.add({ title: 'Berhasil', description: 'Lock dilepas.', color: 'success' })
    await loadSamples()
  } catch {
    toast.add({ title: 'Gagal melepas lock', color: 'error' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [s.id]: false }
  }
}

async function collect(s: ReceptionSample) {
  if (!canAct(s)) {
    toast.add({ title: 'Tidak dapat mengambil sample', description: 'Pastikan Anda mengambil antrian ini dan sesi room aktif.', color: 'warning' })
    return
  }
  actionLoading.value = { ...actionLoading.value, [s.id]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${s.id}/collect`, { tubeCount: s.tubeCount ?? 1 })
    toast.add({ title: 'Berhasil', description: 'Sample diambil petugas.', color: 'success' })
    await loadSamples()
  } catch {
    toast.add({ title: 'Gagal mengambil sample', description: 'Pastikan petugas sudah login (active session).', color: 'error' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [s.id]: false }
  }
}

async function receive(s: ReceptionSample) {
  if (!canAct(s)) {
    toast.add({ title: 'Tidak dapat menerima sample', description: 'Pastikan Anda mengambil antrian ini dan sesi room aktif.', color: 'warning' })
    return
  }
  actionLoading.value = { ...actionLoading.value, [s.id]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${s.id}/receive`)
    toast.add({ title: 'Berhasil', description: 'Sample diterima Lab.', color: 'success' })
    await loadSamples()
  } catch {
    toast.add({ title: 'Gagal menerima sample', color: 'error' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [s.id]: false }
  }
}

watch(
  () => props.activeRoomSession?.id,
  () => { if (props.activeRoomSession) loadSamples() },
  { immediate: true }
)
</script>

<template>
  <UCard class="overflow-hidden border border-default/80 shadow-sm">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            Sample Reception
          </h3>
          <p class="text-sm text-muted">
            Antrian diambil dari data sample collection (bukan ruang tunggu umum).
          </p>
        </div>
        <UButton
          icon="i-lucide-refresh-cw"
          variant="soft"
          color="neutral"
          :loading="loading"
          @click="loadSamples"
        >
          Refresh
        </UButton>
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-5" />
      <span class="ml-2 text-sm">Memuat antrian sample…</span>
    </div>

    <div v-else-if="error" class="py-8 text-center text-sm text-muted">
      {{ error }}
    </div>

    <div v-else-if="!samples.length" class="py-10 text-center text-sm text-muted">
      Tidak ada sample collection yang menunggu diambil.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="s in samples"
        :key="s.id"
        class="rounded-lg border border-default p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">
              {{ formatPatient(s.queueEntry) }}
              <span class="ml-1 font-normal text-muted">
                ({{ s.queueEntry?.registration?.patient?.PatientId || '-' }})
              </span>
            </p>
            <p class="text-xs text-muted">
              {{ s.sampleType?.name || 'Sample' }} ·
              Queue {{ s.queueEntry?.queueCode || '-' }}
            </p>
            <p v-if="s.items?.length" class="mt-1 text-xs text-muted">
              Item:
              <span
                v-for="it in s.items"
                :key="it.id"
                class="mr-1 inline-block rounded bg-muted/40 px-1.5 py-0.5"
              >{{ it.item?.name || it.item?.code || 'Item' }}</span>
            </p>
          </div>
          <UBadge :color="s.status === 'RECEIVED' ? 'success' : (s.status === 'COLLECTED' ? 'info' : 'warning')">
            {{ getSampleStatusLabel(s.status) }}
          </UBadge>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <p class="text-xs text-muted">
              Diambil (COLLECT)
            </p>
            <p class="text-highlighted">
              {{ s.collectedByUser?.name || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDateTime(s.collectedAt) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Diterima (RECEIVE)
            </p>
            <p class="text-highlighted">
              {{ s.receivedByUser?.name || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDateTime(s.receivedAt) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Lock petugas
            </p>
            <p class="text-highlighted">
              {{ s.takenByUser?.name || 'Bebas' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Tabung / Barcode
            </p>
            <p class="text-highlighted">
              {{ s.tubeCount ?? 1 }} / {{ s.barcode || '-' }}
            </p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <template v-if="s.takenBy == null">
            <UButton
              color="primary"
              variant="soft"
              icon="i-lucide-hand"
              :loading="actionLoading[s.id]"
              :disabled="!sessionActive"
              @click="take(s)"
            >
              Ambil Antrian
            </UButton>
          </template>
          <template v-else>
            <UButton
              v-if="s.status === 'PENDING'"
              color="primary"
              variant="soft"
              icon="i-lucide-test-tube-diagonal"
              :loading="actionLoading[s.id]"
              :disabled="!canAct(s)"
              @click="collect(s)"
            >
              Ambil Sample
            </UButton>
            <UButton
              v-if="s.status === 'COLLECTED'"
              color="success"
              variant="soft"
              icon="i-lucide-check-check"
              :loading="actionLoading[s.id]"
              :disabled="!canAct(s)"
              @click="receive(s)"
            >
              Terima Sample
            </UButton>
            <UButton
              v-if="isTakenByMe(s)"
              color="neutral"
              variant="ghost"
              icon="i-lucide-unlock"
              :loading="actionLoading[s.id]"
              @click="release(s)"
            >
              Lepas
            </UButton>
          </template>
        </div>
      </div>
    </div>
  </UCard>
</template>
