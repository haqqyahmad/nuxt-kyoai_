<script setup lang="ts">
import { h, resolveComponent, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useDoctorResult } from '~/composables/useDoctorResult'
import {
  FINAL_GRADES,
  FITNESS_LEVELS,
  FLAG_LABEL,
  FLAG_COLOR
} from '~/types/doctor-result'
import type { DoctorResultItem, DoctorResultGroup } from '~/types/doctor-result'
import DentalResultDisplay from '~/components/dental/DentalResultDisplay.vue'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const USelect = resolveComponent('USelect')

definePageMeta({
  title: 'Doctor Result Detail'
})

const route = useRoute()
const router = useRouter()
const examId = String(route.params.id)

const {
  data,
  loading,
  submitting,
  selectedGrades,
  comments,
  groupGrades,
  finalGrade,
  fitnessLevel,
  finalComment,
  internalNote,
  allItems,
  allGroups,
  pendingGroups,
  pendingCount,
  gradedCount,
  totalGradable,
  canSubmit,
  load,
  selectGrade,
  clearGrade,
  selectGroupGrade,
  clearGroupGrade,
  gradeOptionsFor,
  submit
} = useDoctorResult(examId)

const activeDepartmentId = ref('')
const gradeLoading = ref<Record<string, boolean>>({})
const groupGradeLoading = ref<Record<string, boolean>>({})
const gradeOptionsCache = ref<Record<string, string[]>>({})
const columnVisibility = ref({})

const departments = computed(() => data.value?.departments ?? [])
const abnormalCount = computed(() => allItems.value.filter(item => normalizedFlag(item.flag) !== 'normal').length)
const departmentTabs = computed(() => departments.value.map(department => ({
  label: department.departmentName,
  value: department.departmentId,
  icon: department.gradingMode === 'department' ? 'i-lucide-lock' : 'i-lucide-stethoscope'
})))

const autoCommentText = computed(() =>
  finalComment.value || Object.values(comments.value).filter(Boolean).join(' ')
)

// [F] Ringkasan grade per group (sidebar)
const groupSummary = computed(() =>
  allGroups.value
    .filter(g => g.groupId && g.showInDoctorResult !== false)
    .map(g => ({
      group: g,
      grade: groupGrades.value[g.groupId!]?.grade ?? g.grade ?? g.defaultGrade ?? null,
      comment: groupGrades.value[g.groupId!]?.comment ?? g.comment ?? ''
    }))
)

const abnormalGroupsPending = computed(() =>
  groupSummary.value.filter(s => s.group.isAbnormal && !s.grade)
)

// Ringkasan Grading — semua item gradable dari SEMUA department (bukan per tab aktif)
const selectedSummary = computed(() =>
  allItems.value
    .filter(item => selectedGrades.value[item.inputanId] || item.grade)
    .map(item => ({
      item,
      grade: selectedGrades.value[item.inputanId] || item.grade,
      comment: comments.value[item.inputanId] || item.comment || ''
    }))
)

const itemColumns: TableColumn<DoctorResultItem>[] = [
  {
    id: 'item',
    header: 'Item',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.inputanLabel),
      h('span', { class: 'text-xs text-muted' }, row.original.gradable ? 'gradable = 1' : 'gradable = 0')
    ])
  },
  {
    id: 'result',
    header: 'Result',
    cell: ({ row }) => h('div', { class: resultClass(row.original) }, `${row.original.displayValue ?? '-'} ${row.original.uom ?? ''}`.trim())
  },
  {
    id: 'normal',
    header: 'Normal',
    cell: ({ row }) => h('span', { class: 'text-muted' }, normalValue(row.original))
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, {
      label: flagLabel(row.original.flag),
      color: flagBadgeColor(row.original.flag),
      variant: 'subtle'
    })
  },
  {
    id: 'grade',
    header: 'Grade',
    cell: ({ row }) => renderGradeCell(row.original)
  },
  {
    id: 'comment',
    header: 'Komentar Otomatis',
    cell: ({ row }) => h('div', { class: 'max-w-md text-sm leading-5' }, [
      h('div', {}, comments.value[row.original.inputanId] ?? row.original.comment ?? (row.original.gradable ? 'Pilih grade untuk komentar otomatis.' : '-')),
      row.original.recommendation && (comments.value[row.original.inputanId] || row.original.comment)
        ? h('div', { class: 'mt-1 text-xs text-muted' }, `Rekomendasi: ${row.original.recommendation}`)
        : null
    ])
  }
]

