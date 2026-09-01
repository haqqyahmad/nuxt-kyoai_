<!-- app/components/hris/leaves/detail/ConflictCard.vue -->

<script setup lang="ts">
import type { LeaveConflict } from '~/types/hris-leave'

defineProps<{
  items: LeaveConflict[]
}>()
</script>

<template>
  <div
    v-if="items.length"
    class="space-y-6"
  >
    <UAlert
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Conflict Detected"
      :description="`${items.length} karyawan lain juga cuti pada periode yang berdekatan.`"
    />

    <UCard>
      <template #header>
        <h2 class="font-semibold text-highlighted">
          Detail Konflik Cuti
        </h2>
      </template>

      <div class="space-y-3">
        <div
          v-for="conflict in items"
          :key="`${conflict.employee_name}-${conflict.start_date}`"
          class="rounded-lg border border-default p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-highlighted">
                {{ conflict.employee_name }}
              </p>

              <p class="text-sm text-muted">
                {{ formatLeaveDate(conflict.start_date) }} - {{ formatLeaveDate(conflict.end_date) }}
              </p>
            </div>

            <UBadge
              :color="getLeaveTypeColor(conflict.leave_type)"
              variant="soft"
            >
              {{ getLeaveTypeLabel(conflict.leave_type) }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
