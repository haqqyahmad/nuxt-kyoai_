<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

import { examTypeBadgeColor } from '~/constants/room-types'
import { useAudit } from '~/composables/useAudit'

type Patient = {
  id: string | number
  PatientId?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: string | null
  dob?: string | null
}

type Department = {
  id: string
  name: string
  code: string
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
  formula?: {
    id?: string
    formula?: string | null
  } | null
  nilaiNormalNum?: Array<{
    id: string
    sex?: 'MALE' | 'FEMALE' | null
    ageMin?: number | null
    minValue?: number | null
    maxValue?: number | null
  }>
  nilaiNormalSel?: Array<{
    id: string
    sex?: 'MALE' | 'FEMALE' | null
    ageMin?: number | null
    opsiId?: string
    opsi?: ExamInputOption | null
  }>
}

type WorkHistoryEvent = {
  timestamp: string
  action: string
  actor?: string | null
  details?: string | null
}

type ExamResultDetail = {
  id: string
  queueCode: string
  queueEntryId: string
  patient?: Patient | null
  item?: {
    id: string
    name?: string | null
    code?: string | null
    department?: Department | null
    inputans?: ExamInput[]
  } | null
  resultTiming?: 'inline' | 'deferred'
  status?: 'pending' | 'completed'
  exam?: {
    id: string
    examType?: 'MCU' | 'RAWAT_JALAN' | null
    examCode?: string | null
    externalStatus?: 'ASSIGNED' | 'CANCELLED' | 'FILLED' | null
    assignedExternalUserId?: number | null
    attachmentUrl?: string | null
    results?: Array<{
      inputanId: string
      valueString?: string | null
      valueNumber?: number | null
      valueSelected?: string | null
      valueCalculated?: number | null
      flag?: 'normal' | 'abnormal' | null
      grading?: 'NORMAL' | 'ABNORMAL_INC' | 'ABNORMAL_DEC' | null
    }>
  } | null
  workHistory?: WorkHistoryEvent[]
  checkinAt?: string | null
  completedAt?: string | null
}

type ResultDraft = {
  valueString?: string
  valueNumber?: string
  valueSelected?: string
  valueCalculated?: string
}

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'
type GradingValue = 'NORMAL' | 'ABNORMAL_INC' | 'ABNORMAL_DEC'
type ResultPayload = {
  inputanId: string
  valueString?: string
  valueNumber?: number
  valueSelected?: string
  valueCalculated?: number
}

const props = defineProps<{
  open: boolean
  result: ExamResultDetail | null
  embedded?: boolean
}>()

const emit = defineEmits<{
  close: []
  resultSaved: [result: ExamResultDetail]
}>()

const result = computed(() => props.result)

const api = useApi()
const toast = useToast()
const { loading: auditLoading, entries: auditEntries, fetchAudit, resetAudit } = useAudit()

const groupGradingItems: Array<{ label: string, value: GradingValue }> = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Abnormal (meningkat)', value: 'ABNORMAL_INC' },
  { label: 'Abnormal (menurun)', value: 'ABNORMAL_DEC' }
]

const groupGradingForm = ref<{ groupId: string, groupName: string, grading?: GradingValue }>({
  groupId: '',
  groupName: '',
  grading: undefined
})
const autoComment = ref<string | null>(null)
const groupGradingSaving = ref(false)

async function loadGroupResults() {
  if (!props.result?.exam?.id) return
  try {
    const { data } = await api.get(`/mcu/exams/${props.result.exam.id}/group-results`)
    const list = data?.data ?? []
    if (Array.isArray(list) && list.length > 0) {
      const g = list[0]
      groupGradingForm.value = { groupId: g.groupId, groupName: g.groupName ?? '', grading: g.grading ?? undefined }
      autoComment.value = g.autoComment ?? null
    }
  } catch {
    /* ignore */
  }
}

async function saveGroupGrading() {
  if (!props.result?.exam?.id) return
  if (!groupGradingForm.value.groupId) {
    toast.add({ title: 'groupId wajib diisi', color: 'error' })
    return
  }
  groupGradingSaving.value = true
  try {
    const items = (props.result.exam?.results ?? [])
      .filter((r: any) => r.grading && r.grading !== 'NORMAL')
      .map((r: any) => ({ inputanId: r.inputanId, grading: r.grading, name: inputanLabel(r.inputanId) }))
    const { data } = await api.post(`/mcu/exams/${props.result.exam.id}/group-result`, {
      ...groupGradingForm.value,
      items
    })
    autoComment.value = data?.data?.autoComment ?? null
    toast.add({ title: 'Grading group disimpan', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.response?.data?.message ?? 'Gagal menyimpan', color: 'error' })
  } finally {
    groupGradingSaving.value = false
  }
}

function inputanLabel(inputanId: string) {
  return props.result?.item?.inputans?.find((i: any) => i.id === inputanId)?.label ?? inputanId
}

const externalDoctors = ref<Array<{ id: number, name: string }>>([])
const selectedExternalDoctor = ref<number | undefined>(undefined)
const externalSaving = ref(false)
const externalFile = ref<File | null>(null)

async function loadExternalDoctors() {
  try {
    const res = await api.get('/users?limit=1000')
    const payload = res.data?.data ?? []
    if (Array.isArray(payload)) {
      externalDoctors.value = payload
        .filter((u: any) => (u.roles ?? []).some((r: any) => r.role?.name === 'dokter-external'))
        .map((u: any) => ({ id: u.id, name: u.name }))
    }
  } catch {
    externalDoctors.value = []
  }
}
loadExternalDoctors()

