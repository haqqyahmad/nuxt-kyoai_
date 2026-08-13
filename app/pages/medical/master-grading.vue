<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { GradeRule, GroupGradeConfig } from '~/types/doctor-result'

type GradeRuleForm = {
  code: string
  department: string
  groupName: string
  inputanLabel: string
  inputanCode: string
  gradable: boolean
  condition: string
  grade: string
  comment: string
  recommendation: string
  priority: number
  isActive: boolean
}

const api = useApi()
const toast = useToast()

const conditionOptions = [
  { label: 'Semua Kondisi', value: 'all' },
  { label: 'Normal', value: 'normal' },
  { label: 'Increase', value: 'increase' },
  { label: 'Decrease', value: 'decrease' },
  { label: 'Qualitative', value: 'qualitative' }
]

const gradeOptions = [
  { label: 'Semua Grade', value: 'all' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'BF', value: 'BF' },
  { label: 'C', value: 'C' },
  { label: 'F', value: 'F' }
]

const defaultDepartments = [
  'Laboratorium',
  'Vital Sign',
  'Anthropometry',
  'Cardiology / ECG',
  'Radiology',
  'Eye Examination',
  'Audiometry',
  'Spirometry',
  'DOCTOR'
]

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const importing = ref(false)
const rules = ref<GradeRule[]>([])
const error = ref<string | null>(null)
const search = ref('')
const departmentFilter = ref('all')
const gradeFilter = ref('all')
const conditionFilter = ref('all')
const formOpen = ref(false)
const deleteOpen = ref(false)
const selectedRule = ref<GradeRule | null>(null)
const importFile = ref<HTMLInputElement | null>(null)

type MasterDepartment = { id: string, code?: string | null, name: string }
type MasterGroup = { id: string, code?: string | null, name: string, departmentId?: string | null, children?: MasterGroup[] }
type MasterInputan = { id: string, label: string }
type MasterItem = {
  id: string
  code: string
  name: string
  department?: MasterDepartment | null
  group?: { id: string, code?: string | null, name: string } | null
  inputans?: MasterInputan[]
}

const masterLoading = ref(false)
const masterDepartments = ref<MasterDepartment[]>([])
const masterGroups = ref<MasterGroup[]>([])
const masterItems = ref<MasterItem[]>([])
const selectedGroupKey = ref('')
const selectedInputanKey = ref('')

// [F] grade options + group config
const masterGradeOptions = ref<Array<{ id: string, grade: string, label: string, sortOrder: number, isActive: boolean }>>([])
const groupConfigs = ref<GroupGradeConfig[]>([])
const configLoading = ref(false)
const configSaving = ref<Record<string, boolean>>({})
const groupConfigOpen = ref(false)
const gradeOptionModalOpen = ref(false)
const gradeOptionForm = reactive({ id: '', grade: '', label: '', sortOrder: 0, isActive: true })
const editingGroupConfig = ref<GroupGradeConfig | null>(null)
const groupConfigComments = reactive<Record<string, string>>({}) // key `${groupId}:${grade}` -> comment

function unwrapList(value: unknown): unknown[] {
  const payload = (value as { data?: unknown } | null)?.data ?? value
  if (Array.isArray(payload)) return payload
  const nested = (payload as { data?: unknown } | null)?.data
  return Array.isArray(nested) ? nested : []
}

function flattenGroups(groups: MasterGroup[]): MasterGroup[] {
  return groups.flatMap(group => [group, ...flattenGroups(group.children ?? [])])
}

const masterDepartmentOptions = computed(() => masterDepartments.value.map(department => ({
  label: `${department.name}${department.code ? ` (${department.code})` : ''}`,
  value: department.name
})))

const masterGroupOptions = computed(() => masterGroups.value
  .filter(group => !form.department || group.departmentId === masterDepartments.value.find(department => department.name === form.department)?.id)
  .map(group => ({
    label: `${group.name}${group.code ? ` (${group.code})` : ''}`,
    value: group.id
  })))

const masterInputanOptions = computed(() => masterItems.value
  .filter((item) => {
    const selectedGroup = masterGroups.value.find(group => group.id === selectedGroupKey.value)
    const selectedDepartment = masterDepartments.value.find(department => department.name === form.department)
    return (!selectedGroupKey.value || item.group?.id === selectedGroup?.id)
      && (!selectedDepartment || item.department?.id === selectedDepartment.id)
  })
  .flatMap(item => (item.inputans ?? []).map(inputan => ({
    label: `${inputan.label} · ${item.name} (${item.code})`,
    value: inputan.id,
    itemId: item.id
  }))))

