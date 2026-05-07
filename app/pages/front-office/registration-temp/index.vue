<script setup lang="ts">
import { h, resolveComponent, nextTick } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import { USelect } from '#components'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const api = useApi()
const toast = useToast()

const emit = defineEmits<{
  (e: 'updated', payload: TempRegist): void
}>()

const isStatusModalOpen = ref(false)
const selectedRow = ref<Row<TempRegist> | null>(null)
const selectedStatus = ref<string>('')

// optional (kalau APPROVED butuh input)
const formApprove = reactive({
  examDate: '',
  priorityRegist: ''
})

// optional (kalau REJECTED butuh input)
const formReject = reactive({
  rejectReason: ''
})

const errors = reactive({
  examDate: '',
  priorityRegist: '',
  rejectReason: ''
})

const isFormValid = computed(() => {
  if (selectedStatus.value === 'APPROVED') {
    return !!formApprove.examDate && !!formApprove.priorityRegist
  }

  if (selectedStatus.value === 'REJECTED') {
    return !!formReject.rejectReason
  }

  return true
})

const touched = reactive({
  examDate: false,
  priorityRegist: false,
  rejectReason: false
})

const validate = () => {
  errors.examDate = ''
  errors.priorityRegist = ''
  errors.rejectReason = ''

  if (selectedStatus.value === 'APPROVED') {
    if (!formApprove.examDate && touched.examDate) {
      errors.examDate = 'Exam Date wajib diisi'
    }
    if (!formApprove.priorityRegist && touched.priorityRegist) {
      errors.priorityRegist = 'Priority wajib dipilih'
    }
  }

  if (selectedStatus.value === 'REJECTED') {
    if (!formReject.rejectReason && touched.rejectReason) {
      errors.rejectReason = 'Alasan wajib diisi'
    }
  }
}

// 🔥 hanya validate kalau field sudah disentuh
watch(
  () => [
    formApprove.examDate,
    formApprove.priorityRegist,
    formReject.rejectReason,
    selectedStatus.value
  ],
  () => {
    validate()
  }
)

type TempRegist = {
  id: string
  registrationId: string

  firstName: string
  middleName?: string
  lastName: string

  gender: 'male' | 'female'
  idType: 'KTP' | 'PASSPORT' | 'SIM'
  idValue: string

  phone?: string
  email?: string
  dob: string
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED'

  createdAt: string

  branchId: string
  companyId: string

  serviceType: string
  paymentType: string
  priorityRegist: string

  examDate: string
  scheduleDateExam: string
  notes?: string

  patientExist: boolean
  patientId?: string

  status: string
  rejectReason?: string
}

const { data: reg_temp, refresh } = await useAsyncData(
  'reg_temp',
  async () => {
    try {
      const res = await api.get('/registration-temp')
      console.log('Registration-temp RESPONSE:', res.data.data)

      return res.data.data
    } catch (err) {
      console.error('Registration-temp ERROR:', err)
      throw err // penting supaya masuk ke error state Nuxt
    }
  }
)

const data = computed(() => reg_temp.value ?? [])

const columnFilters = ref([
  {
    id: 'fullName',
    value: ''
  }
])

const columnVisibility = ref({
  id: false // 🔒 langsung disembunyikan
})

const rowSelection = ref({})

const selectedDeleteId = ref<string | null>(null)
async function deletePatient(id: string) {
  try {
    await api.delete(`/registration-temp/${id}`)

    toast.add({
      title: 'Berhasil',
      description: 'Patient berhasil dihapus',
      color: 'success'
    })

    await refresh()
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus patient',
      color: 'error'
    })
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return

  await deletePatient(selectedDeleteId.value)
  selectedDeleteId.value = null
}

async function deleteSelectedPatients() {
  const selectedRows
    = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []

  if (!selectedRows.length) return

  try {
    await Promise.all(
      selectedRows.map((row: any) =>
        api.delete(`/registration-temp/${row.original.id}`)
      )
    )

    toast.add({
      title: 'Berhasil',
      description: 'Data pasien berhasil dihapus',
      color: 'success'
    })

    table.value?.tableApi?.resetRowSelection()
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menghapus data',
      color: 'error'
    })
  }
}

const isDeleteModalOpen = ref(false)