function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as any).data
    if (data?.message) return typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
  }
  if (error instanceof Error) return error.message
  return fallback
}

const externalStatusColor: Record<string, BadgeColor> = {
  ASSIGNED: 'warning',
  CANCELLED: 'neutral',
  FILLED: 'success'
}

function getExamTypeColor(type?: 'MCU' | 'RAWAT_JALAN' | null): BadgeColor {
  return (examTypeBadgeColor[type ?? 'MCU'] ?? 'neutral') as BadgeColor
}

async function assignExternalDoctor() {
  if (!selectedExternalDoctor.value) return
  externalSaving.value = true
  try {
    await api.post(`/mcu/exams/${props.result?.exam?.id}/assign-external`, {
      externalUserId: selectedExternalDoctor.value
    })
    toast.add({ title: 'Berhasil', description: 'Dokter luar ditugaskan.', color: 'success' })
    emit('resultSaved', props.result as ExamResultDetail)
  } catch (error: unknown) {
    toast.add({ title: 'Gagal', description: getErrorMessage(error, 'Gagal menugaskan dokter luar.'), color: 'error' })
  } finally {
    externalSaving.value = false
  }
}

async function cancelExternalDoctor() {
  externalSaving.value = true
  try {
    await api.post(`/mcu/exams/${props.result?.exam?.id}/cancel-external`)
    toast.add({ title: 'Berhasil', description: 'Penugasan dokter luar dibatalkan.', color: 'success' })
    emit('resultSaved', props.result as ExamResultDetail)
  } catch (error: unknown) {
    toast.add({ title: 'Gagal', description: getErrorMessage(error, 'Gagal membatalkan penugasan.'), color: 'error' })
  } finally {
    externalSaving.value = false
  }
}

async function uploadExternalResult() {
  if (!externalFile.value) {
    toast.add({ title: 'PDF wajib diunggah', color: 'warning' })
    return
  }
  externalSaving.value = true
  try {
    const form = new FormData()
    form.append('attachment', externalFile.value)
    form.append('externalUserId', String(props.result?.exam?.assignedExternalUserId ?? selectedExternalDoctor.value ?? ''))
    await api.post(`/mcu/exams/${props.result?.exam?.id}/external-result`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    toast.add({ title: 'Berhasil', description: 'Hasil dokter luar disimpan.', color: 'success' })
    emit('resultSaved', props.result as ExamResultDetail)
  } catch (error: unknown) {
    toast.add({ title: 'Gagal', description: getErrorMessage(error, 'Gagal menyimpan hasil dokter luar.'), color: 'error' })
  } finally {
    externalSaving.value = false
  }
}

const saving = ref(false)
const submitting = ref(false)
const resultDrafts = ref<Record<string, ResultDraft>>({})

function formatPatientName(patient?: Patient | null) {
  if (!patient) return '-'
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString))
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium'
  }).format(new Date(dateString))
}

function getPatientAgeAtDate(dob?: string | null, referenceDate?: string | null) {
  if (!dob || !referenceDate) return null

  const birthDate = new Date(dob)
  const targetDate = new Date(referenceDate)
  if (Number.isNaN(birthDate.getTime())) return null
  if (Number.isNaN(targetDate.getTime())) return null

  let age = targetDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = targetDate.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age
}

function getPatientGenderKey(gender?: string | null) {
  const normalized = (gender || '').trim().toUpperCase()
  if (!normalized) return null
  if (['M', 'MALE', 'L', 'LAKI-LAKI', 'PRIA'].includes(normalized)) return 'M'
  if (['F', 'FEMALE', 'P', 'PEREMPUAN', 'WANITA'].includes(normalized)) return 'F'
  return normalized
}

function isRangeMatchPatient(
  range: {
    sex?: string | null
    ageMin?: number | null
  },
  patientGenderKey: string | null,
  patientAge: number | null
) {
  const rangeGender = getPatientGenderKey(range.sex)
  if (rangeGender && !patientGenderKey) {
    return false
  }

  if (rangeGender && rangeGender !== patientGenderKey) {
    return false
  }

  if (range.ageMin != null && patientAge != null && patientAge < range.ageMin) {
    return false
  }

  if (range.ageMin != null && patientAge == null && range.ageMin > 0) {
    return false
  }

  return true
}

function filterPatientMatchedRanges<T extends { sex?: string | null, ageMin?: number | null }>(ranges: T[]) {
  if (!ranges.length) return []

  const patientAge = getPatientAgeAtDate(props.result?.patient?.dob, props.result?.checkinAt)
  const patientGenderKey = getPatientGenderKey(props.result?.patient?.gender)

  const matched = ranges.filter(range =>
    isRangeMatchPatient(range, patientGenderKey, patientAge)
  )

  if (!matched.length) {
    return []
  }

  const bestAgeMin = Math.max(...matched.map(range => range.ageMin ?? -1))
  return matched.filter(range => (range.ageMin ?? -1) === bestAgeMin)
}

function getPatientMatchedNormalRanges(inputan: ExamInput) {
  return filterPatientMatchedRanges(inputan.nilaiNormalNum || [])
}

