<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useApi } from '~/composables/useApi'
import { useRoomSession } from '~/composables/useRoomSession'
import { useRouter } from '#imports'

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

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const roomTypeId = computed(() => roomSession.value?.roomTypeId ?? null)

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      status: 'PENDING',
      limit: 200,
      page: 1
    }
    if (roomTypeId.value) params.roomTypeId = roomTypeId.value

    const res = await api.get('/medical/exams/queue/samples', { params })
    const payload = res.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    allRows.value = list as SampleCollectionRow[]
    filterRows()
  } catch {
    /* tangani error via interceptor global */
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
    const barcode = (row.barcode ?? '').toLowerCase()
    const queueCode = (row.queueEntry?.queueCode ?? '').toLowerCase()
    const sampleType = (row.sampleType?.name ?? '').toLowerCase()
    return name.includes(q) || rm.includes(q) || barcode.includes(q) || queueCode.includes(q) || sampleType.includes(q)
  })
}

async function handleGetPatient(queueEntryId: string) {
  await router.push(`/rooms/sample-collection/${queueEntryId}`)
  isOpen.value = false
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
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-5xl' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">
          Pilih Pasien untuk Pengambilan Sample
        </h3>
        <UButton
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="load"
        />
      </div>
    </template>
    <template #body>
      <div class="space-y-4">
        <UInput
          v-model="search"
          type="search"
          placeholder="Cari nama pasien / RM / barcode / queue / sample type"
          icon="i-lucide-search"
          class="w-full sm:w-80"
          @update:model-value="filterRows"
        />

        <div v-if="loading" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-6" />
          <span class="ml-2 text-sm text-muted">Memuat data...</span>
        </div>

        <div v-else-if="!rows.length" class="text-center py-8 text-sm text-muted">
          Tidak ada sample dengan status <strong>PENDING</strong> (belum diambil).
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0">
            <thead>
              <tr class="bg-muted/30">
                <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Pasien
                </th>
                <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  RM
                </th>
                <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Queue
                </th>
                <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Sample Type
                </th>
                <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Status
                </th>
                <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted w-24">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" class="border-b border-default/50 hover:bg-muted/30">
                <td class="px-4 py-3">
                  <p class="font-medium text-highlighted">
                    {{ [row.queueEntry?.registration?.patient?.firstName, row.queueEntry?.registration?.patient?.middleName, row.queueEntry?.registration?.patient?.lastName].filter(Boolean).join(' ') || '-' }}
                  </p>
                </td>
                <td class="px-4 py-3 text-sm text-muted">
                  {{ row.queueEntry?.registration?.patient?.PatientId || '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-muted">
                  {{ row.queueEntry?.queueCode || '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-highlighted">
                  {{ row.sampleType?.name || '-' }}
                </td>
                <td class="px-4 py-3">
                  <UBadge color="warning" variant="soft">
                    PENDING
                  </UBadge>
                </td>
                <td class="px-4 py-3">
                  <UButton
                    size="sm"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-user-check"
                    @click="handleGetPatient(row.queueEntry!.id)"
                  >
                    Get Patient
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </UModal>
</template>
