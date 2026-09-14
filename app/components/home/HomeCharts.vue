<script setup lang="ts">
import { Bar, Doughnut } from 'vue-chartjs'

const api = useApi()
const DAYS = 14

function localKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const EMPTY = {
  labels: [] as string[],
  daily: [] as number[],
  statusLabels: [] as string[],
  statusValues: [] as number[]
}

const { data } = await useAsyncData(
  'home-registration-charts',
  async () => {
    const res = await api.get('/registration', { params: { limit: 1000 } })
    const rows = (res.data?.data ?? res.data ?? []) as {
      createdAt?: string
      statusRegistration?: string
    }[]

    const today = new Date()
    const labels: string[] = []
    const keys: string[] = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
      keys.push(localKey(d))
      labels.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }))
    }

    const perDay = new Map<string, number>()
    const perStatus = new Map<string, number>()

    for (const row of rows) {
      if (row.createdAt) {
        const d = new Date(row.createdAt)
        if (!Number.isNaN(d.getTime())) {
          const key = localKey(d)
          perDay.set(key, (perDay.get(key) ?? 0) + 1)
        }
      }
      const status = row.statusRegistration || 'Unknown'
      perStatus.set(status, (perStatus.get(status) ?? 0) + 1)
    }

    return {
      labels,
      daily: keys.map(key => perDay.get(key) ?? 0),
      statusLabels: [...perStatus.keys()],
      statusValues: [...perStatus.values()]
    }
  },
  { default: () => ({ ...EMPTY }) }
)

const trendData = computed(() => ({
  labels: data.value?.labels ?? [],
  datasets: [
    {
      label: 'Registrasi',
      data: data.value?.daily ?? [],
      backgroundColor: 'rgba(16, 185, 129, 0.55)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 6,
      maxBarThickness: 28
    }
  ]
}))

const trendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      grid: { color: 'rgba(120, 120, 120, 0.15)' }
    },
    x: { grid: { display: false } }
  }
}

const STATUS_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#14b8a6']

const statusData = computed(() => ({
  labels: data.value?.statusLabels ?? [],
  datasets: [
    {
      data: data.value?.statusValues ?? [],
      backgroundColor: (data.value?.statusLabels ?? [])
        .map((_, index) => STATUS_COLORS[index % STATUS_COLORS.length]),
      borderWidth: 0
    }
  ]
}))

const statusOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
  cutout: '62%'
}
</script>

<template>
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
            Distribusi status registrasi.
          </p>
        </div>
      </template>

      <ClientOnly>
        <div class="h-72">
          <Doughnut :data="statusData" :options="statusOptions" />
        </div>
      </ClientOnly>
    </UCard>
  </div>
</template>
