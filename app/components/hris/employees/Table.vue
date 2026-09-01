<!-- app/components/hris/employees/Table.vue -->

<script setup lang="ts">
type EmployeeItem = {
  id: number | string
  nik: string
  nama: string
  status?: string
  educations?: any[]
}

const emit = defineEmits<{
  (e: 'edit', id: number): void
}>()

const props = defineProps<{
  employees: EmployeeItem[]
  loading?: boolean
  department?: string
  status?: string
}>()

const openEdit = ref(false)
const currentPage = ref(1)
const pageSize = ref(8)

const filteredEmployees = computed(() => {
  return props.employees.filter((employee) => {
    const matchStatus
      = !props.status
        || props.status === 'Semua Status'
        || employee.status === props.status

    return matchStatus
  })
})

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredEmployees.value.slice(start, end)
})

const totalPages = computed(() =>
  Math.ceil(filteredEmployees.value.length / pageSize.value)
)

function getInitial(name?: string) {
  if (!name) return '-'

  return name
    .split(' ')
    .map(item => item.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getStatusColor(status?: string) {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'error'
  if (status === 'contract') return 'primary'
  if (status === 'leave') return 'warning'

  return 'neutral'
}
</script>

<template>
  <UCard>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-default bg-muted text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">
              NIK
            </th>

            <th class="px-4 py-3 font-semibold">
              Nama
            </th>

            <th class="px-4 py-3 text-center font-semibold">
              Status
            </th>

            <th class="px-4 py-3 text-center font-semibold">
              Pendidikan
            </th>

            <th class="px-4 py-3 text-right font-semibold">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-default">
          <tr v-if="loading">
            <td colspan="5" class="px-4 py-8 text-center text-muted">
              Mengambil data karyawan...
            </td>
          </tr>

          <tr v-else-if="filteredEmployees.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted">
              Data karyawan tidak ditemukan
            </td>
          </tr>

          <tr
            v-for="employee in paginatedEmployees"
            v-else
            :key="employee.id"
            class="hover:bg-muted/50"
          >
            <td class="px-4 py-4 text-highlighted">
              {{ employee.nik }}
            </td>

            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <UAvatar
                  :text="getInitial(employee.nama)"
                  size="sm"
                />

                <span class="font-medium text-highlighted">
                  {{ employee.nama }}
                </span>
              </div>
            </td>

            <td class="px-4 py-4 text-center">
              <UBadge
                :color="getStatusColor(employee.status)"
                variant="soft"
              >
                {{ employee.status || '-' }}
              </UBadge>
            </td>

            <td class="px-4 py-4 text-center text-muted">
              {{ employee.educations?.length || 0 }}
            </td>

            <td class="px-4 py-4 text-right">
              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-edit"
                size="sm"
                @click="emit('edit', employee.id)"
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
          Menampilkan {{ paginatedEmployees.length }} dari {{ filteredEmployees.length }} Karyawan
        </p>

        <UPagination
          v-model:page="currentPage"
          :total="filteredEmployees.length"
          :items-per-page="pageSize"
        />
      </div>
    </template>

  </UCard>
</template>
