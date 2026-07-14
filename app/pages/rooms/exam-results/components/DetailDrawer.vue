<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

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
  nilaiNormalNum?: Array<{
    id: string
    sex?: 'MALE' | 'FEMALE' | null
    ageMin?: number | null
    minValue?: number | null
    maxValue?: number | null
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
    results?: Array<{
      inputanId: string
      valueString?: string | null
      valueNumber?: number | null
      valueSelected?: string | null
      valueCalculated?: number | null
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

const props = defineProps<{
  open: boolean
  result: ExamResultDetail | null
}>()

const emit = defineEmits<{
  close: []
  resultSaved: [result: ExamResultDetail]
}>()

const api = useApi()
const toast = useToast()

const saving = ref(false)
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
    timeStyle: 'short',
  }).format(new Date(dateString))
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
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
  patientAge: number | null,
) {
  if (range.sex == null || range.ageMin == null) {
    return false
  }

  if (!patientGenderKey || patientAge == null) {
    return false
  }

  const rangeGender = getPatientGenderKey(range.sex)
  if (rangeGender && patientGenderKey && rangeGender !== patientGenderKey) {
    return false
  }

  if (range.ageMin != null && patientAge != null && patientAge < range.ageMin) {
    return false
  }

  return true
}

function getPatientMatchedNormalRanges(inputan: ExamInput) {
  const ranges = inputan.nilaiNormalNum || []
  if (!ranges.length) return []

  const patientAge = getPatientAgeAtDate(props.result?.patient?.dob, props.result?.checkinAt)
  const patientGenderKey = getPatientGenderKey(props.result?.patient?.gender)

  const matched = ranges.filter(range =>
    isRangeMatchPatient(range, patientGenderKey, patientAge),
  )

  if (!matched.length || patientAge == null || !patientGenderKey) {
    return []
  }

  const bestAgeMin = Math.max(...matched.map(range => range.ageMin ?? -1))
  return matched.filter(range => (range.ageMin ?? -1) === bestAgeMin)
}

function getMatchedNormalRange(inputan: ExamInput) {
  return getPatientMatchedNormalRanges(inputan)[0] || null
}

