<script setup lang="ts">
type Patient = {
  id: string
  PatientId?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: string | null
  dob?: string | null
  phone?: string | null
}

type QueueStageItem = {
  id: string
  stageOrder: number
  status: string
  stage?: {
    id: string
    code: string
    name: string
  } | null
}

type SampleCollection = {
  id: string
  status: string
  sampleType?: {
    id: string
    name: string
  } | null
}

type RoomQueueDetail = {
  id: string
  roomTypeId: string
  tierOrder: number
  status: string
  queueEntry?: {
    id: string
    queueCode?: string | null
    queueNumber?: number | null
    type?: string | null
    checkinAt?: string | null
    registration?: {
      id: number
      id_reg?: string | null
      examDate?: string | null
      scheduleDateExam?: string | null
      patient?: Patient | null
    } | null
    sampleCollections?: SampleCollection[]
  } | null
  stageItems?: QueueStageItem[]
}

type ExamResult = {
  inputanId: string
  valueString?: string | null
  valueNumber?: number | null
  valueSelected?: string | null
  valueCalculated?: number | null
}

type ExamInputOption = {
  id: string
  label: string
  value: string
}

type ExamInput = {
  id: string
  label: string
  inputType: 'number' | 'string' | 'selected' | 'calculated'
  uom?: string | null
  allowBlank?: boolean
  opsis?: ExamInputOption[]
  nilaiNormalNum?: Array<{
    id: string
    gender?: string | null
    ageMin?: number | null
    ageMax?: number | null
    normalLow?: number | null
    normalHigh?: number | null
    criticalLow?: number | null
    criticalHigh?: number | null
  }>
  nilaiNormalSel?: Array<{
    id: string
    gender?: string | null
    ageMin?: number | null
    ageMax?: number | null
    opsi?: {
      id: string
      label: string
      value: string
    } | null
  }>
}

type NumericNormalRange = NonNullable<ExamInput['nilaiNormalNum']>[number]
type SelectedNormalRange = NonNullable<ExamInput['nilaiNormalSel']>[number]

type RoomExamItem = {
  id: string
  status: string
  notes?: string | null
  operationalStatus?: string
  blockedReason?: string | null
  sampleImpact?: {
    collectionId: string
    sampleTypeId: string
    sampleTypeName?: string | null
    collectionStatus?: string | null
    rejectReason?: string | null
    rescheduledAt?: string | null
  } | null
  trxExamItem?: {
    id: string
    exam?: {
      id: string
      status: string
      results?: ExamResult[]
    } | null
    item?: {
      id: string
      code?: string | null
      name?: string | null
      resultTiming?: 'inline' | 'deferred' | null
      inputans?: ExamInput[]
      department?: {
        id: string
        name: string
      } | null
      group?: {
        id: string
        name: string
      } | null
    } | null
  } | null
}

type ResultDraft = {
  valueString?: string
  valueNumber?: string
  valueSelected?: string
  valueCalculated?: string
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const roomQueueItemId = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const refreshing = ref(false)
const roomQueueDetail = ref<RoomQueueDetail | null>(null)
const roomExamItems = ref<RoomExamItem[]>([])
const stageActionLoading = ref(false)
const itemActionLoading = ref<Record<string, boolean>>({})
const resultSaveLoading = ref<Record<string, boolean>>({})
const resultDrafts = reactive<Record<string, Record<string, ResultDraft>>>({})
const itemNotes = reactive<Record<string, string>>({})

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string, errors?: unknown } } }).response
    return response?.data?.message || fallback
  }

  return fallback
}

function formatPatientName(patient?: Patient | null) {
  if (!patient) return '-'
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
}

function getStatusColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
  return 'neutral'
}

function getStatusLabel(status: string) {
  if (status === 'DONE') return 'Selesai'
  if (status === 'IN_PROGRESS') return 'Sedang dikerjakan'
  if (status === 'CALLED') return 'Sudah dipanggil'
  if (status === 'SKIPPED') return 'Skip'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return 'Menunggu'
}

function getPatientAge(dob?: string | null) {
  if (!dob) return null

  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age
}

