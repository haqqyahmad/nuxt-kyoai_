<!-- app/pages/hris/national-holidays/index.vue -->

<script setup lang="ts">
type NationalHoliday = {
  id: number
  date: string
  name: string
  description: string | null
  is_active: boolean | number
  created_at?: string
  updated_at?: string
}

const api = useApi()
const toast = useToast()

const loading = ref(false)
const holidays = ref<NationalHoliday[]>([])
const selectedHolidayId = ref<number | null>(null)

const openCreateHoliday = ref(false)

const selectedHoliday = computed<NationalHoliday | null>(() => {
  if (!selectedHolidayId.value) return null

  return holidays.value.find(
    holiday => holiday.id === selectedHolidayId.value
  ) || null
})

function syncSelectedHoliday() {
  if (
    selectedHolidayId.value
    && holidays.value.some(holiday => holiday.id === selectedHolidayId.value)
  ) {
    return
  }

  selectedHolidayId.value = holidays.value[0]?.id || null
}

async function fetchHolidays() {
  try {
    const response: any = await api('/hris/national-holidays', {
      method: 'GET'
    })

    const data = response?.data?.data || response?.data || response || []

    holidays.value = Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal mengambil data national holidays.',
      color: 'error'
    })
  }
}

async function refreshPage() {
  loading.value = true

  try {
    await fetchHolidays()
    syncSelectedHoliday()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshPage()
})
</script>

<template>
  <UDashboardPanel
    id="national-holidays"
    class="min-h-0"
  >
    <template #header>
      <UDashboardNavbar title="National Holidays">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-calendar-plus"
            class="whitespace-nowrap"
            @click="openCreateHoliday = true"
          >
            <span class="hidden sm:inline">
              New Holiday
            </span>

            <span class="sm:hidden">
              Create
            </span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
        <div class="mx-auto w-full max-w-7xl space-y-6">
          <div class="space-y-1">
            <p class="text-sm text-muted">
              HRIS / Master Data
            </p>

            <h1 class="text-2xl font-semibold text-highlighted">
              National Holidays
            </h1>
          </div>

          <div class="grid min-w-0 gap-6 xl:grid-cols-12">
            <div class="min-w-0 space-y-6 xl:col-span-4">
              <HrisNationalHolidaysHolidayList
                v-model="selectedHolidayId"
                :holidays="holidays"
                :loading="loading"
              />

              <HrisNationalHolidaysHolidaySummaryCard
                :holidays="holidays"
              />
            </div>

            <div class="min-w-0 space-y-6 xl:col-span-8">
              <HrisNationalHolidaysHolidayDetailForm
                v-if="selectedHoliday"
                :holiday="selectedHoliday"
                @refresh="refreshPage"
              />

              <UCard v-else>
                <div class="rounded-xl border border-dashed border-default p-8 text-center">
                  <p class="font-medium text-highlighted">
                    Belum ada holiday dipilih
                  </p>

                  <p class="mt-1 text-sm text-muted">
                    Pilih national holiday dari daftar sebelah kiri.
                  </p>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>

      <HrisNationalHolidaysCreateHolidayModal
        v-model:open="openCreateHoliday"
        @created="refreshPage"
      />
    </template>
  </UDashboardPanel>
</template>