function getPatientMatchedSelectedNormalRanges(inputan: ExamInput) {
  return filterPatientMatchedRanges(inputan.nilaiNormalSel || [])
}

function getPatientMatchedDisplayNormalRanges(inputan: ExamInput) {
  if (inputan.inputType === 'selected') return getPatientMatchedSelectedNormalRanges(inputan)
  return getPatientMatchedNormalRanges(inputan)
}

function getVisibleNormalRanges(inputan: ExamInput) {
  const matched = getPatientMatchedDisplayNormalRanges(inputan)
  if (matched.length) return matched

  const ranges = inputan.inputType === 'selected'
    ? inputan.nilaiNormalSel || []
    : inputan.nilaiNormalNum || []
  if (!ranges.length) return []

  const patientAge = getPatientAgeAtDate(props.result?.patient?.dob, props.result?.checkinAt)
  if (patientAge == null) return ranges.slice(0, 3)

  const ageMatched = ranges.filter(range => range.ageMin == null || patientAge >= range.ageMin)
  if (!ageMatched.length) return ranges.slice(0, 3)

  const bestAgeMin = Math.max(...ageMatched.map(range => range.ageMin ?? -1))
  return ageMatched.filter(range => (range.ageMin ?? -1) === bestAgeMin)
}

function getMatchedNormalRange(inputan: ExamInput) {
  return getPatientMatchedDisplayNormalRanges(inputan)[0] || null
}

function getDraftText(value: unknown) {
  return String(value ?? '').trim()
}

function getStoredInputResult(inputanId: string) {
  return props.result?.exam?.results?.find(result => result.inputanId === inputanId)
}

function hasInputDraftValue(inputanId: string) {
  const draft = resultDrafts.value[inputanId] || {}
  return Boolean(
    getDraftText(draft.valueNumber)
    || getDraftText(draft.valueCalculated)
    || getDraftText(draft.valueString)
    || getDraftText(draft.valueSelected)
  )
}

function getInputResultValue(inputanId: string) {
  const existing = getStoredInputResult(inputanId)
  const draft = resultDrafts.value[inputanId] || {}

  if (getDraftText(draft.valueNumber)) {
    return { raw: String(draft.valueNumber), numeric: Number(draft.valueNumber) }
  }
  if (getDraftText(draft.valueCalculated)) {
    return { raw: String(draft.valueCalculated), numeric: Number(draft.valueCalculated) }
  }
  if (getDraftText(draft.valueString)) {
    return { raw: String(draft.valueString), numeric: null }
  }
  if (getDraftText(draft.valueSelected)) {
    return { raw: String(draft.valueSelected), numeric: null }
  }

  if (existing?.valueNumber != null) {
    return { raw: String(existing.valueNumber), numeric: existing.valueNumber }
  }
  if (existing?.valueCalculated != null) {
    return { raw: String(existing.valueCalculated), numeric: existing.valueCalculated }
  }
  if (existing?.valueString != null) {
    return { raw: existing.valueString, numeric: null }
  }
  if (existing?.valueSelected != null) {
    return { raw: existing.valueSelected, numeric: null }
  }

  return { raw: '', numeric: null }
}

function getStoredResultFlag(inputanId: string) {
  if (hasInputDraftValue(inputanId)) return null
  return getStoredInputResult(inputanId)?.flag ?? null
}

function isResultOutsideNormalRange(inputan: ExamInput) {
  const storedFlag = getStoredResultFlag(inputan.id)
  if (storedFlag) return storedFlag === 'abnormal'

  const ranges = getPatientMatchedDisplayNormalRanges(inputan)
  if (!ranges.length) return false

  const resultValue = getInputResultValue(inputan.id)

  if (inputan.inputType === 'selected') {
    if (!resultValue.raw) return false
    return !getPatientMatchedSelectedNormalRanges(inputan)
      .some(range => range.opsi?.value === resultValue.raw)
  }

  const range = ranges[0]
  if (!range || !('minValue' in range)) return false

  if (resultValue.numeric == null || Number.isNaN(resultValue.numeric)) return false

  const min = range.minValue
  const max = range.maxValue
  if (min != null && resultValue.numeric < min) return true
  if (max != null && resultValue.numeric > max) return true

  return false
}

function getResultInputClass(inputan: ExamInput) {
  const base = 'w-full rounded-xl border bg-default px-3 py-2.5 text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70'
  const outside = isResultOutsideNormalRange(inputan)

  if (!outside) {
    return `${base} border-default focus:border-primary/60 focus:ring-primary/15`
  }

  return `${base} border-red-500/40 font-semibold text-red-600 focus:border-red-500/70 focus:ring-red-500/15 dark:text-red-400`
}

function getResultNormalityState(inputan: ExamInput) {
  const storedFlag = getStoredResultFlag(inputan.id)
  if (storedFlag === 'abnormal') {
    return {
      label: 'Abnormal',
      color: 'error' as const,
      tone: 'Outside the normal range'
    }
  }
  if (storedFlag === 'normal') {
    return {
      label: 'Normal',
      color: 'success' as const,
      tone: 'Inside the normal range'
    }
  }

  const ranges = getPatientMatchedDisplayNormalRanges(inputan)
  const resultValue = getInputResultValue(inputan.id)

  if (!ranges.length) {
    return {
      label: 'No normal range',
      color: 'neutral' as const,
      tone: 'No range available for this item'
    }
  }

  const hasValue = inputan.inputType === 'selected'
    ? Boolean(resultValue.raw)
    : resultValue.numeric != null && !Number.isNaN(resultValue.numeric)

  if (!hasValue) {
    return {
      label: 'Pending',
      color: 'neutral' as const,
      tone: 'Enter a value to evaluate'
    }
  }

  if (isResultOutsideNormalRange(inputan)) {
    return {
      label: 'Abnormal',
      color: 'error' as const,
      tone: 'Outside the normal range'
    }
  }

  return {
    label: 'Normal',
    color: 'success' as const,
    tone: 'Inside the normal range'
  }
}

