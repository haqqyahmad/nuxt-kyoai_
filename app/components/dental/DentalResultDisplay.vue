<script setup lang="ts">
import { computed } from 'vue'
import { DENTAL_GRADE_CONFIG, DENTAL_CHART_GROUPS } from '~/types/dental'
import type { DentalExamData } from '~/types/dental'

const props = defineProps<{ data: DentalExamData | null }>()

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const grading = computed(() => {
  const config = props.data?.gradeConfig ?? DENTAL_GRADE_CONFIG
  const finalGrade = props.data?.finalGrade ?? props.data?.suggestedGrade
  return {
    suggestedGrade: props.data?.suggestedGrade,
    suggestedLabel: props.data?.suggestedLabel,
    gradeReason: props.data?.gradeReason,
    finalGrade,
    finalLabel: finalGrade ? config[finalGrade as keyof typeof config]?.label : null,
    doctorComment: props.data?.doctorComment ?? (finalGrade ? config[finalGrade as keyof typeof config]?.comment : null)
  }
})

function findingCount(tooth: string) {
  return props.data?.findings?.filter(f => f.toothNumber === tooth).length ?? 0
}
function findingConditions(tooth: string) {
  return props.data?.findings?.find(f => f.toothNumber === tooth)?.conditions ?? []
}

// Ringkasan kondisi: condition -> daftar nomor gigi yang mengalaminya
const conditionSummary = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {}
  for (const f of props.data?.findings ?? []) {
    for (const c of f.conditions ?? []) {
      if (!map[c]) map[c] = []
      map[c].push(f.toothNumber)
    }
  }
  return map
})
</script>

