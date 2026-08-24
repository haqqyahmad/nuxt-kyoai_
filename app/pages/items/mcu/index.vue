<!-- app/pages/items/mcu/index.vue -->
<script setup lang="ts">
import { h, resolveComponent, computed, ref } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import { getPaginationRowModel } from '@tanstack/table-core'
import ItemsAddModal from '~/components/item/ItemsAddModal.vue'
import ItemExamTemplateModal from '~/components/item/itemExamTemplateModal.vue'
import type { RendererKey } from '~/types/physical'
import type { ItemDetail } from './[id].vue'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UBadge = resolveComponent('UBadge')

const api = useApi()
const toast = useToast()

type Department = 'Laboratory' | 'DoctorConsultation' | 'MCU' | 'Vaccine' | 'Antigen' | 'PCR' | 'VitaminInjection' | 'Pharmacy' | 'Dental' | 'Radiology'

type Item = {
  id: string
  name: string
  code: string
  rendererKey?: RendererKey | null
  resultTiming?: 'inline' | 'deferred'
  externalResult?: boolean
  requiresAttachmentForDone?: boolean
  mealPrerequisite?: boolean
  departmentId?: string | null
  roomTypeId?: string
  groupId?: string | null
  price?: number
  description?: string | null
  department?: {
    id: string,
    code?: string | null
    name: string
  } | null
  roomType?: {
    id: string
    code: string
    name: string
  } | null
  group?: {
    id: string,
    name: string,
    code?: string | null
    sortOrder?: number | null
    parent?: {
      id: string,
      name: string,
      code?: string | null
      sortOrder?: number | null
    } | null
  } | null
  isActive?: boolean
  createdAt: string
  inputans?: Array<{
    id: string
    label: string
    inputType: string
    uom: string | null
    sortOrder: number
    allowBlank: boolean
    formula: { formula: string } | null
    opsis: Array<{ id: string; label: string; value: string; sortOrder: number }>
    nilaiNormalNumber: Array<{ sex: string | null; ageMin: number; minValue: number | null; maxValue: number | null }>
    nilaiNormalSel: Array<{ id: string; sex: string | null; ageMin: number; opsiId: string }>
  }> | null
}

type ItemsApiResponse = {
  data?: Item[] | { data?: Item[] }
  meta?: {
    page?: number
    limit?: number
    totalPages?: number
    hasNextPage?: boolean
  }
}

const SERVICE_TYPE_LABEL: Record<string, string> = {
  LAB: 'Lab',
  LABORATORY: 'Lab',
  LABORATORIUM: 'Lab',
  DOKTER: 'Consultation',
  DOC: 'Consultation',
  DOCTORCONSULTATION: 'Consultation',
  MCU: 'MCU',
  VACCINE: 'Vaksin',
  ANTIGEN: 'Antigen',
  PCR: 'PCR',
  VITAMININJECTION: 'Vitamin',
  VITAMIN: 'Vitamin',
  PHARMACY: 'Farmasi',
  DENTAL: 'Gigi',
  RADIOLOGY: 'Radiologi'
}

const SERVICE_TYPE_COLOR: Record<string, string> = {
  LAB: 'success',
  LABORATORY: 'success',
  LABORATORIUM: 'success',
  DOKTER: 'info',
  DOC: 'info',
  DOCTORCONSULTATION: 'info',
  MCU: 'warning',
  VACCINE: 'success',
  ANTIGEN: 'success',
  PCR: 'primary',
  VITAMININJECTION: 'secondary',
  VITAMIN: 'secondary',
  PHARMACY: 'neutral',
  DENTAL: 'warning',
  RADIOLOGY: 'warning'
}

function compareItemSequence(a: Item, b: Item) {
  const aParentOrder = a.group?.parent?.sortOrder ?? 0
  const bParentOrder = b.group?.parent?.sortOrder ?? 0
  if (aParentOrder !== bParentOrder) return aParentOrder - bParentOrder

  const aGroupOrder = a.group?.sortOrder ?? 0
  const bGroupOrder = b.group?.sortOrder ?? 0
  if (aGroupOrder !== bGroupOrder) return aGroupOrder - bGroupOrder

  const aGroupName = a.group?.name ?? ''
  const bGroupName = b.group?.name ?? ''
  if (aGroupName !== bGroupName) return aGroupName.localeCompare(bGroupName)

  return a.name.localeCompare(b.name)
}