const SERVICE_TYPE_COLOR: Record<string, string> = {
  Laboratorium: 'success',
  DoctorConsultation: 'info',
  MCU: 'warning',
  Vaccine: 'success',
  Antigen: 'success',
  PCR: 'success',
  VitaminInjection: 'success',
  Pharmacy: 'success',
  Dental: 'success'
}

const updateStatus = async (id: string, status: string, payload?: any) => {
  if (status === 'APPROVED') {
    return api.post(`/registration-temp/${id}/approve`, payload)
  }

  if (status === 'REJECTED') {
    return api.post(`/registration-temp/${id}/reject`, payload)
  }

  if (status === 'PENDING') {
    return api.post(`/registration-temp/${id}/pending`)
  }
}

const examDateRef = ref<any>(null)
const rejectReasonRef = ref<any>(null)

function focusInput(refEl: any) {
  if (!refEl) return

  const el = refEl.$el as HTMLElement
  const input = el?.querySelector('input, textarea') as HTMLElement

  input?.focus()
}

watch(selectedStatus, async (val) => {
  errors.examDate = ''
  errors.priorityRegist = ''
  errors.rejectReason = ''

  touched.examDate = false
  touched.priorityRegist = false
  touched.rejectReason = false

  if (val === 'APPROVED') {
    formReject.rejectReason = ''

    await nextTick()
    focusInput(examDateRef.value)
  }

  if (val === 'REJECTED') {
    formApprove.examDate = ''
    formApprove.priorityRegist = ''

    await nextTick()
    focusInput(rejectReasonRef.value)
  }
})

const handleChangeStatus = async (row: any, val: string) => {
  isStatusModalOpen.value = true
  selectedRow.value = row
  selectedStatus.value = val
}

const statusLabel: Record<string, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending'
}

async function confirmChangeStatus() {
  const row = selectedRow.value
  const val = selectedStatus.value

  if (!row) return

  // 🔥 tandai semua field sudah disentuh
  touched.examDate = true
  touched.priorityRegist = true
  touched.rejectReason = true

  validate()

  if (!isFormValid.value) {
    toast.add({
      title: 'Warning',
      description: 'Form belum lengkap',
      color: 'warning'
    })
    return
  }

  try {
    const oldStatus = row.original.status

    await updateStatus(row.original.id, val, {
      examDate: formApprove.examDate,
      priorityRegist: formApprove.priorityRegist,
      rejectReason: formReject.rejectReason
    })

    // 🔥 UPDATE LOCAL STATE
    if (!reg_temp.value) return

    const index = reg_temp.value.findIndex(
      i => i.id === row.original.id
    )

    if (index >= 0) {
      const updated = {
        ...reg_temp.value[index],
        status: val,
        examDate: formApprove.examDate,
        priorityRegist: formApprove.priorityRegist,
        rejectReason: formReject.rejectReason
      }

      reg_temp.value[index] = updated

      emit('updated', updated)
    }

    toast.add({
      title: 'Berhasil',
      description: `Status berubah dari ${statusLabel[oldStatus]} → ${statusLabel[val]}`,
      color: 'success'
    })

    await refresh()

    isStatusModalOpen.value = false
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal mengubah status',
      color: 'error'
    })

    console.error(err)
  }
}

watch(isStatusModalOpen, (val) => {
  if (val) {
    formApprove.examDate = ''
    formApprove.priorityRegist = ''
    formReject.rejectReason = ''

    touched.examDate = false
    touched.priorityRegist = false
    touched.rejectReason = false

    errors.examDate = ''
    errors.priorityRegist = ''
    errors.rejectReason = ''
  }
})

watch([selectedRow, selectedStatus], ([row, status]) => {
  if (!row) return

  const data = row.original

  if (status === 'APPROVED') {
    formApprove.examDate = data.examDate || ''
    formApprove.priorityRegist = data.priorityRegist || ''
  }
})

function getRowItems(row: Row<TempRegist>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'View patient details',
      icon: 'i-lucide-eye',
      to: `/registration-temp/${row.original.id}`
    },
    {
      type: 'separator'
    }
  ]
}