function formatNormalRange(range: {
  minValue?: number | null
  maxValue?: number | null
  opsi?: ExamInputOption | null
}, unit?: string | null) {
  if (range.opsi) {
    return range.opsi.label || range.opsi.value
  }

  const low = range.minValue ?? 'min'
  const high = range.maxValue ?? 'max'

  return `${low} - ${high}${unit ? ` ${unit}` : ''}`
}

function formatRangeCriteria(range: {
  sex?: string | null
  ageMin?: number | null
}) {
  const parts: string[] = []

  if (range.sex) {
    parts.push(`Sex: ${range.sex}`)
  }
  if (range.ageMin != null) {
    parts.push(`Age >= ${range.ageMin}`)
  }

  return parts.length ? parts.join(' | ') : 'No criteria'
}

function getAgeAtExamLabel(patient?: Patient | null, referenceDate?: string | null) {
  const age = getPatientAgeAtDate(patient?.dob, referenceDate)
  return age == null ? '-' : `${age} years`
}

function getDepartmentLabel(dept?: Department | null) {
  if (!dept) return '-'
  return `${dept.code} - ${dept.name}`
}

function getStatusLabel(status?: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'pending') return 'Pending'
  return 'Unknown'
}

function getStatusColor(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

function getTypeLabel(type?: string) {
  if (type === 'inline') return 'Inline'
  if (type === 'deferred') return 'Deferred'
  return '-'
}

function getInputTypeLabel(type?: string) {
  if (type === 'number') return 'Number'
  if (type === 'string') return 'Text'
  if (type === 'selected') return 'Select'
  if (type === 'calculated') return 'Calculated'
  return '-'
}

function getInputDraft(inputId: string) {
  if (!resultDrafts.value[inputId]) {
    resultDrafts.value[inputId] = {}
  }
  return resultDrafts.value[inputId]
}

function parseDraftNumber(value?: string) {
  const text = getDraftText(value)
  if (!text) return null

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeFormulaKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function toFormulaIdentifier(value: string) {
  const identifier = value.trim().replace(/[^A-Za-z0-9_$]+/g, '_')
  if (!identifier) return null
  return /^[A-Za-z_$]/.test(identifier) ? identifier : `_${identifier}`
}

function getInputNumericValue(inputan: ExamInput) {
  const draft = resultDrafts.value[inputan.id] ?? {}

  if (inputan.inputType === 'number') {
    const draftValue = parseDraftNumber(draft.valueNumber)
    if (draftValue != null) return draftValue
  }

  if (inputan.inputType === 'calculated') {
    const draftValue = parseDraftNumber(draft.valueCalculated)
    if (draftValue != null) return draftValue
  }

  const existing = props.result?.exam?.results?.find(result => result.inputanId === inputan.id)
  if (existing?.valueNumber != null) return existing.valueNumber
  if (existing?.valueCalculated != null) return existing.valueCalculated

  return null
}

function buildFormulaScope(targetInputId: string) {
  const scope = new Map<string, number>()

  for (const inputan of props.result?.item?.inputans || []) {
    if (inputan.id === targetInputId) continue
    if (!['number', 'calculated'].includes(inputan.inputType)) continue

    const value = getInputNumericValue(inputan)
    if (value == null) continue

    scope.set(normalizeFormulaKey(inputan.label), value)

    const identifier = toFormulaIdentifier(inputan.label)
    if (identifier) scope.set(identifier, value)
  }

  return scope
}

function evaluateCalculatedFormula(inputan: ExamInput) {
  const formula = inputan.formula?.formula?.trim()
  if (!formula) return null

  const scope = buildFormulaScope(inputan.id)
  const args: string[] = []
  const values: number[] = []
  const usedNames = new Set<string>()

  function bindValue(name: string, value: number) {
    let safeName = name
    let suffix = 1
    while (usedNames.has(safeName)) {
      safeName = `${name}_${suffix}`
      suffix += 1
    }
    usedNames.add(safeName)
    args.push(safeName)
    values.push(value)
    return safeName
  }

  let expression = formula

  try {
    expression = formula.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, label: string) => {
      const value = scope.get(normalizeFormulaKey(label))
      if (value == null) throw new Error('Formula dependency is incomplete')
      return bindValue(`v${args.length}`, value)
    })
  } catch {
    return null
  }

  for (const [key, value] of scope.entries()) {
    if (!/^[A-Za-z_$][\w$]*$/.test(key)) continue
    if (['round', 'abs', 'min', 'max', 'pow', 'sqrt', 'ceil', 'floor'].includes(key)) continue
    bindValue(key, value)
  }

  if (!/^[\w$+\-*/%().,\s]+$/.test(expression)) return null

  const fn = new Function(
    'round',
    'abs',
    'min',
    'max',
    'pow',
    'sqrt',
    'ceil',
    'floor',
    ...args,
    `"use strict"; return (${expression});`
  )

  try {
    const round = (value: number, precision = 0) => {
      const factor = 10 ** precision
      return Math.round(value * factor) / factor
    }
    const result = Number(fn(
      round,
      Math.abs,
      Math.min,
      Math.max,
      Math.pow,
      Math.sqrt,
      Math.ceil,
      Math.floor,
      ...values
    ))

    if (!Number.isFinite(result)) return null
    return Math.round(result * 10000) / 10000
  } catch {
    return null
  }
}

