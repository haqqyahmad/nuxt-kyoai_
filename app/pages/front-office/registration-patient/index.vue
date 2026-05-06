<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const api = useApi()
const toast = useToast()

type Patient = {
  id: string
  patientCode: string
  patientName: string

  firstName: string
  middleName?: string
  lastName: string

  gender: 'MALE' | 'FEMALE'
  idType: 'KTP' | 'PASSPORT' | 'SIM'
  idNumber: string

  phone?: string
  email?: string
  dob: string
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED'

  createdAt: string

  // 🔥 tambahkan ini
  id_reg: string
  serviceType: string
  examDate: string
}

function mapPatient(item: any): Patient & { id_reg: string } {
  return {
    id: item.patient?.id,
    patientCode: item.patient?.patientCode,
    patientName: item.patient?.patientName,

    firstName: item.patient?.firstName,
    middleName: item.patient?.middleName,
    lastName: item.patient?.lastName,

    gender: item.patient?.gender,
    idType: item.patient?.idType,
    idNumber: item.patient?.idNumber,

    phone: item.patient?.phone,
    email: item.patient?.email?.toLowerCase(),
    dob: item.patient?.dob,
    maritalStatus: item.patient?.maritalStatus,

    createdAt: item.createdAt,

    // 🔥 penting
    id_reg: item.id_reg,

    serviceType: item.serviceType,
    examDate: item.examDate
  }
}

// const { data: register, refresh } = await useAsyncData('register', () =>
//   api.get('/registration').then(res => res.data.data.map(mapPatient))
// )

const { data: register, refresh, error } = await useAsyncData(
  'register',
  async () => {
    try {
      const res = await api.get('/registration')
      console.log('Registration RESPONSE:', res.data.data.map(mapPatient))

      return res.data.data.map(mapPatient)
    } catch (err) {
      console.error('Registration ERROR:', err)
      throw err // penting supaya masuk ke error state Nuxt
    }
  }
)

const data = computed(() => register.value ?? [])

const columnFilters = ref([
  {
    id: 'id_reg',
    value: ''
  }
])
const columnVisibility = ref()
const rowSelection = ref({})

const selectedDeleteId = ref<string | null>(null)
async function deletePatient(id: string) {
  try {
    await api.delete(`/patient/${id}`)

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
      selectedRows.map((row: any) => api.delete(`/patient/${row.original.id}`))
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

function getRowItems(row: Row<Patient>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'View patient details',
      icon: 'i-lucide-eye',
      to: `/registration/${row.original.id}`
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete patient',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        selectedDeleteId.value = row.original.id
        isDeleteModalOpen.value = true
      }
    }
  ]
}

const columns: TableColumn<Patient>[] = [
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
    accessorKey: 'id_reg',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Regist ID',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => `${row.getValue('id_reg')}`
  },
  {
    accessorKey: 'firstName',
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
      const fullName = [p.firstName, p.middleName, p.lastName]
        .filter(Boolean)
        .join(' ')

      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', undefined, [
          h('p', { class: 'font-medium text-highlighted' }, fullName)
          // h("p", { class: "text-muted" }, `ID: ${p.id_reg}`),
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
      row.getValue('gender') === 'MALE' ? 'Laki-laki' : 'Perempuan'
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

      const date = new Date(value)

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
    cell: ({ row }) => row.getValue('serviceType')
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
      return new Date(row.getValue('examDate')).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  },
  // {
  //   accessorKey: 'email',
  //   header: ({ column }) => {
  //     const isSorted = column.getIsSorted()

  //     return h(UButton, {
  //       color: 'neutral',
  //       variant: 'ghost',
  //       label: 'Email',
  //       icon: isSorted
  //         ? isSorted === 'asc'
  //           ? 'i-lucide-arrow-up-narrow-wide'
  //           : 'i-lucide-arrow-down-wide-narrow'
  //         : 'i-lucide-arrow-up-down',
  //       class: '-mx-2.5',
  //       onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
  //     })
  //   },
  //   cell: ({ row }) => row.getValue('email') ?? '-'
  // },
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
            items: getRowItems(row)
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

const table = useTemplateRef('table')

const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi
        ?.getColumn('id_reg')
        ?.getFilterValue() as string) || ''
    )
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn('id_reg')
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
  <UDashboardPanel id="patient-appointments">
    <template #header>
      <UDashboardNavbar title="Patient Appointment">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-clipboard-plus"
            color="primary"
            to="/front-office/registration-patient/create"
          >
            New Appointment
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search by Regist ID..."
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
    </template>
  </UDashboardPanel>
</template>
