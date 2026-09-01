<script setup lang="ts">
type RegistrationRow = {
  id_reg: string
  examDate: string | null
  serviceType: string
  statusRegistration: string
  createdAt: string
  patient: {
    patientCode: string
    patientName: string
    gender: string
  } | null
}

const api = useApi()
const router = useRouter()

const { data: registrations, pending, refresh } = await useAsyncData<RegistrationRow[]>(
  'exam-status-list',
  async () => {
    try {
      const res = await api.get('/registration', { params: { limit: 100 } })
      const payload = res.data?.data ?? res.data ?? []
      return Array.isArray(payload) ? payload : []
    } catch {
      return []
    }
  },
  { default: () => [], server: false }
)

const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return registrations.value ?? []
  return (registrations.value ?? []).filter(row =>
    row.id_reg.toLowerCase().includes(q)
    || row.patient?.patientName.toLowerCase().includes(q)
    || row.patient?.patientCode.toLowerCase().includes(q)
  )
})

const STATUS_LABEL: Record<string, string> = {
  Open: 'Open',
  Checkin: 'Check-in',
  CheckOut: 'Check-out',
  PartialExam: 'Partial Exam',
  Reschedule: 'Reschedule',
  Cancel: 'Dibatalkan'
}

const STATUS_COLOR: Record<string, string> = {
  Open: 'success',
  Checkin: 'info',
  CheckOut: 'neutral',
  PartialExam: 'warning',
  Reschedule: 'warning',
  Cancel: 'error'
}

function formatDate(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function openStatus(idReg: string) {
  router.push(`/result/exam-status/${idReg}`)
}
</script>

<template>
  <UDashboardPanel id="exam-status-list">
    <template #header>
      <UDashboardNavbar
        title="Status Examination"
        subtitle="Daftar registrasi & status pengerjaan item pemeriksaan"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="pending"
            @click="refresh"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari No. Registrasi / nama pasien / RM..."
          class="max-w-md"
        />

        <div v-if="pending" class="space-y-3">
          <USkeleton v-for="index in 5" :key="index" class="h-14 rounded-xl" />
        </div>

        <div
          v-else-if="filtered.length === 0"
          class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center"
        >
          <UIcon name="i-lucide-clipboard-list" class="mb-2 size-8 text-muted" />
          <p class="text-sm font-medium text-highlighted">
            Tidak ada registrasi ditemukan
          </p>
        </div>

        <UCard v-else class="overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0">
              <thead>
                <tr class="bg-muted/30">
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Registrasi</th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Pasien</th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Exam Date</th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Service</th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                  <th class="border-b border-default px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filtered"
                  :key="row.id_reg"
                  class="hover:bg-muted/20"
                >
                  <td class="border-b border-default px-4 py-3">
                    <code class="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded px-2 py-0.5">
                      {{ row.id_reg }}
                    </code>
                  </td>
                  <td class="border-b border-default px-4 py-3">
                    <p class="text-sm font-semibold text-highlighted">
                      {{ row.patient?.patientName || '-' }}
                    </p>
                    <p class="text-xs text-muted">
                      RM {{ row.patient?.patientCode || '-' }} · {{ row.patient?.gender === 'MALE' ? 'Laki-laki' : row.patient?.gender === 'FEMALE' ? 'Perempuan' : '-' }}
                    </p>
                  </td>
                  <td class="border-b border-default px-4 py-3 text-sm">
                    {{ formatDate(row.examDate) }}
                  </td>
                  <td class="border-b border-default px-4 py-3">
                    <UBadge :label="row.serviceType || '-'" color="primary" variant="soft" size="sm" />
                  </td>
                  <td class="border-b border-default px-4 py-3">
                    <UBadge
                      :label="STATUS_LABEL[row.statusRegistration] ?? row.statusRegistration"
                      :color="(STATUS_COLOR[row.statusRegistration] as any) ?? 'neutral'"
                      variant="subtle"
                      size="sm"
                    />
                  </td>
                  <td class="border-b border-default px-4 py-3 text-right">
                    <UButton
                      icon="i-lucide-activity"
                      color="primary"
                      variant="soft"
                      size="sm"
                      @click="openStatus(row.id_reg)"
                    >
                      Status Exam
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
