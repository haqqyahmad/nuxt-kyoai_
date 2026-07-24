<script setup lang="ts">
interface SampleCollectionRow {
  id: string
  status: string
  tubeCount?: number | null
  barcode?: string | null
  collectedAt?: string | null
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
      } | null
    } | null
  } | null
}

type StageQueueItem = {
  id: string
  stageId: string
  stageOrder: number
  status: string
  roomId: string | null
  stage?: { id: string, code: string, name: string } | null
}

type QueueDetail = {
  id: string
  queueCode?: string | null
  roomItems?: Array<{
    id: string
    roomTypeId: string
    status: string
    stageItems?: StageQueueItem[]
  }>
}

const props = defineProps<{
  open: boolean
}>()
const emit = defineEmits<{
  'close': []
  'collect': []
  'update:open': [value: boolean]
}>()

const api = useApi()
const router = useRouter()
const { session: roomSession } = await useRoomSession()

const loading = ref(false)
const search = ref('')
const allRows = ref<SampleCollectionRow[]>([])
const rows = ref<SampleCollectionRow[]>([])
const today = new Date().toISOString().slice(0, 10)
const dateFrom = ref(today)
const dateTo = ref(today)
const callLoading = ref<Record<string, boolean>>({})
const toast = useToast()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const roomTypeId = computed(() => roomSession.value?.roomTypeId ?? null)
const currentPage = ref(1)
const pageSize = ref(10)
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      status: 'PENDING',
      limit: 200,
      page: 1
    }
    if (roomTypeId.value) params.roomTypeId = roomTypeId.value
    if (dateFrom.value) params.examDateFrom = dateFrom.value
    if (dateTo.value) params.examDateTo = dateTo.value

    const res = await api.get('/medical/exams/queue/samples', { params })
    const payload = res.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    allRows.value = list as SampleCollectionRow[]
    filterRows()
  } catch {
    // error handled by global interceptor
  } finally {
    loading.value = false
  }
}

function filterRows() {
  const q = (search.value ?? '').toLowerCase().trim()
  if (!q) {
    rows.value = allRows.value
    return
  }
  rows.value = allRows.value.filter((row) => {
    const patient = row.queueEntry?.registration?.patient
    const name = [patient?.firstName, patient?.middleName, patient?.lastName].filter(Boolean).join(' ').toLowerCase()
    const rm = (row.queueEntry?.registration?.patient?.PatientId ?? '').toLowerCase()
    const idReg = (row.queueEntry?.registration?.id_reg ?? '').toLowerCase()
    const barcode = (row.barcode ?? '').toLowerCase()
    const queueCode = (row.queueEntry?.queueCode ?? '').toLowerCase()
    const sampleType = (row.sampleType?.name ?? '').toLowerCase()
    return name.includes(q) || rm.includes(q) || idReg.includes(q) || barcode.includes(q) || queueCode.includes(q) || sampleType.includes(q)
  })
}

