<script setup lang="ts">
import { h, resolveComponent, ref, computed, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import {
  type MedicalReportListItem,
  type MedicalReportStatus,
  MR_STATUS_COLOR,
  MR_STATUS_LABEL
} from '~/types/medical-report'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')

definePageMeta({ title: 'MR Review' })

const router = useRouter()
const { list, totalItems, loading, loadList } = useMedicalReport()

const search = ref('')
const statusFilter = ref<'all' | MedicalReportStatus>('all')
const currentPage = ref(1)
const pageSize = ref(20)

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Waiting for MR', value: 'DOCTOR_APPROVED' },
  { label: 'Under MR Review', value: 'MR_REVIEW' },
  { label: 'Returned to Doctor', value: 'MR_RETURNED_TO_DOCTOR' },
  { label: 'MR Verified', value: 'MR_VERIFIED' },
  { label: 'Released', value: 'RELEASED' }
]

function currentStatusParam(): MedicalReportStatus | undefined {
  return statusFilter.value === 'all' ? undefined : statusFilter.value
}

const filteredList = computed(() => {
  const q = search.value.toLowerCase()
  return list.value.filter((item) => {
    const patientName = item.patient?.name ?? ''
    const hay = [item.examCode, item.queueCode, patientName, item.patient?.PatientId, item.companyName, item.company]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return !q || hay.includes(q)
  })
})

const totalWaiting = computed(() => list.value.filter(i => i.status === 'DOCTOR_APPROVED' || i.status === 'MR_REVIEW').length)
const totalVerified = computed(() => list.value.filter(i => i.status === 'MR_VERIFIED' || i.status === 'READY_TO_RELEASE').length)
const totalReleased = computed(() => list.value.filter(i => i.status === 'RELEASED').length)

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusColor(status?: string) {
  return MR_STATUS_COLOR[status ?? ''] ?? 'neutral'
}

function statusLabel(status?: string) {
  return MR_STATUS_LABEL[status ?? ''] ?? status ?? '-'
}

function openDetail(report: MedicalReportListItem) {
  router.push(`/result/mr-review/${report.id}`)
}

const columns: TableColumn<MedicalReportListItem>[] = [
  {
    id: 'patient',
    header: 'Patient',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.patient?.name ?? '-'),
      h('span', { class: 'text-xs text-muted' }, row.original.patient?.PatientId ?? '-')
    ])
  },
  {
    id: 'exam',
    header: 'Exam',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-mono text-sm font-semibold' }, row.original.examCode ?? '-'),
      h('span', { class: 'text-xs text-muted' }, formatDate(row.original.examDate))
    ])
  },
  {
    id: 'company',
    header: 'Company',
    cell: ({ row }) => row.original.companyName ?? row.original.company ?? '-'
  },
  {
    id: 'finalGrade',
    header: 'Grade',
    cell: ({ row }) => row.original.finalGrade
      ? h(UBadge, { label: row.original.finalGrade, color: 'primary', variant: 'subtle' })
      : '-'
  },
  {
    id: 'fitness',
    header: 'Fitness',
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.fitnessLevel ?? '-')
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, {
      label: statusLabel(row.original.status),
      color: statusColor(row.original.status),
      variant: 'subtle'
    })
  },
  {
    id: 'doctorApprovedAt',
    header: 'Doctor Submitted',
    cell: ({ row }) => formatDate(row.original.doctorApprovedAt)
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, 'Action'),
    cell: ({ row }) => h('div', { class: 'flex justify-end gap-1' }, [
      h(UButton, {
        label: 'View',
        icon: 'i-lucide-eye',
        size: 'xs',
        variant: 'outline',
        onClick: () => openDetail(row.original)
      })
    ])
  }
]

watch(currentPage, () => loadList({ status: currentStatusParam(), page: currentPage.value, limit: pageSize.value }))
watch([statusFilter], () => {
  currentPage.value = 1
  loadList({ status: currentStatusParam(), page: 1, limit: pageSize.value })
})

onMounted(() => loadList({ page: 1, limit: pageSize.value }))
</script>

<template>
  <UDashboardPanel id="mr-review" class="w-full min-w-0">
    <template #header>
      <UDashboardNavbar title="MR Review">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="outline"
            :loading="loading"
            @click="loadList({ status: currentStatusParam(), page: currentPage, limit: pageSize })"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
        <div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-clipboard-check" class="size-6 text-primary" />
            <h1 class="text-2xl font-bold">
              Medical Record Review
            </h1>
          </div>
          <p class="mt-1 text-sm text-muted">
            Verify, return, or release reports that have been approved by the doctor.
          </p>
        </div>

        <!-- Summary cards -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UCard>
            <div class="text-sm text-muted">
              Waiting for MR
            </div>
            <div class="mt-1 text-2xl font-bold text-warning">
              {{ totalWaiting }}
            </div>
          </UCard>
          <UCard>
            <div class="text-sm text-muted">
              Verified
            </div>
            <div class="mt-1 text-2xl font-bold text-success">
              {{ totalVerified }}
            </div>
          </UCard>
          <UCard>
            <div class="text-sm text-muted">
              Released
            </div>
            <div class="mt-1 text-2xl font-bold text-primary">
              {{ totalReleased }}
            </div>
          </UCard>
          <UCard>
            <div class="text-sm text-muted">
              Total
            </div>
            <div class="mt-1 text-2xl font-bold">
              {{ totalItems }}
            </div>
          </UCard>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="search"
            placeholder="Search patient / exam code..."
            icon="i-lucide-search"
            class="w-64"
          />
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            placeholder="Status"
            class="w-52"
          />
        </div>

        <!-- Table -->
        <UTable
          :data="filteredList"
          :columns="columns"
          :loading="loading"
          :pagination="{ pageIndex: currentPage - 1, pageSize }"
        />

        <!-- Pagination -->
        <div v-if="totalItems > pageSize" class="flex items-center justify-between">
          <span class="text-sm text-muted">Showing {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, totalItems) }} of {{ totalItems }}</span>
          <div class="flex gap-1">
            <UButton
              label="Previous"
              variant="outline"
              size="xs"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            />
            <UButton
              label="Next"
              variant="outline"
              size="xs"
              :disabled="currentPage * pageSize >= totalItems"
              @click="currentPage++"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
