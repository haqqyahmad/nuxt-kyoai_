<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { HeaderContext } from '@tanstack/table-core'
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

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')
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

const STATUS_LABEL: Record<string, string> = {
  Completed: 'Completed',
  Pending: 'Pending'
}
const STATUS_COLOR: Record<string, string> = {
  Completed: 'success',
  Pending: 'neutral'
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
    results.value = res.data.data ?? []
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

const modalOpen = ref(false)
const modalLoading = ref(false)
const modalData = ref<TempQuestionnaire | null>(null)
const modalResult = ref<QuestionnaireResult | null>(null)

function openModal(row: QuestionnaireResult) {
  modalResult.value = row
  modalData.value = null
  modalOpen.value = true
  loadQuestionnaireDetail(row)
}

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

function formatAnswer(a: NonNullable<TempQuestionnaire['answers']>[number]): string {
  if (a.answerText != null && a.answerText !== '') return a.answerText
  if (a.optionText) return a.optionText
  if (a.optionId) return a.optionId
  return '-'
}

type AnswerItem = NonNullable<TempQuestionnaire['answers']>[number]

const answeredQuestions = computed((): AnswerItem[] =>
  (modalData.value?.answers ?? []).filter((a): a is AnswerItem => a.answered === true)
)

const answeredBySection = computed((): Array<{ section: string, items: AnswerItem[] }> => {
  const groups: Array<{ section: string, items: AnswerItem[] }> = []
  for (const a of answeredQuestions.value) {
    const sec = a.sectionTitle || 'Umum'
    const g = groups.find(x => x.section === sec)
    if (g) {
      g.items.push(a)
    } else {
      groups.push({ section: sec, items: [a] })
    }
  }
  return groups
})

const signCityDate = computed(() => {
  const city = extractBranchCity(modalResult.value?.branchName)
  const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  return city ? `${city.toUpperCase()}, ${date}` : date
})

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
  ctx.image = row.questionnaire_image || ''
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

function getRowItems(row: QuestionnaireResult) {
  return [
    {
      type: 'label' as const,
      label: 'Actions'
    },
    {
      label: 'View answers',
      icon: 'i-lucide-eye',
      onSelect() {
        openModal(row)
      }
    },
    {
      type: 'separator' as const
    },
    {
      label: 'Print',
      icon: 'i-lucide-printer',
      onSelect() {
        printResult(row)
      }
    }
  ]
}

async function printResult(row: QuestionnaireResult) {
  if (!modalData.value || modalData.value.questionnaire_id !== row.questionnaire_id) {
    modalResult.value = row
    await loadQuestionnaireDetail(row)
  }
  printSingle(row)
}

function sortHeader(label: string) {
  return ({ column }: HeaderContext<QuestionnaireResult, unknown>) => {
    const isSorted = column.getIsSorted()

    return h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label,
      icon: isSorted
        ? isSorted === 'asc'
          ? 'i-lucide-arrow-up-narrow-wide'
          : 'i-lucide-arrow-down-wide-narrow'
        : 'i-lucide-arrow-up-down',
      class: '-mx-2.5',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
    })
  }
}

