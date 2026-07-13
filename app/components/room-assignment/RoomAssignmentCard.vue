<script setup lang="ts">
import type { RoomAssignmentRecord } from '~/types/room-assignment'

const props = defineProps<{
  assignment: RoomAssignmentRecord
}>()

const emit = defineEmits<{
  transfer: [assignment: RoomAssignmentRecord]
  toggleActive: [assignment: RoomAssignmentRecord]
  delete: [assignment: RoomAssignmentRecord]
}>()

const statusConfig = computed(() => {
  if (props.assignment.isActive) {
    return {
      label: 'Aktif',
      color: 'success' as const,
      icon: 'i-lucide-check-circle'
    }
  }

  return {
    label: 'Nonaktif',
    color: 'neutral' as const,
    icon: 'i-lucide-circle-off'
  }
})

const canTransfer = computed(() => !props.assignment.isActive)
const sourceLabel = computed(() =>
  props.assignment.assignmentSource === 'SELF' ? 'Self' : 'PIC'
)

function formatUserName() {
  return props.assignment.user?.name || `User #${props.assignment.userId}`
}

function formatRoomName() {
  if (!props.assignment.room) return '-'
  return `${props.assignment.room.code} - ${props.assignment.room.name}`
}

function formatRoomTypeName() {
  if (!props.assignment.roomType) return '-'
  return `${props.assignment.roomType.code} - ${props.assignment.roomType.name}`
}
</script>

<template>
  <UCard
    :ui="{
      root: 'overflow-hidden shadow-sm ring-1 ring-default hover:shadow-md transition-all',
      body: 'p-0',
      footer: 'p-0'
    }"
  >
    <div class="border-b border-default p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-muted">
            Assignment #{{ assignment.id.slice(0, 8) }}
          </p>
          <h3 class="mt-1 truncate text-base font-semibold text-highlighted">
            {{ formatUserName() }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ assignment.user?.email || 'No email' }}
          </p>
        </div>

        <UBadge
          :label="statusConfig.label"
          :color="statusConfig.color"
          :icon="statusConfig.icon"
          variant="subtle"
        />
      </div>

      <div class="mt-3">
        <UBadge
          :label="sourceLabel"
          color="neutral"
          variant="outline"
        />
      </div>
    </div>

    <div class="grid gap-3 p-4 text-sm">
      <div class="rounded-lg bg-muted/40 p-3">
        <p class="text-xs text-muted">
          Tanggal Assignment
        </p>
        <p class="mt-1 font-medium text-highlighted">
          {{ assignment.assignedDate }}
        </p>
      </div>

      <div class="rounded-lg bg-muted/40 p-3">
        <p class="text-xs text-muted">
          Room Type
        </p>
        <p class="mt-1 font-medium text-highlighted">
          {{ formatRoomTypeName() }}
        </p>
      </div>

      <div class="rounded-lg bg-muted/40 p-3">
        <p class="text-xs text-muted">
          Room
        </p>
        <p class="mt-1 font-medium text-highlighted">
          {{ formatRoomName() }}
        </p>
      </div>

      <div class="rounded-lg bg-muted/40 p-3">
        <p class="text-xs text-muted">
          Catatan
        </p>
        <p class="mt-1 line-clamp-2 font-medium text-highlighted">
          {{ assignment.notes || '-' }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2 border-t border-default p-3">
        <UButton
          block
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-swap"
          :disabled="!canTransfer"
          @click="emit('transfer', assignment)"
        >
          Transfer
        </UButton>

        <UButton
          size="sm"
          color="primary"
          variant="soft"
          :icon="assignment.isActive ? 'i-lucide-pause' : 'i-lucide-play'"
          @click="emit('toggleActive', assignment)"
        />

        <UButton
          size="sm"
          color="error"
          variant="soft"
          icon="i-lucide-trash"
          @click="emit('delete', assignment)"
        />
      </div>

      <p
        v-if="assignment.isActive"
        class="border-t border-default px-3 pb-3 text-xs text-muted"
      >
        Transfer baru bisa dilakukan setelah assignment dinonaktifkan.
      </p>
    </template>
  </UCard>
</template>
