<script setup lang="ts">
import { buildQuestionnaireResultHtml, printQuestionnaireResult } from '~/composables/questionnaire/useQuestionnaireResultPrint'
import type { QuestionnairePrintRow } from '~/composables/questionnaire/useQuestionnaireResultPrint'

const api = useApi()
const toast = useToast()

type QuestionnaireResult = {
  registrationKey: string
  registrationRef: string
  patientCode: string
  patientName: string
  patientGender?: string | null
  patientDob?: string | null
  patientAge?: number | null
  patientMaritalStatus?: string | null
  patientPhone?: string | null
  patientAddress?: string | null
  patientPosition?: string | null
  companyId: string
  companyName: string
  branchId: string
  branchName: string
  examDate: string
  questionnaire_id: string
  questionnaire_name: string
  questionnaire_image?: string | null
  status: 'Completed' | 'Pending'
  completionDate: string | null
}

type Branch = {
  id: number
  branchId: string
  nameBranch: string
  addressBranch?: string
}

type Customer = {
  id: number
  codeCostumer: string
  customerName: string
}

const filters = reactive({
  companyId: '',
  branchId: '',
  dateFrom: '',
  dateTo: '',
  status: ''
})

const loading = ref(false)
const results = ref<QuestionnaireResult[]>([])

const { data: branches } = await useAsyncData('qresults-branches', () =>
  api.get('/branch?limit=100').then(res => res.data.data as Branch[])
)

const { data: customers } = await useAsyncData('qresults-customers', () =>
  api.get('/customer').then(res => res.data.data as Customer[])
)

async function fetchResults() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filters.companyId) params.companyId = filters.companyId
    if (filters.branchId) params.branchId = filters.branchId
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo
    if (filters.status) params.status = filters.status

    const res = await api.get('/questionnaire/results', { params })
    const data = (res.data?.data ?? []) as QuestionnaireResult[]
    data.sort((a, b) => {
      const da = a.examDate || ''
      const db = b.examDate || ''
      if (da !== db) return da < db ? 1 : -1
      const ca = a.completionDate ? new Date(a.completionDate).getTime() : 0
      const cb = b.completionDate ? new Date(b.completionDate).getTime() : 0
      return cb - ca
    })
    results.value = data
  } catch {
    toast.add({
      title: 'Failed',
      description: 'Failed to load questionnaire results',
      color: 'error'
    })
    results.value = []
  } finally {
    loading.value = false
  }
}

async function clearFilters() {
  filters.companyId = ''
  filters.branchId = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.status = ''
  await fetchResults()
}

await fetchResults()

// ─────────────────────────────────────────────
// Detail modal
// ─────────────────────────────────────────────
type TempQuestionnaire = {
  questionnaire_id: string
  questionnaire_name: string
  print_template?: string | null
  status: 'Completed' | 'Pending'
  completionDate: string | null
  answers?: Array<{
    questionId: string
    questionText: string
    questionType?: string
    sectionTitle?: string | null
    optionId?: string | null
    optionText?: string | null
    answerText?: string | null
    answered?: boolean
  }>
}

const modalLoading = ref(false)
const modalData = ref<TempQuestionnaire | null>(null)

async function loadQuestionnaireDetail(row: QuestionnaireResult) {
  modalLoading.value = true
  try {
    const res = await api.get(`/registration/number/${row.registrationRef}/questionnaires`)
    const list = (res.data?.data ?? []) as TempQuestionnaire[]
    const match = list.find(q => q.questionnaire_id === row.questionnaire_id)
    modalData.value = match ?? null
  } catch {
    modalData.value = null
  } finally {
    modalLoading.value = false
  }
}

function formatDateTime(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function fmtDate(d?: string) {
  if (!d) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim())
  if (m) {
    const [_, y, mo, day] = m
    const parsed = new Date(Number(y), Number(mo) - 1, Number(day))
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    }
  }
  return d
}

function buildResultRow(row: QuestionnaireResult): QuestionnairePrintRow {
  return {
    questionnaire_name: row.questionnaire_name,
    patientName: row.patientName,
    patientGender: row.patientGender,
    patientDob: row.patientDob,
    patientAge: row.patientAge,
    patientMaritalStatus: row.patientMaritalStatus,
    patientPhone: row.patientPhone,
    patientAddress: row.patientAddress,
    patientPosition: row.patientPosition,
    patientCode: row.patientCode,
    registrationRef: row.registrationRef,
    companyName: row.companyName,
    branchName: row.branchName,
    examDate: row.examDate,
    questionnaire_image: row.questionnaire_image,
    print_template: modalData.value?.print_template ?? null,
    answers: (modalData.value?.answers ?? []).map(a => ({
      questionId: a.questionId,
      questionText: a.questionText,
      questionType: a.questionType,
      sectionTitle: a.sectionTitle,
      optionId: a.optionId,
      optionText: a.optionText,
      answerText: a.answerText,
      answered: a.answered
    }))
  }
}

