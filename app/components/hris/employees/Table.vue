<!-- app/components/hris/employees/Table.vue -->

<script setup lang="ts">
defineProps<{
  department?: string
  status?: string
}>()

const openEdit = ref(false)

const employees = [
  {
    id: '#EMP-00124',
    name: 'Andi Saputra',
    initial: 'AS',
    department: 'Teknologi',
    position: 'Senior Engineer',
    status: 'Aktif',
    joinedAt: '12 Jan 2021'
  },
  {
    id: '#EMP-00125',
    name: 'Budi Mahendra',
    initial: 'BM',
    department: 'Pemasaran',
    position: 'Digital Strategist',
    status: 'Kontrak',
    joinedAt: '05 Mar 2022'
  },
  {
    id: '#EMP-00128',
    name: 'Citra Ningsih',
    initial: 'CN',
    department: 'SDM',
    position: 'HR Generalist',
    status: 'Cuti',
    joinedAt: '19 Okt 2020'
  }
]

function getStatusColor(status: string) {
  if (status === 'Aktif') return 'success'
  if (status === 'Kontrak') return 'primary'
  return 'error'
}
</script>

<template>
  <UCard>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-default bg-muted text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">
              ID Karyawan
            </th>
            <th class="px-4 py-3 font-semibold">
              Nama
            </th>
            <th class="px-4 py-3 font-semibold">
              Departemen
            </th>
            <th class="px-4 py-3 font-semibold">
              Posisi
            </th>
            <th class="px-4 py-3 text-center font-semibold">
              Status
            </th>
            <th class="px-4 py-3 font-semibold">
              Tanggal Bergabung
            </th>
            <th class="px-4 py-3 text-right font-semibold">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-default">
          <tr
            v-for="employee in employees"
            :key="employee.id"
            class="hover:bg-muted/50"
          >
            <td class="px-4 py-4 text-highlighted">
              {{ employee.id }}
            </td>

            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <UAvatar
                  :text="employee.initial"
                  size="sm"
                />

                <span class="font-medium text-highlighted">
                  {{ employee.name }}
                </span>
              </div>
            </td>

            <td class="px-4 py-4 text-muted">
              {{ employee.department }}
            </td>

            <td class="px-4 py-4 text-muted">
              {{ employee.position }}
            </td>

            <td class="px-4 py-4 text-center">
              <UBadge
                :color="getStatusColor(employee.status)"
                variant="soft"
              >
                {{ employee.status }}
              </UBadge>
            </td>

            <td class="px-4 py-4 text-muted">
              {{ employee.joinedAt }}
            </td>

            <td class="px-4 py-4 text-right">
              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-edit"
                size="sm"
                @click="openEdit = true"
              >
                Edit
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted">
          Menampilkan 3 dari 124 Karyawan
        </p>

        <UPagination
          :page="1"
          :total="124"
          :items-per-page="8"
        />
      </div>
    </template>

    <HrisEmployeesEditModal v-model:open="openEdit" />
  </UCard>
</template>
