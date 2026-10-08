<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ title: 'Workflow Approval Hasil' })

const api = useApi()
const toast = useToast()

type Step = {
  id?: string
  stepOrder: number
  label: string
  reviewerUserId?: number | null
  reviewerRoleId?: string | null
  reviewerRoleIds?: number[] | null
  requireFourEyes?: boolean
  isActive?: boolean
}

type Department = {
  id: string
  name: string
  code: string
  gradingMode?: string | null
}

type Workflow = {
  id: string
  departmentId: string
  departmentName?: string | null
  departmentCode?: string | null
  name?: string | null
  isActive: boolean
  steps: Step[]
}

type RoleOption = {
  id: number | string
  name: string
}

const { data: workflows, pending, refresh } = await useAsyncData<Workflow[]>(
  'result-workflow-list',
  async () => {
    try {
      const res = await api.get('/settings/result-workflow')
      return res.data?.data ?? res.data ?? []
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }, message?: string }

      toast.add({ title: 'Gagal muat workflow', description: error?.response?.data?.message || error?.message || '403 Forbidden', color: 'error' })
      return []
    }
  },
  { default: () => [] }
)

const { data: departmentsData, error: deptError } = await useAsyncData<Department[]>(
  'result-workflow-departments',
  async () => {
    try {
      const res = await api.get('/settings/result-workflow/departments')
      return res.data?.data ?? res.data ?? []
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }, message?: string }

      toast.add({ title: 'Gagal muat departemen', description: error?.response?.data?.message || error?.message || '403 Forbidden', color: 'error' })
      return []
    }
  },
  { default: () => [] }
)

const { data: rolesData } = await useAsyncData<RoleOption[]>('result-workflow-roles', async () => {
  const res = await api.get('/settings/roles')
  return res.data?.data ?? res.data ?? []
}, { default: () => [] })

const workflowsByDept = computed<Record<string, Workflow>>(() => {
  const map: Record<string, Workflow> = {}
  for (const w of workflows.value) {
    if (w.departmentId && (!map[w.departmentId] || w.isActive)) map[w.departmentId] = w
  }
  return map
})

const activeDeptWorkflows = computed(() =>
  departmentsData.value
    .map((d) => {
      const wf = workflowsByDept.value[d.id]
      return {
        department: d,
        workflow: wf ?? null,
        steps: wf?.steps ?? [{ stepOrder: 1, label: 'Approve Hasil' }]
      }
    })
)

type StepRow = {
  department: Department
  workflow: Workflow | null
  stepOrder: number
  label: string
  reviewerUserId?: number | null
  reviewerRoleId?: string | null
  reviewerRoleIds?: number[] | null
  requireFourEyes?: boolean
  stepActive: boolean
  workflowActive: boolean
  isFirstOfDept: boolean
}

const stepRows = computed<StepRow[]>(() => {
  const rows: StepRow[] = []
  for (const entry of activeDeptWorkflows.value) {
    const list = entry.steps.length ? entry.steps : [{ stepOrder: 1, label: 'Approve Hasil' }]
    list.forEach((s, idx) => {
      rows.push({
        department: entry.department,
        workflow: entry.workflow,
        stepOrder: s.stepOrder,
        label: s.label,
        reviewerUserId: s.reviewerUserId,
        reviewerRoleId: s.reviewerRoleId,
        reviewerRoleIds: s.reviewerRoleIds,
        requireFourEyes: s.requireFourEyes,
        stepActive: s.isActive !== false,
        workflowActive: entry.workflow ? entry.workflow.isActive : true,
        isFirstOfDept: idx === 0
      })
    })
  }
  return rows
})

const roleOptions = computed(() =>
  (rolesData.value ?? []).map(r => ({ label: r.name, value: String(r.id) }))
)
const roleNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const r of rolesData.value ?? []) map[String(r.id)] = r.name
  return map
})
// ── Edit modal ────────────────────────────────────────────────────
const editOpen = ref(false)
const editDeptId = ref('')
const editDeptName = ref('')
const editSteps = ref<Step[]>([])
const saving = ref(false)

function openEdit(department: Department) {
  editDeptId.value = department.id
  editDeptName.value = department.name
  const wf = workflowsByDept.value[department.id]
  editSteps.value = (wf?.steps?.length ? wf.steps : [{ stepOrder: 1, label: 'Approve Hasil' }]).map(s => ({
    ...s,
    reviewerUserId: s.reviewerUserId ?? null,
    reviewerRoleId: s.reviewerRoleId ?? null,
    reviewerRoleIds: s.reviewerRoleIds?.length ? s.reviewerRoleIds : (s.reviewerRoleId != null ? [Number(s.reviewerRoleId)] : []),
    requireFourEyes: s.requireFourEyes === true
  }))
  editOpen.value = true
}

function addStep() {
  editSteps.value.push({ stepOrder: editSteps.value.length + 1, label: `Step ${editSteps.value.length + 1}`, reviewerUserId: null, reviewerRoleId: null, reviewerRoleIds: [], requireFourEyes: false })
  renumber()
}

function removeStep(idx: number) {
  editSteps.value.splice(idx, 1)
  renumber()
}

function renumber() {
  editSteps.value.forEach((s, i) => (s.stepOrder = i + 1))
}

