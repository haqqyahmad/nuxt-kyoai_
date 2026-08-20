<script setup lang="ts">
import { ref, computed } from 'vue'
import { h, resolveComponent } from 'vue'
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

const { data: workflows, pending, refresh, error: wfError } = await useAsyncData<Workflow[]>(
  'result-workflow-list',
  async () => {
    try {
      const res = await api.get('/settings/result-workflow')
      return res.data?.data ?? res.data ?? []
    } catch (err: any) {
      toast.add({ title: 'Gagal muat workflow', description: err?.response?.data?.message || err?.message || '403 Forbidden', color: 'error' })
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
    } catch (err: any) {
      toast.add({ title: 'Gagal muat departemen', description: err?.response?.data?.message || err?.message || '403 Forbidden', color: 'error' })
      return []
    }
  },
  { default: () => [] }
)

const { data: usersData } = await useAsyncData<any[]>('result-workflow-users', async () => {
  const res = await api.get('/users', { params: { limit: 200 } })
  return res.data?.data?.data ?? res.data?.data ?? res.data ?? []
}, { default: () => [] })

const { data: rolesData } = await useAsyncData<any[]>('result-workflow-roles', async () => {
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
        steps: wf?.steps ?? [{ stepOrder: 1, label: 'Approve Hasil' }],
      }
    })
)

const userOptions = computed(() =>
  (usersData.value ?? []).map((u: any) => ({ label: u.name || String(u.id), value: String(u.id) }))
)
const roleOptions = computed(() =>
  (rolesData.value ?? []).map((r: any) => ({ label: r.name, value: String(r.id) }))
)
const roleNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const r of rolesData.value ?? []) map[String(r.id)] = r.name
  return map
})
const userNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const u of usersData.value ?? []) map[String(u.id)] = u.name || String(u.id)
  return map
})
function reviewerLabel(s: Step): string {
  if (s.reviewerUserId) return `user: ${userNameById.value[String(s.reviewerUserId)] ?? s.reviewerUserId}`
  if (s.reviewerRoleId) return `role: ${roleNameById.value[String(s.reviewerRoleId)] ?? s.reviewerRoleId}`
  return 'anyone'
}

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
  editSteps.value = (wf?.steps?.length ? wf.steps : [{ stepOrder: 1, label: 'Approve Hasil' }]).map((s) => ({
    ...s,
    reviewerUserId: s.reviewerUserId ?? null,
    reviewerRoleId: s.reviewerRoleId ?? null,
  }))
  editOpen.value = true
}

function addStep() {
  editSteps.value.push({ stepOrder: editSteps.value.length + 1, label: `Step ${editSteps.value.length + 1}`, reviewerUserId: null, reviewerRoleId: null })
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
      steps: editSteps.value.map((s) => ({
        label: s.label,
        reviewerUserId: s.reviewerUserId ? Number(s.reviewerUserId) : null,
        reviewerRoleId: s.reviewerRoleId ? String(s.reviewerRoleId) : null,
      })),
    }
    await api.put(`/settings/result-workflow/${editDeptId.value}`, payload)
    toast.add({ title: 'Tersimpan', description: 'Workflow approval diperbarui', color: 'success' })
    editOpen.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Gagal simpan', description: err?.response?.data?.message || err?.message || 'Terjadi kesalahan', color: 'error' })
  } finally {
    saving.value = false
  }
}

const columns: TableColumn<{ department: Department; steps: Step[] }>[] = [
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => { const d = row.original.department; return `${d.name} (${d.code})` }
  },
  {
    accessorKey: 'steps',
    header: 'Alur Approval',
    cell: ({ row }) => {
      const steps = row.original.steps
      const labels = steps.map((s, i) => `${i + 1}. ${s.label}`).join(' → ')
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('span', { class: 'text-sm' }, labels),
        steps.some((s) => s.reviewerUserId || s.reviewerRoleId)
          ? h('span', { class: 'text-xs text-muted' }, steps.map((s) => reviewerLabel(s)).join(' / '))
          : null
      ])
    }
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, 'Aksi'),
    cell: ({ row }) => h('div', { class: 'flex justify-end gap-1' }, [
      h(resolveComponent('UButton'), {
        label: 'Atur',
        icon: 'i-lucide-sliders-horizontal',
        size: 'xs',
        variant: 'outline',
        onClick: () => openEdit(row.original.department)
      })
    ])
  }
]
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex w-full flex-wrap items-center justify-between gap-2">
          <div class="space-y-0.5">
            <h1 class="text-xl font-bold">Workflow Approval Departemen</h1>
            <p class="text-sm text-muted">Atur langkah approval hasil per departemen. Reviewer (opsional) bisa dibatasi ke user/role tertentu. Inputter tidak bisa approve step pertama (four-eyes).</p>
          </div>
          <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="pending" @click="refresh()">Refresh</UButton>
        </div>
      </template>
      <template #default>
        <UPageCard header="Daftar Workflow">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-workflow" class="size-5 text-primary" />
              <h2 class="font-semibold">Daftar Workflow</h2>
            </div>
          </template>
          <UTable :data="activeDeptWorkflows" :columns="columns" :loading="pending" />
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
            <div v-if="editSteps.length === 0" class="text-sm text-muted">Belum ada step. Tambahkan step approval.</div>
            <div v-for="(step, idx) in editSteps" :key="idx" class="flex flex-col gap-2 rounded border p-3">
              <div class="flex items-center gap-2">
                <span class="flex size-7 items-center justify-center rounded-full bg-elevated text-xs font-bold">{{ idx + 1 }}</span>
                <UInput v-model="step.label" placeholder="Label step (mis. Approve Hasil)" class="flex-1" />
                <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="removeStep(idx)" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <USelect
                  :model-value="step.reviewerUserId != null ? String(step.reviewerUserId) : undefined"
                  :items="userOptions"
                  placeholder="Reviewer (user)"
                  clearable
                  @update:model-value="(v: string | null) => { step.reviewerUserId = v ? Number(v) : null }"
                />
                <USelect
                  :model-value="step.reviewerRoleId ?? undefined"
                  :items="roleOptions"
                  placeholder="Atau role tertentu"
                  clearable
                  @update:model-value="(v: string | null) => { step.reviewerRoleId = v || null }"
                />
              </div>
            </div>
            <UButton label="Tambah Step" icon="i-lucide-plus" variant="outline" size="sm" @click="addStep" />
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Batal" variant="outline" @click="editOpen = false" />
            <UButton label="Simpan" color="primary" :loading="saving" :disabled="editSteps.length === 0" @click="saveWorkflow" />
          </div>
        </template>
      </UModal>
  </div>
</template>
