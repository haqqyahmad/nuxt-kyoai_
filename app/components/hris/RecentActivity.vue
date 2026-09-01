<script setup lang="ts">
const activities = [
  {
    name: 'Budi Santoso',
    text: 'beralih ke Senior Developer',
    time: '15 menit yang lalu',
    icon: 'i-lucide-user',
    color: 'primary'
  },
  {
    name: 'Siti Aminah',
    text: 'mengajukan cuti tahunan',
    time: '2 jam yang lalu',
    icon: 'i-lucide-calendar-check',
    color: 'success'
  },
  {
    name: 'HR Dept',
    text: 'mengunggah laporan payroll Mei',
    time: '4 jam yang lalu',
    icon: 'i-lucide-file-check',
    color: 'warning'
  },
  {
    name: 'Admin',
    text: 'mendeteksi duplikasi data rekening',
    time: 'Baru saja',
    icon: 'i-lucide-triangle-alert',
    color: 'error'
  }
]

function getIconColor(color: string) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error'
  }

  return colors[color as keyof typeof colors]
}
</script>

<template>
  <UCard class="h-full">
    <template #header>
      <div class="flex items-center justify-between">
        <h3
          class="text-highlighted flex items-center gap-2 text-lg font-semibold"
        >
          Aktivitas Terbaru

          <UBadge
            color="primary"
            variant="soft"
          >
            {{ activities.length }}
          </UBadge>
        </h3>

        <UButton
          label="Lihat Semua"
          color="primary"
          variant="link"
        />
      </div>
    </template>

    <div class="divide-default divide-y">
      <div
        v-for="activity in activities"
        :key="activity.name + activity.time"
        class="hover:bg-elevated flex cursor-pointer items-center gap-4 p-4 transition-colors"
      >
        <div
          :class="getIconColor(activity.color)"
          class="flex size-10 items-center justify-center rounded-full"
        >
          <UIcon
            :name="activity.icon"
            class="size-5"
          />
        </div>

        <div class="flex-1">
          <p class="text-sm text-highlighted">
            <span class="font-semibold">
              {{ activity.name }}
            </span>
            {{ activity.text }}
          </p>

          <p class="text-muted text-xs">
            {{ activity.time }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
