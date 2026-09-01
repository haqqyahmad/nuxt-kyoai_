<!-- app/components/hris/leaves/detail/AttendanceHistoryCard.vue -->

<script setup lang="ts">
import type { AttendanceHistoryItem } from '~/types/hris-leave'

const router = useRouter()

const props = defineProps<{
  items: AttendanceHistoryItem[]
}>()

const presentCount = computed(() => {
  return props.items.filter(item => item.status === 'present').length
})

const lateAbsentSickCount = computed(() => {
  return props.items.filter(item => ['late', 'absent', 'sick'].includes(item.status)).length
})

const presentPercent = computed(() => {
  if (!props.items.length) return 0

  return Math.round((presentCount.value / props.items.length) * 100)
})

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    present: 'Hadir',
    late: 'Terlambat',
    absent: 'Absen',
    off: 'Libur',
    leave: 'Cuti',
    sick: 'Sakit'
  }

  return labels[status] || status
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <UIcon
              name="i-lucide-calendar-check"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <h2 class="font-semibold text-highlighted">
              Riwayat Absensi
            </h2>

            <p class="text-sm text-muted">
              Aktivitas absensi pada bulan pengajuan cuti.
            </p>
          </div>
        </div>

        <UBadge
          color="neutral"
          variant="soft"
        >
          {{ items.length }} Hari
        </UBadge>
      </div>
    </template>

    <div
      v-if="!items.length"
      class="rounded-xl border border-dashed border-default bg-muted/30 p-6 text-center"
    >
      <UIcon
        name="i-lucide-calendar-x"
        class="mx-auto mb-3 size-8 text-muted"
      />

      <p class="font-medium text-highlighted">
        Riwayat absensi belum tersedia
      </p>

      <p class="mt-1 text-sm text-muted">
        Data absensi untuk bulan pengajuan cuti belum ditemukan.
      </p>
    </div>

    <div
      v-else
      class="space-y-5"
    >
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="item in items"
          :key="item.date"
          class="relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold"
          :class="getAttendanceColor(item.status)"
          :title="`${formatLeaveDate(item.date)} - ${getStatusLabel(item.status)}`"
        >
          {{ new Date(item.date).getDate() }}

          <UIcon
            v-if="item.status === 'holiday'"
            name="i-lucide-flag"
            class="absolute right-1 top-1 size-3"
          />
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl bg-muted/40 p-3">
          <div class="flex items-center gap-2 text-sm text-muted">
            <span class="size-2 rounded-full bg-success" />
            <span>Hadir</span>
          </div>

          <p class="mt-1 text-lg font-semibold text-highlighted">
            {{ presentCount }}
          </p>
        </div>

        <div class="rounded-xl bg-muted/40 p-3">
          <div class="flex items-center gap-2 text-sm text-muted">
            <span class="size-2 rounded-full bg-error" />
            <span>Late/Absent/Sick</span>
          </div>

          <p class="mt-1 text-lg font-semibold text-highlighted">
            {{ lateAbsentSickCount }}
          </p>
        </div>
      </div>

      <div class="rounded-xl bg-muted/40 p-4">
        <div class="mb-2 flex items-center justify-between text-sm">
          <span class="text-muted">
            Persentase Kehadiran
          </span>

          <span class="font-semibold text-highlighted">
            {{ presentPercent }}%
          </span>
        </div>

        <UProgress
          :model-value="presentPercent"
          color="success"
        />
      </div>
    </div>

    <template #footer>
      <UButton
        block
        color="neutral"
        variant="outline"
        icon="i-lucide-file-text"
        @click="router.push('/hris/attendance/tracking')"
      >
        Full Attendance Report
      </UButton>
    </template>
  </UCard>
</template>