<template>
  <div v-if="data" class="space-y-4">
    <!-- Patient header -->
    <div class="rounded-xl border border-default p-4">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Detail Pasien
      </p>
      <div class="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-6">
        <div>
          <p class="text-xs text-muted">
            Nama
          </p>
          <p class="font-semibold text-highlighted">
            {{ data.patientName }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Pasien ID
          </p>
          <p class="font-semibold text-highlighted">
            {{ data.patientId ?? '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Exam Code
          </p>
          <p class="font-mono font-semibold text-highlighted">
            {{ data.examCode }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Queue
          </p>
          <p class="font-semibold text-highlighted">
            {{ data.queueCode }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Umur
          </p>
          <p class="font-semibold text-highlighted">
            {{ data.age != null ? `${data.age} th` : '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Tanggal
          </p>
          <p class="font-semibold text-highlighted">
            {{ formatDate(data.examDate) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Oral Examination -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-default p-4">
        <h4 class="mb-2 text-sm font-semibold text-highlighted">
          Extra Oral
        </h4>
        <div class="flex flex-wrap gap-2">
          <span v-for="v in data.extraOral" :key="v" class="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{{ v }}</span>
          <span v-if="!data.extraOral.length" class="text-sm text-muted">-</span>
        </div>
        <p v-if="data.extraOralNote" class="mt-2 text-sm text-muted">
          {{ data.extraOralNote }}
        </p>
      </div>
      <div class="rounded-xl border border-default p-4">
        <h4 class="mb-2 text-sm font-semibold text-highlighted">
          Intra Oral
        </h4>
        <div class="flex flex-wrap gap-2">
          <span v-for="v in data.intraOral" :key="v" class="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{{ v }}</span>
          <span v-if="!data.intraOral.length" class="text-sm text-muted">-</span>
        </div>
        <p v-if="data.intraOralNote" class="mt-2 text-sm text-muted">
          {{ data.intraOralNote }}
        </p>
      </div>
    </div>

    <!-- Dental Chart (kiri) + Kondisi Gigi (kanan) -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <!-- Dental Chart -->
      <div class="rounded-xl border border-default p-4">
        <h4 class="mb-3 text-sm font-semibold text-highlighted">
          Dental Chart
        </h4>
        <div class="space-y-4">
          <div v-for="group in DENTAL_CHART_GROUPS" :key="group.label" class="print-break-inside">
            <p class="mb-2 text-xs font-semibold text-muted">
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
                    disabled
                    class="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border text-xs font-bold"
                    :class="findingCount(tooth) ? 'border-primary bg-primary/5' : 'border-default bg-default'"
                    :title="findingConditions(tooth).join(', ')"
                  >
                    <span class="text-lg text-muted">🦷</span>
                    <span>{{ tooth }}</span>
                    <span v-if="findingCount(tooth)" class="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {{ findingCount(tooth) }}
                    </span>
                  </button>
                </div>
                <div class="w-px shrink-0 self-stretch bg-default/60" />
                <div class="grid min-w-0 flex-1 gap-1.5" :class="halves[1].length === 8 ? 'grid-cols-8' : 'grid-cols-5'">
                  <button
                    v-for="tooth in halves[1]"
                    :key="tooth"
                    type="button"
                    disabled
                    class="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border text-xs font-bold"
                    :class="findingCount(tooth) ? 'border-primary bg-primary/5' : 'border-default bg-default'"
                    :title="findingConditions(tooth).join(', ')"
                  >
                    <span class="text-lg text-muted">🦷</span>
                    <span>{{ tooth }}</span>
                    <span v-if="findingCount(tooth)" class="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {{ findingCount(tooth) }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kondisi Gigi -->
      <div class="rounded-xl border border-default p-4">
        <h4 class="mb-3 text-sm font-semibold text-highlighted">
          Kondisi Gigi
        </h4>
        <div v-if="!Object.keys(conditionSummary).length" class="rounded-lg border border-dashed border-default py-6 text-center text-sm text-muted">
          Tidak ada kondisi ditemukan.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(teeth, condition) in conditionSummary"
            :key="condition"
            class="rounded-xl border border-default bg-muted/20 p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{{ condition }}</span>
              <span class="text-xs text-muted">{{ teeth.length }} gigi</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span v-for="tooth in teeth" :key="tooth" class="rounded-full border border-default bg-default px-2 py-0.5 text-xs font-semibold text-highlighted">{{ tooth }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dental Findings -->
    <div class="rounded-xl border border-default p-4">
      <h4 class="mb-3 text-sm font-semibold text-highlighted">
        Dental Findings
      </h4>
      <div v-if="!data.findings?.length" class="rounded-lg border border-dashed border-default py-6 text-center text-sm text-muted">
        Tidak ada temuan dental.
      </div>
      <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          v-for="finding in data.findings"
          :key="finding.toothNumber"
          class="rounded-xl border border-default bg-muted/20 p-3"
        >
          <p class="text-lg font-extrabold text-highlighted">
            {{ finding.toothNumber }}
          </p>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <span v-for="c in finding.conditions" :key="c" class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{{ c }}</span>
          </div>
          <p v-if="finding.note" class="mt-1 text-xs text-muted">
            {{ finding.note }}
          </p>
        </div>
      </div>
    </div>

    <!-- Other Dental -->
    <div class="rounded-xl border border-default p-4">
      <h4 class="mb-2 text-sm font-semibold text-highlighted">
        Other Dental / General Findings
      </h4>
      <div class="flex flex-wrap gap-2">
        <span v-for="v in data.otherDental" :key="v" class="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{{ v }}</span>
        <span v-if="!data.otherDental.length" class="text-sm text-muted">-</span>
      </div>
      <p v-if="data.otherNote" class="mt-2 text-sm text-muted">
        {{ data.otherNote }}
      </p>
    </div>

    <!-- Grade & Comment -->
    <div class="rounded-xl border border-default p-4">
      <h4 class="mb-3 text-sm font-semibold text-highlighted">
        Grade & Comment
      </h4>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p class="text-xs text-muted">
            Suggested Grade
          </p>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-2xl font-extrabold text-highlighted">{{ grading.suggestedGrade ?? '-' }}</span>
            <span v-if="grading.suggestedLabel" class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{{ grading.suggestedLabel }}</span>
          </div>
        </div>
        <div>
          <p class="text-xs text-muted">
            Final Grade
          </p>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-2xl font-extrabold text-primary">{{ grading.finalGrade ?? '-' }}</span>
            <span v-if="grading.finalLabel" class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs">{{ grading.finalLabel }}</span>
          </div>
        </div>
      </div>
      <p v-if="grading.gradeReason" class="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted">
        {{ grading.gradeReason }}
      </p>
      <div class="mt-4">
        <p class="text-xs font-semibold text-muted">
          Doctor Comment
        </p>
        <p class="mt-1 whitespace-pre-line text-sm text-highlighted">
          {{ grading.doctorComment || '-' }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print-break-inside {
    break-inside: avoid;
  }
}
</style>
