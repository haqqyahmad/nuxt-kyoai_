<!-- app/pages/hris/index.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

definePageMeta({
  middleware: 'auth'
})

const { isNotificationsSlideoverOpen } = useDashboard()

const items = [
  [
    {
      label: 'Tambah Karyawan',
      icon: 'i-lucide-user-plus',
      to: '/employees/create'
    },
    {
      label: 'Tambah Departemen',
      icon: 'i-lucide-building-2',
      to: '/departments'
    },
    {
      label: 'Ajukan Cuti',
      icon: 'i-lucide-calendar-plus',
      to: '/leave-management'
    },
    {
      label: 'Proses Payroll',
      icon: 'i-lucide-wallet',
      to: '/payroll'
    }
  ]
] satisfies DropdownMenuItem[][]

const cards = [
  {
    title: 'Karyawan Total',
    value: '1,248',
    icon: 'i-lucide-users',
    badge: '+2.4%',
    color: 'success'
  },
  {
    title: 'Cuti Aktif',
    value: '42',
    icon: 'i-lucide-calendar-days',
    badge: 'Hari ini',
    color: 'neutral'
  },
  {
    title: 'Karyawan Baru',
    value: '18',
    icon: 'i-lucide-user-plus',
    badge: 'Bulan ini',
    color: 'success'
  },
  {
    title: 'Reimburse Tertunda',
    value: 'IDR 2.4B',
    icon: 'i-lucide-wallet',
    badge: 'Mendesak',
    color: 'error'
  }
] as const
</script>

<template>
  <UDashboardPanel id="hris" class="bg-default">
    <template #header>
      <UDashboardNavbar
        title="Dashboard HRIS"
        :ui="{
          root: 'border-b border-default bg-default',
          title: 'text-highlighted',
          right: 'gap-3'
        }"
      >
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
      <div class="space-y-6 bg-default">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HrisSummaryCard
            v-for="card in cards"
            :key="card.title"
            :title="card.title"
            :value="card.value"
            :icon="card.icon"
            :badge="card.badge"
            :color="card.color"
          />
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <HrisAttendanceChart />
          </div>

          <HrisRecentActivity />
        </div>

        <HrisEmployeeStatusTable />
      </div>
    </template>
  </UDashboardPanel>
</template>