function getDepartmentKey(item: Item) {
  return (item.department?.code || item.department?.name || '').toString().toUpperCase()
}

function getDepartmentLabel(item: Item) {
  const key = getDepartmentKey(item)
  return SERVICE_TYPE_LABEL[key] || item.department?.name || '-'
}

function getDepartmentColor(item: Item) {
  const key = getDepartmentKey(item)
  return SERVICE_TYPE_COLOR[key] || 'neutral'
}

const {
  data: items,
  refresh,
  pending
} = await useAsyncData('items', async () => {
  const limit = 100
  let page = 1
  const result: Item[] = []

  while (true) {
    const res = await api.get('/mcu/items', {
      params: { page, limit }
    })

    const payload = res.data as ItemsApiResponse
    const rows = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.data?.data)
        ? payload.data.data
        : []

    result.push(...rows)

    if (!payload.meta?.hasNextPage || !rows.length) {
      break
    }

    page += 1
  }

  return result
})

const data = computed<Item[]>(() => [...(items.value ?? [])].sort(compareItemSequence))
const isAddModalOpen = ref(false)

// ─── Filter by Room Type ─────────────────────────────────────────────────────────
const roomTypeFilter = ref<string>('all')
const roomTypes = computed(() => {
  const map = new Map<string, { id: string; code: string; name: string }>()
  for (const item of data.value) {
    if (item.roomType?.id && !map.has(item.roomType.id)) {
      map.set(item.roomType.id, {
        id: item.roomType.id,
        code: item.roomType.code,
        name: item.roomType.name
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const filteredData = computed<Item[]>(() => {
  if (roomTypeFilter.value === 'all') return data.value
  return data.value.filter((item) => item.roomType?.id === roomTypeFilter.value)
})
const columnFilters = ref([{ id: 'name', value: '' }])
const columnVisibility = ref({})
const rowSelection = ref({})

// ─── Batch Import Item ─────────────────────────────────────────────────────────
const importFileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importPreviewOpen = ref(false)
const importPreviewRows = ref<Array<{
  code: string
  name: string
  departmentCode: string
  groupName: string
  subgroupName: string
  roomTypeCode: string
  resultTiming: string
  externalResult: boolean
  price: number
  description: string
  isActive: boolean
  inputans: unknown[]
  error?: string
}>>([])

function downloadImportTemplate() {
  const exportedItems = data.value.map((item) => ({
    code: item.code || '',
    name: item.name,
    departmentCode: item.department?.code || item.department?.name || '',
    groupName: item.group?.parent?.name || '',
    subgroupName: item.group?.name || '',
    roomTypeCode: item.roomType?.code || item.roomType?.name || '',
    resultTiming: 'deferred',
    externalResult: false,
    price: 0,
    description: '',
    isActive: item.isActive !== false,
     inputans: (item.inputans ?? []).map((inp) => {
      const opsiList = inp.opsis ?? []
      return {
        label: inp.label,
        inputType: inp.inputType,
        uom: inp.uom ?? null,
        sortOrder: inp.sortOrder ?? 0,
        allowBlank: inp.allowBlank ?? false,
        formula: inp.inputType === 'calculated' ? inp.formula?.formula ?? null : null,
        opsis: opsiList.map((o) => ({
          label: o.label,
          value: o.value,
          sortOrder: o.sortOrder ?? 0
        })),
        nilaiNormalNumber: (inp.nilaiNormalNumber ?? []).map((n) => ({
          sex: n.sex ?? null,
          ageMin: n.ageMin ?? 0,
          minValue: n.minValue ?? null,
          maxValue: n.maxValue ?? null
        })),
        nilaiNormalSelected: (inp.nilaiNormalSel ?? []).map((n) => ({
          sex: n.sex ?? null,
          ageMin: n.ageMin ?? 0,
          opsiValue: opsiList.find((o: { id: string; label: string }) => o.id === n.opsiId)?.label ?? null
        }))
      }
    })
  }))

  const template = {
    _instructions: 'Kolom code boleh dikosongkan — akan di-generate otomatis (DEPT-GROUP-SUBGROUP-XXXX). departmentCode/groupName/subgroupName/roomTypeCode dicocokkan dengan master (huruf besar/kecil diabaikan). groupName = group induk, subgroupName = group turunan (kosongkan jika item langsung di root group). Kolom inputans (opsional) mendefinisikan template inputan bawaan per item. nilaiNormalNumber (ageMin/sex/minValue/maxValue) ikut terimpor bersama. nilaiNormalSelected diekspor sebagai opsiValue (label opsi) agar portable — saat import, nilai normal selected akan di-strip (opsi baru belum punya ID) dan dapat diatur ulang di halaman Item › Template Exam setelah item terbuat.',
    items: exportedItems.length
      ? exportedItems
      : [
          {
            code: '',
            name: 'Hematologi + Diff Count',
            departmentCode: 'LAB',
            groupName: 'Kimia Klinik',
            subgroupName: '',
            roomTypeCode: 'LAB',
            resultTiming: 'deferred',
            externalResult: false,
            price: 0,
            description: '',
            isActive: true,
            inputans: [
              {
                label: 'Hb',
                inputType: 'number',
                uom: 'g/dL',
                sortOrder: 1,
                allowBlank: false,
                nilaiNormalNumber: [
                  { sex: 'MALE', ageMin: 0, minValue: 10.5, maxValue: 13.0 },
                  { sex: 'FEMALE', ageMin: 0, minValue: 10.5, maxValue: 13.0 }
                ]
              },
              {
                label: 'Catatan',
                inputType: 'string',
                sortOrder: 2,
                allowBlank: true
              }
            ]
          }
        ]
  }
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'template-import-item.json'
  link.click()
  URL.revokeObjectURL(link.href)
}

function norm(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
}

async function resolveReferences() {
  const [deptRes, roomRes] = await Promise.all([
    api.get('/medical/departments'),
    api.get('/medical/rooms/room-types', { params: { page: 1, limit: 1000 } })
  ])
  const unwrap = (v: unknown) => {
    const p = (v as { data?: unknown })?.data ?? v
    return Array.isArray(p) ? p : (p as { data?: unknown })?.data ?? []
  }
  const departments = unwrap(deptRes.data) as Array<{ id: string, code?: string | null, name: string }>
  const roomTypes = unwrap(roomRes.data) as Array<{ id: string, code?: string | null, name: string }>

  const groupsByDept = new Map<string, Array<{ id: string, name: string, code?: string | null, parentId: string | null }>>()
  await Promise.all(departments.map(async dept => {
    try {
      const res = await api.get(`/medical/group/${dept.id}`)
      const payload = (res.data?.data ?? res.data) as unknown
      const list = Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data ?? []
      groupsByDept.set(dept.id, list as Array<{ id: string, name: string, code?: string | null, parentId: string | null }>)
    } catch {
      groupsByDept.set(dept.id, [])
    }
  }))

  return { departments, roomTypes, groupsByDept }
}

async function importItems(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const json = JSON.parse(text) as { items?: unknown[] } | unknown[]
    const raw = Array.isArray(json) ? json : json.items
    if (!Array.isArray(raw)) throw new Error('Format tidak valid: butuh array pada key "items"')

    importPreviewRows.value = raw.map((value) => {
      const row = (value ?? {}) as Record<string, unknown>
      return {
        code: String(row.code ?? '').trim(),
        name: String(row.name ?? '').trim(),
        departmentCode: String(row.departmentCode ?? '').trim(),
        groupName: String(row.groupName ?? '').trim(),
        subgroupName: String(row.subgroupName ?? '').trim(),
        roomTypeCode: String(row.roomTypeCode ?? '').trim(),
        resultTiming: row.resultTiming === 'deferred' ? 'deferred' : 'inline',
        externalResult: Boolean(row.externalResult),
        price: Number(row.price ?? 0) || 0,
        description: String(row.description ?? '').trim(),
        isActive: row.isActive !== false,
        inputans: Array.isArray(row.inputans) ? row.inputans : []
      }
    })
    importPreviewOpen.value = true
  } catch (e: unknown) {
    const msg = (e as Error)?.message
    toast.add({ title: 'Import gagal', description: msg || 'File tidak valid', color: 'error' })
  } finally {
    target.value = ''
  }
}

function removeImportRow(index: number) {
  importPreviewRows.value.splice(index, 1)
}

async function submitImportPreview() {
  if (importing.value || !importPreviewRows.value.length) return
  importing.value = true

  try {
    const { departments, roomTypes, groupsByDept } = await resolveReferences()
    const findDept = (v: unknown) => departments.find(d => norm(d.code) === norm(v) || norm(d.name) === norm(v))
    const findRoom = (v: unknown) => roomTypes.find(r => norm(r.code) === norm(v) || norm(r.name) === norm(v))
    const findGroup = (deptId: string, v: unknown, parentId: string | null = null) =>
      (groupsByDept.get(deptId) ?? []).find(g =>
        (norm(g.name) === norm(v) || norm(g.code) === norm(v)) && (g.parentId ?? null) === parentId
      )

    const codesRes = await api.get('/mcu/items', { params: { page: 1, limit: 1000 } })
    const codesPayload = codesRes.data?.data ?? codesRes.data
    const codesList = Array.isArray(codesPayload) ? codesPayload : (codesPayload?.data ?? [])
    const existingByCode = new Map<string, string>()
    for (const c of codesList as Array<{ code?: string; id?: string }>) {
      if (c.code && c.id) existingByCode.set(c.code, c.id)
    }
    const existingCodes = Array.from(existingByCode.keys())
    const abbrName = (name: string, len = 3) => norm(name).replace(/[^A-Z]/g, '').slice(0, len)
    const nextSeq = (prefix: string) => {
      let max = 0
      for (const c of existingCodes) {
        const m = c.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`))
        if (m) max = Math.max(max, Number(m[1]))
      }
      return max + 1
    }

    let created = 0
    const errors: string[] = []
    importPreviewRows.value.forEach(row => { row.error = '' })

    for (let i = 0; i < importPreviewRows.value.length; i++) {
      const row = importPreviewRows.value[i]!
      if (!row.name.trim()) { row.error = 'name wajib diisi'; errors.push(`Baris ${i + 1}: ${row.error}`); continue }

      const dept = findDept(row.departmentCode)
      if (!dept) { row.error = `department "${row.departmentCode}" tidak ditemukan`; errors.push(`Baris ${i + 1}: ${row.error}`); continue }
      const room = findRoom(row.roomTypeCode)
      if (!room) { row.error = `room type "${row.roomTypeCode}" tidak ditemukan`; errors.push(`Baris ${i + 1}: ${row.error}`); continue }

      const rootGroup = row.groupName ? findGroup(dept.id, row.groupName) : null
      if (row.groupName && !rootGroup) { row.error = `group "${row.groupName}" tidak ditemukan`; errors.push(`Baris ${i + 1}: ${row.error}`); continue }
      const subgroup = row.subgroupName ? findGroup(dept.id, row.subgroupName, rootGroup?.id ?? null) : null
      if (row.subgroupName && !subgroup) { row.error = `subgroup "${row.subgroupName}" tidak ditemukan`; errors.push(`Baris ${i + 1}: ${row.error}`); continue }

       let code = row.code.trim()
      if (!code) {
        const parts = [dept.code || abbrName(dept.name)]
        if (rootGroup) parts.push(rootGroup.code ? norm(rootGroup.code).replace(/[^A-Z0-9]/g, '') : abbrName(rootGroup.name))
        if (subgroup) parts.push(subgroup.code ? norm(subgroup.code).replace(/[^A-Z0-9]/g, '') : abbrName(subgroup.name))
        const prefix = parts.filter(Boolean).join('-')
        code = `${prefix}-${String(nextSeq(prefix)).padStart(4, '0')}`
        row.code = code
      }

      const existingItemId = existingByCode.get(code)
      // nilaiNormalSelected tidak dapat diimport via batch (opsi baru belum punya ID);
      // strip agar melewati validation batch, lalu atur ulang lewat halaman Template Exam.
      const strippedInputans = ((row.inputans ?? []) as Array<Record<string, unknown>>).map((inp) => {
        const { nilaiNormalSelected, ...rest } = inp
        return rest
      })
      const payload = {
        code,
        name: row.name.trim(),
        resultTiming: row.resultTiming === 'deferred' ? 'deferred' : 'inline',
        externalResult: row.externalResult,
        requiresAttachmentForDone: false,
        departmentId: dept.id,
        roomTypeId: room.id,
        groupId: subgroup?.id ?? rootGroup?.id ?? null,
        price: Number(row.price || 0),
        description: row.description.trim() || null,
        isActive: row.isActive,
        inputans: row.inputans?.length ? strippedInputans : []
      }

      try {
        if (existingItemId) {
          await api.put(`/mcu/items/${existingItemId}`, payload)
          if (strippedInputans.length) {
            await api.put(`/mcu/items/${existingItemId}/inputans`, { inputans: strippedInputans })
          }
        } else {
          await api.post('/mcu/items', payload)
          existingByCode.set(code, '')
        }
        created += 1
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'gagal dibuat'
        row.error = msg
        errors.push(`Baris ${i + 1} (${row.name}): ${msg}`)
      }
    }

    if (created) toast.add({ title: 'Import berhasil', description: `${created} item dibuat`, color: 'success' })
    if (errors.length) toast.add({ title: 'Sebagian gagal', description: errors.slice(0, 5).join('\n'), color: 'warning' })
    if (!errors.length) importPreviewOpen.value = false
    await refresh()
  } finally {
    importing.value = false
  }
}

const table = useTemplateRef('table')

const selectedDeleteId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)

// ─── Exam Template Modal ───────────────────────────────────────────────────────
const isExamTemplateModalOpen = ref(false)
const selectedTemplateItem = ref<{ id: string; name: string } | null>(null)

// ─── Edit Item Modal ───────────────────────────────────────────────────────────
const isEditModalOpen = ref(false)
const editItemData = ref<Item | null>(null)

function getGroupBreadcrumb(item: Item) {
  const parts = []

  if (item.group?.parent?.name) {
    parts.push(item.group.parent.name)
  }

  if (item.group?.name) {
    parts.push(item.group.name)
  }

  return parts.join(' > ')
}

type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc'
  toggleSorting: (desc: boolean) => void
}

function openExamTemplate(row: Row<Item>) {
  selectedTemplateItem.value = { id: row.original.id, name: row.original.name }
  isExamTemplateModalOpen.value = true
}
// ──────────────────────────────────────────────────────────────────────────────

async function deleteItem(id: string) {
  try {
    await api.delete(`/mcu/items/${id}`)
    toast.add({ title: 'Berhasil', description: 'Item berhasil dihapus', color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal menghapus item', color: 'error' })
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return
  await deleteItem(selectedDeleteId.value)
  selectedDeleteId.value = null
}

async function deleteSelectedItems() {
  const selectedRows = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []
  if (!selectedRows.length) return
  try {
    await Promise.all(
      selectedRows.map((row: Row<Item>) => api.delete(`/mcu/items/${row.original.id}`))
    )
    toast.add({ title: 'Berhasil', description: 'Data item berhasil dihapus', color: 'success' })
    table.value?.tableApi?.resetRowSelection()
    await refresh()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal menghapus data', color: 'error' })
  }
}

// ─── Edit Item ──────────────────────────────────────────────────────────────────
function editItem(item: ItemDetail) {
  editItemData.value = item
  isEditModalOpen.value = true
}

// ─── Meal Config Modal ─────────────────────────────────────────────────────────
const isMealConfigOpen = ref(false)
const mealConfigSaving = ref(false)
const mealDurationValue = ref<number | null>(null)
const selectedMealItemIds = ref<string[]>([])
const mealConfigItems = ref<Item[]>([])

const mealItemOptions = computed(() =>
  mealConfigItems.value.map((item) => ({
    label: `${item.code} - ${item.name}`,
    value: item.id
  }))
)

const selectedMealItemNames = computed(() =>
  selectedMealItemIds.value
    .map((id) => mealConfigItems.value.find((item) => item.id === id)?.name)
    .filter(Boolean) as string[]
)

async function openMealConfigGlobal() {
  mealConfigItems.value = []
  selectedMealItemIds.value = []
  mealDurationValue.value = null
  isMealConfigOpen.value = true

  try {
    const [itemsRes, cfgRes] = await Promise.all([
      api.get('/mcu/items', { params: { page: 1, limit: 1000 } }),
      api.get('/master/app-config/meal_duration_minutes')
    ])
    const payload = itemsRes.data?.data ?? itemsRes.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    mealConfigItems.value = list as Item[]
    selectedMealItemIds.value = mealConfigItems.value
      .filter((item) => Boolean(item.mealPrerequisite))
      .map((item) => item.id)
    const cfg = cfgRes.data?.data ?? null
    mealDurationValue.value = cfg?.value ? Number(cfg.value) : null
  } catch (error: any) {
    mealConfigItems.value = []
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal memuat konfigurasi meal',
      color: 'error'
    })
  }
}

async function saveMealConfigGlobal() {
  if (mealConfigSaving.value) return
  mealConfigSaving.value = true
  try {
    const selected = new Set(selectedMealItemIds.value)
    await Promise.all([
      api.put('/master/app-config/meal_duration_minutes', { value: mealDurationValue.value ? String(mealDurationValue.value) : null }),
      ...mealConfigItems.value.map((item) =>
        api.put(`/mcu/items/${item.id}`, {
          mealPrerequisite: selected.has(item.id)
        })
      )
    ])
    toast.add({
      title: 'Berhasil',
      description: 'Konfigurasi meal tersimpan',
      color: 'success'
    })
    isMealConfigOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menyimpan konfigurasi meal',
      color: 'error'
    })
  } finally {
    mealConfigSaving.value = false
  }
}

function sortableHeader(label: string, column: SortableColumn) {
  const isSorted = column.getIsSorted()
  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    class: '-mx-2.5',
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    onClick: () => column.toggleSorting(isSorted === 'asc')
  })
}

function getRowItems(row: Row<Item>): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'View detail',
        icon: 'i-lucide-eye',
        to: `/items/mcu/${row.original.id}`
      },
      {
        label: 'Edit',
        icon: 'i-lucide-edit',
        onSelect() {
          editItem(row.original)
        }
      },
      {
        label: 'Edit Template Exam',
        icon: 'i-lucide-test-tube',
        onSelect() {
          openExamTemplate(row)
        }
      }
    ],
    [
      {
        label: 'Delete item',
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect() {
          selectedDeleteId.value = row.original.id
          isDeleteModalOpen.value = true
        }
      }
    ]
  ]
}

const columns: TableColumn<Item>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(!!value),
        ariaLabel: 'Select row'
      })
  },
  {
    accessorKey: 'code',
    header: ({ column }) => sortableHeader('Code', column)
  },
  {
    accessorKey: 'name',
    header: ({ column }) => sortableHeader('Name', column),
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-medium text-highlighted' }, row.original.name),
        h('span', { class: 'text-xs text-muted' }, row.original.code)
      ])
  },
  {
    id: 'group',
    header: ({ column }) => sortableHeader('Group', column),
    cell: ({ row }) => {
      const breadcrumb = getGroupBreadcrumb(row.original)
      const fallback = row.original.group?.name ?? '-'

      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'text-sm font-medium text-highlighted' }, fallback),
        h(
          'span',
          { class: 'text-xs text-muted' },
          breadcrumb || row.original.group?.code || 'No group assigned'
        )
      ])
    }
  },
  {
    accessorKey: 'department',
    header: ({ column }) => sortableHeader('Department', column),
    cell: ({ row }) => {
      return h(UBadge, {
        label: getDepartmentLabel(row.original),
        color: getDepartmentColor(row.original),
        variant: 'subtle'
      })
    }
  },
  {
    id: 'roomType',
    header: ({ column }) => sortableHeader('Room', column),
    cell: ({ row }) => row.original.roomType
      ? `${row.original.roomType.code} - ${row.original.roomType.name}`
      : '-'
  },
  {
    id: 'mealPrerequisite',
    header: ({ column }) => sortableHeader('Meal', column),
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.mealPrerequisite ? 'Pre-req' : '-',
        color: row.original.mealPrerequisite ? 'warning' : 'neutral',
        variant: 'subtle'
      })
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => sortableHeader('Status', column),
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.isActive ? 'Active' : 'Inactive',
        color: row.original.isActive ? 'success' : 'neutral',
        variant: 'subtle'
      })
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => sortableHeader('Created At', column),
    cell: ({ row }) => {
      const value = row.getValue('createdAt')
      if (!value) return '-'
      return new Date(value as string).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          { items: getRowItems(row), content: { align: 'end' } },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost'
            })
        )
      )
  }
]

const searchQuery = computed<string>({
  get: () =>
    (table.value?.tableApi?.getColumn('name')?.getFilterValue() as string) || '',
  set: (value: string) => {
    table.value?.tableApi?.getColumn('name')?.setFilterValue(value || undefined)
  }
})

const currentPage = ref(1)

const currentPageSize = computed<number>({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (value: number) => {
    table.value?.tableApi?.setPageSize(value)
    currentPage.value = 1
  }
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
  <UDashboardPanel id="items">
    <template #header>
      <UDashboardNavbar title="List Items">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton
            icon="i-lucide-utensils"
            label="Konfigurasi Meal"
            color="warning"
            variant="soft"
            @click="openMealConfigGlobal"
          />
          <UButton
            to="/items/groups"
            label="Manage Groups"
            icon="i-lucide-folder-tree"
            color="neutral"
            variant="soft"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-3">
          <USelect
            v-model="roomTypeFilter"
            class="w-52"
            :items="[
              { label: 'All Room Types', value: 'all' },
              ...roomTypes.map((rt) => ({
                label: rt.code ? `${rt.code} - ${rt.name}` : rt.name,
                value: rt.id
              }))
            ]"
          />
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search item..."
            class="max-w-sm"
          />
        </div>

        <div class="flex items-center gap-2">
          <input
            ref="importFileInput"
            type="file"
            accept=".json,application/json"
            class="hidden"
            @change="importItems"
          >
          <UButton
            label="Template"
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            @click="downloadImportTemplate"
          />
          <UButton
            label="Import"
            icon="i-lucide-file-up"
            color="neutral"
            variant="outline"
            :loading="importing"
            @click="importFileInput?.click()"
          />

          <UButton
            label="Add Item"
            icon="i-lucide-clipboard-plus"
            @click="isAddModalOpen = true"
          />

          <BaseDeleteModal
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="item"
            @confirm="deleteSelectedItems"
          >
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
              color="error"
              variant="soft"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </BaseDeleteModal>

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
                    column.toggleVisibility(checked)
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault()
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
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :data="filteredData"
        :columns="columns"
        :loading="pending"
        sticky
        class="w-full"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-3 border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-middle'
        }"
      />

      <div class="mt-4 flex items-center justify-between border-t border-default pt-4">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }}
          of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
          row(s) selected
        </div>

        <div class="flex items-center gap-2">
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

      <!-- Delete single item modal -->
      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="item"
        @confirm="handleDeleteById"
      />

      <!-- Preview import item -->
      <UModal v-model:open="importPreviewOpen" :ui="{ content: 'sm:max-w-[95vw] max-h-[90vh] overflow-hidden' }">
        <template #content>
          <UCard class="flex max-h-[90vh] flex-col" :ui="{ body: 'min-h-0 p-0', footer: 'shrink-0' }">
            <template #header>
              <div>
                <h2 class="text-lg font-semibold">Preview Import Item</h2>
                <p class="text-sm text-muted">Edit data dulu. Code kosong akan dibuat otomatis saat import.</p>
              </div>
            </template>

            <div class="max-h-[calc(90vh-11rem)] overflow-auto p-4">
              <div class="min-w-[1600px] space-y-2">
                <div class="grid grid-cols-[150px_200px_110px_150px_150px_110px_110px_90px_100px_180px_100px_80px] gap-2 text-xs font-semibold uppercase text-muted">
                  <span>Code</span><span>Name</span><span>Dept</span><span>Group</span><span>Subgroup</span><span>Room</span><span>Timing</span><span>External</span><span>Price</span><span>Description</span><span>Inputan</span><span>Aksi</span>
                </div>

                <div
                  v-for="(row, index) in importPreviewRows"
                  :key="index"
                  class="grid grid-cols-[150px_200px_110px_150px_150px_110px_110px_90px_100px_180px_100px_80px] gap-2 rounded-lg border border-default p-2"
                  :class="row.error ? 'border-error/60 bg-error/5' : ''"
                >
                  <UInput v-model="row.code" size="sm" placeholder="Otomatis" />
                  <UInput v-model="row.name" size="sm" />
                  <UInput v-model="row.departmentCode" size="sm" />
                  <UInput v-model="row.groupName" size="sm" />
                  <UInput v-model="row.subgroupName" size="sm" />
                  <UInput v-model="row.roomTypeCode" size="sm" />
                  <USelect v-model="row.resultTiming" :items="[{ label: 'Inline', value: 'inline' }, { label: 'Deferred', value: 'deferred' }]" value-key="value" size="sm" />
                  <UCheckbox v-model="row.externalResult" label="Ya" />
                  <UInput v-model.number="row.price" type="number" min="0" size="sm" />
                  <UInput v-model="row.description" size="sm" />
                  <UInput :model-value="row.inputans?.length ? `${row.inputans.length} komponen` : ''" size="sm" placeholder="Opsional (template inputan bawaan)" readonly />
                  <UButton color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" @click="removeImportRow(index)" />
                  <p v-if="row.error" class="col-span-12 text-xs text-error">{{ row.error }}</p>
                </div>
              </div>
            </div>

            <template #footer>
              <div class="flex w-full justify-end gap-2">
                <UButton color="neutral" variant="soft" :disabled="importing" @click="importPreviewOpen = false">Batal</UButton>
                <UButton color="primary" icon="i-lucide-database" :loading="importing" :disabled="!importPreviewRows.length" @click="submitImportPreview">Import ke DB</UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Add item modal -->
      <ItemsAddModal
        v-model:open="isAddModalOpen"
        @success="refresh()"
      />

      <!-- Edit item modal -->
      <ItemsAddModal
        v-model:open="isEditModalOpen"
        :item="editItemData"
        @success="refresh()"
      />

      <!-- Edit exam template modal -->
      <ItemExamTemplateModal
        v-if="selectedTemplateItem"
        v-model:open="isExamTemplateModalOpen"
        :item-id="selectedTemplateItem.id"
        :item-name="selectedTemplateItem.name"
        @close="selectedTemplateItem = null"
      />

      <!-- Meal config modal -->
      <UModal v-model:open="isMealConfigOpen">
        <template #content>
          <UCard class="flex flex-col" :ui="{ body: 'min-h-0' }">
            <template #header>
              <div>
                <h2 class="text-lg font-semibold">Konfigurasi Meal</h2>
                <p class="text-sm text-muted">
                  Atur durasi makan dan pilih item yang wajib selesai sebelum pasien dapat mulai meal.
                </p>
              </div>
            </template>

            <div class="space-y-5">
              <UFormField label="Durasi Meal (menit)">
                <UInput
                  v-model.number="mealDurationValue"
                  type="number"
                  min="0"
                  placeholder="15"
                  class="max-w-xs"
                />
              </UFormField>

              <UFormField
                label="Prerequisite Meal"
                description="Pilih item (bisa banyak) yang harus selesai sebelum pasien dapat mulai meal."
              >
                <USelectMenu
                  v-model="selectedMealItemIds"
                  :items="mealItemOptions"
                  value-key="value"
                  label-key="label"
                  multiple
                  searchable
                  placeholder="Pilih satu atau lebih item"
                  class="w-full"
                >
                  <template #default>
                    <template v-if="selectedMealItemIds.length">
                      <div class="flex flex-wrap gap-1 pr-6">
                        <UBadge
                          v-for="(name, i) in selectedMealItemNames"
                          :key="i"
                          color="warning"
                          variant="soft"
                          size="sm"
                        >
                          {{ name }}
                        </UBadge>
                      </div>
                    </template>
                    <template v-else>
                      <span class="text-muted">Pilih satu atau lebih item</span>
                    </template>
                  </template>
                </USelectMenu>
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="soft" @click="isMealConfigOpen = false">
                  Batal
                </UButton>
                <UButton
                  :loading="mealConfigSaving"
                  icon="i-lucide-save"
                  @click="saveMealConfigGlobal"
                >
                  Simpan
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
