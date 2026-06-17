<!-- app/components/hris/leaves/detail/RequestInfoCard.vue -->

<script setup lang="ts">
import type { LeaveDetail } from '~/types/hris-leave'

defineProps<{
  leave: LeaveDetail
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <UIcon
            name="i-lucide-calendar-days"
            class="size-5 text-primary"
          />
        </div>

        <div>
          <h2 class="font-semibold text-highlighted">
            Detail Pengajuan
          </h2>

          <p class="text-sm text-muted">
            Informasi jenis cuti, periode, dan durasi pengajuan.
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div class="rounded-xl border border-default p-4">
        <div class="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <UIcon name="i-lucide-tags" />
          <span>Jenis Cuti</span>
        </div>

        <UBadge
          :color="getLeaveTypeColor(leave.leave_type)"
          variant="soft"
        >
          {{ getLeaveTypeLabel(leave.leave_type) }}
        </UBadge>
      </div>

      <div class="rounded-xl border border-default p-4">
        <div class="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <UIcon name="i-lucide-calendar-range" />
          <span>Periode Cuti</span>
        </div>

        <p class="font-semibold text-highlighted">
          {{ formatLeaveDate(leave.start_date) }} - {{ formatLeaveDate(leave.end_date) }}
        </p>
      </div>

      <div class="rounded-xl border border-default p-4">
        <div class="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <UIcon name="i-lucide-clock-3" />
          <span>Durasi</span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <p class="font-semibold text-highlighted">
            {{ leave.total_days }} Hari Kerja
          </p>

          <UBadge
            color="primary"
            variant="soft"
          >
            PAID
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>
