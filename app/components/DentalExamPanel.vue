<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  EXTRA_ORAL_OPTIONS,
  INTRA_ORAL_OPTIONS,
  DENTAL_CONDITIONS,
  OTHER_DENTAL_OPTIONS,
  DENTAL_CHART_GROUPS,
  buildGradeMeta,
  normalizeDentalGrades,
  dedupeSentences,
  buildDentalGradeSummary
} from '~/types/dental'
import type { DentalExamData, DentalFinding, DentalGradeGroup } from '~/types/dental'

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
  finalGrades: string[]
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
  finalGrades: [],
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
  state.otherDental = d.otherDental ? [...d.otherDental] : []
  state.otherNote = d.otherNote ?? ''
  state.doctorComment = d.doctorComment ?? ''
  state.commentsManual = d.commentsManual ?? Boolean(d.doctorComment)
  const findings: FindingMap = {}
  for (const f of d.findings ?? []) {
    findings[f.toothNumber] = { toothNumber: f.toothNumber, conditions: [...(f.conditions ?? [])], note: (f as { note?: string }).note ?? '' }
  }
  state.findings = findings
  // Kontrak array + kompat legacy string tunggal.
  const stored = d.finalGrades?.length ? [...d.finalGrades] : (d.finalGrade ? [d.finalGrade] : [])
  state.finalGrades = normalizeDentalGrades(stored, gradeMeta.value)
  if (!state.commentsManual) regenAutoComment()
}

// Toggle exclusive Normal — Normal is removed automatically when an abnormal
// option is selected, and restored when all abnormal options are deselected.
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
  if (finding.conditions.length === 0 && !finding.note) Reflect.deleteProperty(state.findings, tooth)
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

// Config + meta + grup murni dari master BE (`scope='dental'`).
// Kosong bila master dental belum di-seed — panel tampil kosong, tanpa fallback.
const gradeConfig = computed(() => displayData.value?.gradeConfig ?? {})
const gradeMeta = computed(() => buildGradeMeta(gradeConfig.value))
const gradeGroups = computed<DentalGradeGroup[]>(() => displayData.value?.gradeOptions ?? [])

// ── Select induk/anak (tanpa suggest — murni pilihan dokter) ──
// INDUK SINGLE-SELECT: hanya satu induk aktif. Anak di bawah induk aktif
// bisa multi. Pilih anak dari induk lain -> induk berpindah. Unknowns
// dipertahankan; hasil ter-sort seperti normalize BE.
function activeParentGrade(grades: string[]): string | null {
  for (const g of grades) {
    const cfg = gradeConfig.value[g]
    if (!cfg) continue
    return cfg.parent ?? g
  }
  return null
}

function toggleParentGrade(parent: string) {
  const active = activeParentGrade(state.finalGrades)
  if (active === parent) {
    // Matikan: buang induk + seluruh anaknya.
    state.finalGrades = []
    return
  }
  // Ganti induk: hanya induk ini (anak dipilih manual lagi).
  state.finalGrades = normalizeDentalGrades([parent], gradeMeta.value)
}

function toggleChildGrade(child: string) {
  const parent = gradeConfig.value[child]?.parent
  if (!parent) return
  const active = activeParentGrade(state.finalGrades)
  if (active !== parent) {
    // Pindah induk: set induk + anak ini saja.
    state.finalGrades = normalizeDentalGrades([parent, child], gradeMeta.value)
    return
  }
  state.finalGrades = normalizeDentalGrades(
    state.finalGrades.includes(child)
      ? state.finalGrades.filter(g => g !== child)
      : [...state.finalGrades, child],
    gradeMeta.value
  )
}

// ── Komentar dokter: auto dari grade terpilih kecuali diketik manual ──
function regenAutoComment() {
  const blocks = buildDentalGradeSummary(state.finalGrades, gradeConfig.value, gradeMeta.value)
  state.doctorComment = dedupeSentences(blocks.map(b => b.comment).join(' '))
}

function useAutoComment() {
  regenAutoComment()
  state.commentsManual = false
}

function onDoctorCommentInput() {
  state.commentsManual = true
}

