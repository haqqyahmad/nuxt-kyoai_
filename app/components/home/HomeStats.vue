<script setup lang="ts">
type HomeStat = {
  title: string
  description: string
  icon: string
  to: string
  value: number
  color: 'primary' | 'info' | 'warning' | 'success'
}

const api = useApi()

const COLOR_UI: Record<string, string> = {
  primary: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
  info: 'p-2.5 rounded-full bg-info/10 ring ring-inset ring-info/25 flex-col',
  warning: 'p-2.5 rounded-full bg-warning/10 ring ring-inset ring-warning/25 flex-col',
  success: 'p-2.5 rounded-full bg-success/10 ring ring-inset ring-success/25 flex-col'
}

const { data: stats, pending } = await useAsyncData<HomeStat[]>(
  'home-stats',
  async () => {
    const [patients, registrations, temps, rooms] = await Promise.allSettled([
      api.get('/patient', { params: { limit: 1 } }),
      api.get('/registration', { params: { limit: 1 } }),
      api.get('/registration-temp', { params: { limit: 200 } }),
      api.get('/medical/rooms/sessions/active')
    ])

    const totalOf = (res: PromiseSettledResult<{ data?: { meta?: { total?: number }, data?: unknown[] } }>) =>
      res.status === 'fulfilled'
        ? Number(res.value?.data?.meta?.total ?? (Array.isArray(res.value?.data?.data) ? res.value.data.data.length : 0))
        : 0

    const tempPending = temps.status === 'fulfilled'
      ? (Array.isArray(temps.value?.data?.data) ? temps.value.data.data as { status?: string }[] : [])
          .filter(item => item.status === 'PENDING').length
      : 0

    const activeRooms = rooms.status === 'fulfilled'
      ? (Array.isArray(rooms.value?.data?.data) ? rooms.value.data.data.length : 0)
      : 0

    return [
      {
        title: 'Total Pasien',
        description: 'Pasien terdaftar',
        icon: 'i-lucide-users',
        to: '/patients',
        value: totalOf(patients),
        color: 'primary'
      },
      {
        title: 'Registrasi',
        description: 'Seluruh registrasi',
        icon: 'i-lucide-clipboard-list',
        to: '/front-office/registration-patient',
        value: totalOf(registrations),
        color: 'info'
      },
      {
        title: 'Menunggu Verifikasi',
        description: 'Permintaan registrasi baru',
        icon: 'i-lucide-clock',
        to: '/front-office/registration-temp',
        value: tempPending,
        color: 'warning'
      },
      {
        title: 'Room Aktif',
        description: 'Room dengan petugas',
        icon: 'i-lucide-door-open',
        to: '/rooms/queue',
        value: activeRooms,
        color: 'success'
      }
    ]
  },
  { default: () => [] }
)

function formatValue(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('id-ID') : '0'
}
</script>

<template>
  <UPageGrid class="gap-4 sm:gap-6 lg:grid-cols-4">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      :to="stat.to"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: COLOR_UI[stat.color],
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ pending ? '—' : formatValue(stat.value) }}
        </span>
      </div>
      <p class="text-xs text-muted">
        {{ stat.description }}
      </p>
    </UPageCard>
  </UPageGrid>
</template>