const columns: TableColumn<TempRegist>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
  {
    accessorKey: 'id',
    enableHiding: true, // 🔥 wajib supaya bisa di-hide

    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'ID',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },

    cell: ({ row }) => `${row.getValue('id')}`
  },

  {
    id: 'fullName',

    accessorFn: row =>
      `${row.firstName} ${row.middleName || ''} ${row.lastName}`.trim(),

    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Name',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },

    cell: ({ row }) => {
      const p = row.original

      const fullName = [
        p.firstName,
        p.middleName,
        p.lastName
      ]
        .filter(Boolean)
        .join(' ')

      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', undefined, [
          h(
            'p',
            { class: 'font-medium text-highlighted' },
            fullName
          )
        ])
      ])
    }
  },
  {
    accessorKey: 'gender',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Gender',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) =>
      row.getValue('gender') === 'male' ? 'Laki-laki' : 'Perempuan'
  },
  {
    accessorKey: 'dob',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'DOB',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      const value = row.getValue('dob')

      if (!value) return '-'

      // 🔥 parse manual dari DD/MM/YYYY
      const [day, month, year] = String(value).split('/')

      if (!day || !month || !year) return 'Invalid'

      const date = new Date(`${year}-${month}-${day}`)

      if (isNaN(date.getTime())) return 'Invalid'

      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  },
  {
    accessorKey: 'serviceType',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Service',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },

    cell: ({ row }) => {
      const serviceType = row.getValue('serviceType') as string

      const colorMap: Record<string, string> = {
        success: 'bg-green-100 text-green-700 border-green-200',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
        warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        error: 'bg-red-100 text-red-700 border-red-200',
        neutral: 'bg-gray-100 text-gray-700 border-gray-200'
      }

      const color
        = SERVICE_TYPE_COLOR[serviceType] ?? 'neutral'

      return h(
        'span',
        {
          class: `
          px-2 py-1
          rounded-md
          text-xs
          font-medium
          border
          ${colorMap[color]}
        `
        },
        serviceType
      )
    }
  },
  {
    accessorKey: 'examDate',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Exam Date',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      const value = row.getValue('examDate')

      if (!value) return '-'

      const date = new Date(String(value))

      if (isNaN(date.getTime())) return '-'

      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Registered',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      return new Date(row.getValue('createdAt')).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => {
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Status',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },

    cell: ({ row }) => {
      const status = row.getValue('status') as string

      const colorMap: Record<string, string> = {
        APPROVED: 'bg-green-100 text-green-700 border-green-200',
        REJECTED: 'bg-red-100 text-red-700 border-red-200',
        PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200'
      }

      return h(
        'span',
        {
          class: `px-2 py-1 rounded-md text-xs font-semibold border cursor-pointer hover:opacity-80 transition ${colorMap[status]}`,
          onClick: () => {
            selectedRow.value = row
            selectedStatus.value = row.original.status || 'PENDING'
            isStatusModalOpen.value = true
          }
        },
        status
      )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h('div', { class: 'text-right' }, [
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'neutral',
          variant: 'ghost',
          class: 'ml-auto hover:bg-muted rounded-md',
          to: `/front-office/registration-temp/${row.original.id}`,
          title: 'View Detail'
        })
      ])
    }
  }
]

const table = useTemplateRef('table')

const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi
        ?.getColumn('fullName')
        ?.getFilterValue() as string) || ''
    )
  },

  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn('fullName')
      ?.setFilterValue(value || undefined)
  }
})

const currentPageSize = computed({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (value: number) => {
    table.value?.tableApi?.setPageSize(value)
  }
})
</script>

