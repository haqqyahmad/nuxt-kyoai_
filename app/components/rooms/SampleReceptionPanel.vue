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
const isReceiveModalOpen = ref(false)
const selectedSample = ref<ReceptionSample | null>(null)
const receiveLoading = ref(false)
const modalLockAcquired = ref(false)
const releasingModalLock = ref(false)

async function loadSamples() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, unknown> = {
      status: 'COLLECTED',
      limit: 100,
      page: 1,
      _: Date.now()
    }
    // Filter by roomTypeId from active room session
    if (props.activeRoomSession?.roomTypeId) {
      params.roomTypeId = props.activeRoomSession.roomTypeId
    }
    const res = await api.get('/medical/exams/queue/samples', { params })
    const responseBody = res.data
    const payload = responseBody?.data ?? responseBody
    const list = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.data) ? payload.data : [])
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
  return s.takenBy != null && s.takenBy === myUserId.value
}

function canReceive(s: ReceptionSample) {
  return sessionActive.value
    && s.status === 'COLLECTED'
    && (s.takenBy == null || isTakenByMe(s))
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }
  return fallback
}

async function openReceiveModal(s: ReceptionSample) {
  if (!sessionActive.value) {
    toast.add({ title: 'Sesi room belum aktif', description: 'Masuk ke room dulu.', color: 'warning' })
    return
  }

  if (!canReceive(s)) {
    toast.add({
      title: 'Sample sedang diproses',
      description: 'Sample ini sedang ditangani petugas reception lain.',
      color: 'warning'
    })
    return
  }

  actionLoading.value = { ...actionLoading.value, [s.id]: true }
  try {
    modalLockAcquired.value = isTakenByMe(s)
    if (s.takenBy == null) {
      await api.patch(`/medical/exams/queue/samples/${s.id}/take`)
      modalLockAcquired.value = true
    }

    const detailResponse = await api.get(`/medical/exams/queue/samples/${s.id}`)
    selectedSample.value = (detailResponse.data?.data ?? detailResponse.data) as ReceptionSample
    isReceiveModalOpen.value = true
  } catch (error: unknown) {
    if (modalLockAcquired.value) {
      await api.patch(`/medical/exams/queue/samples/${s.id}/release`).catch(() => undefined)
      modalLockAcquired.value = false
    }
    toast.add({
      title: 'Gagal membuka detail sample',
      description: getErrorMessage(error, 'Sample mungkin sudah diproses petugas lain.'),
      color: 'error'
    })
    await loadSamples()
  } finally {
    actionLoading.value = { ...actionLoading.value, [s.id]: false }
  }
}

async function releaseModalLock() {
  if (!modalLockAcquired.value || !selectedSample.value || releasingModalLock.value) return

  releasingModalLock.value = true
  const sampleId = selectedSample.value.id
  try {
    await api.patch(`/medical/exams/queue/samples/${sampleId}/release`)
  } finally {
    modalLockAcquired.value = false
    releasingModalLock.value = false
    await loadSamples()
  }
}

async function closeReceiveModal() {
  isReceiveModalOpen.value = false
  await releaseModalLock()
  selectedSample.value = null
}

async function confirmReceive() {
  if (!selectedSample.value || receiveLoading.value) return

  receiveLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/samples/${selectedSample.value.id}/receive`)
    modalLockAcquired.value = false
    isReceiveModalOpen.value = false
    selectedSample.value = null
    toast.add({ title: 'Berhasil', description: 'Sample diterima Lab.', color: 'success' })
    await loadSamples()
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal menerima sample',
      description: getErrorMessage(error, 'Sample tidak dapat diterima.'),
      color: 'error'
    })
  } finally {
    receiveLoading.value = false
  }
}

watch(isReceiveModalOpen, (open) => {
  if (!open && modalLockAcquired.value) void releaseModalLock()
})

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
      Tidak ada sample yang menunggu diterima.
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

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UButton
            color="success"
            variant="soft"
            icon="i-lucide-package-check"
            :loading="actionLoading[s.id]"
            :disabled="!canReceive(s)"
            @click="openReceiveModal(s)"
          >
            Terima Sample
          </UButton>
          <span v-if="s.takenBy != null && !isTakenByMe(s)" class="text-xs text-warning">
            Sedang diproses {{ s.takenByUser?.name || 'petugas lain' }}
          </span>
        </div>
      </div>
    </div>
  </UCard>

  <UModal
    v-model:open="isReceiveModalOpen"
    title="Konfirmasi Penerimaan Sample"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="selectedSample" class="space-y-5">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-user-round"
          title="Detail pasien"
          :description="`${formatPatient(selectedSample.queueEntry)} · ${selectedSample.queueEntry?.registration?.patient?.PatientId || '-'} · Queue ${selectedSample.queueEntry?.queueCode || '-'}`"
        />

        <div class="grid gap-3 rounded-xl border border-default p-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted">
              Jenis sample
            </p>
            <p class="font-medium text-highlighted">
              {{ selectedSample.sampleType?.name || 'Sample' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Tabung / Barcode
            </p>
            <p class="font-medium text-highlighted">
              {{ selectedSample.tubeCount ?? 1 }} / {{ selectedSample.barcode || '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Dikumpulkan oleh
            </p>
            <p class="font-medium text-highlighted">
              {{ selectedSample.collectedByUser?.name || '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Waktu pengambilan
            </p>
            <p class="font-medium text-highlighted">
              {{ formatDateTime(selectedSample.collectedAt) }}
            </p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-sm font-semibold text-highlighted">
            Item pemeriksaan terkait
          </p>
          <div v-if="selectedSample.items?.length" class="space-y-2">
            <div
              v-for="item in selectedSample.items"
              :key="item.id"
              class="flex items-center gap-3 rounded-lg border border-default px-3 py-2"
            >
              <UBadge color="neutral" variant="soft">
                {{ item.item?.code || '-' }}
              </UBadge>
              <span class="text-sm text-highlighted">
                {{ item.item?.name || 'Item pemeriksaan' }}
              </span>
            </div>
          </div>
          <p v-else class="text-sm text-muted">
            Tidak ada item pemeriksaan terkait.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="receiveLoading || releasingModalLock"
          @click="closeReceiveModal"
        >
          Batal
        </UButton>
        <UButton
          color="success"
          icon="i-lucide-package-check"
          :loading="receiveLoading"
          @click="confirmReceive"
        >
          Konfirmasi Terima Sample
        </UButton>
      </div>
    </template>
  </UModal>
</template>