async function onGradeChange(item: DoctorResultItem, grade: string) {
  gradeLoading.value[item.inputanId] = true
  try {
    if (!grade) {
      clearGrade(item)
      return
    }
    await selectGrade(item, grade)
    if (!gradeOptionsCache.value[item.inputanId]) {
      const options = await gradeOptionsFor(item)
      gradeOptionsCache.value[item.inputanId] = options
    }
  } finally {
    gradeLoading.value[item.inputanId] = false
  }
}

async function loadGradeOptions() {
  for (const item of allItems.value) {
    if (item.gradable && !item.locked) {
      const options = await gradeOptionsFor(item)
      gradeOptionsCache.value[item.inputanId] = options
    }
  }
}

// [F] Grade group: grade + komentar (opsional)
async function onGroupGradeChange(group: DoctorResultGroup, grade: string, comment: string) {
  if (!group.groupId) return
  // jaga komentar user: kalau sudah terisi manual, pertahankan
  const existing = groupGrades.value[group.groupId]?.comment ?? group.comment ?? ''
  const finalComment = existing || (grade ? groupCommentFor(group, grade) : '')
  groupGradeLoading.value[group.groupId] = true
  try {
    if (!grade) {
      await clearGroupGrade(group.groupId)
      group.grade = null
      return
    }
    const ok = await selectGroupGrade(group.groupId, grade, finalComment)
    if (ok) group.grade = grade
  } finally {
    groupGradeLoading.value[group.groupId] = false
  }
}

function onGroupCommentChange(group: DoctorResultGroup, comment: string) {
  group.comment = comment
  const grade = group.groupId ? groupGrades.value[group.groupId]?.grade : null
  if (group.groupId && grade) {
    groupGrades.value[group.groupId] = { grade, comment }
    void selectGroupGrade(group.groupId, grade, comment)
  }
}

function groupCommentFor(group: DoctorResultGroup, grade: string) {
  return group.commentOptions?.find(o => o.grade === grade)?.comment ?? ''
}

// Hapus grade lewat card Ringkasan Grading — sync otomatis ke select (selectedGrades)
async function removeGrade(item: DoctorResultItem) {
  gradeLoading.value[item.inputanId] = true
  try {
    await clearGrade(item)
  } finally {
    gradeLoading.value[item.inputanId] = false
  }
}