function getInputResultValue(inputanId: string) {
  const existing = props.result?.exam?.results?.find(result => result.inputanId === inputanId)
  const draft = resultDrafts.value[inputanId] || {}

  if (draft.valueNumber?.trim()) {
    return { raw: draft.valueNumber, numeric: Number(draft.valueNumber) }
  }
  if (draft.valueCalculated?.trim()) {
    return { raw: draft.valueCalculated, numeric: Number(draft.valueCalculated) }
  }
  if (draft.valueString?.trim()) {
    return { raw: draft.valueString, numeric: null }
  }
  if (draft.valueSelected?.trim()) {
    return { raw: draft.valueSelected, numeric: null }
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

function isResultOutsideNormalRange(inputan: ExamInput) {
  const range = getMatchedNormalRange(inputan)
  if (!range) return false

  const resultValue = getInputResultValue(inputan.id)
  if (resultValue.numeric == null || Number.isNaN(resultValue.numeric)) return false

  const min = range.minValue
  const max = range.maxValue
  if (min != null && resultValue.numeric < min) return true
  if (max != null && resultValue.numeric > max) return true

  return false
}

function getResultInputClass(inputan: ExamInput) {
  const base = 'w-full rounded-xl border bg-default px-3 py-2.5 text-sm outline-none transition focus:ring-2'
  const outside = isResultOutsideNormalRange(inputan)

  if (!outside) {
    return `${base} border-default focus:border-primary/60 focus:ring-primary/15`
  }

  return `${base} border-red-500/40 font-semibold text-red-600 focus:border-red-500/70 focus:ring-red-500/15 dark:text-red-400`
}

function getResultNormalityState(inputan: ExamInput) {
  const range = getMatchedNormalRange(inputan)
  const resultValue = getInputResultValue(inputan.id)

  if (!range) {
    return {
      label: 'No normal range',
      color: 'neutral' as const,
      tone: 'No range available for this item',
    }
  }

  if (resultValue.numeric == null || Number.isNaN(resultValue.numeric)) {
    return {
      label: 'Pending',
      color: 'neutral' as const,
      tone: 'Enter a numeric value to evaluate',
    }
  }

  if (isResultOutsideNormalRange(inputan)) {
    return {
      label: 'Abnormal',
      color: 'error' as const,
      tone: 'Outside the normal range',
    }
  }

  return {
    label: 'Normal',
    color: 'success' as const,
    tone: 'Inside the normal range',
  }
}

function formatNormalRange(range: {
  minValue?: number | null
  maxValue?: number | null
}, unit?: string | null) {
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

function seedDraftsFromExistingResults() {
  if (!props.result?.exam?.results) return

  const resultMap = new Map(
    (props.result.exam.results || []).map(result => [result.inputanId, result]),
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
}

function buildResultsPayload() {
  const inputs = props.result?.item?.inputans || []

  return inputs
    .map((inputan) => {
      const draft = resultDrafts.value[inputan.id] ?? {}
      const base = { inputanId: inputan.id }

      if (inputan.inputType === 'number') {
        if (!draft.valueNumber?.trim()) return null
        return { ...base, valueNumber: Number(draft.valueNumber) }
      }

      if (inputan.inputType === 'selected') {
        if (!draft.valueSelected?.trim()) return null
        return { ...base, valueSelected: draft.valueSelected }
      }

      if (inputan.inputType === 'calculated') {
        if (!draft.valueCalculated?.trim()) return null
        return { ...base, valueCalculated: Number(draft.valueCalculated) }
      }

      if (!draft.valueString?.trim()) return null
      return { ...base, valueString: draft.valueString.trim() }
    })
    .filter((value): value is Record<string, unknown> => Boolean(value))
}

async function handleSaveResult() {
  if (!props.result?.exam?.id) {
    toast.add({
      title: 'Error',
      description: 'Invalid exam ID',
      color: 'error',
    })
    return
  }

  const results = buildResultsPayload()
  if (results.length === 0) {
    toast.add({
      title: 'No results',
      description: 'Please fill in at least one result field',
      color: 'warning',
    })
    return
  }

  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.result.exam.id}/results`, { results })

    toast.add({
      title: 'Success',
      description: 'Results saved successfully',
      color: 'success',
    })

    emit('resultSaved', props.result)
    emit('close')
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const message = response?.data?.message || 'Failed to save results'

    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

watch(
  () => props.result,
  () => {
    resultDrafts.value = {}
    if (props.result) {
      seedDraftsFromExistingResults()
    }
  },
)

onMounted(() => {
  if (props.result) {
    seedDraftsFromExistingResults()
  }
})
</script>

<template>
  <BaseFullscreenModal :open="open" @close="emit('close')">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
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
          <h3 class="mt-3 truncate text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
            {{ result?.item?.name || '-' }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ formatPatientName(result?.patient) }} · {{ getDepartmentLabel(result?.item?.department) }}
          </p>
        </div>

        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('close')"
        />
      </div>
    </template>

    <template #body>
      <div v-if="result" class="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-default via-default to-muted/10">
        <div class="shrink-0 border-b border-default/70 px-4 py-4 sm:px-6">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">Queue Code</p>
              <p class="mt-2 text-lg font-semibold text-highlighted">{{ result.queueCode }}</p>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">Status</p>
              <div class="mt-2">
                <UBadge
                  :label="getStatusLabel(result.status)"
                  :color="getStatusColor(result.status)"
                  variant="subtle"
                />
              </div>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">Type</p>
              <div class="mt-2">
                <UBadge
                  :label="getTypeLabel(result.resultTiming)"
                  :color="result.resultTiming === 'deferred' ? 'primary' : 'success'"
                  variant="soft"
                />
              </div>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">Check-in</p>
              <p class="mt-2 text-sm font-semibold text-highlighted">{{ formatDateTime(result.checkinAt) }}</p>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div class="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div class="space-y-5">
              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">Patient Summary</h4>
                    <UIcon name="i-lucide-user-round" class="size-4 text-muted" />
                  </div>
                </template>

                <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Full Name</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatPatientName(result.patient) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Patient ID</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.patient?.PatientId || '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Date of Birth</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatDate(result.patient?.dob) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Gender</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.patient?.gender === 'MALE' ? 'Male' : result.patient?.gender === 'FEMALE' ? 'Female' : '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Age at Exam</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ getAgeAtExamLabel(result.patient, result.checkinAt) }}
                    </dd>
                  </div>
                </dl>
              </UCard>

              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">Exam Context</h4>
                    <UIcon name="i-lucide-clipboard-list" class="size-4 text-muted" />
                  </div>
                </template>

                <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Item</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.item?.name || '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Department</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ getDepartmentLabel(result.item?.department) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Queue Entry</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.queueEntryId }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">Completed</dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatDateTime(result.completedAt) }}
                    </dd>
                  </div>
                </dl>
              </UCard>
            </div>

            <div class="space-y-5">
              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">Workflow History</h4>
                      <p class="mt-1 text-xs text-muted">Audit trail of the exam process</p>
                    </div>
                    <UIcon name="i-lucide-list-timeline" class="size-4 text-muted" />
                  </div>
                </template>

                <div v-if="result.workHistory?.length" class="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
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
                      <p class="shrink-0 text-xs text-muted">{{ formatDateTime(event.timestamp) }}</p>
                    </div>
                    <p v-if="event.details" class="mt-3 text-sm leading-6 text-muted">
                      {{ event.details }}
                    </p>
                  </div>
                </div>

                <div v-else class="rounded-2xl border border-dashed border-default/70 bg-muted/20 p-6 text-center text-sm text-muted">
                  No workflow history available.
                </div>
              </UCard>

              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">Result Input</h4>
                      <p class="mt-1 text-xs text-muted">
                        Backend rule: pilih range dengan `sex` yang sama dan `ageMin` terbesar yang masih <= umur pasien saat exam.
                      </p>
                    </div>
                    <UIcon name="i-lucide-file-pen-line" class="size-4 text-muted" />
                  </div>
                </template>

                <div v-if="result.item?.inputans?.length" class="overflow-hidden rounded-2xl border border-default/70">
                  <div class="overflow-x-auto">
                    <table class="min-w-[980px] w-full divide-y divide-default/70">
                      <thead class="bg-muted/40">
                        <tr>
                          <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Item
                          </th>
                          <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Type
                          </th>
                          <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Normal Range
                          </th>
                          <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Result
                          </th>
                        </tr>
                      </thead>

                      <tbody class="divide-y divide-default/60 bg-default/80">
                        <tr
                          v-for="inputan in result.item.inputans"
                          :key="inputan.id"
                          class="align-top transition hover:bg-muted/20"
                        >
                          <td class="px-4 py-4">
                            <div class="space-y-1">
                              <p class="text-sm font-semibold text-highlighted">
                                {{ inputan.label }}
                              </p>
                              <p v-if="inputan.uom" class="text-xs text-muted">
                                Unit: {{ inputan.uom }}
                              </p>
                            </div>
                          </td>

                          <td class="px-4 py-4">
                            <UBadge
                              :label="getInputTypeLabel(inputan.inputType)"
                              :color="inputan.inputType === 'selected' ? 'primary' : 'neutral'"
                              variant="subtle"
                            />
                          </td>

                          <td class="px-4 py-4 text-sm text-muted">
                            <div v-if="getPatientMatchedNormalRanges(inputan).length" class="space-y-2">
                              <div
                                v-for="range in getPatientMatchedNormalRanges(inputan)"
                                :key="range.id"
                                class="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3"
                              >
                                <p class="text-xs font-medium text-muted">
                                  {{ formatRangeCriteria(range) }}
                                </p>
                                <p class="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                  {{ formatNormalRange(range, inputan.uom) }}
                                </p>
                              </div>
                            </div>
                            <div v-else class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                              <div class="flex items-center gap-2">
                                <UBadge color="warning" variant="soft" label="No match" />
                                <span class="text-xs font-medium text-muted">
                                  This item has no normal range that matches sex and age profile.
                                </span>
                              </div>
                            </div>
                          </td>

                          <td class="px-4 py-4">
                            <div class="space-y-3">
                              <div class="flex flex-wrap items-center gap-2">
                                <UBadge
                                  :label="getResultNormalityState(inputan).label"
                                  :color="getResultNormalityState(inputan).color"
                                  variant="soft"
                                />
                                <span class="text-xs text-muted">
                                  {{ getResultNormalityState(inputan).tone }}
                                </span>
                              </div>

                              <input
                                v-if="inputan.inputType === 'number'"
                                v-model="getInputDraft(inputan.id).valueNumber"
                                type="number"
                                :class="getResultInputClass(inputan)"
                                :placeholder="`Enter ${inputan.label}`"
                              />

                              <input
                                v-else-if="inputan.inputType === 'string'"
                                v-model="getInputDraft(inputan.id).valueString"
                                type="text"
                                class="w-full rounded-xl border border-default bg-default px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                                :placeholder="`Enter ${inputan.label}`"
                              />

                              <select
                                v-else-if="inputan.inputType === 'selected'"
                                v-model="getInputDraft(inputan.id).valueSelected"
                                class="w-full rounded-xl border border-default bg-default px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                              >
                                <option value="">Select an option</option>
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
                                :class="getResultInputClass(inputan)"
                                :placeholder="`Enter ${inputan.label}`"
                              />

                              <p v-if="isResultOutsideNormalRange(inputan)" class="text-xs font-semibold text-red-600 dark:text-red-400">
                                Nilai ini berada di luar rentang normal yang sesuai.
                              </p>
                              <p v-else class="text-xs text-muted">
                                Gunakan input sesuai tipe data di atas. Baris ini mengikuti struktur tabel agar mudah di-scan.
                              </p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-else class="rounded-2xl border border-dashed border-default/70 bg-muted/20 p-6 text-center text-sm text-muted">
                  No input fields defined for this item.
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="soft" @click="emit('close')">
          Cancel
        </UButton>
        <UButton
          v-if="result?.status === 'pending'"
          color="primary"
          :loading="saving"
          @click="handleSaveResult"
        >
          Save Results
        </UButton>
        <UButton v-else color="neutral" variant="soft" disabled>
          Already Completed
        </UButton>
      </div>
    </template>
  </BaseFullscreenModal>
</template>