async function printResult(row: QuestionnaireResult) {
  if (!modalData.value || modalData.value.questionnaire_id !== row.questionnaire_id) {
    await loadQuestionnaireDetail(row)
  }
  printQuestionnaireResult(buildResultRow(row))
}

const previewOpen = ref(false)
const previewTitle = ref('')
const previewHtml = ref('')
const previewRow = ref<QuestionnaireResult | null>(null)

async function openPreview(row: QuestionnaireResult) {
  if (!modalData.value || modalData.value.questionnaire_id !== row.questionnaire_id) {
    await loadQuestionnaireDetail(row)
  }
  previewTitle.value = row.questionnaire_name
  previewRow.value = row
  previewHtml.value = buildQuestionnaireResultHtml(buildResultRow(row))
  previewOpen.value = true
}

function closePreview() {
  previewOpen.value = false
  previewHtml.value = ''
}

type PatientGroup = {
  patientKey: string
  patientCode: string
  patientName: string
  patientGender?: string | null
  patientDob?: string | null
  patientAge?: number | null
  companyName: string
  status: 'Completed' | 'Pending'
  questionnaires: QuestionnaireResult[]
}

const patientGroups = computed<PatientGroup[]>(() => {
  const map = new Map<string, PatientGroup>()
  for (const r of results.value) {
    const key = `${r.patientCode || r.patientName || 'unknown'}||${r.examDate || ''}`
    let g = map.get(key)
    if (!g) {
      g = {
        patientKey: key,
        patientCode: r.patientCode,
        patientName: r.patientName,
        patientGender: r.patientGender,
        patientDob: r.patientDob,
        patientAge: r.patientAge,
        companyName: r.companyName,
        status: 'Completed',
        questionnaires: []
      }
      map.set(key, g)
    }
    g.questionnaires.push(r)
    if (r.status !== 'Completed') g.status = 'Pending'
  }

  for (const g of map.values()) {
    g.questionnaires.sort((a, b) => {
      const ca = a.completionDate ? new Date(a.completionDate).getTime() : 0
      const cb = b.completionDate ? new Date(b.completionDate).getTime() : 0
      return cb - ca
    })
  }

  return Array.from(map.values())
})

const totalPatients = computed(() => patientGroups.value.length)

const totalQuestionnaires = computed(() => results.value.length)

const currentPage = ref(1)

const currentPageSize = ref(10)

type SortableKey = 'patientName' | 'companyName' | 'questionnaireCount' | 'examDate' | 'branchName'

const sortBy = ref<SortableKey>('examDate')

const sortDir = ref<'asc' | 'desc'>('desc')

