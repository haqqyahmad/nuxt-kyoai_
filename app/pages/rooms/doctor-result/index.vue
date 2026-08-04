<script setup lang="ts">
import { h, resolveComponent, ref, computed, watch } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UProgress = resolveComponent('UProgress')
const UDropdownMenu = resolveComponent('UDropdownMenu')

type ExamListItem = {
  id: string
  examId?: string
  queueCode?: string
  patient?: {
    id: string | number
    PatientId?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  status?: string
  itemCount?: number
  completedItemCount?: number
  progress?: number
  exam?: {
    examCode?: string | null
  } | null
  patientName?: string
  company?: string | null
  packageName?: string | null
  examDate?: string | null
}

definePageMeta({
  title: 'Doctor Result'
})

const api = useApi()
const toast = useToast()
const router = useRouter()

type DoctorResultTableApi = {
  getState: () => { pagination: { pageSize: number, pageIndex: number } }
  setPageSize: (value: number) => void
  setPageIndex: (value: number) => void
  getFilteredRowModel: () => { rows: unknown[] }
  getAllColumns: () => DoctorResultTableColumn[]
}

type DoctorResultTableColumn = {
  id: string
  getCanHide: () => boolean
  getIsVisible: () => boolean
  toggleVisibility: (value: boolean) => void
}

type DoctorResultTable = {
  tableApi?: DoctorResultTableApi
}

const table = ref<DoctorResultTable | null>(null)
const loading = ref(false)
const exams = ref<ExamListItem[]>([])
const search = ref('')
const statusFilter = ref('all')
const companyFilter = ref('all')
const packageFilter = ref('all')
const columnVisibility = ref({})
const currentPage = ref(1)

const statusOptions = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' }
]

const companyOptions = computed(() => [
  { label: 'Semua Perusahaan', value: 'all' },
  ...[...new Set(exams.value.map(e => e.company).filter(Boolean))]
    .map(company => ({ label: String(company), value: String(company) }))
])

const packageOptions = computed(() => [
  { label: 'Semua Paket MCU', value: 'all' },
  ...[...new Set(exams.value.map(e => e.packageName).filter(Boolean))]
    .map(packageName => ({ label: String(packageName), value: String(packageName) }))
])

const filteredExams = computed(() => {
  const q = search.value.toLowerCase()
  return exams.value.filter((e) => {
    const patientName = getPatientName(e)
    const hay = [
      e.exam?.examCode,
      e.queueCode,
      e.company,
      e.packageName,
      patientName,
      e.patient?.firstName,
      e.patient?.lastName,
      e.patient?.PatientId
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesSearch = !q || hay.includes(q)
    const matchesStatus = statusFilter.value === 'all' || e.status === statusFilter.value
    const matchesCompany = companyFilter.value === 'all' || e.company === companyFilter.value
    const matchesPackage = packageFilter.value === 'all' || e.packageName === packageFilter.value
    return matchesSearch && matchesStatus && matchesCompany && matchesPackage
  })
})

const totalPending = computed(() => exams.value.filter(e => e.status !== 'completed').length)
const totalCompleted = computed(() => exams.value.filter(e => e.status === 'completed').length)
const totalItems = computed(() => exams.value.reduce((sum, exam) => sum + (exam.itemCount ?? 0), 0))

const currentPageSize = computed<number>({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (value: number) => {
    table.value?.tableApi?.setPageSize(value)
    currentPage.value = 1
  }
})

const displayColumnItems = computed(() =>
  table.value?.tableApi
    ?.getAllColumns()
    .filter(column => column.getCanHide())
    .map(column => ({
      label: upperFirst(column.id),
      type: 'checkbox' as const,
      checked: column.getIsVisible(),
      onUpdateChecked(checked: boolean) {
        column.toggleVisibility(!!checked)
      },
      onSelect(e?: Event) {
        e?.preventDefault()
      }
    })) ?? []
)

const columns: TableColumn<ExamListItem>[] = [
  {
    id: 'patient',
    header: 'Pasien',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium text-highlighted' }, getPatientName(row.original)),
      h('span', { class: 'text-xs text-muted' }, row.original.patient?.PatientId ?? '-')
    ])
  },
  {
    id: 'exam',
    header: 'Exam',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-mono text-sm font-semibold' }, row.original.exam?.examCode ?? '-'),
      h('span', { class: 'text-xs text-muted' }, row.original.examDate ?? row.original.queueCode ?? '-')
    ])
  },
  {
    id: 'company',
    header: 'Perusahaan',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', {}, row.original.company ?? '-'),
      h('span', { class: 'text-xs text-muted' }, row.original.packageName ?? 'MCU')
    ])
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h(UProgress, { value: progressValue(row.original), class: 'w-24' }),
      h('span', { class: 'text-xs text-muted whitespace-nowrap' }, `${row.original.completedItemCount ?? 0}/${row.original.itemCount ?? 0} item`)
    ])
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, {
      label: row.original.status ?? 'pending',
      color: statusColor(row.original.status),
      variant: 'subtle'
    })
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, 'Aksi'),
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UButton, {
      label: 'Isi Result',
      icon: 'i-lucide-stethoscope',
      trailingIcon: 'i-lucide-arrow-right',
      size: 'sm',
      onClick: () => openDoctorResult(row.original)
    }))
  }
]

