<script setup lang="ts">
import { Bar, Doughnut } from 'vue-chartjs'

type RegistrationRow = {
  createdAt?: string
  serviceType?: string
  statusRegistration?: string
}

type DeptQueue = {
  name: string
  total: number
  today: { status?: string }[]
}

const api = useApi()
const DAYS = 14

const period = ref<'today' | '7d' | '30d' | 'all'>('30d')
const periodOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: '7 Hari', value: '7d' },
  { label: '30 Hari', value: '30d' },
  { label: 'Semua', value: 'all' }
]

function localKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayKey = localKey(new Date())

const periodRange = computed<{ queueDateFrom?: string, queueDateTo?: string }>(() => {
  const now = new Date()
  if (period.value === 'today') {
    return { queueDateFrom: localKey(now), queueDateTo: localKey(now) }
  }
  if (period.value === '7d') {
    return {
      queueDateFrom: localKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)),
      queueDateTo: localKey(now)
    }
  }
  if (period.value === '30d') {
    return {
      queueDateFrom: localKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)),
      queueDateTo: localKey(now)
    }
  }
  return {}
})

const { data: regs } = await useAsyncData<RegistrationRow[]>(
  'home-charts-regs',
  async () => {
    const res = await api.get('/registration', { params: { limit: 1000 } })
    return (res.data?.data ?? []) as RegistrationRow[]
  },
  { default: () => [] }
)

const { data: depts } = await useAsyncData<DeptQueue[]>(
  'home-charts-depts',
  async () => {
    const deptRes = await api.get('/medical/departments')
    const list = (deptRes.data?.data ?? []) as { id: string, name: string }[]
    const range = periodRange.value

    const settled = await Promise.allSettled(list.map(async (dept) => {
      const [all, todayItems] = await Promise.all([
        api.get(`/medical/exams/queue/department/${dept.id}`, { params: { status: 'ALL', limit: 1, ...range } }),
        api.get(`/medical/exams/queue/department/${dept.id}`, { params: { status: 'ALL', queueDateFrom: todayKey, queueDateTo: todayKey, limit: 1000 } })
      ])
      return {
        name: dept.name,
        total: Number(all.data?.meta?.total ?? 0),
        today: (todayItems.data?.data ?? []) as { status?: string }[]
      }
    }))

    return settled.map((res, index) =>
      res.status === 'fulfilled'
        ? res.value
        : { name: list[index]?.name ?? '-', total: 0, today: [] }
    )
  },
  { default: () => [], watch: [period] }
)

// ── Periode ───────────────────────────────────────────────────
const cutoff = computed<Date | null>(() => {
  const now = new Date()
  if (period.value === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period.value === '7d') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  if (period.value === '30d') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
  return null
})

const filteredRegs = computed(() => {
  const from = cutoff.value
  if (!from) return regs.value ?? []
  return (regs.value ?? []).filter((row) => {
    if (!row.createdAt) return false
    const d = new Date(row.createdAt)
    return !Number.isNaN(d.getTime()) && d >= from
  })
})

// ── Trend 14 hari (bar) ───────────────────────────────────────
const trendData = computed(() => {
  const today = new Date()
  const labels: string[] = []
  const keys: string[] = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    keys.push(localKey(d))
    labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }))
  }
  const perDay = new Map<string, number>()
  for (const row of regs.value ?? []) {
    if (!row.createdAt) continue
    const d = new Date(row.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const key = localKey(d)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  }
  return {
    labels,
    datasets: [{
      label: 'Registrasi',
      data: keys.map(key => perDay.get(key) ?? 0),
      backgroundColor: 'rgba(16, 185, 129, 0.55)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 6,
      maxBarThickness: 28
    }]
  }
})

const trendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(120,120,120,.15)' } },
    x: { grid: { display: false } }
  }
}

// ── Distribusi Status (doughnut, periode) ─────────────────────
const STATUS_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#14b8a6']

function groupCount(rows: RegistrationRow[], pick: (row: RegistrationRow) => string) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = pick(row) || 'Unknown'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return { labels: [...map.keys()], values: [...map.values()] }
}

const statusChartData = computed(() => {
  const { labels, values } = groupCount(filteredRegs.value, row => row.statusRegistration ?? 'Unknown')
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: labels.map((_, i) => STATUS_COLORS[i % STATUS_COLORS.length]),
      borderWidth: 0
    }]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
  cutout: '62%'
}

// ── Distribusi Layanan (doughnut, periode) ────────────────────
const SERVICE_LABEL: Record<string, string> = {
  Laboratorium: 'Lab',
  DoctorConsultation: 'Consultation',
  MCU: 'MCU',
  Vaccine: 'Vaccine',
  Antigen: 'Antigen',
  PCR: 'PCR',
  VitaminInjection: 'Vitamin',
  Pharmacy: 'Pharmacy',
  Dental: 'Dental'
}