const sortedGroups = computed<PatientGroup[]>(() => {
  const list = patientGroups.value.slice()
  list.sort((x, y) => {
    let cmp = 0
    switch (sortBy.value) {
      case 'patientName':
        cmp = x.patientName.localeCompare(y.patientName)
        break
      case 'companyName':
        cmp = x.companyName.localeCompare(y.companyName)
        break
      case 'questionnaireCount':
        cmp = x.questionnaires.length - y.questionnaires.length
        break
      case 'examDate':
        cmp = (x.questionnaires[0]?.examDate ?? '').localeCompare(y.questionnaires[0]?.examDate ?? '')
        break
      case 'branchName':
        cmp = (x.questionnaires[0]?.branchName ?? '').localeCompare(y.questionnaires[0]?.branchName ?? '')
        break
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return list
})

function toggleSort(key: SortableKey) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

function sortIcon(key: SortableKey): string {
  if (sortBy.value !== key) return 'i-lucide-arrow-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'
}

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value
  return sortedGroups.value.slice(start, start + currentPageSize.value)
})

const expanded = reactive<Record<string, boolean>>({})

function isExpanded(patientKey: string): boolean {
  return !!expanded[patientKey]
}

function toggleExpand(patientKey: string) {
  expanded[patientKey] = !expanded[patientKey]
}

watch(currentPageSize, () => {
  currentPage.value = 1
})

watch(results, () => {
  currentPage.value = 1
})
</script>

<template>
  <UDashboardPanel id="questionnaire-results">
    <template #header>
      <UDashboardNavbar title="Questionnaire Results">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-rotate-cw"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="fetchResults"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="w-full min-w-0 space-y-4">
        <!-- Filters -->
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Company</label>
              <select
                v-model="filters.companyId"
                class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                <option value="">
                  All companies
                </option>
                <option v-for="c in customers ?? []" :key="c.id" :value="String(c.id)">
                  {{ c.customerName }}
                </option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Branch</label>
              <select
                v-model="filters.branchId"
                class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                <option value="">
                  All branches
                </option>
                <option v-for="b in branches ?? []" :key="b.branchId" :value="String(b.branchId)">
                  {{ b.nameBranch }}
                </option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-500 dark:text-neutral-400">From Date</label>
              <input
                v-model="filters.dateFrom"
                type="date"
                class="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
            </div>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-500 dark:text-neutral-400">To Date</label>
              <input
                v-model="filters.dateTo"
                type="date"
                class="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
            </div>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Status</label>
              <select
                v-model="filters.status"
                class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                <option value="">
                  All statuses
                </option>
                <option value="Completed">
                  Completed
                </option>
                <option value="Pending">
                  Pending
                </option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-neutral-800">
            <button
              class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
              :disabled="loading"
              @click="clearFilters"
            >
              <UIcon name="i-lucide-rotate-ccw" class="size-3.5" /> Reset
            </button>
            <button
              class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="loading"
              @click="fetchResults"
            >
              <UIcon name="i-lucide-filter" class="size-3.5" /> Apply
            </button>
          </div>
        </div>

        <!-- Table card -->
        <div class="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-neutral-800">
            <span class="text-xs font-medium text-slate-500 dark:text-neutral-400">{{ totalPatients }} Patients ({{ totalQuestionnaires }} Total Questionnaires)</span>
            <span class="hidden text-[11px] text-slate-400 sm:block dark:text-neutral-500">Click a row to view details</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full border-separate border-spacing-0 text-left text-xs text-slate-600 dark:text-neutral-300">
              <thead class="font-semibold text-slate-500 dark:text-neutral-400">
                <tr class="bg-slate-50/80 dark:bg-neutral-800/50">
                  <th class="w-10 p-3.5 pl-4">
                    <span class="sr-only">Expand</span>
                  </th>
                  <th class="p-3.5">
                    <button class="inline-flex items-center gap-1 transition-colors hover:text-slate-800 dark:hover:text-gray-50" @click="toggleSort('patientName')">
                      Patient &amp; Patient ID
                      <UIcon :name="sortIcon('patientName')" class="size-3" :class="sortBy === 'patientName' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-neutral-400'" />
                    </button>
                  </th>
                  <th class="p-3.5">
                    <button class="inline-flex items-center gap-1 transition-colors hover:text-slate-800 dark:hover:text-gray-50" @click="toggleSort('companyName')">
                      Company
                      <UIcon :name="sortIcon('companyName')" class="size-3" :class="sortBy === 'companyName' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-neutral-400'" />
                    </button>
                  </th>
                  <th class="p-3.5">
                    <button class="inline-flex items-center gap-1 transition-colors hover:text-slate-800 dark:hover:text-gray-50" @click="toggleSort('questionnaireCount')">
                      Total Questionnaire
                      <UIcon :name="sortIcon('questionnaireCount')" class="size-3" :class="sortBy === 'questionnaireCount' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-neutral-400'" />
                    </button>
                  </th>
                  <th class="p-3.5">
                    <button class="inline-flex items-center gap-1 transition-colors hover:text-slate-800 dark:hover:text-gray-50" @click="toggleSort('examDate')">
                      Exam Date
                      <UIcon :name="sortIcon('examDate')" class="size-3" :class="sortBy === 'examDate' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-neutral-400'" />
                    </button>
                  </th>
                  <th class="p-3.5">
                    <button class="inline-flex items-center gap-1 transition-colors hover:text-slate-800 dark:hover:text-gray-50" @click="toggleSort('branchName')">
                      Branch
                      <UIcon :name="sortIcon('branchName')" class="size-3" :class="sortBy === 'branchName' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-neutral-400'" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-neutral-800">
                <tr v-if="loading">
                  <td colspan="6" class="py-10 text-center">
                    <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-slate-400 dark:text-neutral-400" />
                  </td>
                </tr>
                <tr v-else-if="!paginatedGroups.length">
                  <td colspan="6" class="py-10 text-center text-sm text-slate-400 dark:text-neutral-400">
                    No data
                  </td>
                </tr>

                <template v-for="g in paginatedGroups" :key="g.patientKey">
                  <tr class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800/50" @click="toggleExpand(g.patientKey)">
                    <td class="p-3.5 pl-4 text-center">
                      <button
                        class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 dark:text-neutral-400 dark:hover:bg-neutral-600"
                        aria-label="Expand"
                        @click.stop="toggleExpand(g.patientKey)"
                      >
                        <UIcon
                          name="i-lucide-chevron-right"
                          class="size-4 transition-transform duration-200"
                          :class="isExpanded(g.patientKey) ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''"
                        />
                      </button>
                    </td>
                    <td class="p-3.5">
                      <div class="font-semibold text-slate-800 dark:text-gray-50">
                        {{ g.patientName }}
                      </div>
                      <div class="font-mono text-[10px] text-slate-400 dark:text-neutral-500">
                        {{ g.patientCode || '-' }}
                      </div>
                    </td>
                    <td class="p-3.5 font-medium text-slate-700 dark:text-neutral-200">
                      {{ g.companyName || '-' }}
                    </td>
                    <td class="p-3.5">
                      <span class="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:border-blue-900 dark:bg-blue-900/40 dark:text-blue-200">
                        <UIcon name="i-lucide-file-text" class="size-3.5" /> {{ g.questionnaires.length }} Questionnaire
                      </span>
                    </td>
                    <td class="p-3.5 text-slate-600 dark:text-neutral-300">
                      {{ g.questionnaires.length ? fmtDate(g.questionnaires[0]?.examDate) : '-' }}
                    </td>
                    <td class="p-3.5 text-slate-600 dark:text-neutral-300">
                      {{ g.questionnaires.length ? (g.questionnaires[0]?.branchName ?? '-') : '-' }}
                    </td>
                  </tr>

                  <tr v-if="isExpanded(g.patientKey)" class="border-y border-slate-200 bg-slate-50/70 dark:border-neutral-700 dark:bg-neutral-800/70">
                    <td colspan="6" class="p-4 pl-12 pr-6">
                      <div class="space-y-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-3.5 py-2 text-[11px] font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          <span class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-corner-down-right" class="size-3.5 text-blue-600 dark:text-blue-400" /> Patient Questionnaire Details: {{ g.patientName }}
                          </span>
                          <span class="font-mono text-[10px] text-slate-400 dark:text-neutral-500">{{ g.patientCode }}</span>
                        </div>
                        <div class="overflow-x-auto">
                          <table class="w-full text-left text-xs">
                            <thead class="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-500">
                              <tr>
                                <th class="p-2.5">
                                  Registration No.
                                </th>
                                <th class="p-2.5">
                                  Questionnaire
                                </th>
                                <th class="p-2.5">
                                  Status
                                </th>
                                <th class="p-2.5">
                                  Completion Time
                                </th>
                                <th class="p-2.5 text-center">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-neutral-800">
                              <tr v-for="q in g.questionnaires" :key="q.registrationKey" class="transition-colors hover:bg-slate-100/50 dark:hover:bg-neutral-700/50">
                                <td class="p-2.5 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                                  {{ q.registrationRef }}
                                </td>
                                <td class="p-2.5 font-medium text-slate-800 dark:text-gray-50">
                                  {{ q.questionnaire_name }}
                                </td>
                                <td class="p-2.5">
                                  <span
                                    :class="q.status === 'Completed'
                                      ? 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                                      : 'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'"
                                  >
                                    {{ q.status }}
                                  </span>
                                </td>
                                <td class="p-2.5 text-[11px] text-slate-400 dark:text-neutral-500">
                                  {{ q.completionDate ? formatDateTime(q.completionDate) : '-' }}
                                </td>
                                <td class="p-2.5 text-center">
                                  <div class="inline-flex items-center gap-1">
                                    <button
                                      class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200"
                                      title="View"
                                      :disabled="loading"
                                      @click="openPreview(q)"
                                    >
                                      <UIcon name="i-lucide-eye" class="size-3.5" />
                                    </button>
                                    <button
                                      class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200"
                                      title="Print"
                                      :disabled="loading"
                                      @click="printResult(q)"
                                    >
                                      <UIcon name="i-lucide-file-down" class="size-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Pagination footer -->
          <div class="flex flex-col items-center justify-between gap-4 border-t border-slate-100 p-4 sm:flex-row dark:border-neutral-800">
            <span class="text-xs font-medium text-slate-400 dark:text-neutral-500">{{ totalPatients }} Registered Patients</span>

            <div class="flex flex-wrap items-center gap-3">
              <USelect
                v-model="currentPageSize"
                :items="[
                  { label: '10 items', value: 10 },
                  { label: '25 items', value: 25 },
                  { label: '50 items', value: 50 }
                ]"
                class="w-36"
              />
              <UPagination
                :default-page="currentPage"
                :items-per-page="currentPageSize"
                :total="totalPatients"
                @update:page="currentPage = $event"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="previewOpen" :title="previewTitle" :ui="{ content: 'sm:max-w-4xl w-full' }">
    <template #body>
      <iframe
        :srcdoc="previewHtml"
        title="Questionnaire preview"
        class="h-[75vh] w-full rounded-lg border border-default bg-white"
      />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Close"
          @click="closePreview"
        />
        <UButton
          color="primary"
          icon="i-lucide-printer"
          label="Print"
          :disabled="!previewRow"
          @click="previewRow && printResult(previewRow)"
        />
      </div>
    </template>
  </UModal>
</template>