function matchesPatientProfile(gender?: string | null, ageMin?: number | null, ageMax?: number | null) {
  const patientGender = patient.value?.gender ?? null
  const patientAge = getPatientAge(patient.value?.dob)

  const genderMatches = !gender || gender === patientGender
  const ageMinMatches = ageMin == null || patientAge == null || patientAge >= ageMin
  const ageMaxMatches = ageMax == null || patientAge == null || patientAge <= ageMax

  return genderMatches && ageMinMatches && ageMaxMatches
}

function formatProfileSuffix(gender?: string | null, ageMin?: number | null, ageMax?: number | null) {
  const parts: string[] = []

  if (gender === 'MALE') parts.push('Laki-laki')
  if (gender === 'FEMALE') parts.push('Perempuan')

  if (ageMin != null && ageMax != null) {
    parts.push(`${ageMin}-${ageMax} th`)
  } else if (ageMin != null) {
    parts.push(`>= ${ageMin} th`)
  } else if (ageMax != null) {
    parts.push(`<= ${ageMax} th`)
  }

  return parts.length > 0 ? ` (${parts.join(' · ')})` : ''
}

function getNumericNormalRanges(inputan: ExamInput) {
  return (inputan.nilaiNormalNum ?? []).filter(range =>
    matchesPatientProfile(range.gender, range.ageMin, range.ageMax)
  )
}

function getSelectedNormalRanges(inputan: ExamInput) {
  return (inputan.nilaiNormalSel ?? []).filter(range =>
    matchesPatientProfile(range.gender, range.ageMin, range.ageMax)
  )
}

function formatNumericNormalRange(inputan: ExamInput, range: NumericNormalRange) {
  const parts: string[] = []

  if (range.normalLow != null || range.normalHigh != null) {
    const low = range.normalLow != null ? String(range.normalLow) : '-∞'
    const high = range.normalHigh != null ? String(range.normalHigh) : '∞'
    parts.push(`Normal ${low} - ${high}${inputan.uom ? ` ${inputan.uom}` : ''}`)
  }

  if (range.criticalLow != null || range.criticalHigh != null) {
    const criticalParts: string[] = []
    if (range.criticalLow != null) criticalParts.push(`kritikal bawah ${range.criticalLow}`)
    if (range.criticalHigh != null) criticalParts.push(`kritikal atas ${range.criticalHigh}`)
    parts.push(criticalParts.join(' · '))
  }

  return `${parts.join(' | ')}${formatProfileSuffix(range.gender, range.ageMin, range.ageMax)}`
}

function formatSelectedNormalRange(range: SelectedNormalRange) {
  return `${range.opsi?.label ?? range.opsi?.value ?? '-'}${formatProfileSuffix(range.gender, range.ageMin, range.ageMax)}`
}