function patientName(row: SampleCollectionRow) {
  const p = row.queueEntry?.registration?.patient
  return [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(' ') || '-'
}

async function handleGetPatient(row: SampleCollectionRow) {
  const queueEntryId = row.queueEntry?.id
  if (!queueEntryId || callLoading.value[queueEntryId]) return

  callLoading.value = { ...callLoading.value, [queueEntryId]: true }
  try {
    const detailRes = await api.get(`/medical/exams/queue/${queueEntryId}`)
    const detailPayload = detailRes.data?.data ?? detailRes.data ?? null
    const queueDetail = detailPayload as QueueDetail | null

    const roomItems = queueDetail?.roomItems ?? []
    let stageId: string | null = null
    for (const item of roomItems) {
      const waitingStage = item.stageItems?.find(
        (s: StageQueueItem) => s.status === 'WAITING'
      )
      if (waitingStage) {
        stageId = waitingStage.stageId
        break
      }
    }

    if (!stageId) {
      toast.add({
        title: 'Tidak ada stage waiting',
        description: 'Pasien ini tidak memiliki stage yang bisa dipanggil.',
        color: 'warning'
      })
      return
    }

    await api.patch(`/medical/exams/queue/stage/${stageId}/call`, {
      roomId: roomSession.value?.roomId ?? undefined,
      roomTypeId: roomSession.value?.roomTypeId ?? undefined
    })

    await router.push(`/rooms/sample-collection/${queueEntryId}`)
    isOpen.value = false

    toast.add({
      title: 'Berhasil',
      description: 'Pasien berhasil diambil dari waiting list.',
      color: 'success'
    })
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 409) {
      toast.add({
        title: 'Sudah diambil ruangan lain',
        description: 'Pasien ini sudah dipanggil oleh ruangan lain.',
        color: 'warning'
      })
    } else {
      toast.add({
        title: 'Gagal mengambil pasien',
        description: 'Terjadi kesalahan saat mengambil pasien.',
        color: 'error'
      })
    }
  } finally {
    callLoading.value = { ...callLoading.value, [queueEntryId]: false }
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) load()
  },
  { immediate: true }
)
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-4xl max-h-[85vh]' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div>
          <h3 class="font-semibold text-highlighted">
            Pilih Pasien
          </h3>
          <p class="text-sm text-muted">
            Pilih pasien untuk mengambil sample.
          </p>
        </div>
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="load"
        />
      </div>
    </template>
    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <UInput
            v-model="search"
            type="search"
            placeholder="Cari nama pasien, RM, queue, atau sample type..."
            icon="i-lucide-search"
            class="flex-1"
            @update:model-value="filterRows"
          />
          <UBadge :label="`${rows.length} pasien`" color="neutral" variant="subtle" />
        </div>

        <div class="flex items-center gap-3">
          <UFormField label="Dari" class="flex-1">
            <UInput
              v-model="dateFrom"
              type="date"
              :max="dateTo || undefined"
              @change="load"
            />
          </UFormField>
          <UFormField label="Sampai" class="flex-1">
            <UInput
              v-model="dateTo"
              type="date"
              :min="dateFrom || undefined"
              @change="load"
            />
          </UFormField>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-5 text-muted" />
          <span class="ml-2 text-sm text-muted">Memuat data...</span>
        </div>

        <div v-else-if="!rows.length" class="rounded-lg border border-dashed border-default py-12 text-center">
          <UIcon name="i-lucide-inbox" class="mx-auto mb-2 size-8 text-muted/50" />
          <p class="font-medium text-highlighted">
            Tidak ada sample yang perlu diambil
          </p>
          <p class="mt-1 text-sm text-muted">
            Semua sample sudah dikoleksi atau belum tersedia.
          </p>
        </div>

        <div v-else class="flex flex-col max-h-[60vh]">
          <div class="overflow-auto flex-1">
            <table class="w-full">
              <thead class="sticky top-0 z-10 bg-elevated">
                <tr>
                  <th class="border-b border-default px-4 py-2.5 text-left text-xs font-medium text-muted w-[28%]">
                    Pasien
                  </th>
                  <th class="border-b border-default px-4 py-2.5 text-left text-xs font-medium text-muted w-[14%]">
                    Reg. No
                  </th>
                  <th class="border-b border-default px-4 py-2.5 text-left text-xs font-medium text-muted w-[12%]">
                    Queue
                  </th>
                  <th class="border-b border-default px-4 py-2.5 text-left text-xs font-medium text-muted w-[18%]">
                    Sample Type
                  </th>
                  <th class="border-b border-default px-4 py-2.5 text-center text-xs font-medium text-muted w-[14%]">
                    Status
                  </th>
                  <th class="border-b border-default px-4 py-2.5 text-center text-xs font-medium text-muted w-[14%]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in paginatedRows"
                  :key="row.id"
                  class="border-b border-default/50 hover:bg-muted/30 transition-colors"
                >
                  <td class="px-4 py-3">
                    <p class="font-medium text-highlighted">
                      {{ patientName(row) }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ row.queueEntry?.registration?.patient?.PatientId || '-' }}
                    </p>
                  </td>
                  <td class="px-4 py-3 text-sm text-muted">
                    {{ row.queueEntry?.registration?.id_reg || '-' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-muted">
                    {{ row.queueEntry?.queueCode || '-' }}
                  </td>
                  <td class="px-4 py-3">
                    <UBadge color="info" variant="soft">
                      {{ row.sampleType?.name || '-' }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-3">
                    <UBadge color="warning" variant="soft">
                      {{ row.status }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      icon="i-lucide-user-check"
                      :loading="row.queueEntry?.id ? callLoading[row.queueEntry.id] : false"
                      :disabled="!roomSession"
                      @click="handleGetPatient(row)"
                    >
                      Pilih
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-default px-4 py-3 text-sm">
            <p class="text-muted">
              Menampilkan {{ paginatedRows.length }} dari {{ rows.length }}
            </p>
            <UPagination v-model:page="currentPage" :total="rows.length" :items-per-page="pageSize" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
