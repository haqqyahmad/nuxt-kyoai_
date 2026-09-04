<script setup lang="ts">
import { ref, computed } from 'vue'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ title: 'Persetujuan Hasil' })

const api = useApi()
const toast = useToast()
const router = useRouter()

type PendingItem = {
  id: string
  examId: string
  departmentId: string
  departmentName?: string | null
  departmentCode?: string | null
  examCode?: string | null
  examStatus?: string | null
  registrationId?: number | null
  patient?: { PatientId?: string | null, name?: string | null } | null
  currentStepOrder?: number
  stepLabel?: string | null
  stepCount?: number
  reviewerUserId?: number | null
  reviewerRoleId?: string | null
  reviewerRoleIds?: number[]
  submittedBy?: number | null
  submittedAt?: string | null
  canApprove?: boolean
  approveDisableReason?: string | null
}

const list = ref<PendingItem[]>([])
const loading = ref(false)
const total = ref(0)

const { data: usersData } = await useAsyncData<any[]>('dept-approval-users', async () => {
  const res = await api.get('/users', { params: { limit: 200 } })
  return res.data?.data?.data ?? res.data?.data ?? res.data ?? []
}, { default: () => [] })

const { data: rolesData } = await useAsyncData<any[]>('dept-approval-roles', async () => {
  const res = await api.get('/settings/roles')
  return res.data?.data ?? res.data ?? []
}, { default: () => [] })

async function loadList() {
  loading.value = true
  try {
    const res = await api.get('/mcu/exams/pending-dept-approval', { params: { limit: 100 } })
    const payload = res.data?.data ?? res.data
    const rows = Array.isArray(payload) ? payload : payload?.data ?? []
    list.value = rows
    total.value = Array.isArray(payload) ? rows.length : payload?.total ?? rows.length
  } catch (err: any) {
    toast.add({ title: 'Gagal memuat', description: err?.response?.data?.message || 'Terjadi kesalahan', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function approve(item: PendingItem) {
  try {
    await api.post(`/mcu/exams/${item.examId}/department-result/approve`, { departmentId: item.departmentId })
    toast.add({ title: 'Disetujui', description: `${item.departmentName} — ${item.examCode}`, color: 'success' })
    await loadList()
  } catch (err: any) {
    toast.add({ title: 'Gagal approve', description: err?.response?.data?.message || 'Terjadi kesalahan', color: 'error' })
  }
}

function openDetail(item: PendingItem) {
  router.push(`/result/exam-results/${item.examId}?department=${item.departmentCode}&examId=${item.examId}`)
}

function formatDate(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function stepTitle(item: PendingItem) {
  if (!item.stepCount || item.stepCount === 0) return item.stepLabel || 'Approve'
  return `Step ${item.currentStepOrder}/${item.stepCount}${item.stepLabel ? ` — ${item.stepLabel}` : ''}`
}

function reviewerRequirement(item: PendingItem): string {
  if (item.reviewerUserId) {
    const label = userNameById.value[String(item.reviewerUserId)] ?? String(item.reviewerUserId)
    return `reviewer: user ${label}`
  }
  const roles = item.reviewerRoleIds?.length
    ? item.reviewerRoleIds
    : (item.reviewerRoleId != null ? [Number(item.reviewerRoleId)] : [])
  if (roles.length) {
    const label = roles.map((rid) => roleNameById.value[String(rid)] ?? rid).join(', ')
    return `reviewer: role ${label}`
  }
  return 'reviewer: siapa pun (four-eyes)'
}

const userNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const u of (usersData.value ?? [])) {
    const name = u.name || String(u.id)
    map[String(u.id)] = name
    if (u.employee?.name) map[String(u.id)] = u.employee.name
  }
  return map
})
const roleNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const r of (rolesData.value ?? [])) map[String(r.id)] = r.name
  return map
})

const columns: TableColumn<PendingItem>[] = [
  {
    accessorKey: 'patient',
    header: 'Pasien',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.patient?.name ?? '-'),
      h('span', { class: 'text-xs text-muted' }, row.original.patient?.PatientId ?? row.original.examId)
    ])
  },
  {
    accessorKey: 'examCode',
    header: 'Exam',
    cell: ({ row }) => row.original.examCode ?? '-'
  },
  {
    accessorKey: 'departmentName',
    header: 'Department',
    cell: ({ row }) => h('span', {}, `${row.original.departmentName ?? '-'} (${row.original.departmentCode ?? ''})`)
  },
  {
    id: 'step',
    header: 'Langkah',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'text-sm' }, stepTitle(item)),
        h('span', { class: 'text-xs text-muted' }, reviewerRequirement(item))
      ])
    }
  },
  {
    accessorKey: 'submittedAt',
    header: 'Disubmit',
    cell: ({ row }) => formatDate(row.original.submittedAt)
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, 'Aksi'),
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex justify-end gap-1' }, [
        h(resolveComponent('UButton'), { label: 'Buka', icon: 'i-lucide-eye', size: 'xs', variant: 'outline', onClick: () => openDetail(item) }),
        h(resolveComponent('UButton'), {
          label: 'Approve',
          icon: 'i-lucide-check-circle',
          color: 'success',
          size: 'xs',
          disabled: item.canApprove === false,
          title: item.canApprove === false ? (item.approveDisableReason || 'Anda tidak memiliki hak approve') : undefined,
          onClick: () => { if (item.canApprove !== false) approve(item) }
        })
      ])
    }
  }
]
</script>

<template>
  <UDashboardPanel id="department-approval" class="w-full min-w-0">
    <template #header>
      <UDashboardNavbar title="Persetujuan Hasil Departemen">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="loading" @click="loadList">Refresh</UButton>
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
        <div>
          <h1 class="text-2xl font-bold">Inbox Approval Hasil</h1>
          <p class="mt-1 text-sm text-muted">Daftar hasil per departemen yang menunggu persetujuan. Hanya reviewer yang ditunjuk (user/role) atau yang berbeda dari inputter (four-eyes) yang bisa approve.</p>
        </div>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-inbox" class="size-5 text-primary" />
              <h2 class="font-semibold">Menunggu Approval ({{ total }})</h2>
            </div>
          </template>
          <UTable :data="list" :columns="columns" :loading="loading" class="w-full" />
          <div v-if="!loading && list.length === 0" class="py-10 text-center text-sm text-muted">
            Tidak ada hasil yang menunggu approval.
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