function applyInputanSelection(inputanId: string) {
  selectedInputanKey.value = inputanId
  const option = masterInputanOptions.value.find(item => item.value === inputanId)
  const item = option ? masterItems.value.find(masterItem => masterItem.id === option.itemId) : null
  const inputan = item?.inputans?.find(value => value.id === inputanId)
  if (!item || !inputan) return

  form.department = item.department?.name ?? form.department
  form.groupName = item.group?.name ?? ''
  form.inputanLabel = inputan.label
  form.inputanCode = item.code
  selectedGroupKey.value = item.group?.id ?? ''
}

function applyGroupSelection(groupId: string) {
  selectedGroupKey.value = groupId
  const group = masterGroups.value.find(item => item.id === groupId)
  form.groupName = group?.name ?? ''
  selectedInputanKey.value = ''
  form.inputanLabel = ''
  form.inputanCode = ''
}

async function loadMasterReferences() {
  masterLoading.value = true
  try {
    const departmentResponse = await api.get('/medical/departments')
    masterDepartments.value = unwrapList(departmentResponse.data) as MasterDepartment[]

    const groupResponses = await Promise.all(masterDepartments.value.map(department =>
      api.get('/medical/groups', { params: { departmentId: department.id } }).catch(() => ({ data: [] }))
    ))
    masterGroups.value = groupResponses.flatMap(response => flattenGroups(unwrapList(response.data) as MasterGroup[]))

    const itemResponse = await api.get('/mcu/items', { params: { page: 1, limit: 1000 } })
    masterItems.value = unwrapList(itemResponse.data) as MasterItem[]
  } catch (value: unknown) {
    toast.add({ title: 'Gagal memuat referensi master', description: getErrorMessage(value, 'Department, group, atau item tidak dapat dimuat.'), color: 'error' })
  } finally {
    masterLoading.value = false
  }
}

// [F] ── grade options ───────────────────────────────────────────
async function loadGradeOptions() {
  try {
    const res = await api.get('/mcu/grade-options')
    masterGradeOptions.value = res.data?.data ?? res.data ?? []
  } catch {
    masterGradeOptions.value = []
  }
}

function openCreateGradeOption() {
  Object.assign(gradeOptionForm, { id: '', grade: '', label: '', sortOrder: masterGradeOptions.value.length + 1, isActive: true })
  gradeOptionModalOpen.value = true
}

function openEditGradeOption(option: typeof masterGradeOptions.value[number]) {
  Object.assign(gradeOptionForm, { id: option.id, grade: option.grade, label: option.label, sortOrder: option.sortOrder, isActive: option.isActive })
  gradeOptionModalOpen.value = true
}

async function saveGradeOption() {
  if (!gradeOptionForm.grade.trim() || !gradeOptionForm.label.trim()) {
    toast.add({ title: 'Validasi gagal', description: 'Grade dan label wajib diisi.', color: 'error' })
    return
  }
  try {
    if (gradeOptionForm.id) {
      await api.put(`/mcu/grade-options/${gradeOptionForm.id}`, { ...gradeOptionForm })
    } else {
      await api.post('/mcu/grade-options', { ...gradeOptionForm })
    }
    gradeOptionModalOpen.value = false
    toast.add({ title: 'Berhasil', description: 'Grade option tersimpan', color: 'success' })
    await Promise.all([loadGradeOptions(), loadGroupConfigs()])
  } catch (value: unknown) {
    toast.add({ title: 'Gagal simpan grade option', description: getErrorMessage(value, 'Terjadi kesalahan.'), color: 'error' })
  }
}

async function deleteGradeOption(option: typeof masterGradeOptions.value[number]) {
  try {
    await api.delete(`/mcu/grade-options/${option.id}`)
    toast.add({ title: 'Berhasil', description: 'Grade option dihapus', color: 'success' })
    await Promise.all([loadGradeOptions(), loadGroupConfigs()])
  } catch (value: unknown) {
    toast.add({ title: 'Gagal hapus', description: getErrorMessage(value, 'Terjadi kesalahan.'), color: 'error' })
  }
}

// [F] ── group grade config ─────────────────────────────────────
async function loadGroupConfigs() {
  configLoading.value = true
  try {
    const res = await api.get('/mcu/group-grade-configs')
    groupConfigs.value = res.data?.data ?? res.data ?? []
  } catch (value: unknown) {
    toast.add({ title: 'Gagal muat config group', description: getErrorMessage(value, 'Terjadi kesalahan.'), color: 'error' })
  } finally {
    configLoading.value = false
  }
}

function openGroupConfig(group: GroupGradeConfig) {
  editingGroupConfig.value = group
  Object.keys(groupConfigComments).forEach(k => delete groupConfigComments[k])
  for (const opt of group.commentOptions) {
    groupConfigComments[`${group.groupId}:${opt.grade}`] = opt.comment
  }
  groupConfigOpen.value = true
}