async function load() {
  loading.value = true
  try {
    const res = await api.get('/mcu/exams/results', {
      params: { page: 1, limit: 100, groupBy: 'exam', scope: 'false' }
    })
    const payload = res.data?.data ?? res.data
    exams.value = Array.isArray(payload)
      ? payload
      : (payload?.data ?? [])
  } catch (err) {
    const errMsg = err as { response?: { data?: { message?: string } }, message?: string }
    toast.add({
      title: 'Failed to load',
      description: errMsg?.response?.data?.message || errMsg?.message || 'Gagal memuat data',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function openDoctorResult(exam: ExamListItem) {
  const id = exam.examId ?? exam.id
  router.push(`/rooms/doctor-result/${id}`)
}

function getPatientName(exam: ExamListItem) {
  return exam.patientName
    || [exam.patient?.firstName, exam.patient?.lastName].filter(Boolean).join(' ')
    || '-'
}

function statusColor(status?: string) {
  return status === 'completed' ? 'success' : 'warning'
}

function progressValue(exam: ExamListItem) {
  if (typeof exam.progress === 'number') return exam.progress
  if (!exam.itemCount) return 0
  return Math.round(((exam.completedItemCount ?? 0) / exam.itemCount) * 100)
}

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

onMounted(load)
</script>

<template>
  <UDashboardPanel id="doctor-result" class="w-full min-w-0">
    <template #header>
      <UDashboardNavbar title="Doctor Result MCU">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="outline"
            :loading="loading"
            @click="load"
          >
            Refresh
          </UButton>
          <UButton
            icon="i-lucide-download"
            variant="outline"
            color="neutral"
          >
            Export
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
        <div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-stethoscope" class="size-6 text-primary" />
            <h1 class="text-2xl font-bold">
              Daftar Pasien Doctor Review
            </h1>
          </div>
          <p class="mt-1 text-sm text-muted">
            Pilih pasien untuk mengisi grading item dokter dan membentuk kesimpulan MCU.
          </p>
        </div>

        <div class="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <UCard variant="subtle">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase text-muted">
                  Siap Review
                </p>
                <p class="mt-1 text-2xl font-bold">
                  {{ totalPending }}
                </p>
              </div>
              <UIcon name="i-lucide-clipboard-check" class="size-8 text-warning" />
            </div>
          </UCard>
          <UCard variant="subtle">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase text-muted">
                  Siap MR Review
                </p>
                <p class="mt-1 text-2xl font-bold">
                  {{ totalCompleted }}
                </p>
              </div>
              <UIcon name="i-lucide-file-check-2" class="size-8 text-success" />
            </div>
          </UCard>
          <UCard variant="subtle" class="sm:col-span-2 xl:col-span-1">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase text-muted">
                  Total Item
                </p>
                <p class="mt-1 text-2xl font-bold">
                  {{ totalItems }}
                </p>
              </div>
              <UIcon name="i-lucide-list-checks" class="size-8 text-info" />
            </div>
          </UCard>
        </div>

        <UCard class="w-full min-w-0 overflow-hidden">
          <template #header>
            <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 class="font-semibold">
                  Pasien Siap Review
                </h2>
                <p class="text-xs text-muted">
                  {{ filteredExams.length }} exam
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="info" variant="soft">
                  Department approved
                </UBadge>
                <UDropdownMenu
                  :items="displayColumnItems"
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
            </div>
          </template>

          <div class="mb-4 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_220px_180px_200px]">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Cari pasien / exam code / perusahaan"
              class="sm:col-span-2 xl:col-span-1"
            />
            <USelect
              v-model="companyFilter"
              :items="companyOptions"
            />
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
            />
            <USelect
              v-model="packageFilter"
              :items="packageOptions"
            />
          </div>

          <div class="w-full min-w-0 overflow-x-auto">
            <UTable
              ref="table"
              v-model:column-visibility="columnVisibility"
              :data="filteredExams"
              :columns="columns"
              :loading="loading"
              sticky
              class="w-full min-w-[920px]"
              :pagination-options="{
                getPaginationRowModel: getPaginationRowModel()
              }"
              :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-3 border-y border-default first:border-l last:border-r first:rounded-l-lg last:rounded-r-lg',
                td: 'border-b border-default align-middle',
                separator: 'h-0'
              }"
            />
          </div>

          <div class="mt-4 flex flex-col gap-3 border-t border-default pt-4 md:flex-row md:items-center md:justify-between">
            <div class="text-sm text-muted">
              Menampilkan {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} pasien
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <USelect
                v-model="currentPageSize"
                class="w-32"
                :items="[
                  { label: '10 items', value: 10 },
                  { label: '20 items', value: 20 },
                  { label: '50 items', value: 50 },
                  { label: 'All', value: 1000 }
                ]"
              />
              <UPagination
                v-model:page="currentPage"
                :items-per-page="currentPageSize"
                :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
