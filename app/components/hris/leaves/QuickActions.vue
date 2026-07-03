<!-- app/components/hris/leaves/QuickActions.vue -->

<script setup lang="ts">
type QuickAction = {
  title: string
  description: string
  icon: string
  color: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
  to?: string
  disabled?: boolean
  action?: 'bulk-approve'
}

const emit = defineEmits<{
  bulkApprove: []
}>()

const router = useRouter()

const actions: QuickAction[] = [
  {
    title: 'Laporan Bulanan',
    description: 'Unduh laporan cuti bulanan',
    icon: 'i-lucide-file-bar-chart',
    color: 'primary',
    // disabled: true
    to: '/hris/attendance/tracking'
  },
  // {
  //   title: 'Verifikasi Massal',
  //   description: 'Setujui cuti yang dipilih',
  //   icon: 'i-lucide-badge-check',
  //   color: 'success',
  //   action: 'bulk-approve'
  // },
  {
    title: 'Hari Libur Nasional',
    description: 'Konfigurasi kalender libur',
    icon: 'i-lucide-calendar-x',
    color: 'warning',
    to: '/hris/national-holidays'
  },
  {
    title: 'Pengingat Broadcast',
    description: 'Kirim notifikasi ke tim',
    icon: 'i-lucide-bell-ring',
    color: 'neutral',
    disabled: true
  }
]

function handleAction(action: QuickAction) {
  if (action.disabled) return

  if (action.action === 'bulk-approve') {
    emit('bulkApprove')
    return
  }

  if (action.to) {
    router.push(action.to)
  }
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <UCard
      v-for="action in actions"
      :key="action.title"
      class="group transition"
      :class="[
        action.disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:bg-muted/40'
      ]"
      @click="handleAction(action)"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl"
          :class="{
            'bg-primary/10 text-primary': action.color === 'primary',
            'bg-success/10 text-success': action.color === 'success',
            'bg-warning/10 text-warning': action.color === 'warning',
            'bg-error/10 text-error': action.color === 'error',
            'bg-muted text-muted': action.color === 'neutral'
          }"
        >
          <UIcon
            :name="action.icon"
            class="size-5"
          />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate font-semibold text-highlighted">
              {{ action.title }}
            </p>

            <UBadge
              v-if="action.disabled"
              color="neutral"
              variant="soft"
              size="sm"
            >
              Soon
            </UBadge>
          </div>

          <p class="mt-1 truncate text-sm text-muted">
            {{ action.description }}
          </p>
        </div>

        <UIcon
          v-if="!action.disabled"
          name="i-lucide-chevron-right"
          class="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5"
        />
      </div>
    </UCard>
  </div>
</template>
