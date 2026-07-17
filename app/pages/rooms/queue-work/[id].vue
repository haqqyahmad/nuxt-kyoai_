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
  roomId: string | null
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

type RoomAssignment = {
  id: string
  assignedDate: string
  roomId: string | null
  roomTypeId: string | null
  assignmentSource?: 'PIC' | 'SELF'
  notes?: string | null
  room?: {
    id: string
    code: string
    name: string
  } | null
  roomType?: {
    id: string
    code: string
    name: string
    tierOrder: number
  } | null
}

type RoomSession = {
  id: string
  roomId: string
  roomTypeId: string
  startedAt: string
  endedAt?: string | null
  exitReason?: string | null
  room?: {
    id: string
    code: string
    name: string
  } | null
  roomType?: {
    id: string
    code: string
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
const { user, permissions } = await useCurrentUser()
const today = new Date().toISOString().slice(0, 10)
const {
  data: assignmentData,
  pending: assignmentPending,
  refresh: refreshAssignment
} = await useAsyncData<RoomAssignment | null>(
  'room-assignment-work',
  async () => {
    try {
      const res = await api.get('/room-assignments/me', {
        params: {
          assignedDate: today,
          _: Date.now()
        }
      })

      const payload = res.data
      return (payload && Object.prototype.hasOwnProperty.call(payload, 'data')
        ? payload.data
        : payload) as RoomAssignment | null
    } catch {
      return null
    }
  },
  {
    default: () => null,
    server: false
  }
)
const {
  session: roomSession,
  pending: roomSessionPending,
  refresh: refreshRoomSession,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()

const roomQueueItemId = computed(() => String(route.params.id ?? ''))
const currentUserId = computed(() => user.value?.id ?? null)
const loading = ref(false)
const refreshing = ref(false)
const roomQueueDetail = ref<RoomQueueDetail | null>(null)
const roomExamItems = ref<RoomExamItem[]>([])
const stageActionLoading = ref(false)
const itemActionLoading = ref<Record<string, boolean>>({})
const resultSaveLoading = ref<Record<string, boolean>>({})
const resultDrafts = reactive<Record<string, Record<string, ResultDraft>>>({})
const itemNotes = reactive<Record<string, string>>({})
const isItemActionModalOpen = ref(false)
const selectedItemAction = ref<RoomExamItem | null>(null)
const selectedItemActionType = ref<'skip' | 'reschedule' | 'retest' | 'refuse' | null>(null)
const itemActionReason = ref('')
const itemActionNote = ref('')
const itemActionSubmitLoading = ref(false)
const isExitRoomModalOpen = ref(false)
const isEnterRoomModalOpen = ref(false)
const roomSessionActionLoading = ref(false)
const roomEnterActionLoading = ref(false)

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string, errors?: unknown } } }).response
    return response?.data?.message || fallback
  }

  return fallback
}

const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value as RoomSession
})

const roomAssignment = computed(() => assignmentData.value ?? null)
const canEnterRoom = computed(() => Boolean(roomAssignment.value?.roomId) && !activeRoomSession.value)
const canUseAssignShortcut = computed(() => !roomAssignment.value?.roomId)

const roomSessionLabel = computed(() => {
  if (!activeRoomSession.value) return 'Sesi room tidak aktif'
  if (activeRoomSession.value.room?.name) {
    return `${activeRoomSession.value.room.code} - ${activeRoomSession.value.room.name}`
  }
  return activeRoomSession.value.roomType?.name || 'Sesi room aktif'
})

function formatPatientName(patient?: Patient | null) {
  if (!patient) return '-'
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
}

function getStatusColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
  if (status === 'REFUSED') return 'error'
  if (status === 'RETEXT') return 'warning'
  return 'neutral'
}