async function saveGroupConfig() {
  if (!editingGroupConfig.value) return
  const groupId = editingGroupConfig.value.groupId
  configSaving.value[groupId] = true
  try {
    const comments = masterGradeOptions.value
      .filter(o => o.isActive)
      .map(o => ({ grade: o.grade, comment: groupConfigComments[`${groupId}:${o.grade}`] ?? '' }))
    await api.put(`/mcu/group-grade-configs/${groupId}`, {
      showInDoctorResult: editingGroupConfig.value.showInDoctorResult,
      comments
    })
    toast.add({ title: 'Berhasil', description: 'Konfigurasi group tersimpan', color: 'success' })
    groupConfigOpen.value = false
    await loadGroupConfigs()
  } catch (value: unknown) {
    toast.add({ title: 'Gagal simpan config', description: getErrorMessage(value, 'Terjadi kesalahan.'), color: 'error' })
  } finally {
    delete configSaving.value[groupId]
  }
}

async function toggleGroupShow(group: GroupGradeConfig) {
  const groupId = group.groupId
  configSaving.value[groupId] = true
  try {
    await api.put(`/mcu/group-grade-configs/${groupId}`, {
      showInDoctorResult: group.showInDoctorResult
    })
    toast.add({ title: 'Berhasil', description: group.showInDoctorResult ? 'Group ditampilkan di Doctor Result' : 'Group disembunyikan dari Doctor Result', color: 'success' })
  } catch (value: unknown) {
    group.showInDoctorResult = !group.showInDoctorResult
    toast.add({ title: 'Gagal', description: getErrorMessage(value, 'Terjadi kesalahan.'), color: 'error' })
  } finally {
    delete configSaving.value[groupId]
  }
}

const form = reactive<GradeRuleForm>({
  code: '',
  department: '',
  groupName: '',
  inputanLabel: '',
  inputanCode: '',
  gradable: true,
  condition: 'normal',
  grade: 'A',
  comment: '',
  recommendation: '',
  priority: 10,
  isActive: true
})

const columns: TableColumn<GradeRule>[] = [
  { accessorKey: 'code', header: 'Kode' },
  { accessorKey: 'department', header: 'Department / Group' },
  { accessorKey: 'inputanLabel', header: 'Item' },
  { accessorKey: 'condition', header: 'Kondisi' },
  { accessorKey: 'grade', header: 'Grade' },
  { accessorKey: 'comment', header: 'Comment Kesimpulan' },
  { accessorKey: 'isActive', header: 'Status' },
  { id: 'actions', header: 'Aksi' }
]

const formGradeOptions = gradeOptions.filter(item => item.value !== 'all')
const formConditionOptions = conditionOptions.filter(item => item.value !== 'all')

const departmentOptions = computed(() => [
  { label: 'Semua Department', value: 'all' },
  ...[...new Set([...defaultDepartments, ...rules.value.map(rule => rule.department).filter(Boolean)])]
    .sort((a, b) => a.localeCompare(b))
    .map(department => ({ label: department, value: department }))
])

const filteredRules = computed(() => {
  const query = search.value.trim().toLowerCase()

  return [...rules.value]
    .filter((rule) => {
      const haystack = [
        rule.code,
        rule.department,
        rule.groupName,
        rule.inputanLabel,
        rule.inputanCode,
        rule.grade,
        rule.comment,
        rule.recommendation
      ].filter(Boolean).join(' ').toLowerCase()

      return (!query || haystack.includes(query))
        && (departmentFilter.value === 'all' || rule.department === departmentFilter.value)
        && (gradeFilter.value === 'all' || rule.grade === gradeFilter.value)
        && (conditionFilter.value === 'all' || rule.condition === conditionFilter.value)
    })
    .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10)
      || String(a.department || '').localeCompare(String(b.department || ''))
      || String(a.inputanLabel || '').localeCompare(String(b.inputanLabel || '')))
})

const stats = computed(() => ({
  total: rules.value.length,
  gradable: rules.value.filter(rule => rule.gradable).length,
  increase: rules.value.filter(rule => rule.condition === 'increase').length,
  decrease: rules.value.filter(rule => rule.condition === 'decrease').length
}))

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'object' && value && 'response' in value) {
    const response = (value as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }
  if (value instanceof Error) return value.message
  return fallback
}

function conditionLabel(condition: string) {
  return conditionOptions.find(item => item.value === condition)?.label ?? condition
}

function conditionColor(condition: string) {
  if (condition === 'normal') return 'success'
  if (condition === 'increase') return 'error'
  if (condition === 'decrease') return 'warning'
  return 'info'
}

function gradeClass(grade: string) {
  const color = {
    A: 'text-success',
    B: 'text-primary',
    BF: 'text-warning',
    C: 'text-error',
    F: 'text-red-900'
  }[grade] ?? 'text-highlighted'

  return `font-black ${color}`
}

function resetForm() {
  Object.assign(form, {
    code: '',
    department: '',
    groupName: '',
    inputanLabel: '',
    inputanCode: '',
    gradable: true,
    condition: 'normal',
    grade: 'A',
    comment: '',
    recommendation: '',
    priority: 10,
    isActive: true
  })
}

