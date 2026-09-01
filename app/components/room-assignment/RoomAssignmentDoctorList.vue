<script setup lang="ts">
import type { RoomAssignmentRecord } from '~/types/room-assignment'

defineProps<{
  title?: string
  assignments: RoomAssignmentRecord[]
}>()

function getRoomLabel(assignment: RoomAssignmentRecord) {
  if (!assignment.room) return '-'
  return `${assignment.room.code} - ${assignment.room.name}`
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            {{ title || 'Petugas di Room Ini' }}
          </h3>
          <p class="text-sm text-muted">
            Daftar petugas aktif berdasarkan assignment hari ini
          </p>
        </div>
      </div>
    </template>

    <ul
      v-if="assignments.length"
      class="divide-y divide-default"
    >
      <li
        v-for="assignment in assignments"
        :key="assignment.id"
        class="flex items-center justify-between gap-3 py-3"
      >
        <div class="min-w-0">
          <p class="font-medium text-highlighted">
            {{ assignment.user?.name || `User #${assignment.userId}` }}
          </p>
          <p class="text-sm text-muted">
            {{ assignment.user?.email || '-' }}
          </p>
        </div>

        <div class="text-right">
          <p class="text-sm font-medium text-highlighted">
            {{ getRoomLabel(assignment) }}
          </p>
          <p class="text-xs text-muted">
            {{ assignment.roomType?.name || '-' }}
          </p>
        </div>
      </li>
    </ul>

    <div
      v-else
      class="rounded-xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      Belum ada assignment aktif.
    </div>
  </UCard>
</template>
