<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  EXTRA_ORAL_OPTIONS,
  INTRA_ORAL_OPTIONS,
  DENTAL_CONDITIONS,
  OTHER_DENTAL_OPTIONS,
  DENTAL_GRADE_CONFIG,
  DENTAL_CHART_GROUPS
} from '~/types/dental'
import type { DentalExamData, DentalFinding, DentalGrade } from '~/types/dental'

const props = withDefaults(defineProps<{
  examId: string
  data?: DentalExamData | null
  disabled?: boolean
  showSubmit?: boolean
}>(), {
  disabled: false,
  showSubmit: true
})
const emit = defineEmits<{ saved: [] }>()
const api = useApi()
const toast = useToast()

type FindingMap = Record<string, DentalFinding>

const state = reactive<{
  extraOral: string[]
  extraOralNote: string
  intraOral: string[]
  intraOralNote: string
  otherDental: string[]
  otherNote: string
  findings: FindingMap
  selectedTooth: string | null
  suggestedGrade: DentalGrade | undefined
  suggestedOverride: boolean
  finalGrade: DentalGrade | undefined
  doctorComment: string
  commentsManual: boolean
}>({
  extraOral: ['Normal'],
  intraOral: ['Normal'],
  extraOralNote: '',
  intraOralNote: '',
  otherDental: [],
  otherNote: '',
  findings: {},
  selectedTooth: null,
  suggestedGrade: undefined,
  suggestedOverride: false,
  finalGrade: undefined,
  doctorComment: '',
  commentsManual: false
})

const saving = ref(false)
const localData = ref<DentalExamData | null>(props.data ?? null)

const displayData = computed(() => props.data ?? localData.value)

async function load() {
  if (props.data || !props.examId) return
  try {
    const res = await api.get(`/mcu/exams/${props.examId}/dental`)
    localData.value = (res.data?.data ?? res.data ?? null) as DentalExamData | null
  } catch {
    localData.value = null
  }
  seed()
}

onMounted(load)

function seed() {
  const d = displayData.value
  if (!d) return
  state.extraOral = d.extraOral?.length ? [...d.extraOral] : ['Normal']
  state.intraOral = d.intraOral?.length ? [...d.intraOral] : ['Normal']
  state.extraOralNote = d.extraOralNote ?? ''
  state.intraOralNote = d.intraOralNote ?? ''
  state.otherDental = d.otherDental ?? []
  state.otherNote = d.otherNote ?? ''
  state.finalGrade = d.finalGrade ?? undefined
  state.doctorComment = d.doctorComment ?? ''
  state.commentsManual = Boolean(d.doctorComment)
  state.suggestedOverride = d.suggestedGrade
    ? d.suggestedGrade !== suggested.value.grade || d.gradeReason === 'Grade suggested dipilih manual oleh dokter.'
    : false
  state.suggestedGrade = d.suggestedGrade ?? undefined
  const findings: FindingMap = {}
  for (const f of d.findings ?? []) {
    findings[f.toothNumber] = { toothNumber: f.toothNumber, conditions: [...f.conditions], note: f.note ?? '' }
  }
  state.findings = findings
}

// Toggle exclusive Normal — Normal dihapus otomatis saat opsi abnormal dipilih,
// dan dikembalikan saat semua abnormal dilepas.
function toggleExclusiveNormal(list: string[], value: string) {
  if (value === 'Normal') {
    list.splice(0, list.length, 'Normal')
    return
  }
  const idx = list.indexOf(value)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(value)
  const normalIdx = list.indexOf('Normal')
  if (normalIdx >= 0) list.splice(normalIdx, 1)
  if (list.length === 0) list.push('Normal')
}

function toggleList(list: string[], value: string) {
  const idx = list.indexOf(value)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(value)
}

function isChip(list: string[], value: string) {
  return list.includes(value)
}