function getStatusLabel(status: string) {
  if (status === 'DONE') return 'Selesai'
  if (status === 'IN_PROGRESS') return 'Sedang dikerjakan'
  if (status === 'CALLED') return 'Sudah dipanggil'
  if (status === 'SKIPPED') return 'Skip'
  if (status === 'RESCHEDULED') return 'Reschedule'
  if (status === 'REFUSED') return 'Pasien Menolak'
  if (status === 'RETEXT') return 'Perlu Tes Ulang'
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

  const matchedNormal = ranges.find((range) => {
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

  const matchedCritical = ranges.find((range) => {
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
const canManageItemActions = computed(() => permissions.value.includes('queue:admin'))
const currentRoomId = computed(() =>
  activeRoomSession.value?.roomId ?? roomAssignment.value?.roomId ?? null
)

const activeStage = computed(() => {
  const stages = (roomQueueDetail.value?.stageItems ?? [])
    .filter(stage => ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(stage.status))

  if (stages.length === 0) return null

  const roomId = currentRoomId.value
  if (roomId) {
    const ownStage = stages.find(stage => stage.roomId === roomId)
    if (ownStage) return ownStage

    const unassignedStage = stages.find(stage => !stage.roomId)
    if (unassignedStage) return unassignedStage

    return null
  }

  return stages[0] ?? null
})
const activeStageCode = computed(() => activeStage.value?.stage?.code ?? null)
const allItemsFinal = computed(() =>
  roomExamItems.value.every(item => ['DONE', 'SKIPPED', 'RESCHEDULED'].includes(item.status))
)
const sampleCollections = computed(() => roomQueueDetail.value?.queueEntry?.sampleCollections ?? [])

function getStageDisplayName(stage?: QueueStageItem | null) {
  if (!stage) return '-'
  const total = (roomQueueDetail.value?.stageItems ?? []).length
  const code = stage.stage?.code
  const name = (code ? `${code} · ` : '') + (stage.stage?.name || `Stage ${stage.stageOrder ?? '-'}`)
  const otherRoom = stage.roomId && stage.roomId !== roomAssignment.value?.roomId
  const suffix = otherRoom ? ' (ruangan lain)' : ''
  return (total > 1 ? `Stage ${stage.stageOrder} dari ${total}: ` : '') + name + suffix
}

const stageSummary = computed(() => {
  const items = roomQueueDetail.value?.stageItems ?? []
  if (items.length === 0) return '-'
  const active = items.find(s => ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(s.status))
  const activeOrder = active?.stageOrder ?? 0
  const names = items
    .slice()
    .sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0))
    .map((s) => {
      const code = s.stage?.code
      const otherRoom = s.roomId && s.roomId !== roomAssignment.value?.roomId
      return (code ? `${code} · ` : '') + (s.stage?.name || `Stage ${s.stageOrder}`) + (otherRoom ? ' (ruangan lain)' : '')
    })
  return `Stage ${activeOrder} dari ${items.length} (${names.join(' → ')})`
})

function isExamStageActive() {
  return activeStageCode.value === 'EXAM'
}

function isCollectStageActive() {
  return activeStageCode.value === 'COLLECT'
}

function isReceiveStageActive() {
  return activeStageCode.value === 'RECEIVE'
}

function getItemSampleCollection(item: RoomExamItem): SampleCollection | null {
  const collectionId = item.sampleImpact?.collectionId
  if (!collectionId) return null
  return sampleCollections.value.find(collection => collection.id === collectionId) ?? null
}

function canCollectSample(item: RoomExamItem) {
  if (!isCollectStageActive()) return false
  const collection = getItemSampleCollection(item)
  return Boolean(collection) && collection?.status === 'PENDING'
}

function canReceiveSample(item: RoomExamItem) {
  if (!isReceiveStageActive()) return false
  const collection = getItemSampleCollection(item)
  return Boolean(collection) && collection?.status === 'COLLECTED'
}

function isSampleManagedItem(item: RoomExamItem) {
  return Boolean(item.sampleImpact)
}

function isDeferredItem(item: RoomExamItem) {
  return item.trxExamItem?.item?.resultTiming === 'deferred'
}

function getSampleCollectionStatus(item: RoomExamItem) {
  return item.sampleImpact?.collectionStatus ?? null
}

function isItemInProgress(item: RoomExamItem) {
  return item.status === 'IN_PROGRESS'
}

function canInteractWithItem(item: RoomExamItem) {
  if (!isExamStageActive()) return false
  if (!isItemInProgress(item)) return false
  if (item.operationalStatus === 'WAITING_SAMPLE') return false
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED') return false
  return true
}

function canRenderExamInputs(item: RoomExamItem) {
  return hasStructuredInputs(item) && !isDeferredItem(item) && canInteractWithItem(item)
}

function canRenderItemNotes(item: RoomExamItem) {
  return canInteractWithItem(item) && (isDeferredItem(item) || !hasStructuredInputs(item))
}

function getOperationalStatusLabel(item: RoomExamItem) {
  const sampleStatus = getSampleCollectionStatus(item)

  if (item.operationalStatus === 'WAITING_SAMPLE' || sampleStatus === 'COLLECTED') return 'Menunggu sample diterima'
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' || sampleStatus === 'REJECTED') return 'Sample ditolak'
  if (item.operationalStatus === 'RESCHEDULED' || sampleStatus === 'RESCHEDULED') return 'Sample dijadwalkan ulang'
  return getStatusLabel(item.status)
}

function getOperationalStatusColor(item: RoomExamItem) {
  const sampleStatus = getSampleCollectionStatus(item)

  if (item.operationalStatus === 'WAITING_SAMPLE' || sampleStatus === 'COLLECTED') return 'warning'
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' || sampleStatus === 'REJECTED') return 'error'
  if (item.operationalStatus === 'RESCHEDULED' || sampleStatus === 'RESCHEDULED') return 'neutral'
  return getStatusColor(item.status)
}

function getSampleActionDescription(item: RoomExamItem) {
  const sampleStatus = getSampleCollectionStatus(item)

  if (sampleStatus === 'REJECTED') {
    return item.sampleImpact?.rejectReason || 'Sample ditolak dan perlu reschedule sebelum item bisa dikerjakan.'
  }

  if (sampleStatus === 'RESCHEDULED') {
    return item.sampleImpact?.rescheduledAt
      ? `Sample dijadwalkan ulang ke ${item.sampleImpact.rescheduledAt}.`
      : 'Sample dijadwalkan ulang dan menunggu kunjungan berikutnya.'
  }

  if (sampleStatus === 'COLLECTED') {
    return 'Sample sudah diambil dan menunggu diterima oleh lab.'
  }

  if (sampleStatus === 'RECEIVED') {
    return 'Sample sudah diterima oleh lab dan siap diproses di stage exam.'
  }

  return 'Item ini masih mengikuti status sample terkait.'
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

function openItemActionModal(item: RoomExamItem, action: 'skip' | 'reschedule' | 'retest' | 'refuse') {
  selectedItemAction.value = item
  selectedItemActionType.value = action
  itemActionReason.value = ''
  itemActionNote.value = ''
  isItemActionModalOpen.value = true
}

function closeItemActionModal() {
  isItemActionModalOpen.value = false
  selectedItemAction.value = null
  selectedItemActionType.value = null
  itemActionReason.value = ''
  itemActionNote.value = ''
}

function openExitRoomModal() {
  if (!activeRoomSession.value) {
    toast.add({
      title: 'Sesi room belum aktif',
      description: 'Tidak ada room aktif yang bisa dikeluarkan.',
      color: 'warning'
    })
    return
  }

  isExitRoomModalOpen.value = true
}

function openEnterRoomModal() {
  if (!roomAssignment.value?.roomId) {
    toast.add({
      title: 'Belum ada assignment room',
      description: 'Tidak ada room assignment yang bisa dipakai untuk masuk room.',
      color: 'warning'
    })
    return
  }

  isEnterRoomModalOpen.value = true
}

async function handleEnterRoom() {
  if (roomEnterActionLoading.value || !roomAssignment.value?.roomId) return

  roomEnterActionLoading.value = true
  try {
    await enterRoomSession({ roomId: roomAssignment.value.roomId })
    await refreshRoomSession()
    await refreshAssignment()
    isEnterRoomModalOpen.value = false

    toast.add({
      title: 'Berhasil',
      description: 'Berhasil masuk ke room aktif.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal masuk room',
      description: getErrorMessage(error, 'Terjadi kesalahan saat masuk ke room aktif.'),
      color: 'error'
    })
  } finally {
    roomEnterActionLoading.value = false
  }
}

async function handleExitRoom() {
  if (roomSessionActionLoading.value || !activeRoomSession.value) return

  roomSessionActionLoading.value = true
  try {
    await exitRoomSession()
    await refreshRoomSession()
    isExitRoomModalOpen.value = false

    toast.add({
      title: 'Berhasil',
      description: 'Berhasil keluar dari room aktif.',
      color: 'success'
    })

    await router.push('/rooms/assignments')
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal keluar room',
      description: getErrorMessage(error, 'Terjadi kesalahan saat keluar dari room aktif.'),
      color: 'error'
    })
  } finally {
    roomSessionActionLoading.value = false
  }
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

function getDraftText(value: unknown) {
  return String(value ?? '').trim()
}

function buildResultsPayload(item: RoomExamItem) {
  const itemDraft = resultDrafts[item.id] ?? {}
  const inputs = item.trxExamItem?.item?.inputans ?? []

  return inputs.map((inputan) => {
    const draft = itemDraft[inputan.id] ?? {}
    const base = { inputanId: inputan.id }

    if (inputan.inputType === 'number') {
      if (!getDraftText(draft.valueNumber)) return null
      return {
        ...base,
        valueNumber: Number(draft.valueNumber)
      }
    }

    if (inputan.inputType === 'selected') {
      if (!getDraftText(draft.valueSelected)) return null
      return {
        ...base,
        valueSelected: draft.valueSelected
      }
    }

    if (inputan.inputType === 'calculated') {
      if (!getDraftText(draft.valueCalculated)) return null
      return {
        ...base,
        valueCalculated: Number(draft.valueCalculated)
      }
    }

    if (!getDraftText(draft.valueString)) return null
    return {
      ...base,
      valueString: getDraftText(draft.valueString)
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

async function handleReturnPatient() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/return`, {})
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: 'Pasien dikembalikan ke waiting list.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal mengembalikan pasien',
      description: getErrorMessage(error, 'Terjadi kesalahan saat mengembalikan pasien ke waiting list.'),
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

    // Check if there are deferred items that need result input
    const deferredItems = (roomExamItems.value || []).filter(
      item => item.trxExamItem?.item?.resultTiming === 'deferred'
    )

    if (deferredItems.length > 0) {
      const firstDeferredItem = deferredItems.find(item => item.trxExamItem?.exam?.id)
      const departmentId = deferredItems.find(item => item.trxExamItem?.item?.department?.id)
        ?.trxExamItem?.item?.department?.id

      toast.add({
        title: 'Ada hasil yang perlu diinput',
        description: `${deferredItems.length} item menunggu input hasil.`,
        color: 'info'
      })
      // Redirect to exam results page with deferred items highlighted
      await router.push({
        path: '/rooms/exam-results',
        query: {
          examId: firstDeferredItem?.trxExamItem?.exam?.id ?? undefined,
          queueEntryId: roomQueueDetail.value?.queueEntry?.id ?? undefined,
          departmentId: departmentId ?? undefined,
          resultTiming: 'deferred'
        }
      })
    } else {
      // No deferred items, go back to queue
      await router.push('/rooms/queue')
    }
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

async function handleCollectSample(item: RoomExamItem) {
  const collection = getItemSampleCollection(item)
  if (!collection || itemActionLoading.value[item.id]) return

  setItemLoading(item.id, true)
  try {
    await api.patch(`/medical/exams/queue/samples/${collection.id}/collect`, {})
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: `Sample ${collection.sampleType?.name ?? ''} berhasil diambil.`.trim(),
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal mengambil sample',
      description: getErrorMessage(error, 'Terjadi kesalahan saat mengambil sample.'),
      color: 'error'
    })
  } finally {
    setItemLoading(item.id, false)
  }
}

async function handleReceiveSample(item: RoomExamItem) {
  const collection = getItemSampleCollection(item)
  if (!collection || itemActionLoading.value[item.id]) return

  setItemLoading(item.id, true)
  try {
    await api.patch(`/medical/exams/queue/samples/${collection.id}/receive`, {})
    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: `Sample ${collection.sampleType?.name ?? ''} berhasil diterima.`.trim(),
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal menerima sample',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menerima sample.'),
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
  if (!currentUserId.value) {
    toast.add({
      title: 'Akun pengguna tidak ditemukan',
      description: 'Muat ulang halaman lalu coba lagi.',
      color: 'error'
    })
    return
  }

  setItemLoading(item.id, true)
  try {
    await api.patch(`/medical/exams/queue/exam-item/${item.id}/done`, {
      updatedBy: currentUserId.value,
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

async function handleSubmitItemAction() {
  if (!selectedItemAction.value || !selectedItemActionType.value || itemActionSubmitLoading.value) return
  if (!currentUserId.value) {
    toast.add({
      title: 'Akun pengguna tidak ditemukan',
      description: 'Muat ulang halaman lalu coba lagi.',
      color: 'error'
    })
    return
  }

  const item = selectedItemAction.value
  const actionType = selectedItemActionType.value
  itemActionSubmitLoading.value = true

  try {
    if (actionType === 'skip') {
      if (!itemActionReason.value.trim()) {
        toast.add({
          title: 'Alasan wajib diisi',
          description: 'Isi alasan skip sebelum melanjutkan.',
          color: 'warning'
        })
        return
      }

      await api.patch(`/medical/exams/queue/exam-item/${item.id}/skip`, {
        skippedBy: currentUserId.value,
        skipReason: itemActionReason.value.trim(),
        notes: itemActionNote.value.trim() || null
      })
    } else if (actionType === 'refuse') {
      if (!itemActionReason.value.trim()) {
        toast.add({
          title: 'Alasan wajib diisi',
          description: 'Isi alasan penolakan sebelum melanjutkan.',
          color: 'warning'
        })
        return
      }

      await api.patch(`/medical/exams/queue/exam-item/${item.id}/refuse`, {
        refusedBy: currentUserId.value,
        refuseReason: itemActionReason.value.trim(),
        notes: itemActionNote.value.trim() || null
      })
    } else if (actionType === 'retest') {
      await api.patch(`/medical/exams/queue/exam-item/${item.id}/retest`, {
        retestedBy: currentUserId.value,
        retestReason: itemActionReason.value.trim() || 'Retest requested',
        notes: itemActionNote.value.trim() || null
      })
    } else {
      await api.patch(`/medical/exams/queue/exam-item/${item.id}/reschedule`, {
        rescheduledBy: currentUserId.value,
        rescheduleNote: itemActionNote.value.trim() || null
      })
    }

    await loadPage(true)
    toast.add({
      title: 'Berhasil',
      description: actionType === 'skip'
        ? `Item ${item.trxExamItem?.item?.name ?? 'pemeriksaan'} ditandai skip.`
        : actionType === 'refuse'
          ? `Item ${item.trxExamItem?.item?.name ?? 'pemeriksaan'} ditolak pasien.`
          : actionType === 'retest'
            ? `Item ${item.trxExamItem?.item?.name ?? 'pemeriksaan'} ditandai perlu tes ulang.`
            : `Item ${item.trxExamItem?.item?.name ?? 'pemeriksaan'} dijadwalkan ulang.`,
      color: 'success'
    })
    closeItemActionModal()
  } catch (error: unknown) {
    toast.add({
      title: actionType === 'skip' ? 'Gagal skip item' : actionType === 'refuse' ? 'Gagal menolak item' : actionType === 'retest' ? 'Gagal retest item' : 'Gagal reschedule item',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memproses item pemeriksaan.'),
      color: 'error'
    })
  } finally {
    itemActionSubmitLoading.value = false
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
          <UBadge
            :color="activeRoomSession ? 'success' : 'neutral'"
            variant="subtle"
            :label="roomSessionPending ? 'Mengecek sesi room...' : roomSessionLabel"
          />

          <UButton
            v-if="canEnterRoom"
            color="primary"
            variant="soft"
            icon="i-lucide-log-in"
            :loading="assignmentPending || roomEnterActionLoading"
            @click="openEnterRoomModal"
          >
            Masuk Room
          </UButton>

          <UButton
            v-if="activeRoomSession"
            color="warning"
            variant="soft"
            icon="i-lucide-log-out"
            :loading="roomSessionActionLoading"
            @click="openExitRoomModal"
          >
            Keluar Room
          </UButton>

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
                    :label="`${activeStage ? getStageDisplayName(activeStage) : 'Selesai'}`"
                    :color="activeStage ? getStatusColor(activeStage.status) : 'success'"
                    variant="subtle"
                  />
                  <UBadge
                    color="info"
                    variant="outline"
                    :label="stageSummary"
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
                  Selesaikan item pemeriksaan satu per satu. Input hasil hanya aktif saat item sudah <code>IN_PROGRESS</code>. Untuk item dengan <code>resultTiming</code> deferred, lakukan pemeriksaan tanpa input lalu isi dokumentasi sebelum item ditandai selesai.
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
                    Item lab baru bisa diisi saat tahap aktif sudah EXAM, sample terkait sudah RECEIVED, dan item sudah berstatus IN_PROGRESS.
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
                  v-if="activeStage?.status === 'WAITING' && canUseAssignShortcut"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-user-round-plus"
                  to="/rooms/assignments"
                >
                  Assign Room
                </UButton>

                <UButton
                  v-if="activeStage?.status === 'CALLED'"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-play"
                  :loading="stageActionLoading"
                  @click="handleStartStage"
                >
                  Mulai Pemeriksaan
                </UButton>

                <UButton
                  v-if="activeStage?.status === 'CALLED'"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-rotate-ccw"
                  :loading="stageActionLoading"
                  @click="handleReturnPatient"
                >
                  Kembalikan ke Waiting
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
                  v-else-if="getSampleCollectionStatus(item) && getSampleCollectionStatus(item) !== 'RECEIVED'"
                  :color="getOperationalStatusColor(item)"
                  :title="getOperationalStatusLabel(item)"
                  :description="item.blockedReason || getSampleActionDescription(item)"
                />

                <UAlert
                  v-else-if="hasStructuredInputs(item) && isDeferredItem(item)"
                  color="info"
                  title="Hasil deferred"
                  description="Item ini tidak memerlukan input hasil. Lakukan pemeriksaan, tulis dokumentasi singkat, lalu selesaikan item."
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

                <div v-if="canRenderItemNotes(item)">
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
                    v-if="canCollectSample(item)"
                    color="info"
                    variant="soft"
                    icon="i-lucide-test-tube"
                    :loading="itemActionLoading[item.id]"
                    @click="handleCollectSample(item)"
                  >
                    Ambil Sample
                  </UButton>

                  <UButton
                    v-else-if="canReceiveSample(item)"
                    color="info"
                    variant="soft"
                    icon="i-lucide-package-check"
                    :loading="itemActionLoading[item.id]"
                    @click="handleReceiveSample(item)"
                  >
                    Terima Sample
                  </UButton>

                  <UButton
                    v-else-if="item.status === 'PENDING' && isExamStageActive()"
                    color="warning"
                    variant="soft"
                    icon="i-lucide-play"
                    :loading="itemActionLoading[item.id]"
                    @click="handleStartItem(item)"
                  >
                    Mulai Item
                  </UButton>

                  <UButton
                    v-if="hasStructuredInputs(item) && !isDeferredItem(item) && item.status === 'IN_PROGRESS'"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-save"
                    :loading="resultSaveLoading[item.id]"
                    @click="handleSaveResults(item)"
                  >
                    Simpan Hasil
                  </UButton>

                  <UButton
                    v-if="item.status === 'IN_PROGRESS'"
                    color="success"
                    variant="soft"
                    icon="i-lucide-check"
                    :loading="itemActionLoading[item.id]"
                    @click="handleDoneItem(item)"
                  >
                    Selesaikan Item
                  </UButton>

                  <UButton
                    v-if="canManageItemActions && !['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT'].includes(item.status)"
                    color="error"
                    variant="soft"
                    icon="i-lucide-ban"
                    :loading="itemActionLoading[item.id]"
                    @click="openItemActionModal(item, 'refuse')"
                  >
                    Pasien Menolak
                  </UButton>

                  <UButton
                    v-if="canManageItemActions && !['DONE', 'SKIPPED', 'RESCHEDULED'].includes(item.status)"
                    color="warning"
                    variant="soft"
                    icon="i-lucide-calendar-clock"
                    :loading="itemActionLoading[item.id]"
                    @click="openItemActionModal(item, 'reschedule')"
                  >
                    Reschedule
                  </UButton>

                  <UButton
                    v-if="canManageItemActions && !['DONE', 'SKIPPED', 'RESCHEDULED'].includes(item.status)"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-refresh-cw"
                    :loading="itemActionLoading[item.id]"
                    @click="openItemActionModal(item, 'retest')"
                  >
                    Retest
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="isItemActionModalOpen"
    :title="selectedItemActionType === 'skip' ? 'Skip Item' : selectedItemActionType === 'refuse' ? 'Pasien Menolak Item' : selectedItemActionType === 'retest' ? 'Retest Item' : 'Reschedule Item'"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          :color="(selectedItemActionType === 'skip' || selectedItemActionType === 'refuse') ? 'error' : 'warning'"
          :title="selectedItemAction?.trxExamItem?.item?.name || 'Item pemeriksaan'"
          :description="selectedItemActionType === 'skip'
            ? 'Item ini akan ditandai skip (batal oleh admin/petugas).'
            : selectedItemActionType === 'refuse'
              ? 'Item ini akan ditandai pasien menolak pemeriksaan.'
              : selectedItemActionType === 'retest'
                ? 'Item ini akan dijadwalkan ulang untuk pemeriksaan ulang.'
                : 'Item ini akan dijadwalkan ulang untuk kunjungan berikutnya.'"
        />

        <div v-if="selectedItemActionType === 'skip' || selectedItemActionType === 'refuse'" class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">
            {{ selectedItemActionType === 'refuse' ? 'Alasan penolakan' : 'Alasan skip' }}
          </label>
          <UTextarea
            v-model="itemActionReason"
            :rows="4"
            :placeholder="selectedItemActionType === 'refuse'
              ? 'Contoh: pasien tidak ingin diperiksa, kondisi lain...'
              : 'Contoh: sampel tidak tersedia, kondisi lain...'"
          />
        </div>

        <div v-else-if="selectedItemActionType === 'retest'" class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">
            Alasan retest
          </label>
          <UTextarea
            v-model="itemActionReason"
            :rows="4"
            placeholder="Contoh: hasil tidak valid, alat bermasalah, kondisi lain..."
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">
            Catatan
          </label>
          <UTextarea
            v-model="itemActionNote"
            :rows="4"
            placeholder="Catatan tambahan opsional"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="itemActionSubmitLoading"
          @click="closeItemActionModal"
        >
          Batal
        </UButton>
        <UButton
          :color="selectedItemActionType === 'skip' ? 'error' : selectedItemActionType === 'retest' ? 'primary' : 'warning'"
          :loading="itemActionSubmitLoading"
          @click="handleSubmitItemAction"
        >
          {{ selectedItemActionType === 'skip' ? 'Tolak Item' : selectedItemActionType === 'retest' ? 'Retest Item' : 'Reschedule Item' }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isExitRoomModalOpen"
    title="Keluar Room"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          title="Keluar dari sesi room aktif?"
          :description="`Sesi aktif saat ini: ${roomSessionLabel}. Setelah keluar, kamu akan diarahkan ke halaman assignment room.`"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="roomSessionActionLoading"
          @click="isExitRoomModalOpen = false"
        >
          Batal
        </UButton>
        <UButton
          color="warning"
          :loading="roomSessionActionLoading"
          @click="handleExitRoom"
        >
          Keluar Room
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isEnterRoomModalOpen"
    title="Masuk Room"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="info"
          title="Masuk ke room assignment?"
          :description="`Room assignment saat ini: ${roomAssignment?.room?.code ? `${roomAssignment.room.code} - ` : ''}${roomAssignment?.room?.name || roomAssignment?.roomType?.name || '-'}.`"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="roomEnterActionLoading"
          @click="isEnterRoomModalOpen = false"
        >
          Batal
        </UButton>
        <UButton
          color="primary"
          :loading="roomEnterActionLoading"
          @click="handleEnterRoom"
        >
          Masuk Room
        </UButton>
      </div>
    </template>
  </UModal>
</template>
