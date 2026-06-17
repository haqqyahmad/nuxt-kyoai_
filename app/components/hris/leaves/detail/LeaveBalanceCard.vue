<!-- app/components/hris/leaves/detail/LeaveBalanceCard.vue -->

<script setup lang="ts">
import type { LeaveBalance } from '~/types/hris-leave'

const props = defineProps<{
  balance: LeaveBalance
}>()

const balancePercent = computed(() => {
  if (!props.balance.entitlement_days) return 0

  return Math.round(
    (props.balance.remaining_days / props.balance.entitlement_days) * 100
  )
})
</script>

<template>
  <UCard class="overflow-hidden bg-primary text-white">
    <div class="relative">
      <UIcon
        name="i-lucide-calendar-check"
        class="absolute -right-12 -top-10 size-36 opacity-10"
      />

      <p class="mb-6 text-xs font-semibold uppercase tracking-widest opacity-80">
        Leave Balance
      </p>

      <div class="mb-4 flex items-end gap-2">
        <span class="text-5xl font-bold">
          {{ balance.remaining_days }}
        </span>

        <span class="mb-1 text-lg opacity-80">
          Hari Tersisa
        </span>
      </div>

      <UProgress
        :model-value="balancePercent"
        color="success"
      />

      <p class="mt-4 text-xs opacity-80">
        Total Hak Cuti: {{ balance.entitlement_days }} Hari / Tahun
      </p>

      <div class="mt-6 grid gap-3">
        <div class="rounded-xl bg-white/10 p-3">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide opacity-80">
              Cuti Baru
            </p>

            <UBadge color="error" variant="soft">
              {{ balance.new_remaining_days }} Sisa
            </UBadge>
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="opacity-80">Jatah</span>
            <span class="font-semibold">{{ balance.new_entitlement_days }} Hari</span>
          </div>

          <div class="mt-1 flex items-center justify-between text-sm">
            <span class="opacity-80">Terpakai</span>
            <span class="font-semibold">{{ balance.new_used_days }} Hari</span>
          </div>
        </div>

        <div class="rounded-xl bg-white/10 p-3">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide opacity-80">
              Cuti Lama
            </p>

            <UBadge color="error" variant="soft">
              {{ balance.old_remaining_days }} Sisa
            </UBadge>
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="opacity-80">Jatah</span>
            <span class="font-semibold">{{ balance.old_entitlement_days }} Hari</span>
          </div>

          <div class="mt-1 flex items-center justify-between text-sm">
            <span class="opacity-80">Terpakai</span>
            <span class="font-semibold">{{ balance.old_used_days }} Hari</span>
          </div>

          <p
            v-if="balance.expired_at"
            class="mt-3 text-xs opacity-80"
          >
            Berlaku sampai {{ formatLeaveDate(balance.expired_at) }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
