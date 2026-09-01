<!-- app/components/hris/leaves/create/BalanceCard.vue -->

<script setup lang="ts">
type Balance = {
  entitlement_days: number
  used_days: number
  remaining_days: number
}

const props = defineProps<{
  balance: Balance
}>()
</script>

<template>
  <UCard class="w-full lg:w-auto">
    <div class="flex items-center gap-4">
      <div class="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon
          name="i-lucide-calendar-days"
          class="size-6"
        />
      </div>

      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">
          Sisa Cuti Tahunan
        </p>

        <p class="text-xl font-bold text-highlighted">
          {{ props.balance.remaining_days }} Hari
        </p>
      </div>
    </div>
  </UCard>
</template>