function recomputeCalculatedDrafts(clearIncomplete = false) {
  const calculatedInputs = (props.result?.item?.inputans || [])
    .filter(inputan => inputan.inputType === 'calculated')

  for (let pass = 0; pass < calculatedInputs.length; pass += 1) {
    let changed = false

    for (const inputan of calculatedInputs) {
      const draft = getInputDraft(inputan.id)
      const calculated = evaluateCalculatedFormula(inputan)

      if (calculated == null) {
        if (clearIncomplete && getDraftText(draft.valueCalculated)) {
          draft.valueCalculated = ''
          changed = true
        }
        continue
      }

      const nextValue = String(calculated)
      if (draft.valueCalculated !== nextValue) {
        draft.valueCalculated = nextValue
        changed = true
      }
    }

    if (!changed) break
  }
}

function seedDraftsFromExistingResults() {
  if (!props.result?.exam?.results) return

  const resultMap = new Map(
    (props.result.exam.results || []).map(result => [result.inputanId, result])
  )

  for (const inputan of props.result.item?.inputans || []) {
    const existing = resultMap.get(inputan.id)
    const draft = getInputDraft(inputan.id)

    if (existing?.valueNumber != null && draft.valueNumber === undefined) {
      draft.valueNumber = String(existing.valueNumber)
    }
    if (existing?.valueString != null && draft.valueString === undefined) {
      draft.valueString = existing.valueString
    }
    if (existing?.valueSelected != null && draft.valueSelected === undefined) {
      draft.valueSelected = existing.valueSelected
    }
    if (existing?.valueCalculated != null && draft.valueCalculated === undefined) {
      draft.valueCalculated = String(existing.valueCalculated)
    }
  }

  recomputeCalculatedDrafts(false)
}

function buildResultsPayload() {
  recomputeCalculatedDrafts(true)

  const inputs = props.result?.item?.inputans || []
  const payload: ResultPayload[] = []

  for (const inputan of inputs) {
    const draft = resultDrafts.value[inputan.id] ?? {}
    const base: ResultPayload = { inputanId: inputan.id }

    if (inputan.inputType === 'number') {
      if (getDraftText(draft.valueNumber)) {
        payload.push({ ...base, valueNumber: Number(draft.valueNumber) })
      }
      continue
    }

    if (inputan.inputType === 'selected') {
      const valueSelected = getDraftText(draft.valueSelected)
      if (valueSelected) {
        payload.push({ ...base, valueSelected })
      }
      continue
    }

    if (inputan.inputType === 'calculated') {
      if (getDraftText(draft.valueCalculated)) {
        payload.push({ ...base, valueCalculated: Number(draft.valueCalculated) })
      }
      continue
    }

    const valueString = getDraftText(draft.valueString)
    if (valueString) {
      payload.push({ ...base, valueString })
    }
  }

  return payload
}

