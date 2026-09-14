<!-- app/pages/index.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

usePageSeo({
  title: 'Dashboard',
  description: 'Ringkasan data dan aktivitas sistem.'
})

const { isNotificationsSlideoverOpen } = useDashboard()

const items = [
  [
    {
      label: 'New patient',
      icon: 'i-lucide-user-round-plus',
      to: '/patients'
    },
    {
      label: 'New appointment',
      icon: 'i-lucide-clipboard-plus',
      to: '/front-office/registration-patient'
    },
    {
      label: 'New user',
      icon: 'i-lucide-user-plus',
      to: '/users'
    },
    {
      label: 'New customer',
      icon: 'i-lucide-building',
      to: '/customer'
    }
  ]
] satisfies DropdownMenuItem[][]

const quickActions = [
  {
    title: 'Pasien Baru',
    description: 'Tambah & kelola data pasien',
    icon: 'i-lucide-user-round-plus',
    to: '/patients'
  },
  {
    title: 'Registrasi',
    description: 'Buat registrasi pemeriksaan',
    icon: 'i-lucide-clipboard-plus',
    to: '/front-office/registration-patient'
  },
  {
    title: 'Antrean Room',
    description: 'Pantau antrean & panggil pasien',
    icon: 'i-lucide-list-ordered',
    to: '/rooms/queue'
  },
  {
    title: 'Hasil Pemeriksaan',
    description: 'Lihat & input hasil exam',
    icon: 'i-lucide-file-check-2',
    to: '/result/exam-results'
  }
]
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Dashboard" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HomeStats />

        <div>
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Aksi Cepat
          </h2>
          <UPageGrid class="gap-4 sm:gap-6 lg:grid-cols-4">
            <UPageCard
              v-for="(action, index) in quickActions"
              :key="index"
              :icon="action.icon"
              :title="action.title"
              :description="action.description"
              :to="action.to"
              variant="outline"
              :ui="{ leading: 'p-2.5 rounded-full bg-elevated ring ring-inset ring-default' }"
            />
          </UPageGrid>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