const columns: TableColumn<QuestionnaireResult>[] = [
  {
    accessorKey: 'patientName',
    header: sortHeader('Patient'),
    cell: ({ row }) => {
      const r = row.original

      return h('div', undefined, [
        h('p', { class: 'font-medium text-highlighted' }, r.patientName),
        h('p', { class: 'text-xs text-muted' }, r.patientCode || '-')
      ])
    }
  },
  {
    accessorKey: 'registrationRef',
    header: sortHeader('Regist'),
    cell: ({ row }) => row.getValue('registrationRef') as string
  },
  {
    accessorKey: 'examDate',
    header: sortHeader('Exam Date'),
    cell: ({ row }) => fmtDate(row.getValue('examDate') as string)
  },
  {
    accessorKey: 'companyName',
    header: sortHeader('Company'),
    cell: ({ row }) => row.getValue('companyName') || '-'
  },
  {
    accessorKey: 'branchName',
    header: sortHeader('Branch'),
    cell: ({ row }) => {
      const v = row.getValue('branchName') as string
      return h('span', { class: 'line-clamp-2 max-w-56' }, v || '-')
    }
  },
  {
    accessorKey: 'questionnaire_name',
    header: sortHeader('Questionnaire'),
    cell: ({ row }) => row.getValue('questionnaire_name') || '-'
  },
  {
    accessorKey: 'status',
    header: sortHeader('Status'),
    cell: ({ row }) => {
      const status = row.getValue('status') as string

      return h(
        UBadge,
        {
          label: STATUS_LABEL[status] ?? status,
          color: STATUS_COLOR[status] ?? 'neutral',
          variant: 'subtle'
        }
      )
    }
  },
  {
    accessorKey: 'completionDate',
    header: sortHeader('Completion'),
    cell: ({ row }) => {
      const v = row.getValue('completionDate') as string | null
      return v ? formatDateTime(v) : '-'
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end'
            },
            items: getRowItems(row.original)
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
]

const table = ref()

const currentPage = ref(1)

const currentPageSize = ref(10)

watch(currentPageSize, (val) => {
  table.value?.tableApi?.setPageSize(val)
  currentPage.value = 1
})

watch(
  () => table.value?.tableApi?.getState().pagination.pageIndex,
  (idx) => {
    currentPage.value = (idx ?? 0) + 1
  },
  { immediate: true }
)

watch(currentPage, (page) => {
  table.value?.tableApi?.setPageIndex(page - 1)
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
        <div class="rounded-xl border border-default bg-background p-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div class="flex min-w-0 flex-col gap-1.5">
              <label class="text-xs font-medium text-muted">Company</label>
              <USelect
                v-model="filters.companyId"
                :items="(customers ?? []).map(c => ({ label: c.customerName, value: String(c.id) }))"
                placeholder="Semua company"
                class="w-full"
                clear-search-on-close
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <label class="text-xs font-medium text-muted">Branch</label>
              <USelect
                v-model="filters.branchId"
                :items="(branches ?? []).map(b => ({ label: b.nameBranch, value: String(b.branchId) }))"
                placeholder="Semua branch"
                class="w-full"
                clear-search-on-close
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <label class="text-xs font-medium text-muted">Dari Tanggal</label>
              <UInput
                v-model="filters.dateFrom"
                type="date"
                class="w-full"
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <label class="text-xs font-medium text-muted">Sampai Tanggal</label>
              <UInput
                v-model="filters.dateTo"
                type="date"
                class="w-full"
              />
            </div>
            <div class="flex min-w-0 flex-col gap-1.5">
              <label class="text-xs font-medium text-muted">Status</label>
              <USelect
                v-model="filters.status"
                :items="[
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Pending', value: 'Pending' }
                ]"
                placeholder="Semua status"
                class="w-full"
              />
            </div>
            <div class="flex items-end gap-2 xl:justify-end">
              <UButton
                label="Reset"
                color="neutral"
                variant="ghost"
                icon="i-lucide-rotate-ccw"
                :disabled="loading"
                @click="clearFilters"
              />
              <UButton
                label="Terapkan"
                color="primary"
                icon="i-lucide-filter"
                :loading="loading"
                @click="fetchResults"
              />
            </div>
          </div>
        </div>

        <!-- Info + display control -->
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <p class="text-sm text-muted">
            {{ results.length }} hasil questionnaire
          </p>

          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi
                      ?.getColumn(column.id)
                      ?.toggleVisibility(!!checked);
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault();
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>

        <!-- Table -->
        <UTable
          ref="table"
          :pagination-options="{
            getPaginationRowModel: getPaginationRowModel()
          }"
          sticky
          class="w-full"
          :data="results"
          :columns="columns"
          :loading="loading"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default',
            separator: 'h-0'
          }"
        />

        <!-- Pagination -->
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4"
        >
          <div class="text-sm text-muted">
            {{ results.length }} row(s)
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
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
              :total="results.length"
              @update:page="currentPage = $event"
            />
          </div>
        </div>
      </div>

      <!-- Detail modal -->
      <UModal v-model:open="modalOpen" :title="modalResult?.questionnaire_name ?? 'Detail'" :ui="{ content: 'sm:max-w-4xl' }">
        <template #body>
          <div v-if="modalResult" class="flex flex-col items-center">
            <div class="qr-doc-paper w-full">
              <div class="flex flex-wrap gap-2 items-center mb-3">
                <UBadge
                  v-if="modalResult.status === 'Completed'"
                  label="Completed"
                  color="success"
                  variant="subtle"
                />
                <UBadge
                  v-else
                  label="Pending"
                  color="neutral"
                  variant="subtle"
                />
              </div>

              <h1 class="qr-doc-title">
                KUESIONER MEDICAL CHECK - UP
              </h1>

              <div class="qr-section-title">
                DATA DIRI
              </div>
              <table class="qr-data-diri">
                <tbody>
                  <tr>
                    <td class="qr-label">
                      Nama Lengkap
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ modalResult.patientName }} &nbsp;&nbsp;&nbsp; ( {{ genderLabel(modalResult.patientGender) }} )</td>
                  </tr>
                  <tr>
                    <td class="qr-label">
                      Tgl, Bln, Tahun Lahir
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ modalResult.patientDob ? fmtDate(modalResult.patientDob) : '-' }} &nbsp;&nbsp;&nbsp; ( Umur : {{ modalResult.patientAge != null ? `${modalResult.patientAge} Tahun` : '-' }} )</td>
                  </tr>
                  <tr>
                    <td class="qr-label">
                      Perusahaan
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ modalResult.companyName || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="qr-label">
                      Status Pernikahan
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ maritalLabel(modalResult.patientMaritalStatus) }}</td>
                  </tr>
                  <tr>
                    <td class="qr-label">
                      Alamat Rumah
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ modalResult.patientAddress || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="qr-label">
                      Telepon
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ modalResult.patientPhone || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="qr-label">
                      Posisi Pekerjaan
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ modalResult.patientPosition || '-' }}</td>
                  </tr>
                  <tr>
                    <td class="qr-label">
                      No. RM / Registrasi
                    </td>
                    <td class="qr-colon">
                      :
                    </td>
                    <td>{{ modalResult.patientCode || '-' }} / {{ modalResult.registrationRef }}</td>
                  </tr>
                </tbody>
              </table>

              <div v-if="modalLoading" class="flex items-center justify-center py-8">
                <UIcon name="i-lucide-loader-circle" class="animate-spin text-xl text-muted" />
              </div>
              <template v-else-if="answeredBySection.length">
                <div
                  v-for="(group, gi) in answeredBySection"
                  :key="group.section || gi"
                >
                  <div
                    v-if="group.items.length && group.section"
                    class="qr-section-title"
                  >
                    {{ group.section }}
                  </div>
                  <ol
                    v-if="group.items.length"
                    class="qr-question-list"
                    :class="gi > 0 ? 'qr-question-list-mt' : ''"
                  >
                    <li
                      v-for="(a, i) in group.items"
                      :key="a.questionId || i"
                      class="qr-question-item"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <span>{{ a.questionText }}</span>
                        <span class="qr-answer shrink-0">{{ formatAnswer(a) }}</span>
                      </div>
                    </li>
                  </ol>
                </div>
              </template>
              <div v-else class="text-sm text-muted py-4">
                Tidak ada jawaban tersimpan untuk questionnaire ini.
              </div>

              <div v-if="answeredBySection.length" class="qr-consent-section">
                <div class="qr-consent-line">
                  Isian diatas telah saya isi dengan sadar dan benar
                </div>
                <div class="qr-consent-line">
                  Dengan menandatangani surat untuk melakukan MCU ini, saya memberikan izin kepada:
                </div>
                <ol class="qr-consent-list">
                  <li>
                    Pemeriksa kesehatan tersebut diatas untuk melakukan pemeriksaan kesehatan dengan komponen yang telah ditentukan dan mengolah hasil pemeriksaan kesehatan tersebut
                  </li>
                  <li>
                    Memberikan hasil pemeriksaan tersebut kepada bagian HRD / Dokter perusahaan tempat saya bekerja atau akan bekerja, untuk disimpan dan dikelola pada fasilitas perusahaan (Jika MCU difasilitasi oleh perusahaan)
                  </li>
                </ol>
                <div class="qr-signature-area">
                  <div class="qr-sign-city">
                    {{ signCityDate }}
                  </div>
                  <div class="qr-sign-line" />
                  <div class="qr-sign-label">
                    ( ttd )
                  </div>
                  <div class="qr-sign-name">
                    {{ modalResult.patientName || '-' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-muted">
            Data tidak ditemukan.
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Close"
              @click="modalOpen = false"
            />
            <UButton
              color="primary"
              icon="i-lucide-printer"
              label="Print"
              :disabled="!modalData || !modalData.answers?.length"
              @click="modalResult && printSingle(modalResult)"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.qr-doc-paper {
  background: white;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
  color: #000;
  max-width: 800px;
  margin: 0 auto;
}

.qr-doc-title {
  text-align: center;
  font-size: 15px;
  font-weight: bold;
  text-decoration: underline;
  text-transform: uppercase;
  margin: 0 0 20px;
}

.qr-section-title {
  font-weight: bold;
  text-decoration: underline;
  text-transform: uppercase;
  margin: 15px 0 8px;
}

.qr-data-diri {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6px;
}

.qr-data-diri td {
  padding: 2px 0;
  vertical-align: top;
}

.qr-data-diri td.qr-label {
  width: 180px;
}

.qr-data-diri td.qr-colon {
  width: 15px;
}

.qr-question-list {
  margin: 0;
  padding-left: 20px;
  list-style: decimal;
}

.qr-question-list-mt {
  margin-top: 10px;
}

.qr-question-item {
  margin-bottom: 6px;
  line-height: 1.3;
}

.qr-answer {
  font-weight: bold;
}

.qr-consent-section {
  margin-top: 20px;
  border-top: 1px solid #d1d5db;
  padding-top: 16px;
}

.qr-consent-line,
.qr-consent-list li {
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 5px;
}

.qr-consent-list {
  margin: 5px 0 0 0;
  padding-left: 20px;
}

.qr-signature-area {
  margin-top: 30px;
  text-align: right;
}

.qr-sign-line {
  border-top: 1px solid #333;
  margin-top: 48px;
  padding-top: 4px;
}

.qr-sign-label {
  text-align: center;
  margin-top: 20px;
}

.qr-sign-name {
  text-align: center;
  margin-top: 2px;
}
</style>