function scrollToDepartment(departmentId: string) {
  activeDepartmentId.value = departmentId
  document.getElementById(`dept-${departmentId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

// Scroll spy — highlight tab otomatis saat user scroll
let observer: IntersectionObserver | null = null
function setupScrollSpy() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const deptId = entry.target.id.replace('dept-', '')
          activeDepartmentId.value = deptId
        }
      }
    },
    { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
  )
  departments.value.forEach((dept) => {
    const el = document.getElementById(`dept-${dept.departmentId}`)
    if (el) observer!.observe(el)
  })
}

function goBack() {
  router.push('/rooms/doctor-result')
}

function normalizedFlag(flag: string) {
  const value = String(flag || '').toLowerCase()
  if (['high', 'critical_high', 'increase', 'abnormal_inc'].includes(value)) return 'increase'
  if (['low', 'critical_low', 'decrease', 'abnormal_dec'].includes(value)) return 'decrease'
  if (value === 'qualitative') return 'qualitative'
  return 'normal'
}

function flagBadgeColor(flag: string) {
  return FLAG_COLOR[normalizedFlag(flag)] ?? 'neutral'
}

function flagLabel(flag: string) {
  return FLAG_LABEL[normalizedFlag(flag)] ?? flag
}

function resultClass(item: DoctorResultItem) {
  const flag = normalizedFlag(item.flag)
  return {
    'font-semibold': true,
    'text-error': flag === 'increase',
    'text-warning': flag === 'decrease'
  }
}

function normalValue(item: DoctorResultItem) {
  if (item.normalMin != null || item.normalMax != null) return `${item.normalMin ?? '-'} - ${item.normalMax ?? '-'}`
  return '-'
}

function renderGradeCell(item: DoctorResultItem) {
  if (item.locked) {
    return h('div', { class: 'flex items-center gap-2' }, [
      h(UBadge, { label: item.grade || '-', color: 'neutral', variant: 'subtle' }),
      h(UIcon, { name: 'i-lucide-lock', class: 'size-4 text-muted' })
    ])
  }

  if (!item.gradable) return h('span', { class: 'text-xs text-muted' }, 'Tidak gradable')

  const options = gradeOptionsCache.value[item.inputanId]
  if (options?.length === 0) {
    return h('span', { class: 'text-xs text-muted' }, `Tidak ada grade untuk kondisi ${flagLabel(item.flag)}`)
  }

  return h(USelect, {
    'modelValue': selectedGrades.value[item.inputanId] ?? item.grade ?? '',
    'items': options ?? [],
    'size': 'sm',
    'class': 'w-28',
    'loading': gradeLoading.value[item.inputanId] || !options,
    'disabled': !options,
    'placeholder': 'Pilih',
    'onUpdate:modelValue': (value: string) => onGradeChange(item, value)
  })
}

async function submitResult() {
  const result = await submit()
  if (result) router.push('/rooms/doctor-result')
}

watch(departments, () => {
  nextTick(setupScrollSpy)
})

onMounted(async () => {
  await load()
  if (departments.value[0]) activeDepartmentId.value = departments.value[0].departmentId
  await loadGradeOptions()
  nextTick(setupScrollSpy)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <UDashboardPanel id="doctor-result-detail" class="w-full min-w-0">
    <template #body>
      <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
        <!-- Header minimal: back + title + right actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default pb-3">
          <div class="flex min-w-0 items-center gap-3">
            <UButton
              icon="i-lucide-arrow-left"
              variant="ghost"
              size="sm"
              @click="goBack"
            />
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <UIcon name="i-lucide-stethoscope" class="size-6 shrink-0 text-primary" />
                <h1 class="truncate text-2xl font-bold">
                  Doctor Result MCU
                </h1>
              </div>
              <p class="mt-1 text-sm text-muted">
                Grade hanya muncul pada item dengan gradable = 1.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="info" variant="soft">
              {{ gradedCount }}/{{ totalGradable }} graded
            </UBadge>
            <UButton icon="i-lucide-save" color="neutral" variant="outline">
              Simpan Draft
            </UButton>
            <UButton
              icon="i-lucide-send"
              color="primary"
              :loading="submitting"
              :disabled="!canSubmit"
              @click="submitResult"
            >
              Submit ke MR Review
            </UButton>
          </div>
        </div>

        <UCard v-if="loading" class="w-full min-w-0">
          <div class="space-y-4">
            <USkeleton class="h-6 w-1/2" />
            <USkeleton class="h-28 w-full" />
            <USkeleton class="h-64 w-full" />
          </div>
        </UCard>

        <template v-else-if="data">
          <UCard class="w-full min-w-0 overflow-hidden">
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="font-semibold">
                  Data Pasien
                </h2>
                <UBadge color="info" variant="soft">
                  DOCTOR_REVIEW
                </UBadge>
              </div>
            </template>

            <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase text-muted">
                  Pasien
                </div>
                <div class="truncate font-semibold">
                  {{ data.patient.name }}
                </div>
                <div class="truncate text-xs text-muted">
                  {{ data.patient.patientId }}
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase text-muted">
                  Exam Code
                </div>
                <div class="truncate font-mono text-sm font-semibold">
                  {{ data.patient.examCode }}
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase text-muted">
                  Exam Date
                </div>
                <div class="truncate font-semibold">
                  {{ data.patient.examDate }}
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase text-muted">
                  Umur
                </div>
                <div class="truncate font-semibold">
                  {{ data.patient.age }}
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase text-muted">
                  Perusahaan
                </div>
                <div class="truncate font-semibold">
                  {{ data.patient.company }}
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-semibold uppercase text-muted">
                  Paket
                </div>
                <div class="truncate font-semibold">
                  {{ data.patient.package }}
                </div>
              </div>
            </div>
          </UCard>

          <UAlert
            v-if="pendingCount > 0"
            icon="i-lucide-alert-triangle"
            color="warning"
            variant="soft"
            :title="`${pendingCount} item grading belum diisi`"
            description="Semua item gradable harus diisi sebelum submit ke MR Review."
          />

          <UAlert
            v-if="abnormalGroupsPending.length > 0"
            icon="i-lucide-alert-triangle"
            color="error"
            variant="soft"
            :title="`${abnormalGroupsPending.length} group abnormal belum di-grade`"
            description="Kelompok dengan item abnormal wajib diberi grade group sebelum submit."
          />

          <!-- Sticky Group Anchor Navigation -->
          <div class="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-1.5 bg-default/95 backdrop-blur-sm px-4 py-2 border-b border-default shadow-sm">
            <span class="mr-1 text-xs font-semibold text-muted">Group:</span>
            <UButton
              v-for="tab in departmentTabs"
              :key="tab.value"
              :icon="tab.icon"
              :label="tab.label"
              size="xs"
              :color="tab.value === activeDepartmentId ? 'primary' : 'neutral'"
              :variant="tab.value === activeDepartmentId ? 'solid' : 'outline'"
              class="shrink-0"
              @click="scrollToDepartment(tab.value)"
            />
          </div>

          <div class="grid w-full min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <UCard class="w-full min-w-0 overflow-hidden">
              <template #header>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="min-w-0">
                    <h2 class="font-semibold">
                      Hasil Pemeriksaan Multi-Department
                    </h2>
                    <p class="text-xs text-muted">
                      {{ allItems.length }} item, {{ abnormalCount }} abnormal
                    </p>
                  </div>
                  <UBadge color="warning" variant="soft">
                    {{ pendingCount }} pending
                  </UBadge>
                </div>
              </template>

              <div class="w-full min-w-0 space-y-6">
                <section
                  v-for="dept in departments"
                  :id="`dept-${dept.departmentId}`"
                  :key="dept.departmentId"
                  class="scroll-mt-4 w-full min-w-0 space-y-6"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-2">
                    <div class="min-w-0">
                      <h3 class="truncate font-semibold">
                        {{ dept.departmentName }}
                      </h3>
                      <p class="text-xs text-muted">
                        {{ dept.groups.reduce((n, g) => n + (g.items?.length ?? 0), 0) }} item
                      </p>
                    </div>
                    <UBadge color="neutral" variant="soft">
                      {{ dept.departmentCode }}
                    </UBadge>
                  </div>

                  <!-- [DENTAL] Preview read-only hasil dept gigi -->
                  <div
                    v-if="(dept as any).dental"
                    class="w-full min-w-0 overflow-hidden rounded-lg border border-primary/30"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-primary/30 bg-primary/5 px-4 py-3">
                      <div class="flex min-w-0 items-center gap-2">
                        <UIcon name="i-lucide-stethoscope" class="size-4 text-primary" />
                        <h4 class="truncate font-semibold">
                          Pemeriksaan Gigi — Preview
                        </h4>
                      </div>
                      <div class="flex items-center gap-2">
                        <UBadge
                          v-if="(dept as any).dental.status === 'SUBMITTED'"
                          color="success"
                          variant="soft"
                          label="Submitted"
                        />
                        <UButton
                          icon="i-lucide-printer"
                          size="xs"
                          color="primary"
                          variant="outline"
                          @click="router.push(`/rooms/dental/print/${examId}`)"
                        >
                          Cetak
                        </UButton>
                      </div>
                    </div>
                    <div class="px-4 py-3">
                      <DentalResultDisplay :data="(dept as any).dental" />
                    </div>
                  </div>
                  <template v-for="group in dept.groups" :key="group.groupName">
                    <div
                      v-if="group.showInDoctorResult !== false"
                      class="w-full min-w-0 overflow-hidden rounded-lg border border-default/70"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-elevated/40 px-4 py-3">
                        <div class="flex min-w-0 items-center gap-3">
                          <h4 class="truncate font-semibold">
                            {{ group.groupName }}
                          </h4>
                          <small class="text-xs text-muted">Result approved dari department</small>
                        </div>
                        <UBadge
                          v-if="group.isAbnormal"
                          color="error"
                          variant="soft"
                        >
                          ⚠ {{ group.abnormalCount }} abnormal
                        </UBadge>
                        <span v-else class="text-xs font-semibold text-success">
                          ✓ Normal
                        </span>
                      </div>

                      <!-- [F] strip grade group -->
                      <div
                        class="flex flex-wrap items-center gap-3 border-b border-default px-4 py-3"
                        :class="group.isAbnormal ? 'bg-error/5' : 'bg-success/5'"
                      >
                        <span class="text-xs font-semibold text-muted">Grade Group</span>
                        <USelect
                          class="w-44"
                          size="sm"
                          :model-value="groupGrades[group.groupId!]?.grade ?? group.grade ?? (group.isAbnormal ? '' : group.defaultGrade ?? 'A')"
                          :items="(group.gradeOptions ?? []).map(o => ({ label: `${o.grade} - ${o.label}`, value: o.grade }))"
                          placeholder="Pilih"
                          :loading="group.groupId ? groupGradeLoading[group.groupId] : false"
                          @update:model-value="onGroupGradeChange(group, $event as string, groupCommentFor(group, $event as string))"
                        />                       <UInput
                          class="min-w-48 flex-1"
                          size="sm"
                          :model-value="groupGrades[group.groupId!]?.comment ?? group.comment ?? ''"
                          placeholder="Komentar group (opsional)"
                          @update:model-value="(v) => onGroupCommentChange(group, v as string)"
                        />
                        <small v-if="!group.isAbnormal" class="text-xs text-success">
                          otomatis A, dapat diubah
                        </small>
                      </div>

                      <div class="w-full min-w-0 overflow-x-auto">
                        <UTable
                          v-model:column-visibility="columnVisibility"
                          :data="group.items"
                          :columns="itemColumns"
                          class="w-full min-w-[960px]"
                          :ui="{
                            base: 'table-fixed border-separate border-spacing-0',
                            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                            tbody: '[&>tr]:last:[&>td]:border-b-0',
                            th: 'py-3 border-b border-default',
                            td: 'border-b border-default align-top',
                            separator: 'h-0'
                          }"
                        />
                      </div>
                    </div>
                  </template>
                </section>
              </div>
            </UCard>

            <aside class="w-full min-w-0 space-y-4 2xl:sticky 2xl:top-4 2xl:self-start">
              <UCard class="w-full min-w-0 aside-scroll">
                <template #header>
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="font-semibold">
                      Kesimpulan Dokter
                    </h2>
                    <UBadge color="success" variant="soft">
                      Auto generated
                    </UBadge>
                  </div>
                </template>

                <div class="space-y-4">
                  <!-- [F] Grade per Group summary -->
                  <div class="rounded-lg border border-primary/30 bg-elevated/50 p-3">
                    <h3 class="text-sm font-semibold text-primary">
                      Grade per Group
                    </h3>
                    <div v-if="groupSummary.length" class="mt-2 space-y-2">
                      <div
                        v-for="gs in groupSummary"
                        :key="gs.group.groupId ?? gs.group.groupName"
                        class="flex items-start justify-between gap-2 rounded-md border border-default px-3 py-2"
                      >
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-2">
                            <span class="text-sm font-medium">
                              {{ gs.group.groupName }}
                            </span>
                            <span
                              class="text-sm font-black"
                              :class="gs.group.isAbnormal ? 'text-error' : 'text-success'"
                            >
                              {{ gs.grade || '-' }}
                            </span>
                          </div>
                          <p class="mt-1 text-xs text-muted">
                            {{ gs.group.isAbnormal ? `${gs.group.abnormalCount} abnormal` : 'Normal' }}
                          </p>
                          <p v-if="gs.comment" class="mt-0.5 text-sm">
                            {{ gs.comment }}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p v-else class="mt-2 text-xs text-muted">
                      Tidak ada grade group.
                    </p>
                    <p v-if="abnormalGroupsPending.length" class="mt-2 text-xs font-semibold text-warning">
                      {{ abnormalGroupsPending.length }} group abnormal belum di-grade
                    </p>
                  </div>

                  <UAlert
                    icon="i-lucide-info"
                    color="warning"
                    variant="soft"
                    title="Auto-comment"
                    description="Komentar otomatis diambil dari kombinasi item, status nilai, dan grade."
                  />

                  <div class="rounded-lg border border-default p-3">
                    <h3 class="text-sm font-semibold">
                      Ringkasan Grading
                    </h3>
                    <div v-if="selectedSummary.length" class="mt-3 space-y-2">
                      <div
                        v-for="entry in selectedSummary"
                        :key="entry.item.inputanId"
                        class="flex items-start gap-2 rounded-md border-l-4 border-primary bg-elevated/40 px-3 py-2"
                      >
                        <div class="min-w-0 flex-1">
                          <div class="text-sm font-semibold">
                            {{ entry.item.inputanLabel }} - Grade {{ entry.grade }}
                          </div>
                          <div class="mt-1 text-xs text-muted">
                            {{ flagLabel(entry.item.flag) }}
                          </div>
                          <p class="mt-1 text-sm">
                            {{ entry.comment || '-' }}
                          </p>
                        </div>
                        <UButton
                          icon="i-lucide-x"
                          size="xs"
                          color="error"
                          variant="ghost"
                          :loading="gradeLoading[entry.item.inputanId]"
                          aria-label="Hapus grade"
                          @click="removeGrade(entry.item)"
                        />
                      </div>
                    </div>
                    <p v-else class="mt-2 text-sm text-muted">
                      Belum ada grade dipilih.
                    </p>
                  </div>

                  <UFormField label="Final Grade">
                    <USelect
                      v-model="finalGrade"
                      :items="[...FINAL_GRADES]"
                      placeholder="Pilih final grade"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Fitness Level">
                    <USelect
                      v-model="fitnessLevel"
                      :items="[...FITNESS_LEVELS]"
                      placeholder="Pilih fitness level"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Komentar Kesimpulan Otomatis">
                    <UTextarea
                      v-model="finalComment"
                      :rows="8"
                      placeholder="Komentar otomatis akan muncul setelah grade dipilih."
                      class="w-full"
                    />
                    <p v-if="!finalComment && autoCommentText" class="mt-1 text-xs text-muted">
                      Auto: {{ autoCommentText }}
                    </p>
                  </UFormField>

                  <UFormField label="Catatan Internal Dokter">
                    <UTextarea
                      v-model="internalNote"
                      :rows="4"
                      placeholder="Catatan internal, tidak tampil pada sertifikat."
                      class="w-full"
                    />
                  </UFormField>

                  <div class="rounded-lg border border-default p-3 text-sm">
                    <div class="flex justify-between">
                      <span class="text-muted">Graded</span>
                      <span class="font-semibold">{{ gradedCount }}/{{ totalGradable }}</span>
                    </div>
                    <div class="mt-2 flex justify-between">
                      <span class="text-muted">Pending</span>
                      <span class="font-semibold text-warning">{{ pendingCount }}</span>
                    </div>
                  </div>

                  <UButton
                    block
                    icon="i-lucide-send"
                    color="primary"
                    :loading="submitting"
                    :disabled="!canSubmit"
                    @click="submitResult"
                  >
                    Submit ke MR Review
                  </UButton>
                </div>
              </UCard>
            </aside>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.aside-scroll {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  scrollbar-width: thin;          /* Firefox */
  scrollbar-color: var(--ui-border) transparent; /* Firefox */
}
.aside-scroll::-webkit-scrollbar {
  width: 4px;                     /* Chrome / Safari */
}
.aside-scroll::-webkit-scrollbar-thumb {
  background: var(--ui-border);
  border-radius: 999px;
}
.aside-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
