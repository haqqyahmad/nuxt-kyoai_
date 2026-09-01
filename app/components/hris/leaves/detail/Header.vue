<!-- app/components/hris/leaves/detail/Header.vue -->

<script setup lang="ts">
import type { LeaveDetail } from '~/types/hris-leave'

defineProps<{
  leave: LeaveDetail
}>()
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 flex-1">
        <div class="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span class="font-medium">Leave Management</span>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4"
          />
          <span class="font-medium text-primary">
            Request Approval
          </span>
        </div>

        <div class="flex items-start gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <UIcon
              name="i-lucide-calendar-check"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <h1 class="text-2xl font-bold tracking-tight text-highlighted">
              Detail Permohonan Cuti
            </h1>

            <p class="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Review informasi karyawan, periode cuti, riwayat absensi, dan
              konflik jadwal sebelum permohonan disetujui atau ditolak.
            </p>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 lg:pt-1">
        <UBadge
          :color="getStatusColor(leave.status)"
          variant="soft"
          size="lg"
          class="px-3 py-1.5"
        >
          {{ getStatusLabel(leave.status) }}
        </UBadge>
      </div>
    </div>
  </UCard>
</template>
