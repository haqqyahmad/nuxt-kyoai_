<!-- pages/hris/employees/index.vue -->

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const api = useApi()
const toast = useToast()

const openAdd = ref(false)

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
    console.log('employees:', employees.value)
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
  console.log('Export CSV')
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
        />

        <HrisEmployeesAddModal
          v-model:open="openAdd"
          @saved="loadEmployees"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