<template>
  <UDashboardPanel id="temp-registration">
    <template #header>
      <UDashboardNavbar title="Temp Registration">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search by Name..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <BaseDeleteModal
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="patient"
            @confirm="deleteSelectedPatients"
          >
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
              color="error"
              variant="subtle"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>
                  {{
                    table?.tableApi?.getFilteredSelectedRowModel().rows.length
                  }}
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
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        sticky
        class="w-full"
        :data="data"
        :columns="columns"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }}
          of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s)
          selected.
        </div>

        <div class="flex items-center gap-1.5">
          <USelect
            v-model="currentPageSize"
            :items="[
              { label: '10 items', value: 10 },
              { label: '20 items', value: 20 },
              { label: '50 items', value: 50 },
              { label: 'All', value: 1000 }
            ]"
            class="w-32"
          />
          <UPagination
            :default-page="
              (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
            "
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="patient"
        @confirm="handleDeleteById"
      />
      <BaseConfirmModal
        v-model:open="isStatusModalOpen"
        :count="1"
        entity="status"
        title="Ubah Status"
        description="Apakah yakin ingin mengubah status?"
        :disabled="!isFormValid"
        :variant="
          selectedStatus === 'APPROVED'
            ? 'success'
            : selectedStatus === 'REJECTED'
              ? 'danger'
              : 'warning'
        "
        @confirm="confirmChangeStatus"
      >
        <template #content>
          <div class="space-y-4">
            <!-- 🔥 PINDAHKAN KE SINI -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-muted">
                Pilih Status
              </label>

              <USelect
                v-model="selectedStatus"
                :items="[
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Rejected', value: 'REJECTED' },
                  { label: 'Pending', value: 'PENDING' }
                ]"
                class="w-full"
              />

              <p class="text-xs text-gray-400">
                DEBUG: {{ selectedStatus }}
              </p>
            </div>

            <!-- 🔥 STATUS INFO -->
            <div class="text-sm text-muted">
              Status akan diubah menjadi:
              <span
                :class="[
                  'ml-2 px-2 py-1 rounded-md text-xs font-semibold border',
                  selectedStatus === 'APPROVED' && 'bg-green-100 text-green-700 border-green-200',
                  selectedStatus === 'REJECTED' && 'bg-red-100 text-red-700 border-red-200',
                  selectedStatus === 'PENDING' && 'bg-yellow-100 text-yellow-700 border-yellow-200'
                ]"
              >
                {{ selectedStatus }}
              </span>
            </div>

            <!-- 🔥 APPROVED FORM -->
            <div
              v-if="selectedStatus === 'APPROVED'"
              class="space-y-4 border rounded-xl p-4 bg-muted/30"
            >
              <div class="text-sm font-medium text-muted">
                Informasi Approval
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-sm font-medium text-muted">
                    Exam Date <span class="text-red-500">*</span>
                  </label>
                  <UInput
                    ref="examDateRef"
                    v-model="formApprove.examDate"
                    type="date"
                    icon="i-lucide-calendar"
                    :color="touched.examDate && errors.examDate ? 'error' : 'neutral'"
                    @blur="touched.examDate = true"
                  />
                  <p v-if="touched.examDate && errors.examDate" class="text-xs text-red-500">
                    {{ errors.examDate }}
                  </p>
                </div>

                <div class="space-y-1">
                  <label class="text-sm font-medium text-muted">
                    Priority <span class="text-red-500">*</span>
                  </label>
                  <USelect
                    v-model="formApprove.priorityRegist"
                    icon="i-lucide-award"
                    :items="[
                      { label: 'VIP', value: 'VIP' },
                      { label: 'Normal', value: 'NORMAL' },
                      { label: 'Emergency', value: 'EMERGENCY' }
                    ]"
                    placeholder="Pilih prioritas"
                    class="w-full min-w-[150px]"
                    :color="touched.priorityRegist && errors.priorityRegist ? 'error' : 'neutral'"
                    @update:model-value="() => touched.priorityRegist = true"
                    @blur="touched.priorityRegist = true"
                  />
                  <p v-if="touched.priorityRegist && errors.priorityRegist" class="text-xs text-red-500">
                    {{ errors.priorityRegist }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 🔥 REJECTED FORM -->
            <div
              v-else-if="selectedStatus === 'REJECTED'"
              class="space-y-3 border rounded-xl p-4 bg-muted/30"
            >
              <div class="text-sm font-medium text-muted">
                Alasan Penolakan
              </div>

              <div class="space-y-1 w-full">
                <label class="text-sm font-medium text-muted">
                  Reason :
                </label>
                <UTextarea
                  ref="rejectReasonRef"
                  v-model="formReject.rejectReason"
                  placeholder="Masukkan alasan penolakan..."
                  :rows="5"
                  class="w-full min-h-[120px]"
                  :color="touched.rejectReason && errors.rejectReason ? 'error' : 'neutral'"
                  @blur="touched.rejectReason = true"
                />
                <p v-if="touched.rejectReason && errors.rejectReason" class="text-xs text-red-500">
                  {{ errors.rejectReason }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </BaseConfirmModal>
    </template>
  </UDashboardPanel>
</template>