async function saveWorkflow() {
  if (!editDeptId.value || editSteps.value.length === 0) return
  saving.value = true
  try {
    const payload = {
      steps: editSteps.value.map(s => ({
        label: s.label,
        reviewerUserId: s.reviewerUserId ? Number(s.reviewerUserId) : null,
        reviewerRoleId: s.reviewerRoleId ? String(s.reviewerRoleId) : null,
        reviewerRoleIds: (s.reviewerRoleIds?.length ? s.reviewerRoleIds : (s.reviewerRoleId != null ? [Number(s.reviewerRoleId)] : [])),
        requireFourEyes: s.requireFourEyes === true
      }))
    }
    await api.put(`/settings/result-workflow/${editDeptId.value}`, payload)
    toast.add({ title: 'Tersimpan', description: 'Workflow approval diperbarui', color: 'success' })
    editOpen.value = false
    await refresh()
  } catch (err) {
    const error = err as { response?: { data?: { message?: string } }, message?: string }

    toast.add({ title: 'Gagal simpan', description: error?.response?.data?.message || error?.message || 'Terjadi kesalahan', color: 'error' })
  } finally {
    saving.value = false
  }
}

const columns: TableColumn<StepRow>[] = [
  {
    id: 'department',
    header: 'Department',
    cell: ({ row }) => {
      const d = row.original.department
      return `${d.name} (${d.code})`
    }
  },
  {
    id: 'step',
    header: 'Step',
    cell: ({ row }) => String(row.original.stepOrder)
  },
  {
    id: 'label',
    header: 'Label',
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.label)
  },
  {
    id: 'roles',
    header: 'Role(s)',
    cell: ({ row }) => {
      const ids = (row.original.reviewerRoleIds?.length
        ? row.original.reviewerRoleIds
        : row.original.reviewerRoleId != null ? [Number(row.original.reviewerRoleId)] : [])
      if (!ids.length) return '—'
      return h('div', { class: 'flex flex-wrap gap-1' }, ids.map(rid =>
        h(resolveComponent('UBadge'), {
          label: roleNameById.value[String(rid)] ?? String(rid),
          color: 'info',
          variant: 'subtle',
          size: 'xs'
        })
      ))
    }
  },
  {
    id: 'fourEyes',
    header: 'Four-Eyes',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      label: row.original.requireFourEyes ? 'Yes' : 'No',
      color: row.original.requireFourEyes ? 'warning' : 'neutral',
      variant: 'subtle',
      size: 'xs'
    })
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const active = row.original.workflowActive && row.original.stepActive
      return h(resolveComponent('UBadge'), {
        label: active ? 'Active' : 'Inactive',
        color: active ? 'success' : 'neutral',
        variant: 'subtle',
        size: 'xs'
      })
    }
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, 'Aksi'),
    cell: ({ row }) => {
      if (!row.original.isFirstOfDept) return null
      return h('div', { class: 'flex justify-end gap-1' }, [
        h(resolveComponent('UButton'), {
          label: 'Atur',
          icon: 'i-lucide-sliders-horizontal',
          size: 'xs',
          variant: 'outline',
          onClick: () => openEdit(row.original.department)
        })
      ])
    }
  }
]
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex w-full flex-wrap items-center justify-between gap-2">
          <div class="space-y-0.5">
            <h1 class="text-xl font-bold">
              Workflow Approval Departemen
            </h1>
            <p class="text-sm text-muted">
              Atur langkah approval hasil per departemen. Role yang ditunjuk pada tiap step adalah approver untuk step tersebut. Four-eyes (submitter tidak boleh approve hasilnya sendiri) bersifat opsional per step. Bila tidak ada role ditunjuk, siapa pun dengan akses hasil departemen dapat meng-approve.
            </p>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="outline"
            :loading="pending"
            @click="refresh()"
          >
            Refresh
          </UButton>
        </div>
      </template>
      <template #default>
        <UPageCard header="Daftar Workflow">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-workflow" class="size-5 text-primary" />
              <h2 class="font-semibold">
                Daftar Workflow
              </h2>
            </div>
          </template>
          <UTable :data="stepRows" :columns="columns" :loading="pending" />
          <div v-if="deptError" class="mt-2 text-sm text-error">
            {{ deptError?.message || 'Gagal memuat daftar departemen.' }}
          </div>
          <div v-else-if="!pending && activeDeptWorkflows.length === 0" class="py-10 text-center text-sm text-muted">
            Tidak ada departemen yang tersedia untuk workflow.
          </div>
        </UPageCard>
      </template>
    </UPageCard>

    <UModal v-model:open="editOpen" title="Atur Workflow" :description="'Department: ' + editDeptName">
      <template #body>
        <div class="space-y-4">
          <div v-if="editSteps.length === 0" class="text-sm text-muted">
            Belum ada step. Tambahkan step approval.
          </div>
          <div v-for="(step, idx) in editSteps" :key="idx" class="flex flex-col gap-2 rounded border p-3">
            <div class="flex items-center gap-2">
              <span class="flex size-7 items-center justify-center rounded-full bg-elevated text-xs font-bold">{{ idx + 1 }}</span>
              <UInput v-model="step.label" placeholder="Label step (mis. Approve Hasil)" class="flex-1" />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="removeStep(idx)"
              />
            </div>
            <div>
              <USelect
                multiple
                :model-value="(step.reviewerRoleIds ?? []).map(String)"
                :items="roleOptions"
                placeholder="Role (bisa banyak)"
                clearable
                class="w-full"
                @update:model-value="(v: string[] | null) => { step.reviewerRoleIds = (v ?? []).map(Number); step.reviewerRoleId = (v?.[0]) || null }"
              />
            </div>
            <UCheckbox
              v-model="step.requireFourEyes"
              label="Four-eyes (submitter tidak boleh approve hasilnya sendiri)"
            />
          </div>
          <UButton
            label="Tambah Step"
            icon="i-lucide-plus"
            variant="outline"
            size="sm"
            @click="addStep"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Batal" variant="outline" @click="editOpen = false" />
          <UButton
            label="Simpan"
            color="primary"
            :loading="saving"
            :disabled="editSteps.length === 0"
            @click="saveWorkflow"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