watch(() => state.finalGrades, () => {
  if (!state.commentsManual) regenAutoComment()
})

const gradeSummaryBlocks = computed(() =>
  buildDentalGradeSummary(state.finalGrades, gradeConfig.value, gradeMeta.value)
)

const selectedSummary = computed(() => {
  const extraNote = state.extraOralNote.trim()
  const intraNote = state.intraOralNote.trim()
  const otherNote = state.otherNote.trim()
  const parts = [
    `Extra Oral: ${state.extraOral.join(', ')}${extraNote ? ` — ${extraNote}` : ''}`,
    `Intra Oral: ${state.intraOral.join(', ')}${intraNote ? ` — ${intraNote}` : ''}`,
    `Dental Findings: ${findingsList.value.length ? findingsList.value.map(f => `Tooth ${f.toothNumber}: ${f.conditions.join(', ')}${f.note ? ` (${f.note})` : ''}`).join(' | ') : 'None'}`,
    `Other Dental: ${state.otherDental.join(', ') || 'None'}${otherNote ? ` — ${otherNote}` : ''}`
  ]
  if (!gradeSummaryBlocks.value.length) {
    parts.push('Final Grades: -')
  } else {
    parts.push('Final Grades:')
    for (const b of gradeSummaryBlocks.value) {
      const kids = b.children.length ? ` [${b.children.map(k => `${k.code}: ${k.label}`).join('; ')}]` : ''
      parts.push(`- ${b.parent} — ${b.label}${kids}`)
    }
  }
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
    // Kontrak array; tanpa suggestedGrade dan tanpa finalGrade (BE yang menurunkan).
    finalGrades: state.finalGrades,
    doctorComment: state.doctorComment.trim() || null,
    commentsManual: state.commentsManual
  }
}