const SERVICE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b', '#ec4899']

const serviceChartData = computed(() => {
  const { labels, values } = groupCount(filteredRegs.value, row => SERVICE_LABEL[row.serviceType ?? ''] ?? row.serviceType ?? 'Unknown')
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: labels.map((_, i) => SERVICE_COLORS[i % SERVICE_COLORS.length]),
      borderWidth: 0
    }]
  }
})

// ── Pemeriksaan per Departemen (bar) ──────────────────────────
const deptChartData = computed(() => ({
  labels: (depts.value ?? []).map(d => d.name),
  datasets: [{
    label: 'Antrian pemeriksaan',
    data: (depts.value ?? []).map(d => d.total),
    backgroundColor: 'rgba(59, 130, 246, 0.55)',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 6,
    maxBarThickness: 32
  }]
}))

const deptChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(120,120,120,.15)' } },
    x: { grid: { display: false } }
  }
}

// ── Antrean vs Selesai hari ini (bar) ─────────────────────────
const queueToday = computed(() => {
  const active = new Set(['WAITING', 'CALLED', 'IN_PROGRESS'])
  let antrean = 0
  let selesai = 0
  for (const dept of depts.value ?? []) {
    for (const item of dept.today) {
      if (item.status === 'DONE') selesai += 1
      else if (item.status && active.has(item.status)) antrean += 1
    }
  }
  return { antrean, selesai }
})

const todayQueueData = computed(() => ({
  labels: ['Antrean', 'Selesai'],
  datasets: [{
    label: 'Hari ini',
    data: [queueToday.value.antrean, queueToday.value.selesai],
    backgroundColor: ['rgba(245, 158, 11, 0.6)', 'rgba(16, 185, 129, 0.6)'],
    borderColor: ['#f59e0b', '#10b981'],
    borderWidth: 1,
    borderRadius: 6,
    maxBarThickness: 60
  }]
}))

const todayQueueOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(120,120,120,.15)' } },
    x: { grid: { display: false } }
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-muted">
        Statistik
      </h2>
      <USelect
        v-model="period"
        :items="periodOptions"
        icon="i-lucide-calendar-range"
        class="w-40"
      />
    </div>

    <div class="grid gap-4 sm:gap-6 lg:grid-cols-3">
      <UCard class="lg:col-span-2">
        <template #header>
          <div>
            <h3 class="font-semibold text-highlighted">
              Registrasi 14 Hari Terakhir
            </h3>
            <p class="text-sm text-muted">
              Volume registrasi harian.
            </p>
          </div>
        </template>
        <ClientOnly>
          <div class="h-72">
            <Bar :data="trendData" :options="trendOptions" />
          </div>
        </ClientOnly>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h3 class="font-semibold text-highlighted">
              Status Registrasi
            </h3>
            <p class="text-sm text-muted">
              Distribusi status (per periode).
            </p>
          </div>
        </template>
        <ClientOnly>
          <div class="h-72">
            <Doughnut :data="statusChartData" :options="doughnutOptions" />
          </div>
        </ClientOnly>
      </UCard>
    </div>

    <div class="grid gap-4 sm:gap-6 lg:grid-cols-3">
      <UCard>
        <template #header>
          <div>
            <h3 class="font-semibold text-highlighted">
              Distribusi Layanan
            </h3>
            <p class="text-sm text-muted">
              Jenis layanan (per periode).
            </p>
          </div>
        </template>
        <ClientOnly>
          <div class="h-72">
            <Doughnut :data="serviceChartData" :options="doughnutOptions" />
          </div>
        </ClientOnly>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div>
            <h3 class="font-semibold text-highlighted">
              Pemeriksaan per Departemen
            </h3>
            <p class="text-sm text-muted">
              Jumlah antrian pemeriksaan tiap departemen (per periode).
            </p>
          </div>
        </template>
        <ClientOnly>
          <div class="h-72">
            <Bar :data="deptChartData" :options="deptChartOptions" />
          </div>
        </ClientOnly>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div>
          <h3 class="font-semibold text-highlighted">
            Antrean vs Selesai (Hari Ini)
          </h3>
          <p class="text-sm text-muted">
            Pasien menunggu vs pemeriksaan selesai hari ini.
          </p>
        </div>
      </template>
      <ClientOnly>
        <div class="h-56">
          <Bar :data="todayQueueData" :options="todayQueueOptions" />
        </div>
      </ClientOnly>
    </UCard>
  </div>
</template>