function fillForm(rule: GradeRule) {
  Object.assign(form, {
    code: rule.code,
    department: rule.department,
    groupName: rule.groupName ?? '',
    inputanLabel: rule.inputanLabel,
    inputanCode: rule.inputanCode ?? '',
    gradable: rule.gradable,
    condition: rule.condition,
    grade: rule.grade,
    comment: rule.comment,
    recommendation: rule.recommendation ?? '',
    priority: rule.priority ?? 10,
    isActive: rule.isActive
  })
}

function payloadFromForm() {
  return {
    code: form.code.trim(),
    department: form.department,
    groupName: form.groupName.trim() || null,
    inputanLabel: form.inputanLabel.trim(),
    inputanCode: form.inputanCode.trim() || null,
    gradable: form.gradable,
    condition: form.condition,
    grade: form.grade,
    comment: form.comment.trim(),
    recommendation: form.recommendation.trim() || null,
    priority: Number(form.priority || 10),
    isActive: form.isActive
  }
}

async function loadRules() {
  loading.value = true
  error.value = null
  try {
    const res = await api.get('/mcu/grade-rules', { params: { page: 1, limit: 1000 } })
    const payload = res.data?.data ?? res.data
    rules.value = Array.isArray(payload) ? payload : (payload?.data ?? [])
  } catch (value: unknown) {
    rules.value = []
    error.value = getErrorMessage(value, 'Gagal memuat data master grade.')
    toast.add({ title: 'Gagal memuat master grade', description: error.value, color: 'error' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  selectedRule.value = null
  resetForm()
  formOpen.value = true
}

function openEdit(rule: GradeRule) {
  selectedRule.value = rule
  fillForm(rule)
  formOpen.value = true
}

function askDelete(rule: GradeRule) {
  selectedRule.value = rule
  deleteOpen.value = true
}

async function saveRule() {
  if (saving.value) return
  if (!form.code.trim() || !form.department || !form.inputanLabel.trim() || !form.comment.trim()) {
    toast.add({ title: 'Validasi gagal', description: 'Kode, department, item pemeriksaan, dan comment wajib diisi.', color: 'error' })
    return
  }

  saving.value = true
  try {
    const payload = payloadFromForm()
    if (selectedRule.value) {
      await api.put(`/mcu/grade-rules/${selectedRule.value.id}`, payload)
      toast.add({ title: 'Berhasil', description: 'Master grade berhasil diperbarui', color: 'success' })
    } else {
      await api.post('/mcu/grade-rules', payload)
      toast.add({ title: 'Berhasil', description: 'Master grade berhasil ditambahkan', color: 'success' })
    }
    formOpen.value = false
    await loadRules()
  } catch (value: unknown) {
    toast.add({
      title: 'Gagal menyimpan master grade',
      description: getErrorMessage(value, 'Periksa kembali field wajib dan kode unik.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function deleteRule() {
  if (!selectedRule.value || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/mcu/grade-rules/${selectedRule.value.id}`)
    toast.add({ title: 'Berhasil', description: 'Master grade berhasil dihapus', color: 'success' })
    deleteOpen.value = false
    selectedRule.value = null
    await loadRules()
  } catch (value: unknown) {
    toast.add({ title: 'Gagal menghapus master grade', description: getErrorMessage(value, 'Terjadi kesalahan saat menghapus data.'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

function resetFilter() {
  search.value = ''
  departmentFilter.value = 'all'
  gradeFilter.value = 'all'
  conditionFilter.value = 'all'
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ grade_rules: filteredRules.value }, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'mcu-grade-rules.json'
  link.click()
  URL.revokeObjectURL(link.href)
}

async function importJson(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  importing.value = true
  try {
    const text = await file.text()
    const json = JSON.parse(text) as { grade_rules?: GradeRule[] } | GradeRule[]
    const data = Array.isArray(json) ? json : json.grade_rules
    if (!Array.isArray(data)) throw new Error('Format JSON tidak valid')

    for (const rule of data) {
      await api.post('/mcu/grade-rules', {
        code: rule.code,
        department: rule.department,
        groupName: rule.groupName ?? null,
        inputanLabel: rule.inputanLabel,
        inputanCode: rule.inputanCode ?? null,
        gradable: rule.gradable ?? true,
        condition: rule.condition,
        grade: rule.grade,
        comment: rule.comment,
        recommendation: rule.recommendation ?? null,
        priority: rule.priority ?? 10,
        isActive: rule.isActive ?? true
      })
    }

    toast.add({ title: 'Import berhasil', description: `${data.length} rule diproses`, color: 'success' })
    await loadRules()
  } catch (value: unknown) {
    toast.add({ title: 'Import gagal', description: getErrorMessage(value, 'Format JSON tidak valid atau kode duplikat.'), color: 'error' })
  } finally {
    importing.value = false
    target.value = ''
  }
}

onMounted(() => {
  void Promise.all([loadRules(), loadMasterReferences(), loadGradeOptions(), loadGroupConfigs()])
})
</script>

<template>
  <UDashboardPanel id="master-grading" class="w-full min-w-0">
    <template #header>
      <UDashboardNavbar title="Master Grade Pemeriksaan">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
        <div class="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div class="min-w-0">
            <h1 class="break-words text-2xl font-bold text-highlighted">
              Master Grade Pemeriksaan
            </h1>
            <p class="mt-1 break-words text-sm text-muted">
              Kelola grade, kondisi hasil, komentar kesimpulan, dan aturan item yang dapat di-grade.
            </p>
          </div>

          <div class="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
            <input
              ref="importFile"
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="importJson"
            >
            <UButton
              icon="i-lucide-download"
              class="min-w-0 flex-1 justify-center sm:flex-none"
              color="neutral"
              variant="outline"
              @click="exportJson"
            >
              <span class="truncate">Export JSON</span>
            </UButton>
            <UButton
              icon="i-lucide-upload"
              class="min-w-0 flex-1 justify-center sm:flex-none"
              color="neutral"
              variant="outline"
              :loading="importing"
              @click="importFile?.click()"
            >
              <span class="truncate">Import JSON</span>
            </UButton>
            <UButton
              icon="i-lucide-plus"
              class="min-w-0 flex-[1_0_100%] justify-center sm:flex-none"
              @click="openCreate"
            >
              <span class="truncate">Tambah Grade</span>
            </UButton>
          </div>
        </div>

        <div class="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <UCard variant="subtle">
            <p class="break-words text-xs font-semibold uppercase text-muted">
              Total Aturan
            </p>
            <p class="mt-1 text-2xl font-bold">
              {{ stats.total }}
            </p>
          </UCard>
          <UCard variant="subtle">
            <p class="break-words text-xs font-semibold uppercase text-muted">
              Item Gradable
            </p>
            <p class="mt-1 text-2xl font-bold">
              {{ stats.gradable }}
            </p>
          </UCard>
          <UCard variant="subtle">
            <p class="break-words text-xs font-semibold uppercase text-muted">
              Kondisi Increase
            </p>
            <p class="mt-1 text-2xl font-bold">
              {{ stats.increase }}
            </p>
          </UCard>
          <UCard variant="subtle">
            <p class="break-words text-xs font-semibold uppercase text-muted">
              Kondisi Decrease
            </p>
            <p class="mt-1 text-2xl font-bold">
              {{ stats.decrease }}
            </p>
          </UCard>
        </div>

        <!-- [F] Master Grade Options -->
        <UCard class="w-full min-w-0 overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div class="min-w-0">
                <h2 class="break-words text-base font-semibold text-highlighted">
                  Master Grade Options
                </h2>
                <p class="break-words text-sm text-muted">
                  Daftar grade yang tersedia untuk dokter (item & group).
                </p>
              </div>
              <UButton
                icon="i-lucide-plus"
                class="shrink-0"
                @click="openCreateGradeOption"
              >
                Tambah Grade Option
              </UButton>
            </div>
          </template>
          <UTable
            :data="masterGradeOptions"
            :columns="[
              { accessorKey: 'grade', header: 'Grade' },
              { accessorKey: 'label', header: 'Label' },
              { accessorKey: 'sortOrder', header: 'Urutan' },
              { accessorKey: 'isActive', header: 'Status' },
              { id: 'actions', header: 'Aksi' }
            ]"
            :loading="configLoading"
            class="w-full min-w-[640px]"
          >
            <template #grade-cell="{ row }">
              <span class="font-black" :class="gradeClass(row.original.grade)">{{ row.original.grade }}</span>
            </template>
            <template #isActive-cell="{ row }">
              <UBadge :color="row.original.isActive ? 'success' : 'neutral'" variant="soft">
                {{ row.original.isActive ? 'Aktif' : 'Nonaktif' }}
              </UBadge>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex flex-col gap-2 sm:flex-row">
                <UButton icon="i-lucide-pencil" size="sm" color="neutral" variant="outline" @click="openEditGradeOption(row.original)">
                  Edit
                </UButton>
                <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="subtle" @click="deleteGradeOption(row.original)">
                  Hapus
                </UButton>
              </div>
            </template>
          </UTable>
        </UCard>

        <!-- [F] Konfigurasi Grade per Group -->
        <UCard class="w-full min-w-0 overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div class="min-w-0">
                <h2 class="break-words text-base font-semibold text-highlighted">
                  Konfigurasi Grade per Group
                </h2>
                <p class="break-words text-sm text-muted">
                  Atur group mana yang tampil di Doctor Result + komentar default per grade group.
                </p>
              </div>
              <UButton
                icon="i-lucide-refresh-cw"
                class="shrink-0"
                color="neutral"
                variant="soft"
                :loading="configLoading"
                @click="loadGroupConfigs"
              >
                Refresh
              </UButton>
            </div>
          </template>
          <div class="max-h-[calc(100vh-20rem)] min-h-40 w-full min-w-0 overflow-auto rounded-lg border border-default">
            <UTable
              :data="groupConfigs"
              :columns="[
                { accessorKey: 'groupName', header: 'Group' },
                { accessorKey: 'department', header: 'Department' },
                { accessorKey: 'showInDoctorResult', header: 'Tampil di Doctor Result' },
                { accessorKey: 'commentOptions', header: 'Komentar Default' },
                { id: 'actions', header: 'Aksi' }
              ]"
              :loading="configLoading"
              class="w-full min-w-[720px]"
            >
              <template #groupName-cell="{ row }">
                <div class="min-w-0">
                  <p class="font-semibold text-highlighted">{{ row.original.groupName }}</p>
                  <p class="text-xs text-muted">{{ row.original.groupCode || '-' }}</p>
                </div>
              </template>
              <template #department-cell="{ row }">
                <span class="text-sm">{{ row.original.department?.name ?? '-' }}</span>
              </template>
              <template #showInDoctorResult-cell="{ row }">
                <USwitch
                  :model-value="row.original.showInDoctorResult"
                  :loading="configSaving[row.original.groupId]"
                  @update:model-value="(v) => { row.original.showInDoctorResult = v as boolean; toggleGroupShow(row.original) }"
                />
              </template>
              <template #commentOptions-cell="{ row }">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="opt in row.original.commentOptions"
                    :key="opt.grade"
                    class="rounded-full border border-default px-2 py-0.5 text-xs"
                  >
                    <b>{{ opt.grade }}</b>
                    <span v-if="opt.comment" class="text-muted">: {{ opt.comment }}</span>
                  </span>
                  <span v-if="!row.original.commentOptions.length" class="text-xs text-muted">
                    Belum ada komentar
                  </span>
                </div>
              </template>
              <template #actions-cell="{ row }">
                <UButton icon="i-lucide-settings-2" size="sm" color="neutral" variant="outline" @click="openGroupConfig(row.original)">
                  Atur Komentar
                </UButton>
              </template>
            </UTable>
          </div>
        </UCard>

        <UCard class="w-full min-w-0 overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div class="min-w-0">
                <h2 class="break-words text-base font-semibold text-highlighted">
                  Daftar Konfigurasi Grade
                </h2>
                <p class="break-words text-sm text-muted">
                  {{ filteredRules.length }} data dari master MstGradeRule.
                </p>
              </div>
              <UButton
                icon="i-lucide-refresh-cw"
                class="shrink-0"
                color="neutral"
                variant="soft"
                :loading="loading"
                @click="loadRules"
              >
                Refresh
              </UButton>
            </div>
          </template>

          <div class="mb-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_220px_160px_190px_auto]">
            <UFormField label="Cari" class="md:col-span-2 xl:col-span-1">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Kode, department, item, grade, komentar"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Department">
              <USelect
                v-model="departmentFilter"
                :items="departmentOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Grade">
              <USelect
                v-model="gradeFilter"
                :items="gradeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Kondisi">
              <USelect
                v-model="conditionFilter"
                :items="conditionOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <div class="flex items-end">
              <UButton
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="outline"
                class="w-full justify-center"
                @click="resetFilter"
              >
                Reset
              </UButton>
            </div>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            class="mb-4"
            :description="error"
          />

          <div class="max-h-[calc(100vh-22rem)] min-h-80 w-full min-w-0 overflow-auto rounded-lg border border-default">
            <UTable
              :data="filteredRules"
              :columns="columns"
              :loading="loading"
              sticky
              class="w-full min-w-[980px]"
              :ui="{
                base: 'w-full table-fixed',
                thead: 'sticky top-0 z-10 [&>tr]:bg-elevated',
                th: 'whitespace-nowrap',
                td: 'align-top whitespace-normal break-words [overflow-wrap:anywhere]'
              }"
            >
              <template #code-cell="{ row }">
                <div class="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                  <p class="font-semibold text-highlighted">
                    {{ row.original.code }}
                  </p>
                  <p class="text-xs text-muted">
                    Prioritas {{ row.original.priority ?? 10 }}
                  </p>
                </div>
              </template>

              <template #department-cell="{ row }">
                <div class="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                  <p class="font-medium">
                    {{ row.original.department }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ row.original.groupName || '-' }}
                  </p>
                </div>
              </template>

              <template #inputanLabel-cell="{ row }">
                <div class="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                  <p class="font-medium text-highlighted">
                    {{ row.original.inputanLabel }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ row.original.inputanCode || '-' }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ row.original.gradable ? 'Dapat di-grade' : 'Tidak dapat di-grade' }}
                  </p>
                </div>
              </template>

              <template #condition-cell="{ row }">
                <UBadge :color="conditionColor(row.original.condition)" variant="soft">
                  {{ conditionLabel(row.original.condition) }}
                </UBadge>
              </template>

              <template #grade-cell="{ row }">
                <span :class="gradeClass(row.original.grade)">{{ row.original.grade }}</span>
              </template>

              <template #comment-cell="{ row }">
                <div class="min-w-0 whitespace-normal break-words text-sm leading-5 [overflow-wrap:anywhere]">
                  <p>{{ row.original.comment }}</p>
                  <p v-if="row.original.recommendation" class="mt-1 text-xs text-muted">
                    Rekomendasi: {{ row.original.recommendation }}
                  </p>
                </div>
              </template>

              <template #isActive-cell="{ row }">
                <UBadge :color="row.original.isActive ? 'success' : 'neutral'" variant="soft">
                  {{ row.original.isActive ? 'Aktif' : 'Nonaktif' }}
                </UBadge>
              </template>

              <template #actions-cell="{ row }">
                <div class="flex flex-col justify-end gap-2 sm:flex-row">
                  <UButton
                    icon="i-lucide-pencil"
                    size="sm"
                    color="neutral"
                    variant="outline"
                    @click="openEdit(row.original)"
                  >
                    Edit
                  </UButton>
                  <UButton
                    icon="i-lucide-trash-2"
                    size="sm"
                    color="error"
                    variant="subtle"
                    @click="askDelete(row.original)"
                  >
                    Hapus
                  </UButton>
                </div>
              </template>

              <template #empty>
                <div class="py-10 text-center text-sm text-muted">
                  Tidak ada konfigurasi grade.
                </div>
              </template>
            </UTable>
          </div>
        </UCard>
      </div>

      <UModal v-model:open="formOpen" :ui="{ content: 'sm:max-w-3xl max-h-[90vh] overflow-hidden' }">
        <template #content>
          <UCard class="flex max-h-[90vh] flex-col" :ui="{ body: 'min-h-0 p-0', footer: 'shrink-0' }">
            <template #header>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  {{ selectedRule ? 'Edit Grade' : 'Tambah Grade' }}
                </h2>
                <p class="text-sm text-muted">
                  Konfigurasi aturan grade dan komentar otomatis Doctor Result MCU.
                </p>
              </div>
            </template>

            <form class="max-h-[calc(90vh-12rem)] overflow-y-auto p-6" @submit.prevent="saveRule">
              <div class="grid gap-4 md:grid-cols-2">
                <UFormField label="Kode Grade" required>
                  <UInput v-model="form.code" placeholder="GRD-HB-INC-B" class="w-full" />
                </UFormField>
                <UFormField label="Status">
                  <USwitch v-model="form.isActive" label="Aktif" />
                </UFormField>
                <UFormField label="Department" required>
                  <USelectMenu
                    v-model="form.department"
                    :items="masterDepartmentOptions"
                    value-key="value"
                    searchable
                    :loading="masterLoading"
                    placeholder="Cari department"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Item Group">
                  <USelectMenu
                    v-model="selectedGroupKey"
                    :items="masterGroupOptions"
                    value-key="value"
                    searchable
                    :loading="masterLoading"
                    placeholder="Cari group"
                    class="w-full"
                    @update:model-value="applyGroupSelection"
                  />
                </UFormField>
                <UFormField label="Item Pemeriksaan" required class="md:col-span-2">
                  <USelectMenu
                    v-model="selectedInputanKey"
                    :items="masterInputanOptions"
                    value-key="value"
                    searchable
                    :loading="masterLoading"
                    placeholder="Cari item atau inputan"
                    class="w-full"
                    @update:model-value="applyInputanSelection"
                  />
                </UFormField>
                <UFormField label="Kode Item Tersimpan">
                  <UInput
                    v-model="form.inputanCode"
                    readonly
                    placeholder="Terisi dari item"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Inputan Tersimpan">
                  <UInput
                    v-model="form.inputanLabel"
                    readonly
                    placeholder="Terisi dari inputan"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Dapat di-grade">
                  <USwitch v-model="form.gradable" label="Ya" />
                </UFormField>
                <UFormField label="Kondisi Hasil" required>
                  <USelect
                    v-model="form.condition"
                    :items="formConditionOptions"
                    value-key="value"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Grade" required>
                  <USelect
                    v-model="form.grade"
                    :items="formGradeOptions"
                    value-key="value"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Prioritas">
                  <UInput
                    v-model.number="form.priority"
                    type="number"
                    min="1"
                    max="999"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Comment Kesimpulan" required class="md:col-span-2">
                  <UTextarea
                    v-model="form.comment"
                    :rows="4"
                    placeholder="Komentar otomatis yang masuk ke kesimpulan dokter."
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Rekomendasi" class="md:col-span-2">
                  <UTextarea
                    v-model="form.recommendation"
                    :rows="3"
                    placeholder="Rekomendasi follow-up atau pemeriksaan lanjutan."
                    class="w-full"
                  />
                </UFormField>
              </div>
            </form>

            <template #footer>
              <div class="flex w-full flex-col justify-end gap-2 sm:flex-row">
                <UButton
                  color="neutral"
                  variant="soft"
                  :disabled="saving"
                  @click="formOpen = false"
                >
                  Batal
                </UButton>
                <UButton
                  icon="i-lucide-save"
                  :loading="saving"
                  @click="saveRule"
                >
                  Simpan Grade
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- [F] Modal Grade Option -->
      <UModal v-model:open="gradeOptionModalOpen" :ui="{ content: 'sm:max-w-md' }">
        <template #content>
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold text-highlighted">
                {{ gradeOptionForm.id ? 'Edit Grade Option' : 'Tambah Grade Option' }}
              </h2>
            </template>
            <div class="space-y-4">
              <UFormField label="Kode Grade" required>
                <UInput v-model="gradeOptionForm.grade" placeholder="D" class="w-full" />
              </UFormField>
              <UFormField label="Label" required>
                <UInput v-model="gradeOptionForm.label" placeholder="Significant / Rujuk Khusus" class="w-full" />
              </UFormField>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Urutan">
                  <UInput v-model.number="gradeOptionForm.sortOrder" type="number" min="1" class="w-full" />
                </UFormField>
                <UFormField label="Status">
                  <USwitch v-model="gradeOptionForm.isActive" label="Aktif" />
                </UFormField>
              </div>
            </div>
            <template #footer>
              <div class="flex w-full flex-col justify-end gap-2 sm:flex-row">
                <UButton color="neutral" variant="soft" @click="gradeOptionModalOpen = false">
                  Batal
                </UButton>
                <UButton icon="i-lucide-save" @click="saveGradeOption">
                  Simpan
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- [F] Modal Konfigurasi Group -->
      <UModal v-model:open="groupConfigOpen" :ui="{ content: 'sm:max-w-lg' }">
        <template #content>
          <UCard>
            <template #header>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  {{ editingGroupConfig?.groupName ?? 'Konfigurasi Group' }}
                </h2>
                <p class="text-sm text-muted">
                  Komentar default per grade group (boleh kosong). Dokter bisa mengubah di Doctor Result.
                </p>
              </div>
            </template>
            <div class="space-y-3">
              <div class="flex items-center justify-between rounded-lg border border-default px-3 py-2">
                <span class="text-sm font-medium">Tampil di Doctor Result</span>
                <USwitch v-model="editingGroupConfig!.showInDoctorResult" />
              </div>
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase text-muted">Komentar per Grade</p>
                <div
                  v-for="opt in masterGradeOptions.filter(o => o.isActive)"
                  :key="opt.grade"
                  class="flex items-center gap-2"
                >
                  <span class="w-10 shrink-0 font-black" :class="gradeClass(opt.grade)">{{ opt.grade }}</span>
                  <UInput
                    :model-value="groupConfigComments[`${editingGroupConfig?.groupId}:${opt.grade}`] ?? ''"
                    placeholder="Komentar (opsional)"
                    class="flex-1"
                    @update:model-value="(v) => groupConfigComments[`${editingGroupConfig?.groupId}:${opt.grade}`] = v as string"
                  />
                </div>
              </div>
            </div>
            <template #footer>
              <div class="flex w-full flex-col justify-end gap-2 sm:flex-row">
                <UButton color="neutral" variant="soft" @click="groupConfigOpen = false">
                  Batal
                </UButton>
                <UButton
                  icon="i-lucide-save"
                  :loading="editingGroupConfig ? configSaving[editingGroupConfig.groupId] : false"
                  @click="saveGroupConfig"
                >
                  Simpan
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <UModal v-model:open="deleteOpen" :ui="{ content: 'sm:max-w-md' }">
        <template #content>
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold text-highlighted">
                Hapus konfigurasi grade?
              </h2>
            </template>

            <p class="text-sm text-muted">
              Data master grade {{ selectedRule?.code || '' }} yang dihapus tidak dapat dikembalikan.
            </p>

            <template #footer>
              <div class="flex w-full flex-col justify-end gap-2 sm:flex-row">
                <UButton
                  color="neutral"
                  variant="soft"
                  :disabled="deleting"
                  @click="deleteOpen = false"
                >
                  Batal
                </UButton>
                <UButton
                  color="error"
                  icon="i-lucide-trash-2"
                  :loading="deleting"
                  @click="deleteRule"
                >
                  Hapus
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
