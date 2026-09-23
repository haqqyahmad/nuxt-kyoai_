<script setup lang="ts">
import type { ApiError, OutpatientEncounter } from '~/types/outpatient'
import { formatDateTime } from '~/constants/outpatient'

const api = useApi()
const toast = useToast()
const router = useRouter()

const activeTab = ref('active')
const dateFilter = ref(new Date().toISOString().split('T')[0])
const search = ref('')
const actionId = ref<string | null>(null)

const { data, refresh, pending } = await useAsyncData(
  'outpatient-queue',
  async () => {
    const params: Record<string, unknown> = { search: search.value || undefined }
    if (activeTab.value === 'active') params.status = 'IN_CONSULTATION'
    else if (activeTab.value === 'history') params.statusIn = 'DONE,CANCELLED'
    if (activeTab.value !== 'history') params.date = dateFilter.value
    const res = await api.get('/outpatient/encounters', { params })
    return res.data.data as OutpatientEncounter[]
  }
)

const rows = computed(() => data.value ?? [])

watch([activeTab, dateFilter, search], () => refresh())

function openEncounter(row: OutpatientEncounter) {
  router.push(`/outpatient/encounter/${row.id}`)
}

async function returnToWaiting(row: OutpatientEncounter) {
  actionId.value = row.id
  try {
    await api.patch(`/outpatient/encounters/${row.id}/return`)
    toast.add({ title: 'Berhasil', description: 'Pasien dikembalikan ke ruang tunggu', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    actionId.value = null
  }
}

async function completeEncounter(row: OutpatientEncounter) {
  actionId.value = row.id
  try {
    await api.patch(`/outpatient/encounters/${row.id}/complete`)
    toast.add({ title: 'Berhasil', description: 'Konsultasi selesai', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    actionId.value = null
  }
}

async function reopenEncounter(row: OutpatientEncounter) {
  actionId.value = row.id
  try {
    await api.patch(`/outpatient/encounters/${row.id}/reopen`)
    toast.add({ title: 'Berhasil', description: 'Konsultasi dibuka kembali', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    actionId.value = null
  }
}

function handleStatusAction(row: OutpatientEncounter, action: 'open' | 'return' | 'complete' | 'reopen') {
  if (action === 'open') openEncounter(row)
  else if (action === 'return') returnToWaiting(row)
  else if (action === 'complete') completeEncounter(row)
  else if (action === 'reopen') reopenEncounter(row)
}
</script>

<template>
  <UDashboardPanel id="outpatient-queue">
    <template #header>
      <UDashboardNavbar title="Outpatient Queue">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari pasien..."
          class="max-w-sm"
        />
        <UInput
          v-if="activeTab !== 'history'"
          v-model="dateFilter"
          type="date"
          class="w-44"
        />
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          @click="refresh()"
        />
      </div>

      <UTabs
        v-model="activeTab"
        :items="[
          { label: 'Sedang Konsultasi', value: 'active', icon: 'i-lucide-stethoscope' },
          { label: 'Riwayat', value: 'history', icon: 'i-lucide-history' }
        ]"
      />

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated/50 text-left">
            <tr>
              <th class="px-3 py-2">
                No. Antrian
              </th>
              <th class="px-3 py-2">
                Pasien
              </th>
              <th class="px-3 py-2">
                Layanan
              </th>
              <th class="px-3 py-2">
                Status
              </th>
              <th class="px-3 py-2">
                Dipanggil
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-t border-default">
              <td class="px-3 py-2 font-medium text-highlighted">
                {{ row.queueCode }}
              </td>
              <td class="px-3 py-2">
                <div class="flex flex-col">
                  <span class="font-medium">{{ row.patient?.fullName || '-' }}</span>
                  <span class="text-xs text-muted">{{ row.patient?.patientCode }}</span>
                </div>
              </td>
              <td class="px-3 py-2">
                {{ row.registration?.serviceType || '-' }}
              </td>
              <td class="px-3 py-2">
                <OutpatientEncounterStatusMenu
                  :status="row.status"
                  :loading="actionId === row.id"
                  @action="(a) => handleStatusAction(row, a)"
                />
              </td>
              <td class="px-3 py-2">
                {{ formatDateTime(row.calledAt) }}
              </td>
            </tr>
            <tr v-if="!pending && !rows.length">
              <td colspan="5" class="px-3 py-8 text-center text-muted">
                Tidak ada data.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </UDashboardPanel>
</template>