function parseDraftNumber(value?: string) {
  if (!value?.trim()) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getNumberEvaluation(inputan: ExamInput, draftValue?: string) {
  const value = parseDraftNumber(draftValue)
  if (value == null) return null

  const ranges = getNumericNormalRanges(inputan)
  if (ranges.length === 0) return null

  const matchedNormal = ranges.find(range => {
    const lowOk = range.normalLow == null || value >= range.normalLow
    const highOk = range.normalHigh == null || value <= range.normalHigh
    return lowOk && highOk
  })

  if (matchedNormal) {
    return {
      status: 'normal' as const,
      label: `Dalam batas normal${formatProfileSuffix(matchedNormal.gender, matchedNormal.ageMin, matchedNormal.ageMax)}`
    }
  }

  const matchedCritical = ranges.find(range => {
    const lowCritical = range.criticalLow != null && value <= range.criticalLow
    const highCritical = range.criticalHigh != null && value >= range.criticalHigh
    return lowCritical || highCritical
  })

  if (matchedCritical) {
    return {
      status: 'critical' as const,
      label: `Di luar batas kritikal${formatProfileSuffix(matchedCritical.gender, matchedCritical.ageMin, matchedCritical.ageMax)}`
    }
  }

  return {
    status: 'out-of-range' as const,
    label: 'Di luar nilai normal'
  }
}

function getSelectedEvaluation(inputan: ExamInput, draftValue?: string) {
  if (!draftValue?.trim()) return null

  const ranges = getSelectedNormalRanges(inputan)
  if (ranges.length === 0) return null

  const matched = ranges.find(range => range.opsi?.value === draftValue)

  if (matched) {
    return {
      status: 'normal' as const,
      label: `Sesuai nilai normal${formatProfileSuffix(matched.gender, matched.ageMin, matched.ageMax)}`
    }
  }

  return {
    status: 'out-of-range' as const,
    label: 'Tidak sesuai nilai normal'
  }
}

function getInputEvaluation(itemId: string, inputan: ExamInput) {
  const draft = getInputDraft(itemId, inputan.id)

  if (inputan.inputType === 'number') {
    return getNumberEvaluation(inputan, draft.valueNumber)
  }

  if (inputan.inputType === 'selected') {
    return getSelectedEvaluation(inputan, draft.valueSelected)
  }

  return null
}

function getEvaluationBadgeColor(status?: 'normal' | 'out-of-range' | 'critical') {
  if (status === 'normal') return 'success'
  if (status === 'critical') return 'error'
  if (status === 'out-of-range') return 'warning'
  return 'neutral'
}

function getInputContainerClass(itemId: string, inputan: ExamInput) {
  const evaluation = getInputEvaluation(itemId, inputan)

  if (evaluation?.status === 'critical') {
    return 'rounded-xl border border-error/40 bg-error/5 p-3'
  }

  if (evaluation?.status === 'out-of-range') {
    return 'rounded-xl border border-warning/40 bg-warning/5 p-3'
  }

  if (evaluation?.status === 'normal') {
    return 'rounded-xl border border-success/30 bg-success/5 p-3'
  }

  return 'rounded-xl border border-default bg-muted/20 p-3'
}

const patient = computed(() => roomQueueDetail.value?.queueEntry?.registration?.patient ?? null)
const activeStage = computed(() =>
  (roomQueueDetail.value?.stageItems ?? []).find(stage => ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(stage.status)) ?? null
)
const activeStageCode = computed(() => activeStage.value?.stage?.code ?? null)
const allItemsFinal = computed(() =>
  roomExamItems.value.every(item => ['DONE', 'SKIPPED', 'RESCHEDULED'].includes(item.status))
)
const sampleCollections = computed(() => roomQueueDetail.value?.queueEntry?.sampleCollections ?? [])

function getStageDisplayName(stage?: QueueStageItem | null) {
  return stage?.stage?.name || `Stage ${stage?.stageOrder ?? '-'}`
}

function isExamStageActive() {
  return activeStageCode.value === 'EXAM'
}

function isSampleManagedItem(item: RoomExamItem) {
  return Boolean(item.sampleImpact)
}

function canRenderExamInputs(item: RoomExamItem) {
  if (!hasStructuredInputs(item)) return false
  if (!isSampleManagedItem(item)) return true
  return isExamStageActive() && item.operationalStatus !== 'WAITING_SAMPLE' && item.operationalStatus !== 'BLOCKED_SAMPLE_REJECTED'
}

function getOperationalStatusLabel(item: RoomExamItem) {
  if (item.operationalStatus === 'WAITING_SAMPLE') return 'Menunggu sample diterima'
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED') return 'Sample ditolak'
  if (item.operationalStatus === 'RESCHEDULED') return 'Sample dijadwalkan ulang'
  return getStatusLabel(item.status)
}

function getOperationalStatusColor(item: RoomExamItem) {
  if (item.operationalStatus === 'WAITING_SAMPLE') return 'warning'
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED') return 'error'
  if (item.operationalStatus === 'RESCHEDULED') return 'neutral'
  return getStatusColor(item.status)
}

function hasStructuredInputs(item: RoomExamItem) {
  return (item.trxExamItem?.item?.inputans ?? []).length > 0
}

function getInputDraft(itemId: string, inputId: string) {
  if (!resultDrafts[itemId]) {
    resultDrafts[itemId] = {}
  }

  if (!resultDrafts[itemId][inputId]) {
    resultDrafts[itemId][inputId] = {}
  }

  return resultDrafts[itemId][inputId]
}

function seedLocalState() {
  for (const item of roomExamItems.value) {
    if (itemNotes[item.id] === undefined) {
      itemNotes[item.id] = item.notes ?? ''
    }

    const resultMap = new Map(
      (item.trxExamItem?.exam?.results ?? []).map(result => [result.inputanId, result])
    )

    for (const inputan of item.trxExamItem?.item?.inputans ?? []) {
      const existing = resultMap.get(inputan.id)
      const draft = getInputDraft(item.id, inputan.id)

      if (draft.valueNumber === undefined && existing?.valueNumber != null) {
        draft.valueNumber = String(existing.valueNumber)
      }

      if (draft.valueString === undefined && existing?.valueString != null) {
        draft.valueString = existing.valueString
      }

      if (draft.valueSelected === undefined && existing?.valueSelected != null) {
        draft.valueSelected = existing.valueSelected
      }

      if (draft.valueCalculated === undefined && existing?.valueCalculated != null) {
        draft.valueCalculated = String(existing.valueCalculated)
      }
    }
  }
}

watch(roomExamItems, seedLocalState, { immediate: true })

async function loadPage(showRefreshState = false) {
  if (!roomQueueItemId.value) return

  if (showRefreshState) {
    refreshing.value = true
  } else {
    loading.value = true
  }

  try {
    const [detailRes, examItemsRes] = await Promise.all([
      api.get(`/medical/exams/queue/room-item/${roomQueueItemId.value}`),
      api.get(`/medical/exams/queue/room-item/${roomQueueItemId.value}/exam-items`)
    ])

    roomQueueDetail.value = detailRes.data?.data ?? detailRes.data ?? null
    roomExamItems.value = examItemsRes.data?.data ?? examItemsRes.data ?? []
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal memuat data pemeriksaan',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memuat detail pekerjaan room.'),
      color: 'error'
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

watch(() => roomQueueItemId.value, () => loadPage(), { immediate: true })

function setItemLoading(itemId: string, value: boolean) {
  itemActionLoading.value = {
    ...itemActionLoading.value,
    [itemId]: value
  }
}

function setResultSaving(itemId: string, value: boolean) {
  resultSaveLoading.value = {
    ...resultSaveLoading.value,
    [itemId]: value
  }
}

function buildResultsPayload(item: RoomExamItem) {
  const itemDraft = resultDrafts[item.id] ?? {}
  const inputs = item.trxExamItem?.item?.inputans ?? []

  return inputs.map((inputan) => {
    const draft = itemDraft[inputan.id] ?? {}
    const base = { inputanId: inputan.id }

    if (inputan.inputType === 'number') {
      if (!draft.valueNumber?.trim()) return null
      return {
        ...base,
        valueNumber: Number(draft.valueNumber)
      }
    }

    if (inputan.inputType === 'selected') {
      if (!draft.valueSelected?.trim()) return null
      return {
        ...base,
        valueSelected: draft.valueSelected
      }
    }

    if (inputan.inputType === 'calculated') {
      if (!draft.valueCalculated?.trim()) return null
      return {
        ...base,
        valueCalculated: Number(draft.valueCalculated)
      }
    }

    if (!draft.valueString?.trim()) return null
    return {
      ...base,
      valueString: draft.valueString.trim()
    }
  }).filter((value): value is Record<string, unknown> => Boolean(value))
}

async function handleCallPatient() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/call`, {})
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: 'Pasien berhasil diambil dari queue general.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal mengambil pasien',
      description: getErrorMessage(error, 'Terjadi kesalahan saat mengambil pasien.'),
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleStartStage() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/start`)
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: 'Pemeriksaan room dimulai.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal memulai pemeriksaan',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memulai pemeriksaan room.'),
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleFinishStage() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/done`, {})
    toast.add({
      title: 'Berhasil',
      description: 'Pemeriksaan room selesai.',
      color: 'success'
    })
    await router.push('/rooms/queue')
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { errors?: { pendingItems?: Array<{ itemName?: string }> } } } }).response
    const pendingItems = response?.data?.errors?.pendingItems ?? []
    const pendingLabel = pendingItems.length > 0
      ? ` Item belum final: ${pendingItems.map(item => item.itemName).filter(Boolean).join(', ')}.`
      : ''

    toast.add({
      title: 'Belum bisa menyelesaikan room',
      description: `${getErrorMessage(error, 'Masih ada item pemeriksaan yang belum selesai.')}${pendingLabel}`,
      color: 'warning'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleStartItem(item: RoomExamItem) {
  if (itemActionLoading.value[item.id]) return

  setItemLoading(item.id, true)
  try {
    await api.patch(`/medical/exams/queue/exam-item/${item.id}/start`, {})
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: `Item ${item.trxExamItem?.item?.name ?? 'pemeriksaan'} dimulai.`,
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal memulai item',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memulai item pemeriksaan.'),
      color: 'error'
    })
  } finally {
    setItemLoading(item.id, false)
  }
}

async function handleSaveResults(item: RoomExamItem) {
  const examId = item.trxExamItem?.exam?.id
  if (!examId) return

  const results = buildResultsPayload(item)
  if (results.length === 0) {
    toast.add({
      title: 'Belum ada hasil',
      description: 'Isi minimal satu hasil exam sebelum disimpan.',
      color: 'warning'
    })
    return
  }

  setResultSaving(item.id, true)
  try {
    await api.post(`/mcu/exams/${examId}/results`, { results })
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: 'Hasil exam item berhasil disimpan.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal menyimpan hasil',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menyimpan hasil exam.'),
      color: 'error'
    })
  } finally {
    setResultSaving(item.id, false)
  }
}

async function handleDoneItem(item: RoomExamItem) {
  if (itemActionLoading.value[item.id]) return

  setItemLoading(item.id, true)
  try {
    await api.patch(`/medical/exams/queue/exam-item/${item.id}/done`, {
      notes: itemNotes[item.id]?.trim() || null
    })
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: `Item ${item.trxExamItem?.item?.name ?? 'pemeriksaan'} selesai.`,
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal menyelesaikan item',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menyelesaikan item pemeriksaan.'),
      color: 'error'
    })
  } finally {
    setItemLoading(item.id, false)
  }
}
</script>

<template>
  <UDashboardPanel id="room-queue-work">
    <template #header>
      <UDashboardNavbar
        title="Pekerjaan Room"
        :subtitle="roomQueueDetail?.queueEntry?.registration?.id_reg || 'Detail pemeriksaan petugas room'"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-arrow-left"
            @click="router.push('/rooms/queue')"
          >
            Kembali ke Queue
          </UButton>

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-refresh-cw"
            :loading="refreshing"
            @click="loadPage(true)"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div
          v-if="loading"
          class="grid gap-4"
        >
          <USkeleton class="h-40 rounded-2xl" />
          <USkeleton class="h-72 rounded-2xl" />
        </div>

        <UAlert
          v-else-if="!roomQueueDetail"
          color="error"
          title="Detail room queue tidak ditemukan"
          description="Data pekerjaan tidak bisa dimuat. Coba kembali dari halaman queue room."
        />

        <template v-else>
          <UCard class="overflow-hidden border border-default/80 shadow-sm">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-3">
                <div>
                  <p class="text-sm font-medium text-muted">
                    Pasien aktif
                  </p>
                  <h2 class="mt-1 text-xl font-semibold text-highlighted">
                    {{ formatPatientName(patient) }}
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    {{ patient?.PatientId || '-' }} · {{ roomQueueDetail.queueEntry?.queueCode || '-' }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UBadge
                    :label="`Stage aktif: ${activeStage ? getStageDisplayName(activeStage) : 'Selesai'}`"
                    :color="activeStage ? getStatusColor(activeStage.status) : 'success'"
                    variant="subtle"
                  />
                  <UBadge
                    :label="`Status room: ${getStatusLabel(roomQueueDetail.status)}`"
                    :color="getStatusColor(roomQueueDetail.status)"
                    variant="soft"
                  />
                  <UBadge
                    color="neutral"
                    variant="outline"
                    :label="`Jenis antrian: ${roomQueueDetail.queueEntry?.type || '-'}`"
                  />
                </div>

                <p class="max-w-2xl text-sm text-muted">
                  Selesaikan item pemeriksaan satu per satu. Jika item punya input hasil exam, simpan hasilnya dulu. Jika tidak punya inputan, isi dokumentasi hasil sebelum item ditandai selesai.
                </p>

                <div
                  v-if="sampleCollections.length > 0"
                  class="rounded-xl border border-default/80 bg-muted/20 p-3"
                >
                  <p class="text-sm font-medium text-highlighted">
                    Alur sample
                  </p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <UBadge
                      v-for="collection in sampleCollections"
                      :key="collection.id"
                      :label="`${collection.sampleType?.name || 'Sample'}: ${collection.status}`"
                      :color="collection.status === 'RECEIVED' ? 'success' : collection.status === 'REJECTED' ? 'error' : collection.status === 'COLLECTED' ? 'info' : 'warning'"
                      variant="soft"
                    />
                  </div>
                  <p class="mt-2 text-xs text-muted">
                    Item lab baru bisa diisi saat tahap aktif sudah EXAM dan sample terkait sudah RECEIVED.
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                <UButton
                  v-if="activeStage?.status === 'WAITING'"
                  icon="i-lucide-bell-ring"
                  :loading="stageActionLoading"
                  @click="handleCallPatient"
                >
                  Ambil dari Queue General
                </UButton>

                <UButton
                  v-if="activeStage && ['WAITING', 'CALLED'].includes(activeStage.status)"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-play"
                  :loading="stageActionLoading"
                  @click="handleStartStage"
                >
                  Mulai Pemeriksaan
                </UButton>

                <UButton
                  v-if="activeStage && ['CALLED', 'IN_PROGRESS'].includes(activeStage.status)"
                  color="success"
                  variant="soft"
                  icon="i-lucide-check-check"
                  :disabled="!allItemsFinal"
                  :loading="stageActionLoading"
                  @click="handleFinishStage"
                >
                  Selesaikan Room
                </UButton>
              </div>
            </div>
          </UCard>

          <UAlert
            v-if="!allItemsFinal"
            color="warning"
            title="Room belum bisa diselesaikan"
            description="Masih ada item pemeriksaan yang statusnya belum final. Lengkapi hasil atau dokumentasi lalu selesaikan setiap item."
          />

          <div class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))]">
            <UCard
              v-for="item in roomExamItems"
              :key="item.id"
              class="overflow-hidden border border-default/80 shadow-sm"
            >
              <template #header>
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs text-muted">
                      {{ item.trxExamItem?.item?.code || '-' }}
                      <span v-if="item.trxExamItem?.item?.group?.name">
                        · {{ item.trxExamItem.item.group.name }}
                      </span>
                    </p>
                    <h3 class="mt-1 text-base font-semibold text-highlighted">
                      {{ item.trxExamItem?.item?.name || '-' }}
                    </h3>
                  </div>

                  <UBadge
                    :label="getOperationalStatusLabel(item)"
                    :color="getOperationalStatusColor(item)"
                    variant="subtle"
                  />
                </div>
              </template>

              <div class="space-y-4">
                <UAlert
                  v-if="isSampleManagedItem(item) && !isExamStageActive()"
                  color="warning"
                  title="Belum masuk tahap exam"
                  :description="`Tahap aktif saat ini ${getStageDisplayName(activeStage)}. Item lab baru bisa diisi setelah sample collect dan receive selesai, lalu stage aktif berpindah ke EXAM.`"
                />

                <UAlert
                  v-else-if="item.operationalStatus === 'WAITING_SAMPLE' || item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED'"
                  :color="item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' ? 'error' : 'warning'"
                  :title="item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' ? 'Sample bermasalah' : 'Menunggu sample diterima'"
                  :description="item.blockedReason || 'Item ini belum bisa dikerjakan.'"
                />

                <div
                  v-if="canRenderExamInputs(item)"
                  class="space-y-3"
                >
                  <div
                    v-for="inputan in item.trxExamItem?.item?.inputans || []"
                    :key="inputan.id"
                    :class="getInputContainerClass(item.id, inputan)"
                  >
                    <div class="mb-2 flex items-start justify-between gap-3">
                      <label class="block text-sm font-medium text-highlighted">
                        {{ inputan.label }}
                        <span v-if="inputan.uom" class="text-xs text-muted">({{ inputan.uom }})</span>
                      </label>

                      <UBadge
                        v-if="getInputEvaluation(item.id, inputan)"
                        :color="getEvaluationBadgeColor(getInputEvaluation(item.id, inputan)?.status)"
                        variant="soft"
                        :label="getInputEvaluation(item.id, inputan)?.label"
                      />
                    </div>

                    <div
                      v-if="inputan.inputType === 'number' && getNumericNormalRanges(inputan).length > 0"
                      class="mb-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success"
                    >
                      <p
                        v-for="range in getNumericNormalRanges(inputan)"
                        :key="range.id"
                      >
                        {{ formatNumericNormalRange(inputan, range) }}
                      </p>
                    </div>

                    <div
                      v-else-if="inputan.inputType === 'selected' && getSelectedNormalRanges(inputan).length > 0"
                      class="mb-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
                    >
                      <p class="font-medium">
                        Nilai normal
                      </p>
                      <p
                        v-for="range in getSelectedNormalRanges(inputan)"
                        :key="range.id"
                      >
                        {{ formatSelectedNormalRange(range) }}
                      </p>
                    </div>

                    <input
                      v-if="inputan.inputType === 'number'"
                      v-model="getInputDraft(item.id, inputan.id).valueNumber"
                      type="number"
                      class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                      :placeholder="`Isi ${inputan.label}`"
                    >

                    <input
                      v-else-if="inputan.inputType === 'string'"
                      v-model="getInputDraft(item.id, inputan.id).valueString"
                      type="text"
                      class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                      :placeholder="`Isi ${inputan.label}`"
                    >

                    <select
                      v-else-if="inputan.inputType === 'selected'"
                      v-model="getInputDraft(item.id, inputan.id).valueSelected"
                      class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                    >
                      <option value="">
                        Pilih hasil
                      </option>
                      <option
                        v-for="opsi in inputan.opsis || []"
                        :key="opsi.id"
                        :value="opsi.value"
                      >
                        {{ opsi.label }}
                      </option>
                    </select>

                    <input
                      v-else
                      v-model="getInputDraft(item.id, inputan.id).valueCalculated"
                      type="number"
                      class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                      :placeholder="`Isi ${inputan.label}`"
                    >
                  </div>
                </div>

                <div v-else-if="!hasStructuredInputs(item)">
                  <label class="mb-2 block text-sm font-medium text-highlighted">
                    Dokumentasi hasil pemeriksaan
                  </label>
                  <textarea
                    v-model="itemNotes[item.id]"
                    rows="4"
                    class="w-full rounded-xl border border-default bg-default px-3 py-2 text-sm"
                    placeholder="Tuliskan dokumentasi atau kesimpulan hasil pemeriksaan item ini..."
                  />
                </div>

                <div class="flex flex-wrap gap-2 border-t border-default/70 pt-4">
                  <UButton
                    v-if="item.status === 'PENDING'"
                    color="warning"
                    variant="soft"
                    icon="i-lucide-play"
                    :loading="itemActionLoading[item.id]"
                    @click="handleStartItem(item)"
                  >
                    Mulai Item
                  </UButton>

                  <UButton
                    v-if="hasStructuredInputs(item) && ['PENDING', 'IN_PROGRESS'].includes(item.status)"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-save"
                    :loading="resultSaveLoading[item.id]"
                    @click="handleSaveResults(item)"
                  >
                    Simpan Hasil
                  </UButton>

                  <UButton
                    v-if="['PENDING', 'IN_PROGRESS'].includes(item.status)"
                    color="success"
                    variant="soft"
                    icon="i-lucide-check"
                    :loading="itemActionLoading[item.id]"
                    @click="handleDoneItem(item)"
                  >
                    Selesaikan Item
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
