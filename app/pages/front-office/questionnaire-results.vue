<script setup lang="ts">
import {
  renderQuestionnaireTemplate,
  buildQuestionnairePrintContext,
  pageSetupCss,
  printHeaderCss,
  printHeaderHtml,
  extractTemplateStyles,
  extractBranchCity,
  wrapDocumentImage,
  documentImageCss
} from '~/composables/questionnaire/useQuestionnairePrint'

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
      title: 'Gagal',
      description: 'Gagal memuat hasil questionnaire',
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

function genderLabel(g?: string | null): string {
  if (!g) return '-'
  if (g === 'MALE') return 'Laki-laki'
  if (g === 'FEMALE') return 'Perempuan'
  return g
}

function maritalLabel(m?: string | null): string {
  if (!m) return '-'
  const map: Record<string, string> = {
    SINGLE: 'Belum Menikah',
    MARRIED: 'Menikah',
    DIVORCED: 'Cerai',
    WIDOWED: 'Janda/Duda'
  }
  return map[m] ?? m
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

const printCss = `
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
  body { background-color: #f0f2f5; margin: 0; padding: 20px; }
  .document-page { background: white; width: 100%; max-width: 800px; margin: 0 auto; padding: 30px 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 15px; font-weight: bold; text-decoration: underline; margin-top: 0; margin-bottom: 25px; text-transform: uppercase; }
  .section-title { font-weight: bold; text-decoration: underline; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; }
  .section-subtitle { font-weight: bold; margin-top: 10px; margin-bottom: 6px; }
  .data-diri-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  .data-diri-table td { padding: 2px 0; vertical-align: top; }
  .data-diri-table td.label { width: 180px; }
  .data-diri-table td.colon { width: 15px; }
  .question-list { margin: 0; padding-left: 20px; }
  .question-item { margin-bottom: 6px; line-height: 1.3; }
  .answer { font-weight: bold; }
  .flex-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .signature-area { margin-top: 40px; text-align: right; padding-right: 40px; }
  .signature-space { height: 60px; }
  .sign-ttd { text-align: center; margin-right: -40px; }
  .sign-name { text-align: center; margin-right: -40px; }
  .consent-section { margin-top: 20px; line-height: 1.3; }
  .consent-signature { page-break-inside: avoid; break-inside: avoid; }
  .consent-list { margin: 5px 0 0 0; padding-left: 20px; }
  .consent-list li { margin-bottom: 5px; }
  .document-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 5px; border-top: 1px solid #d9dee7; color: #6b7280; font-size: 7.5pt; page-break-inside: avoid; }
  @media print {
    body { background-color: white; padding: 0; }
    .document-page { box-shadow: none; padding: 20px; width: 100%; max-width: 100%; }
    h1 { display: none; }
  }
  @media screen { h1 { display: none; } }
`

function legacyPrintHtml(row: QuestionnaireResult): string {
  const answers = (modalData.value?.answers ?? []).filter(a => a.answered === true)
  const questionsHtml = answers.length
    ? answers.map(a => `
        <li class="question-item">
          <div class="flex-row">
            <span>${a.questionText}</span>
            <span class="answer">${a.answerText != null && a.answerText !== '' ? a.answerText : (a.optionText || a.optionId || '-')}</span>
          </div>
        </li>
      `).join('')
    : ''

  const docContent = `
              <div class="document-page">
                <div class="section-title">DATA DIRI</div>
          <table class="data-diri-table">
            <tr><td class="label">Nama Lengkap</td><td class="colon">:</td><td>${row.patientName} &nbsp;&nbsp;&nbsp; ( ${genderLabel(row.patientGender)} )</td></tr>
            <tr><td class="label">Tgl, Bln, Tahun Lahir</td><td class="colon">:</td><td>${row.patientDob ? fmtDate(row.patientDob) : '-'} &nbsp;&nbsp;&nbsp; ( Umur : ${row.patientAge != null ? `${row.patientAge} Tahun` : '-'} )</td></tr>
            <tr><td class="label">Perusahaan</td><td class="colon">:</td><td>${row.companyName || '-'}</td></tr>
            <tr><td class="label">Status Pernikahan</td><td class="colon">:</td><td>${maritalLabel(row.patientMaritalStatus)}</td></tr>
            <tr><td class="label">Alamat Rumah</td><td class="colon">:</td><td>${row.patientAddress || '-'}</td></tr>
            <tr><td class="label">Telepon</td><td class="colon">:</td><td>${row.patientPhone || '-'}</td></tr>
            <tr><td class="label">Posisi Pekerjaan</td><td class="colon">:</td><td>${row.patientPosition || '-'}</td></tr>
            <tr><td class="label">No. RM / Registrasi</td><td class="colon">:</td><td>${row.patientCode || '-'} / ${row.registrationRef}</td></tr>
          </table>

          ${questionsHtml
            ? `<div class="section-title">ISILAH PERTANYAAN DIBAWAH DENGAN SEBENARNYA</div>
          <ol class="question-list">
            ${questionsHtml}
          </ol>

          <div class="consent-signature">
            <div class="consent-section">
              <strong>Isian diatas telah saya isi dengan sadar dan benar</strong><br>
              <strong>Dengan menandatangani surat untuk melakukan MCU ini, saya memberikan izin kepada:</strong>
              <ol class="consent-list">
                <li><strong>Pemeriksa kesehatan tersebut diatas untuk melakukan pemeriksaan kesehatan dengan komponen yang telah ditentukan dan mengolah hasil pemeriksaan kesehatan tersebut</strong></li>
                <li><strong>Memberikan hasil pemeriksaan tersebut kepada bagian HRD / Dokter perusahaan tempat saya bekerja atau akan bekerja, untuk disimpan dan dikelola pada fasilitas perusahaan (Jika MCU difasilitasi oleh perusahaan)</strong></li>
              </ol>
            </div>

            <div class="signature-area">
              <div class="sign-city">${extractBranchCity(row.branchName).toUpperCase()}${row.branchName ? ', ' : ''}${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div class="signature-space"></div>
              <div class="sign-ttd">( ttd )</div>
              <div class="sign-name">${row.patientName}</div>
            </div>
          </div>

          <div class="document-footer">
            <div>${row.patientName} &nbsp;|&nbsp; ${row.patientCode || '-'}</div>
          </div>`
            : '<div>Belum ada jawaban tersimpan.</div>'}
              </div>`

  const sideImageCss = row.questionnaire_image ? documentImageCss() : ''
  return `
    <html lang="id">
      <head>
        <title>${row.questionnaire_name} - ${row.patientName}</title>
        <style>${printCss}${printHeaderCss()}${sideImageCss}${pageSetupCss(row.patientName, row.patientCode)}</style>
      </head>
      <body>
        <table class="printwrap">
          <thead>
            <tr><th>${printHeaderHtml({ documentTitle: row.questionnaire_name, patientName: row.patientName, patientCode: row.patientCode, logoUrl: '' })}</th></tr>
          </thead>
          <tbody>
            <tr><td>
              ${wrapDocumentImage(docContent, row.questionnaire_image)}
            </td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `
}

function templatePrintHtml(row: QuestionnaireResult, tpl: string): string {
  const ctx = buildQuestionnairePrintContext({
    documentTitle: modalData.value?.questionnaire_name || row.questionnaire_name,
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
    image: row.questionnaire_image,
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
  })
  const { styles, body } = extractTemplateStyles(tpl)
  const rendered = renderQuestionnaireTemplate(body, ctx)
  const logoMatch = tpl.match(/src="(data:image[^"]*)"/)
  ctx.logoUrl = logoMatch?.[1] || ''
  const headerCtx = {
    documentTitle: ctx.documentTitle,
    patientName: ctx.patientName,
    patientCode: ctx.patientCode,
    logoUrl: ctx.logoUrl
  }
  const pageCss = pageSetupCss(ctx.patientName, ctx.patientCode)
  const sideImageCss = ctx.image ? documentImageCss() : ''
  const content = wrapDocumentImage(`<div class="document-page">
                ${rendered}
              </div>`, ctx.image)
  return `
    <html lang="id">
      <head>
        <title>${ctx.documentTitle} - ${ctx.patientName}</title>
        <style>${printCss}</style>
        ${styles}
        <style>${printHeaderCss()}</style>
        <style>${sideImageCss}</style>
        <style>${pageCss}</style>
      </head>
      <body>
        <table class="printwrap">
          <thead>
            <tr><th>${printHeaderHtml(headerCtx)}</th></tr>
          </thead>
          <tbody>
            <tr><td>
              ${content}
            </td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `
}

function printSingle(row: QuestionnaireResult) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const tpl = modalData.value?.print_template?.trim()
  const html = tpl
    ? templatePrintHtml(row, tpl)
    : legacyPrintHtml(row)

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

async function printResult(row: QuestionnaireResult) {
  if (!modalData.value || modalData.value.questionnaire_id !== row.questionnaire_id) {
    await loadQuestionnaireDetail(row)
  }
  printSingle(row)
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
    const key = r.patientCode || r.patientName || 'unknown'
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
      <UDashboardNavbar title="Hasil Questionnaire">
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
                  Semua company
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
                  Semua branch
                </option>
                <option v-for="b in branches ?? []" :key="b.branchId" :value="String(b.branchId)">
                  {{ b.nameBranch }}
                </option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Dari Tanggal</label>
              <input
                v-model="filters.dateFrom"
                type="date"
                class="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
            </div>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Sampai Tanggal</label>
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
                  Semua status
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
              <UIcon name="i-lucide-filter" class="size-3.5" /> Terapkan
            </button>
          </div>
        </div>

        <!-- Table card -->
        <div class="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-neutral-800">
            <span class="text-xs font-medium text-slate-500 dark:text-neutral-400">{{ totalPatients }} Pasien ({{ totalQuestionnaires }} Total Questionnaire)</span>
            <span class="hidden text-[11px] text-slate-400 sm:block dark:text-neutral-500">Klik baris untuk melihat rincian</span>
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
                    Tidak ada data
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
                      {{ g.questionnaires.length ? fmtDate(g.questionnaires[0].examDate) : '-' }}
                    </td>
                    <td class="p-3.5 text-slate-600 dark:text-neutral-300">
                      {{ g.questionnaires.length ? g.questionnaires[0].branchName : '-' }}
                    </td>
                  </tr>

                  <tr v-if="isExpanded(g.patientKey)" class="border-y border-slate-200 bg-slate-50/70 dark:border-neutral-700 dark:bg-neutral-800/70">
                    <td colspan="6" class="p-4 pl-12 pr-6">
                      <div class="space-y-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-3.5 py-2 text-[11px] font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          <span class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-corner-down-right" class="size-3.5 text-blue-600 dark:text-blue-400" /> Rincian Questionnaire Pasien: {{ g.patientName }}
                          </span>
                          <span class="font-mono text-[10px] text-slate-400 dark:text-neutral-500">{{ g.patientCode }}</span>
                        </div>
                        <div class="overflow-x-auto">
                          <table class="w-full text-left text-xs">
                            <thead class="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-500">
                              <tr>
                                <th class="p-2.5">
                                  No. Registrasi
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
                                  Aksi
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
                                  <button
                                    class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200"
                                    title="Print"
                                    :disabled="loading"
                                    @click="printResult(q)"
                                  >
                                    <UIcon name="i-lucide-file-down" class="size-3.5" />
                                  </button>
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
            <span class="text-xs font-medium text-slate-400 dark:text-neutral-500">{{ totalPatients }} Pasien Terdaftar</span>

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
</template>
