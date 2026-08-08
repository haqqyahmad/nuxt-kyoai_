<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { HeaderContext } from '@tanstack/table-core'

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
  companyId: string
  companyName: string
  branchId: string
  branchName: string
  examDate: string
  questionnaire_id: string
  questionnaire_name: string
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
  status: 'Completed' | 'Pending'
  completionDate: string | null
  answers?: Array<{
    questionId: string
    questionText: string
    questionType?: string
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

function dataDiriRows(row: QuestionnaireResult): Array<[string, string]> {
  return [
    ['Nama Lengkap', `${row.patientName} ${row.patientGender ? `(${genderLabel(row.patientGender)})` : ''}`],
    ['Umur', row.patientAge != null ? `${row.patientAge} tahun` : (row.patientDob ? fmtDate(row.patientDob) : '-')],
    ['Perusahaan', row.companyName || '-'],
    ['Status Pernikahan', maritalLabel(row.patientMaritalStatus)],
    ['Alamat Rumah', row.patientAddress || '-'],
    ['Telepon', row.patientPhone || '-'],
    ['No. RM', row.patientCode || '-'],
    ['Registrasi', row.registrationRef]
  ]
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

function printSingle(row: QuestionnaireResult) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const answers = modalData.value?.answers ?? []
  const datiDiri = dataDiriRows(row)
  const questionsHtml = answers.length
    ? answers.map((a, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="q-text">${a.questionText}</td>
          <td class="q-answer">${a.answered !== false ? (a.answerText != null && a.answerText !== '' ? a.answerText : (a.optionText || a.optionId || '-')) : '<span class="empty">-</span>'}</td>
        </tr>
      `).join('')
    : ''

  const html = `
    <html>
      <head>
        <title>${row.questionnaire_name} - ${row.patientName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; color: #111; }
          h1 { font-size: 18px; text-align: center; margin: 0 0 2px; text-transform: uppercase; }
          .subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 18px; }
          h2 { font-size: 13px; text-transform: uppercase; margin: 18px 0 8px; border-bottom: 1.5px solid #333; padding-bottom: 3px; }
          table.dati { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
          table.dati td { padding: 3px 6px; vertical-align: top; }
          table.dati td.label { width: 30%; font-weight: 600; }
          table.quest { width: 100%; border-collapse: collapse; }
          table.quest th { text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 1.5px solid #333; padding: 4px 6px; }
          table.quest td { border-bottom: 1px solid #ddd; padding: 6px; vertical-align: top; }
          table.quest td.num { width: 34px; font-weight: 600; }
          table.quest td.q-text { width: 60%; }
          .empty { color: #999; }
          .footer { margin-top: 24px; }
          .sign-grid { display: flex; justify-content: space-between; margin-top: 40px; }
          .sign { text-align: center; width: 40%; }
          .sign .line { border-top: 1px solid #333; margin-top: 48px; padding-top: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>KUESIONER MEDICAL CHECK-UP</h1>
        <div class="subtitle">${row.questionnaire_name} — ${fmtDate(row.examDate)}</div>

        <h2>DATA DIRI</h2>
        <table class="dati">
          ${datiDiri.map(([k, v]) => `<tr><td class="label">${k}</td><td>: ${v}</td></tr>`).join('')}
        </table>

        ${questionsHtml
          ? `<h2>ISILAH PERTANYAAN DIBAWAH INI DENGAN SEBENARNYA</h2>
        <table class="quest">
          <thead><tr><th>No</th><th>Pertanyaan</th><th>Jawaban</th></tr></thead>
          <tbody>${questionsHtml}</tbody>
        </table>
        <div class="footer">
          <div class="sign-grid">
            <div class="sign"><div>Pasien</div><div class="line">${row.patientName}</div></div>
            <div class="sign"><div>Dokter</div><div class="line"></div></div>
          </div>
        </div>`
          : '<div class="meta">Tidak ada jawaban tersimpan.</div>'}
      </body>
    </html>
  `
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
      <UModal v-model:open="modalOpen" :title="modalResult?.questionnaire_name ?? 'Detail'">
        <template #body>
          <div v-if="modalResult" class="space-y-4">
            <div class="flex flex-wrap gap-2 items-center">
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

            <div class="rounded-lg border border-default">
              <div class="px-4 py-2 bg-elevated rounded-t-lg border-b border-default">
                <p class="text-sm font-semibold">
                  DATA DIRI
                </p>
              </div>
              <dl class="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Nama Lengkap:
                  </dt>
                  <dd class="font-semibold">
                    {{ modalResult.patientName }}
                  </dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Jenis Kelamin:
                  </dt>
                  <dd>{{ genderLabel(modalResult.patientGender) }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Umur:
                  </dt>
                  <dd>{{ modalResult.patientAge != null ? `${modalResult.patientAge} tahun` : (modalResult.patientDob ? fmtDate(modalResult.patientDob) : '-') }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    No. RM:
                  </dt>
                  <dd>{{ modalResult.patientCode || '-' }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Perusahaan:
                  </dt>
                  <dd>{{ modalResult.companyName || '-' }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Status Pernikahan:
                  </dt>
                  <dd>{{ maritalLabel(modalResult.patientMaritalStatus) }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Alamat Rumah:
                  </dt>
                  <dd>{{ modalResult.patientAddress || '-' }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Telepon:
                  </dt>
                  <dd>{{ modalResult.patientPhone || '-' }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Registrasi:
                  </dt>
                  <dd>{{ modalResult.registrationRef }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Exam Date:
                  </dt>
                  <dd>{{ fmtDate(modalResult.examDate) }}</dd>
                </div>
                <div class="flex items-center gap-2">
                  <dt class="text-muted shrink-0">
                    Branch:
                  </dt>
                  <dd>{{ modalResult.branchName || '-' }}</dd>
                </div>
              </dl>
            </div>

            <div class="rounded-lg border border-default">
              <div class="px-4 py-2 bg-elevated rounded-t-lg border-b border-default">
                <p class="text-sm font-semibold">
                  ISILAH PERTANYAAN DIBAWAH INI DENGAN SEBENARNYA
                </p>
              </div>
              <div v-if="modalLoading" class="flex items-center justify-center py-6">
                <UIcon name="i-lucide-loader-circle" class="animate-spin text-xl text-muted" />
              </div>
              <div v-else-if="!modalData?.answers?.length" class="px-4 py-4 text-sm text-muted">
                Tidak ada jawaban tersimpan untuk questionnaire ini.
              </div>
              <div v-else class="divide-y divide-default">
                <div
                  v-for="(a, i) in modalData.answers"
                  :key="a.questionId || i"
                  class="flex items-start gap-3 px-4 py-3"
                >
                  <span class="text-sm font-semibold text-muted shrink-0 w-6">{{ i + 1 }}.</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-muted">
                      {{ a.questionText }}
                    </p>
                    <p class="text-sm font-semibold mt-0.5">
                      {{ formatAnswer(a) }}
                    </p>
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
