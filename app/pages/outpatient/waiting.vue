<script setup lang="ts">
import type { ApiError, OutpatientEncounter, RegistrationRow } from '~/types/outpatient'
import { formatDateTime } from '~/constants/outpatient'

const api = useApi()
const toast = useToast()
const router = useRouter()

const todayIso = new Date().toISOString().split('T')[0]
const dateFilter = ref(todayIso)
const search = ref('')
const actionId = ref<string | null>(null)

const { data: encounters, refresh, pending } = await useAsyncData(
  'outpatient-waiting',
  async () => {
    const res = await api.get('/outpatient/encounters', {
      params: { status: 'WAITING', date: dateFilter.value, search: search.value || undefined }
    })
    return res.data.data as OutpatientEncounter[]
  }
)

const rows = computed(() => encounters.value ?? [])

watch([dateFilter, search], () => refresh())

/* ── Tambah dari Registrasi ── */
const isAddOpen = ref(false)
const regSearch = ref('')
const registrations = ref<RegistrationRow[]>([])
const regLoading = ref(false)

async function loadRegistrations() {
  regLoading.value = true
  try {
    const res = await api.get('/registration', { params: { statusRegistration: 'Open' } })
    registrations.value = ((res.data.data ?? []) as RegistrationRow[]).filter(
      r => r.serviceType !== 'MCU'
    )
  } catch {
    registrations.value = []
  } finally {
    regLoading.value = false
  }
}

const filteredRegistrations = computed(() => {
  const q = regSearch.value.toLowerCase()
  if (!q) return registrations.value.slice(0, 50)
  return registrations.value
    .filter((r) => {
      const name = r.patient
        ? [r.patient.firstName, r.patient.middleName, r.patient.lastName].filter(Boolean).join(' ')
        : ''
      return `${r.id_reg} ${name} ${r.serviceType}`.toLowerCase().includes(q)
    })
    .slice(0, 50)
})

async function openAdd() {
  isAddOpen.value = true
  await loadRegistrations()
}

async function checkin(registrationId: number) {
  actionId.value = String(registrationId)
  try {
    await api.post('/outpatient/encounters/checkin', { registrationId })
    toast.add({ title: 'Berhasil', description: 'Pasien masuk ruang tunggu umum', color: 'success' })
    isAddOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: (err as ApiError)?.response?.data?.message || 'Gagal check-in',
      color: 'error'
    })
  } finally {
    actionId.value = null
  }
}

/* ── Aksi encounter ── */
async function callEncounter(row: OutpatientEncounter) {
  actionId.value = row.id
  try {
    await api.patch(`/outpatient/encounters/${row.id}/call`)
    toast.add({ title: 'Berhasil', description: `Pasien ${row.queueCode} dipanggil`, color: 'success' })
    await router.push(`/outpatient/encounter/${row.id}`)
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal memanggil', color: 'error' })
  } finally {
    actionId.value = null
  }
}

async function cancelEncounter(row: OutpatientEncounter) {
  const reason = window.prompt('Alasan pembatalan?') ?? ''
  actionId.value = row.id
  try {
    await api.patch(`/outpatient/encounters/${row.id}/cancel`, { reason })
    toast.add({ title: 'Berhasil', description: 'Encounter dibatalkan', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    actionId.value = null
  }
}
</script>

<template>
  <UDashboardPanel id="outpatient-waiting">
    <template #header>
      <UDashboardNavbar title="Ruang Tunggu Umum (Outpatient)">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton label="Tambah dari Registrasi" icon="i-lucide-user-plus" @click="openAdd" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari pasien / kode antrian..."
          class="max-w-sm"
        />
        <UInput v-model="dateFilter" type="date" class="w-44" />
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          @click="refresh()"
        />
      </div>

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
                Prioritas
              </th>
              <th class="px-3 py-2">
                Masuk
              </th>
              <th class="px-3 py-2 text-right">
                Aksi
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
                {{ row.priority }}
              </td>
              <td class="px-3 py-2">
                {{ formatDateTime(row.queuedAt) }}
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-2">
                  <UButton
                    label="Ambil Pasien"
                    icon="i-lucide-hand"
                    size="xs"
                    :loading="actionId === row.id"
                    @click="callEncounter(row)"
                  />
                  <UButton
                    label="Batal"
                    icon="i-lucide-x"
                    size="xs"
                    color="error"
                    variant="subtle"
                    @click="cancelEncounter(row)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!pending && !rows.length">
              <td colspan="6" class="px-3 py-8 text-center text-muted">
                Tidak ada pasien menunggu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <UModal v-model:open="isAddOpen" title="Tambah dari Registrasi (Non-MCU)">
        <template #body>
          <div class="space-y-3">
            <UInput
              v-model="regSearch"
              icon="i-lucide-search"
              placeholder="Cari registrasi..."
              class="w-full"
            />
            <div class="max-h-80 overflow-y-auto rounded-lg border border-default">
              <table class="w-full text-sm">
                <thead class="bg-elevated/50 text-left">
                  <tr>
                    <th class="px-3 py-2">
                      Reg ID
                    </th>
                    <th class="px-3 py-2">
                      Pasien
                    </th>
                    <th class="px-3 py-2">
                      Layanan
                    </th>
                    <th class="px-3 py-2 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in filteredRegistrations" :key="r.id" class="border-t border-default">
                    <td class="px-3 py-2 font-medium">
                      {{ r.id_reg }}
                    </td>
                    <td class="px-3 py-2">
                      {{ [r.patient?.firstName, r.patient?.middleName, r.patient?.lastName].filter(Boolean).join(' ') || '-' }}
                    </td>
                    <td class="px-3 py-2">
                      {{ r.serviceType }}
                    </td>
                    <td class="px-3 py-2 text-right">
                      <UButton
                        label="Check-in"
                        size="xs"
                        :loading="actionId === String(r.id)"
                        @click="checkin(r.id)"
                      />
                    </td>
                  </tr>
                  <tr v-if="regLoading">
                    <td colspan="4" class="px-3 py-6 text-center text-muted">
                      Memuat...
                    </td>
                  </tr>
                  <tr v-else-if="!filteredRegistrations.length">
                    <td colspan="4" class="px-3 py-6 text-center text-muted">
                      Tidak ada registrasi non-MCU berstatus Open.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
