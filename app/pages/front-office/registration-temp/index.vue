<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import { USelect } from '#components'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const api = useApi()
const toast = useToast()

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
  rejectedReason?: string
}

const { data: reg_temp, refresh } = await useAsyncData(
  'reg_temp',
  async () => {
    try {
      const res = await api.get('/registration-temp')

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
async function deleteRegistrationTemp(id: string) {
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

  await deleteRegistrationTemp(selectedDeleteId.value)
  selectedDeleteId.value = null
}

async function deleteSelectedRegistrations() {
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
        PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        PROCESS: 'bg-blue-100 text-blue-700 border-blue-200'
      }

      return h(
        'span',
        {
          class: `px-2 py-1 rounded-md text-xs font-semibold border ${colorMap[status]}`
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

const table = ref()

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

const currentPage = ref(1)

const currentPageSize = ref(10)

watch(currentPageSize, (value) => {
  table.value?.tableApi?.setPageSize(value)
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
            entity="registration-temp"
            @confirm="deleteSelectedRegistrations"
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
            v-model:page="currentPage"
            :items-per-page="currentPageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>
      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="registration-temp"
        @confirm="handleDeleteById"
      />
    </template>
  </UDashboardPanel>
</template>