const selectedFinding = computed(() =>
  state.selectedTooth ? state.findings[state.selectedTooth] ?? null : null
)

function selectTooth(tooth: string) {
  state.selectedTooth = tooth
}

function toggleFindingCondition(condition: string) {
  if (!state.selectedTooth) return
  const tooth = state.selectedTooth
  let finding = state.findings[tooth]
  if (!finding) {
    finding = { toothNumber: tooth, conditions: [], note: '' }
    state.findings[tooth] = finding
  }
  const idx = finding.conditions.indexOf(condition)
  if (idx >= 0) finding.conditions.splice(idx, 1)
  else finding.conditions.push(condition)
  if (finding.conditions.length === 0) Reflect.deleteProperty(state.findings, tooth)
}

function clearTooth() {
  if (!state.selectedTooth) return
  Reflect.deleteProperty(state.findings, state.selectedTooth)
}

function removeFinding(tooth: string) {
  Reflect.deleteProperty(state.findings, tooth)
}

const conditionsPanel = ref<{ $el: HTMLElement } | null>(null)

function editFinding(tooth: string) {
  state.selectedTooth = tooth
  nextTick(() => {
    conditionsPanel.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const findingsList = computed(() =>
  Object.values(state.findings)
    .filter(f => f.conditions.length > 0 || f.note)
    .sort((a, b) => Number(a.toothNumber) - Number(b.toothNumber))
)

const allFindingConditions = computed(() =>
  Object.values(state.findings).flatMap(f => f.conditions)
)

const suggested = computed(() => {
  const urgent = ['Abscess', 'Fistula', 'Fracture', 'Tooth Mobility']
  const treatment = ['Caries', 'Broken Crown', 'Broken Filling', 'Loose Crown', 'Loose Filling', 'Radix', 'Impaction']
  const oralAbnormal = [...state.extraOral, ...state.intraOral].filter(v => v !== 'Normal')

  if (allFindingConditions.value.some(c => urgent.includes(c))) {
    return { grade: 'D' as DentalGrade, label: DENTAL_GRADE_CONFIG.D.label, reason: 'Terdapat temuan yang membutuhkan evaluasi segera.' }
  }
  if (allFindingConditions.value.some(c => treatment.includes(c)) || oralAbnormal.length >= 2) {
    return { grade: 'C' as DentalGrade, label: DENTAL_GRADE_CONFIG.C.label, reason: 'Terdapat kondisi gigi atau oral yang membutuhkan perawatan.' }
  }
  if (allFindingConditions.value.length || state.otherDental.length || oralAbnormal.length) {
    return { grade: 'B' as DentalGrade, label: DENTAL_GRADE_CONFIG.B.label, reason: 'Terdapat temuan ringan atau kebutuhan perawatan rutin.' }
  }
  return { grade: 'A' as DentalGrade, label: DENTAL_GRADE_CONFIG.A.label, reason: 'Belum ada temuan abnormal.' }
})

const gradeConfig = computed(() => displayData.value?.gradeConfig ?? DENTAL_GRADE_CONFIG)

// Suggested grade efektif: auto-computed kecuali dokter override manual.
const effectiveSuggestedGrade = computed(() =>
  state.suggestedOverride && state.suggestedGrade
    ? state.suggestedGrade
    : suggested.value.grade
)

function resetSuggestedToAuto() {
  state.suggestedGrade = undefined
  state.suggestedOverride = false
}

// Sinkron auto-suggested ke state kalau belum dioverride.
watch(suggested, (auto) => {
  if (!state.suggestedOverride) state.suggestedGrade = auto.grade
}, { immediate: true })

// Opsi select grade (FE pakai {label,value})
const gradeOptions = computed(() =>
  (Object.keys(DENTAL_GRADE_CONFIG) as DentalGrade[]).map(g => ({ label: `${g} — ${DENTAL_GRADE_CONFIG[g]?.label ?? '-'}`, value: g }))
)

function useAutoComment() {
  if (!state.finalGrade) state.finalGrade = suggested.value.grade
  state.doctorComment = gradeConfig.value[state.finalGrade as DentalGrade]?.comment ?? ''
  state.commentsManual = false
}

function onFinalGradeChange() {
  if (!state.commentsManual && state.finalGrade) {
    state.doctorComment = gradeConfig.value[state.finalGrade]?.comment ?? ''
  }
}

const selectedSummary = computed(() => {
  const parts = [
    `Extra Oral: ${state.extraOral.join(', ')}`,
    `Intra Oral: ${state.intraOral.join(', ')}`,
    `Dental Findings: ${findingsList.value.length ? findingsList.value.map(f => `Tooth ${f.toothNumber}: ${f.conditions.join(', ')}`).join(' | ') : 'None'}`,
    `Other Dental: ${state.otherDental.join(', ') || 'None'}`,
    `Suggested Grade: ${effectiveSuggestedGrade.value} — ${gradeConfig.value[effectiveSuggestedGrade.value as DentalGrade]?.label ?? suggested.value.label}`,
    `Final Grade: ${state.finalGrade ?? '-'} — ${state.finalGrade ? gradeConfig.value[state.finalGrade]?.label : ''}`
  ]
  return parts.join('\n')
})

function buildPayload() {
  return {
    extraOral: state.extraOral,
    extraOralNote: state.extraOralNote.trim() || null,
    intraOral: state.intraOral,
    intraOralNote: state.intraOralNote.trim() || null,
    otherDental: state.otherDental,
    otherNote: state.otherNote.trim() || null,
    findings: Object.values(state.findings).filter(f => f.conditions.length > 0),
    suggestedGrade: state.suggestedOverride ? state.suggestedGrade : null,
    finalGrade: state.finalGrade,
    doctorComment: state.doctorComment.trim() || null
  }
}

async function save() {
  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/dental`, buildPayload())
    toast.add({ title: 'Berhasil', description: 'Pemeriksaan gigi (draft) disimpan.', color: 'success' })
    emit('saved')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Pemeriksaan gigi gagal disimpan.'
    toast.add({ title: 'Gagal menyimpan', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/dental/submit`, buildPayload())
    confirmSubmit.value = false
    toast.add({ title: 'Berhasil', description: 'Pemeriksaan gigi disubmit ke department.', color: 'success' })
    emit('saved')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submit pemeriksaan gigi gagal.'
    toast.add({ title: 'Gagal submit', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const confirmSubmit = ref(false)

if (props.data) seed()
</script>

<template>
  <div class="space-y-4">
    <UCard class="border border-default/80 shadow-sm">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs text-muted">
              Dental Examination · {{ props.data?.gradeConfig ? '' : 'live' }}
            </p>
            <h3 class="mt-1 text-base font-semibold text-highlighted">
              Pemeriksaan Gigi
            </h3>
          </div>
          <UBadge label="Grading otomatis, dokter dapat mengubah" color="primary" variant="soft" />
        </div>
      </template>

      <!-- Oral Examination -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-default p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <strong class="text-sm">Extra Oral</strong>
            <div class="flex items-center gap-2">
              <UBadge
                v-if="state.extraOral.filter(v => v !== 'Normal').length > 0"
                :label="`${state.extraOral.filter(v => v !== 'Normal').length} dipilih`"
                color="primary"
                variant="soft"
                size="xs"
              />
              <span class="text-xs text-muted">Multiple selection</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in EXTRA_ORAL_OPTIONS"
              :key="opt"
              type="button"
              class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
              :class="isChip(state.extraOral, opt) ? 'border-primary bg-primary text-white' : 'border-default hover:border-primary'"
              :disabled="disabled"
              @click="toggleExclusiveNormal(state.extraOral, opt)"
            >
              <UIcon
                v-if="isChip(state.extraOral, opt)"
                name="i-lucide-check"
                class="size-3.5"
              />
              {{ opt }}
            </button>
          </div>
          <UFormField label="Keterangan tambahan" class="mt-4">
            <UInput v-model="state.extraOralNote" :disabled="disabled" placeholder="Contoh: edema ringan pada sisi kiri" />
          </UFormField>
        </div>

        <div class="rounded-xl border border-default p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <strong class="text-sm">Intra Oral</strong>
            <div class="flex items-center gap-2">
              <UBadge
                v-if="state.intraOral.filter(v => v !== 'Normal').length > 0"
                :label="`${state.intraOral.filter(v => v !== 'Normal').length} dipilih`"
                color="primary"
                variant="soft"
                size="xs"
              />
              <span class="text-xs text-muted">Multiple selection</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in INTRA_ORAL_OPTIONS"
              :key="opt"
              type="button"
              class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
              :class="isChip(state.intraOral, opt) ? 'border-primary bg-primary text-white' : 'border-default hover:border-primary'"
              :disabled="disabled"
              @click="toggleExclusiveNormal(state.intraOral, opt)"
            >
              <UIcon
                v-if="isChip(state.intraOral, opt)"
                name="i-lucide-check"
                class="size-3.5"
              />
              {{ opt }}
            </button>
          </div>
          <UFormField label="Keterangan tambahan" class="mt-4">
            <UInput v-model="state.intraOralNote" :disabled="disabled" placeholder="Contoh: lesi pada mukosa bukal" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Dental Chart (kiri) + Kondisi Gigi (kanan) -->
    <div class="grid grid-cols-1 gap-4" :class="state.selectedTooth ? 'lg:grid-cols-[4fr_1fr]' : 'lg:grid-cols-1'">
      <!-- Dental Chart -->
      <UCard class="border border-default/80 shadow-sm">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-base font-semibold text-highlighted">
              Dental Chart
            </h3>
            <UBadge :label="state.selectedTooth ? `Gigi ${state.selectedTooth} dipilih` : 'Belum ada gigi dipilih'" color="neutral" variant="subtle" />
          </div>
        </template>

        <div class="space-y-5">
          <div v-for="group in DENTAL_CHART_GROUPS" :key="group.label">
            <p class="mb-3 text-sm font-bold">
              {{ group.label }}
            </p>
            <div class="space-y-3">
              <div
                v-for="(halves, rowIdx) in group.rows"
                :key="rowIdx"
                class="flex items-stretch gap-1.5"
              >
                <div class="grid min-w-0 flex-1 gap-1.5" :class="halves[0].length === 8 ? 'grid-cols-8' : 'grid-cols-5'">
                  <button
                    v-for="tooth in halves[0]"
                    :key="tooth"
                    type="button"
                    class="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border text-xs font-bold transition hover:-translate-y-0.5"
                    :class="[
                      state.selectedTooth === tooth ? 'border-primary bg-primary/10' : 'border-default',
                      state.findings[tooth]?.conditions.length ? 'bg-primary/5' : 'bg-default'
                    ]"
                    :disabled="disabled"
                    @click="selectTooth(tooth)"
                  >
                    <span class="text-lg text-muted">🦷</span>
                    <span>{{ tooth }}</span>
                    <span
                      v-if="state.findings[tooth]?.conditions.length"
                      class="absolute -right-1.5 -top-1.5 flex size-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white shadow-sm"
                    >
                      {{ state.findings[tooth]!.conditions.length }}
                    </span>
                  </button>
                </div>
                <div class="w-px shrink-0 self-stretch bg-default/60" />
                <div class="grid min-w-0 flex-1 gap-1.5" :class="halves[1].length === 8 ? 'grid-cols-8' : 'grid-cols-5'">
                  <button
                    v-for="tooth in halves[1]"
                    :key="tooth"
                    type="button"
                    class="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border text-xs font-bold transition hover:-translate-y-0.5"
                    :class="[
                      state.selectedTooth === tooth ? 'border-primary bg-primary/10' : 'border-default',
                      state.findings[tooth]?.conditions.length ? 'bg-primary/5' : 'bg-default'
                    ]"
                    :disabled="disabled"
                    @click="selectTooth(tooth)"
                  >
                    <span class="text-lg text-muted">🦷</span>
                    <span>{{ tooth }}</span>
                    <span
                      v-if="state.findings[tooth]?.conditions.length"
                      class="absolute -right-1.5 -top-1.5 flex size-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white shadow-sm"
                    >
                      {{ state.findings[tooth]!.conditions.length }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <UAlert
            v-if="selectedFinding && selectedFinding.conditions.length > 0"
            color="primary"
            variant="soft"
            :title="`Gigi ${selectedFinding.toothNumber}`"
          >
            <template #description>
              <div class="flex flex-wrap gap-2">
                <span v-for="condition in selectedFinding.conditions" :key="condition" class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {{ condition }}
                </span>
              </div>
            </template>
          </UAlert>
        </div>
      </UCard>

      <!-- Selected Tooth Conditions -->
      <UCard
        v-if="state.selectedTooth"
        ref="conditionsPanel"
        class="scroll-mt-24 border border-primary/30 shadow-sm"
      >
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-highlighted">
                Kondisi Gigi {{ state.selectedTooth }}
              </h3>
              <p class="text-xs text-muted">
                Klik beberapa kondisi. Dental Findings akan diperbarui langsung.
              </p>
            </div>
            <UButton
              color="error"
              variant="soft"
              size="sm"
              icon="i-lucide-trash"
              :disabled="disabled"
              @click="clearTooth"
            >
              Hapus temuan
            </UButton>
          </div>
        </template>

        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="condition in DENTAL_CONDITIONS"
            :key="condition"
            type="button"
            class="rounded-full border px-2.5 py-2 text-sm transition"
            :class="state.findings[state.selectedTooth]?.conditions.includes(condition) ? 'border-primary bg-primary text-white' : 'border-default hover:border-primary'"
            :disabled="disabled"
            @click="toggleFindingCondition(condition)"
          >
            {{ condition }}
          </button>
        </div>

        <UFormField label="Catatan khusus gigi" class="mt-4">
          <UInput
            v-if="state.findings[state.selectedTooth]"
            v-model="state.findings[state.selectedTooth]!.note"
            :disabled="disabled"
            placeholder="Contoh: karies pada permukaan distal"
          />
        </UFormField>
      </UCard>
    </div>

    <!-- Dental Findings -->
    <UCard class="border border-default/80 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-semibold text-highlighted">
            Dental Findings
          </h3>
          <UBadge :label="`${findingsList.length} gigi`" color="neutral" variant="subtle" />
        </div>
      </template>

      <div v-if="!findingsList.length" class="rounded-xl border border-dashed border-default py-8 text-center text-sm text-muted">
        Belum ada temuan dental.
      </div>
      <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          v-for="finding in findingsList"
          :key="finding.toothNumber"
          class="flex items-start justify-between gap-3 rounded-xl border border-default bg-muted/20 p-3"
        >
          <div class="min-w-0">
            <p class="text-lg font-extrabold text-highlighted">
              {{ finding.toothNumber }}
            </p>
            <div class="mt-1 flex flex-wrap gap-1.5">
              <span v-for="condition in finding.conditions" :key="condition" class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {{ condition }}
              </span>
            </div>
            <p v-if="finding.note" class="mt-1 text-xs text-muted">
              {{ finding.note }}
            </p>
          </div>
          <div class="flex shrink-0 gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-pencil"
              :disabled="disabled"
              @click="editFinding(finding.toothNumber)"
            >
              Edit
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :disabled="disabled"
              @click="removeFinding(finding.toothNumber)"
            >
              Remove
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Other Dental -->
    <UCard class="border border-default/80 shadow-sm">
      <template #header>
        <h3 class="text-base font-semibold text-highlighted">
          Other Dental / General Findings
        </h3>
      </template>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in OTHER_DENTAL_OPTIONS"
          :key="opt"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm transition"
          :class="isChip(state.otherDental, opt) ? 'border-primary bg-primary text-white' : 'border-default hover:border-primary'"
          :disabled="disabled"
          @click="toggleList(state.otherDental, opt)"
        >
          {{ opt }}
        </button>
      </div>
      <UFormField label="Keterangan Other Dental" class="mt-4">
        <UTextarea
          v-model="state.otherNote"
          :disabled="disabled"
          :rows="3"
          placeholder="Tambahkan lokasi atau penjelasan temuan"
        />
      </UFormField>
    </UCard>

    <!-- Grade & Comment -->
    <UCard class="border border-default/80 shadow-sm">
      <template #header>
        <h3 class="text-base font-semibold text-highlighted">
          Grade & Comment
        </h3>
      </template>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-default p-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="text-xs text-muted">
              Suggested Grade · {{ state.suggestedOverride ? 'Manual' : 'Auto' }}
            </p>
            <UButton
              v-if="state.suggestedOverride && !disabled"
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              @click="resetSuggestedToAuto"
            >
              Auto
            </UButton>
          </div>
          <USelect
            v-model="state.suggestedGrade"
            :disabled="disabled"
            :items="gradeOptions"
            placeholder="Auto — tidak dipilih"
            @change="state.suggestedOverride = true"
          />
          <p class="mt-2 text-xs text-muted">
            {{ suggested.reason }}
          </p>
          <UBadge
            :label="gradeConfig[effectiveSuggestedGrade as DentalGrade]?.label ?? '-'"
            color="primary"
            variant="soft"
            class="mt-2"
          />
        </div>
        <div class="rounded-xl border border-default p-4">
          <UFormField label="Final Grade">
            <USelect
              v-model="state.finalGrade"
              :disabled="disabled"
              :items="gradeOptions"
              placeholder="Pilih final grade"
              @change="onFinalGradeChange"
            />
          </UFormField>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <label class="text-sm font-semibold">Doctor Comment</label>
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            :disabled="disabled"
            @click="useAutoComment"
          >
            Gunakan komentar otomatis
          </UButton>
        </div>
        <UTextarea v-model="state.doctorComment" :disabled="disabled" :rows="4" />
      </div>

      <div class="mt-4 rounded-xl border-l-4 border-primary bg-primary/5 p-4">
        <strong class="text-sm">Examination Summary</strong>
        <pre class="mt-2 whitespace-pre-line text-sm text-highlighted">{{ selectedSummary }}</pre>
      </div>

      <div v-if="!disabled" class="mt-4 flex flex-wrap justify-end gap-2 border-t border-default pt-4">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-save"
          :loading="saving"
          @click="save"
        >
          Simpan Draft
        </UButton>
        <UButton
          v-if="showSubmit"
          color="primary"
          icon="i-lucide-send"
          :loading="saving"
          @click="confirmSubmit = true"
        >
          Submit Exam
        </UButton>
      </div>
    </UCard>

    <UModal
      v-if="showSubmit"
      v-model:open="confirmSubmit"
      :dismissible="false"
      :close="false"
      title="Konfirmasi Submit Pemeriksaan Gigi"
    >
      <template #body>
        <p class="text-sm text-highlighted">
          Yakin ingin submit pemeriksaan gigi ke department?
        </p>
        <p class="mt-2 text-xs text-muted">
          Setelah submit, hasil terkunci dan masuk workflow approval department.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="confirmSubmit = false">
            Tidak, kembali
          </UButton>
          <UButton color="primary" :loading="saving" @click="submit">
            Ya, submit
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