async function handleSaveResult() {
  if (!props.result?.exam?.id) {
    toast.add({
      title: 'Error',
      description: 'Invalid exam ID',
      color: 'error'
    })
    return
  }

  const results = buildResultsPayload()
  if (results.length === 0) {
    toast.add({
      title: 'No results',
      description: 'Please fill in at least one result field',
      color: 'warning'
    })
    return
  }

  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.result.exam.id}/results`, { results })

    toast.add({
      title: 'Draft saved',
      description: 'Results saved without completing the exam',
      color: 'success'
    })

    emit('resultSaved', props.result)
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const message = response?.data?.message || 'Failed to save results'

    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function handleSubmitResult() {
  if (!props.result?.exam?.id) {
    toast.add({
      title: 'Error',
      description: 'Invalid exam ID',
      color: 'error'
    })
    return
  }

  const results = buildResultsPayload()
  if (results.length === 0) {
    toast.add({
      title: 'No results',
      description: 'Please fill in at least one result field',
      color: 'warning'
    })
    return
  }

  submitting.value = true
  try {
    await api.post(`/mcu/exams/${props.result.exam.id}/results`, { results })
    await api.post(`/mcu/exams/${props.result.exam.id}/results/submit`, {
      departmentId: props.result.item?.department?.id
    })

    toast.add({
      title: 'Results submitted',
      description: 'Exam has been marked as completed',
      color: 'success'
    })

    emit('resultSaved', props.result)
    emit('close')
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    toast.add({
      title: 'Submit failed',
      description: response?.data?.message || 'Failed to submit results',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.result,
  () => {
    resultDrafts.value = {}
    if (props.result) {
      seedDraftsFromExistingResults()
      if (props.result.id) {
        fetchAudit('RoomExamItem', props.result.id)
        loadGroupResults()
      } else {
        resetAudit()
      }
    } else {
      resetAudit()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.result) {
    seedDraftsFromExistingResults()
  }
})
</script>

<template>
  <BaseFullscreenModal
    :open="open"
    :embedded="embedded"
    :hide-footer="embedded"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex flex-wrap items-start gap-3 sm:gap-4">
        <UButton
          v-if="embedded"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Kembali ke daftar result"
          class="mt-0.5 shrink-0"
          @click="emit('close')"
        />

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="primary" variant="soft" :label="result?.queueCode || '-'" />
            <UBadge
              v-if="result"
              :label="getTypeLabel(result.resultTiming)"
              :color="result.resultTiming === 'deferred' ? 'primary' : 'success'"
              variant="subtle"
            />
            <UBadge
              v-if="result"
              :label="getStatusLabel(result.status)"
              :color="getStatusColor(result.status)"
              variant="subtle"
            />
          </div>
          <h1 class="mt-2 truncate text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
            {{ result?.item?.name || '-' }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ formatPatientName(result?.patient) }} · {{ getDepartmentLabel(result?.item?.department) }}
          </p>
        </div>

        <UButton
          v-if="!embedded"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('close')"
        />

        <div
          v-if="embedded && result?.status === 'pending'"
          class="flex w-full items-center justify-end gap-2 sm:w-auto"
        >
          <UButton
            color="neutral"
            variant="soft"
            :loading="saving"
            :disabled="submitting"
            icon="i-lucide-save"
            @click="handleSaveResult"
          >
            Simpan Draft
          </UButton>
          <UButton
            color="primary"
            :loading="submitting"
            :disabled="saving"
            icon="i-lucide-send"
            @click="handleSubmitResult"
          >
            Submit Hasil
          </UButton>
        </div>
      </div>
    </template>

    <template #body>
      <div
        v-if="result"
        class="flex min-h-0 flex-col bg-gradient-to-b from-default via-default to-muted/10"
        :class="embedded ? 'min-h-full overflow-visible' : 'h-full overflow-hidden'"
      >
        <div class="shrink-0 border-b border-default/70 px-4 py-4 sm:px-6">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Nomor Antrean
              </p>
              <p class="mt-2 text-lg font-semibold text-highlighted">
                {{ result.queueCode }}
              </p>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Status
              </p>
              <div class="mt-2">
                <UBadge
                  :label="getStatusLabel(result.status)"
                  :color="getStatusColor(result.status)"
                  variant="subtle"
                />
              </div>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Tipe Hasil
              </p>
              <div class="mt-2">
                <UBadge
                  :label="getTypeLabel(result.resultTiming)"
                  :color="result.resultTiming === 'deferred' ? 'primary' : 'success'"
                  variant="soft"
                />
              </div>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Waktu Check-in
              </p>
              <p class="mt-2 text-sm font-semibold text-highlighted">
                {{ formatDateTime(result.checkinAt) }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="min-h-0 flex-1 px-4 py-4 sm:px-6 sm:py-5"
          :class="embedded ? 'overflow-visible' : 'overflow-y-auto'"
        >
          <div class="mx-auto grid w-full max-w-[1500px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <div class="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                      Ringkasan Pasien
                    </h4>
                    <UIcon name="i-lucide-user-round" class="size-4 text-muted" />
                  </div>
                </template>

                <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Nama Pasien
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatPatientName(result.patient) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Nomor Rekam Medis
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.patient?.PatientId || '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Tanggal Lahir
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatDate(result.patient?.dob) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Jenis Kelamin
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.patient?.gender === 'MALE' ? 'Male' : result.patient?.gender === 'FEMALE' ? 'Female' : '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Usia Saat Pemeriksaan
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ getAgeAtExamLabel(result.patient, result.checkinAt) }}
                    </dd>
                  </div>
                </dl>
              </UCard>

              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                      Informasi Pemeriksaan
                    </h4>
                    <UIcon name="i-lucide-clipboard-list" class="size-4 text-muted" />
                  </div>
                </template>

                <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Pemeriksaan
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.item?.name || '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Department
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ getDepartmentLabel(result.item?.department) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      ID Antrean
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.queueEntryId }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Jenis Pemeriksaan
                    </dt>
                    <dd class="mt-1">
                      <UBadge :color="getExamTypeColor(result.exam?.examType)" variant="subtle">
                        {{ result.exam?.examType === 'RAWAT_JALAN' ? 'Rawat Jalan' : 'MCU' }}
                      </UBadge>
                    </dd>
                  </div>
                  <div v-if="result.exam?.examCode">
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Exam Code (Edisi)
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted font-mono">
                      {{ result.exam.examCode }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Dokter Luar
                    </dt>
                    <dd class="mt-1 space-y-2">
                      <UBadge v-if="result.exam?.externalStatus" :color="externalStatusColor[result.exam.externalStatus] ?? 'neutral'" variant="subtle">
                        {{ result.exam.externalStatus }}
                      </UBadge>
                      <span v-else class="text-sm text-muted">-</span>

                      <div v-if="!result.exam?.externalStatus || result.exam?.externalStatus === 'CANCELLED'" class="flex items-center gap-2">
                        <USelectMenu
                          v-model="selectedExternalDoctor"
                          :items="externalDoctors"
                          value-key="id"
                          label-key="name"
                          placeholder="Pilih dokter luar"
                          class="min-w-48"
                        />
                        <UButton
                          size="xs"
                          color="primary"
                          variant="soft"
                          :loading="externalSaving"
                          :disabled="!selectedExternalDoctor"
                          @click="assignExternalDoctor"
                        >
                          Tugaskan
                        </UButton>
                      </div>

                      <div v-if="result.exam?.externalStatus === 'ASSIGNED'" class="flex items-center gap-2">
                        <UButton
                          size="xs"
                          color="error"
                          variant="soft"
                          :loading="externalSaving"
                          @click="cancelExternalDoctor"
                        >
                          Batalkan
                        </UButton>
                        <UButton
                          size="xs"
                          color="success"
                          variant="soft"
                          :loading="externalSaving"
                          @click="uploadExternalResult"
                        >
                          Upload Hasil
                        </UButton>
                        <UInput
                          type="file"
                          accept="application/pdf"
                          size="xs"
                          @change="(e: any) => (externalFile = e?.target?.files?.[0] ?? null)"
                        />
                      </div>

                      <a
                        v-if="result.exam?.attachmentUrl"
                        :href="result.exam.attachmentUrl"
                        target="_blank"
                        class="text-xs text-primary underline"
                      >
                        Lihat PDF
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Waktu Selesai
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatDateTime(result.completedAt) }}
                    </dd>
                  </div>
                </dl>
              </UCard>
            </div>

            <div class="flex min-w-0 flex-col gap-5">
              <UCard class="order-2 border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                        Riwayat Proses
                      </h4>
                      <p class="mt-1 text-xs text-muted">
                        Jejak perubahan dan proses pemeriksaan
                      </p>
                    </div>
                    <UIcon name="i-lucide-list-checks" class="size-4 text-muted" />
                  </div>
                </template>

                <div v-if="auditLoading" class="rounded-2xl border border-dashed border-default/70 bg-muted/20 p-6 text-center text-sm text-muted">
                  Memuat riwayat proses...
                </div>

                <div v-else-if="auditEntries.length" class="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  <div
                    v-for="(entry, index) in auditEntries"
                    :key="entry.id ?? index"
                    class="rounded-2xl border border-default/70 bg-muted/30 p-4"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-highlighted">
                          {{ entry.action }}
                        </p>
                        <p v-if="entry.actorId" class="mt-1 text-xs text-muted">
                          by <strong>user #{{ entry.actorId }}</strong>
                          <span v-if="entry.actorRole"> ({{ entry.actorRole }})</span>
                        </p>
                      </div>
                      <p class="shrink-0 text-xs text-muted">
                        {{ formatDateTime(entry.createdAt) }}
                      </p>
                    </div>
                    <p v-if="entry.notes" class="mt-3 text-sm leading-6 text-muted">
                      {{ entry.notes }}
                    </p>
                    <div v-if="entry.payloadAfter" class="mt-3 space-y-1 text-xs text-muted">
                      <div v-for="(diff, key) in entry.payloadAfter" :key="key" class="flex gap-2">
                        <span class="font-medium text-highlighted">{{ key }}:</span>
                        <span>{{ diff.from ?? '-' }} → {{ diff.to ?? '-' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else-if="result.workHistory?.length" class="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  <div
                    v-for="(event, index) in result.workHistory"
                    :key="index"
                    class="rounded-2xl border border-default/70 bg-muted/30 p-4"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-highlighted">
                          {{ event.action }}
                        </p>
                        <p v-if="event.actor" class="mt-1 text-xs text-muted">
                          by <strong>{{ event.actor }}</strong>
                        </p>
                      </div>
                      <p class="shrink-0 text-xs text-muted">
                        {{ formatDateTime(event.timestamp) }}
                      </p>
                    </div>
                    <p v-if="event.details" class="mt-3 text-sm leading-6 text-muted">
                      {{ event.details }}
                    </p>
                  </div>
                </div>

                <div v-else class="rounded-2xl border border-dashed border-default/70 bg-muted/20 p-6 text-center text-sm text-muted">
                  Belum ada riwayat proses.
                </div>
              </UCard>

              <UCard class="order-1 border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                        Input Hasil Pemeriksaan
                      </h4>
                      <p class="mt-1 text-xs text-muted">
                        Isi hasil sesuai parameter dan rentang normal pasien.
                      </p>
                    </div>
                    <UIcon name="i-lucide-file-pen-line" class="size-4 text-muted" />
                  </div>
                </template>

                <div v-if="result.item?.inputans?.length" class="overflow-hidden rounded-2xl border border-default/70">
                  <div class="overflow-x-auto">
                    <table class="min-w-[720px] w-full table-fixed divide-y divide-default/70">
                      <thead class="bg-muted/40">
                        <tr>
                          <th class="w-[28%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Parameter
                          </th>
                          <th class="w-[25%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Nilai Normal
                          </th>
                          <th class="w-[32%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Hasil
                          </th>
                          <th class="w-[15%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody class="divide-y divide-default/60 bg-default/80">
                        <tr
                          v-for="inputan in result.item.inputans"
                          :key="inputan.id"
                          class="transition hover:bg-muted/20"
                        >
                          <td class="px-3 py-2.5 align-middle">
                            <div class="min-w-0">
                              <p class="text-sm font-semibold text-highlighted">
                                {{ inputan.label }}
                              </p>
                              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                                <UBadge
                                  :label="getInputTypeLabel(inputan.inputType)"
                                  :color="inputan.inputType === 'selected' ? 'primary' : 'neutral'"
                                  variant="subtle"
                                  size="sm"
                                />
                                <span v-if="inputan.uom" class="text-xs text-muted">
                                  {{ inputan.uom }}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td class="px-3 py-2.5 align-middle text-sm text-muted">
                            <div v-if="getVisibleNormalRanges(inputan).length" class="space-y-1">
                              <div
                                v-for="range in getVisibleNormalRanges(inputan)"
                                :key="range.id"
                                class="leading-tight"
                              >
                                <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                  {{ formatNormalRange(range, inputan.uom) }}
                                </p>
                                <p class="mt-0.5 text-[11px] text-muted">
                                  {{ formatRangeCriteria(range) }}
                                </p>
                              </div>
                            </div>
                            <span v-else class="text-xs text-amber-600 dark:text-amber-400">
                              Belum tersedia
                            </span>
                          </td>

                          <td class="px-3 py-2.5 align-middle">
                            <div class="max-w-sm">
                              <input
                                v-if="inputan.inputType === 'number'"
                                v-model="getInputDraft(inputan.id).valueNumber"
                                type="number"
                                :disabled="result.status !== 'pending'"
                                :class="getResultInputClass(inputan)"
                                placeholder="Masukkan hasil"
                                @input="recomputeCalculatedDrafts(true)"
                              >

                              <input
                                v-else-if="inputan.inputType === 'string'"
                                v-model="getInputDraft(inputan.id).valueString"
                                type="text"
                                :disabled="result.status !== 'pending'"
                                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                                placeholder="Masukkan hasil"
                              >

                              <select
                                v-else-if="inputan.inputType === 'selected'"
                                v-model="getInputDraft(inputan.id).valueSelected"
                                :disabled="result.status !== 'pending'"
                                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <option value="">
                                  Pilih hasil
                                </option>
                                <option
                                  v-for="opsi in inputan.opsis"
                                  :key="opsi.id"
                                  :value="opsi.value"
                                >
                                  {{ opsi.label }}
                                </option>
                              </select>

                              <input
                                v-else-if="inputan.inputType === 'calculated'"
                                v-model="getInputDraft(inputan.id).valueCalculated"
                                type="number"
                                disabled
                                :class="getResultInputClass(inputan)"
                                placeholder="Dihitung otomatis"
                              >
                              <p
                                v-if="inputan.formula?.formula"
                                class="mt-1 truncate text-[11px] text-muted"
                              >
                                {{ inputan.formula.formula }}
                              </p>
                            </div>
                          </td>

                          <td class="px-3 py-2.5 align-middle">
                            <UBadge
                              :label="getResultNormalityState(inputan).label"
                              :color="getResultNormalityState(inputan).color"
                              variant="soft"
                              size="sm"
                            />
                            <p
                              v-if="isResultOutsideNormalRange(inputan)"
                              class="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400"
                            >
                              Di luar nilai normal
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-else class="rounded-2xl border border-dashed border-default/70 bg-muted/20 p-6 text-center text-sm text-muted">
                  Belum ada parameter input untuk pemeriksaan ini.
                </div>
              </UCard>

              <UCard class="order-3 border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                        Group Grading & Auto Comment
                      </h4>
                      <p class="mt-1 text-xs text-muted">
                        Grading item dihitung otomatis. Grading group diisi manual, lalu sistem membuat auto doctor comment.
                      </p>
                    </div>
                    <UIcon name="i-lucide-clipboard-list" class="size-4 text-muted" />
                  </div>
                </template>

                <div class="space-y-4">
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <UFormField label="Group ID">
                      <UInput v-model="groupGradingForm.groupId" placeholder="e.g. HEMATOLOGY" class="w-full" />
                    </UFormField>
                    <UFormField label="Group Name">
                      <UInput v-model="groupGradingForm.groupName" placeholder="e.g. Hematology" class="w-full" />
                    </UFormField>
                  </div>

                  <UFormField label="Grading Group (manual)">
                    <USelect
                      v-model="groupGradingForm.grading"
                      :items="groupGradingItems"
                      :placeholder="'Pilih grading group'"
                      class="w-full sm:w-72"
                    />
                  </UFormField>

                  <div>
                    <p class="mb-1 text-xs font-medium text-muted">
                      Auto Doctor Comment
                    </p>
                    <UTextarea
                      :model-value="autoComment ?? ''"
                      readonly
                      :rows="4"
                      class="w-full"
                      placeholder="Auto-comment akan digenerate setelah simpan grading group."
                    />
                  </div>

                  <UButton
                    v-if="result.status === 'pending'"
                    :loading="groupGradingSaving"
                    icon="i-lucide-save"
                    @click="saveGroupGrading"
                  >
                    Simpan Grading Group
                  </UButton>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          v-if="!embedded"
          color="neutral"
          variant="soft"
          @click="emit('close')"
        >
          Kembali
        </UButton>
        <template v-if="result?.status === 'pending'">
          <UButton
            color="neutral"
            variant="soft"
            :loading="saving"
            :disabled="submitting"
            @click="handleSaveResult"
          >
            Simpan Draft
          </UButton>
          <UButton
            color="primary"
            :loading="submitting"
            :disabled="saving"
            @click="handleSubmitResult"
          >
            Submit Hasil
          </UButton>
        </template>
        <UButton
          v-else-if="!embedded"
          color="neutral"
          variant="soft"
          disabled
        >
          Hasil Sudah Selesai
        </UButton>
      </div>
    </template>
  </BaseFullscreenModal>
</template>
