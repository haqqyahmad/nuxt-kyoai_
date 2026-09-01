<!-- pages/hris/employees/index.vue -->

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const api = useApi()
const toast = useToast()

const openAdd = ref(false)
const editEmployeeId = ref<number | null>(null)
const openEdit = ref(false)

const department = ref('Semua Departemen')
const status = ref('Semua Status')

const loading = ref(false)

type EmployeeItem = {
  id: number
  nik: string
  nama: string
  status: string
  educations?: any[]
}

type EmployeesResponse = {
  success: boolean
  message: string
  data: EmployeeItem[]
}

const employees = ref<EmployeeItem[]>([])

async function loadEmployees() {
  loading.value = true

  try {
    const res = await api<EmployeesResponse>('/hris/employees')

    employees.value = res.data?.data || []

  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal mengambil data employee',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function exportCsv() {

}

onMounted(() => {
  loadEmployees()
})
</script>

<template>
  <UDashboardPanel id="employees">
    <template #header>
      <UDashboardNavbar title="Employee Directory">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HrisEmployeesHeader
          @add="openAdd = true"
          @export="exportCsv"
        />

        <HrisEmployeesFilters
          v-model:department="department"
          v-model:status="status"
        />

        <HrisEmployeesTable
          :employees="employees"
          :loading="loading"
          :department="department"
          :status="status"
          @edit="(id: number) => { editEmployeeId = id; openEdit = true }"
        />

        <HrisEmployeesAddModal
          v-model:open="openAdd"
          @saved="loadEmployees"
        />

        <HrisEmployeesEditModal
          v-model:open="openEdit"
          :employee-id="editEmployeeId"
          @saved="loadEmployees"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
