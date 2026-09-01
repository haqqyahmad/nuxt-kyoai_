<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'

type Employee = {
  name: string
  email: string
  department: string
  status: 'Aktif' | 'Cuti Sakit'
  attendance: number
}

const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UProgress = resolveComponent('UProgress')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const employees: Employee[] = [
  {
    name: 'Adi Nugroho',
    email: 'adi.n@hris.pro',
    department: 'Teknologi',
    status: 'Aktif',
    attendance: 98
  },
  {
    name: 'Dian Wijaya',
    email: 'dian.w@hris.pro',
    department: 'Pemasaran',
    status: 'Cuti Sakit',
    attendance: 82
  }
]

const columns: TableColumn<Employee>[] = [
  {
    accessorKey: 'name',
    header: 'Karyawan',
    cell: ({ row }) => {
      const employee = row.original

      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, {
          alt: employee.name,
          size: 'sm'
        }),

        h('div', undefined, [
          h('p', { class: 'font-semibold text-highlighted' }, employee.name),
          h('p', { class: 'text-muted text-xs' }, employee.email)
        ])
      ])
    }
  },
  {
    accessorKey: 'department',
    header: 'Departemen'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status

      return h(
        UBadge,
        {
          color: status === 'Aktif' ? 'success' : 'warning',
          variant: 'soft'
        },
        () => status
      )
    }
  },
  {
    accessorKey: 'attendance',
    header: 'Kehadiran',
    cell: ({ row }) => {
      const attendance = row.original.attendance

      return h('div', { class: 'flex items-center gap-3' }, [
        h(UProgress, {
          modelValue: attendance,
          color: 'primary',
          class: 'w-24'
        }),

        h('span', { class: 'text-muted text-xs' }, `${attendance}%`)
      ])
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const employee = row.original

      const items: DropdownMenuItem[][] = [
        [
          {
            label: 'Detail',
            icon: 'i-lucide-eye'
          },
          {
            label: 'Edit',
            icon: 'i-lucide-pencil'
          },
          {
            label: 'Nonaktifkan',
            icon: 'i-lucide-user-x',
            color: 'error'
          }
        ]
      ]

      return h(
        UDropdownMenu,
        {
          items
        },
        () =>
          h(UButton, {
            'icon': 'i-lucide-ellipsis-vertical',
            'color': 'neutral',
            'variant': 'ghost',
            'square': true,
            'class': 'opacity-0 group-hover:opacity-100 transition-opacity',
            'aria-label': `Aksi ${employee.name}`
          })
      )
    }
  }
]
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-highlighted flex items-center gap-2 font-semibold">
          Status Karyawan Terkini

          <UBadge color="primary" variant="soft">
            {{ employees.length }}
          </UBadge>
        </h3>

        <UButton
          icon="i-lucide-filter"
          label="Filter"
          color="neutral"
          variant="outline"
        />
      </div>
    </template>

    <UTable
      :data="employees"
      :columns="columns"
      :ui="{
        tr: 'group hover:bg-elevated transition-colors',
        th: 'text-muted uppercase',
        td: 'align-middle'
      }"
    />
  </UCard>
</template>