async function save() {
  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/dental`, buildPayload())
    toast.add({ title: 'Success', description: 'Dental examination (draft) saved.', color: 'success' })
    emit('saved')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save dental examination.'
    toast.add({ title: 'Failed to save', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/dental/submit`, buildPayload())
    confirmSubmit.value = false
    toast.add({ title: 'Success', description: 'Dental examination submitted to department.', color: 'success' })
    emit('saved')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to submit dental examination.'
    toast.add({ title: 'Failed to submit', description: message, color: 'error' })
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
              Dental Examination
            </h3>
          </div>
          <UBadge label="Multi-grade, doctor decides" color="primary" variant="soft" />
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
                :label="`${state.extraOral.filter(v => v !== 'Normal').length} selected`"
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
          <UFormField label="Additional note" class="mt-4">
            <UTextarea
              v-model="state.extraOralNote"
              :disabled="disabled"
              :rows="4"
              class="w-full"
              placeholder="e.g. mild edema on the left side"
            />
          </UFormField>
        </div>

        <div class="rounded-xl border border-default p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <strong class="text-sm">Intra Oral</strong>
            <div class="flex items-center gap-2">
              <UBadge
                v-if="state.intraOral.filter(v => v !== 'Normal').length > 0"
                :label="`${state.intraOral.filter(v => v !== 'Normal').length} selected`"
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
          <UFormField label="Additional note" class="mt-4">
            <UTextarea
              v-model="state.intraOralNote"
              :disabled="disabled"
              :rows="4"
              class="w-full"
              placeholder="e.g. lesion on the buccal mucosa"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Dental Chart (left) + Tooth Conditions (right) -->
    <div class="grid grid-cols-1 gap-4" :class="state.selectedTooth ? 'lg:grid-cols-[4fr_1fr]' : 'lg:grid-cols-1'">
      <!-- Dental Chart -->
      <UCard class="border border-default/80 shadow-sm">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-base font-semibold text-highlighted">
              Dental Chart
            </h3>
            <UBadge :label="state.selectedTooth ? `Tooth ${state.selectedTooth} selected` : 'No tooth selected'" color="neutral" variant="subtle" />
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
            :title="`Tooth ${selectedFinding.toothNumber}`"
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
                Tooth Conditions {{ state.selectedTooth }}
              </h3>
              <p class="text-xs text-muted">
                Click multiple conditions. Dental Findings will update immediately.
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
              Clear finding
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

        <UFormField label="Tooth note" class="mt-4">
          <UInput
            v-if="state.findings[state.selectedTooth]"
            v-model="state.findings[state.selectedTooth]!.note"
            :disabled="disabled"
            placeholder="e.g. caries on the distal surface"
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
          <UBadge :label="`${findingsList.length} teeth`" color="neutral" variant="subtle" />
        </div>
      </template>

      <div v-if="!findingsList.length" class="rounded-xl border border-dashed border-default py-8 text-center text-sm text-muted">
        No dental findings yet.
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
      <UFormField label="Other Dental note" class="mt-4">
        <UTextarea
          v-model="state.otherNote"
          :disabled="disabled"
          :rows="6"
          class="w-full"
          placeholder="Add location or description of the finding"
        />
      </UFormField>
    </UCard>

    <!-- Grade & Comment (multi-select per induk) -->
    <UCard class="border border-default/80 shadow-sm">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-base font-semibold text-highlighted">
            Grade & Comment
          </h3>
          <UBadge
            :label="state.finalGrades.length ? `${state.finalGrades.length} selected` : 'No grade selected'"
            color="neutral"
            variant="subtle"
          />
        </div>
      </template>

      <p v-if="gradeGroups.length" class="mb-3 text-xs text-muted">
        Pilih satu grade induk, lalu boleh pilih beberapa anak di bawahnya. Anak otomatis membawa induknya; memilih induk lain mengganti induk yang aktif.
      </p>
      <div v-if="!gradeGroups.length" class="rounded-xl border border-dashed border-default py-8 text-center text-sm text-muted">
        Master grade dental belum tersedia. Hubungi admin untuk mengaktifkan daftar grade.
      </div>
      <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          v-for="group in gradeGroups"
          :key="group.parent"
          class="rounded-xl border p-3"
          :class="state.finalGrades.includes(group.parent) ? 'border-primary/50 bg-primary/5' : 'border-default'"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 text-left"
            :disabled="disabled"
            @click="toggleParentGrade(group.parent)"
          >
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded-md border"
              :class="state.finalGrades.includes(group.parent) ? 'border-primary bg-primary text-white' : 'border-default'"
            >
              <UIcon v-if="state.finalGrades.includes(group.parent)" name="i-lucide-check" class="size-3.5" />
            </span>
            <span class="text-xl font-extrabold text-highlighted">{{ group.parent }}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-muted">{{ group.label }}</span>
          </button>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="child in group.children"
              :key="child.code"
              type="button"
              :title="child.label"
              class="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition"
              :class="state.finalGrades.includes(child.code) ? 'border-primary bg-primary text-white' : 'border-default hover:border-primary'"
              :disabled="disabled"
              @click="toggleChildGrade(child.code)"
            >
              <UIcon v-if="state.finalGrades.includes(child.code)" name="i-lucide-check" class="size-3" />
              {{ child.code }}
            </button>
          </div>
          <p class="mt-2 truncate text-xs text-muted" :title="group.children.map(c => `${c.code}: ${c.label}`).join('; ')">
            {{ group.children.map(c => c.code).join(' · ') }}
          </p>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <label class="text-sm font-semibold">Doctor Comment {{ state.commentsManual ? '' : '(auto)' }}</label>
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            :disabled="disabled"
            @click="useAutoComment"
          >
            Use auto comment
          </UButton>
        </div>
        <UTextarea
          v-model="state.doctorComment"
          :disabled="disabled"
          :rows="8"
          class="w-full"
          @input="onDoctorCommentInput"
        />
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
          Save Draft
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
      title="Confirm Submit Dental Examination"
    >
      <template #body>
        <p class="text-sm text-highlighted">
          Submit the dental examination to the department?
        </p>
        <p class="mt-2 text-xs text-muted">
          After submitting, the result is locked and enters the department approval workflow.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="confirmSubmit = false">
            No, back
          </UButton>
          <UButton color="primary" :loading="saving" @click="submit">
            Yes, submit
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
