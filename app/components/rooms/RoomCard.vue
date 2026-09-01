<!-- app/components/rooms/RoomCard.vue -->
<script setup lang="ts">
import type { Room, RoomState } from '~/types/room'

const props = defineProps<{
  room: Room
  state: RoomState
}>()

const emit = defineEmits<{
  edit: [room: Room]
  delete: [id: string]
}>()

const stateConfig = computed(() => {
  if (props.state === 'INACTIVE') {
    return {
      label: 'Tidak Aktif',
      color: 'neutral' as const,
      icon: 'i-lucide-ban'
    }
  }

  return {
    label: 'Aktif',
    color: 'success' as const,
    icon: 'i-lucide-check-circle'
  }
})

function getRoomTypeColor(serviceType?: string | null) {
  if (!serviceType) return 'neutral'

  const normalized = serviceType.toLowerCase()
  if (normalized.includes('lab')) return 'error'
  if (normalized.includes('doctor')) return 'primary'
  if (normalized.includes('dental')) return 'warning'
  if (normalized.includes('pharmacy')) return 'success'
  if (normalized.includes('mcu')) return 'info'
  if (normalized.includes('radiology')) return 'info'
  return 'neutral'
}
</script>

<template>
  <UCard
    :ui="{
      root: [
        'overflow-hidden transition-all duration-200',
        'shadow-md hover:shadow-xl ring-1 ring-default',
        'hover:-translate-y-0.5',
        state === 'INACTIVE'
          ? 'opacity-60'
          : 'hover:ring-primary/20'
      ].join(' '),

      body: 'p-0',
      footer: 'p-0'
    }"
  >
    <div class="border-b border-default p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-medium text-muted">
            {{ room.code }}
          </p>

          <h3 class="mt-1 truncate text-base font-semibold text-highlighted">
            {{ room.name }}
          </h3>

          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span v-if="room.roomType">
              {{ room.roomType.code }} - {{ room.roomType.name }}
            </span>

            <UBadge
              v-if="room.roomType"
              :label="room.roomType.serviceType"
              :color="getRoomTypeColor(room.roomType.serviceType)"
              variant="soft"
            />
          </div>
        </div>

        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <UBadge
            :label="stateConfig.label"
            :color="stateConfig.color"
            :icon="stateConfig.icon"
            variant="subtle"
          />
        </div>
      </div>
    </div>

    <div class="min-h-40 p-4">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Ringkasan room
      </p>

      <div class="grid grid-cols-1 gap-3 text-sm">
        <div class="rounded-lg bg-muted/40 p-3">
          <p class="text-xs text-muted">
            Room Type
          </p>
          <p class="mt-1 font-medium text-highlighted">
            {{ room.roomType?.code || '-' }} - {{ room.roomType?.name || '-' }}
          </p>
          <p class="mt-1 text-xs text-muted">
            Service: {{ room.roomType?.serviceType || '-' }} · Tier {{ room.roomType?.tierOrder ?? '-' }}
          </p>
        </div>

        <div class="rounded-lg bg-muted/40 p-3">
          <p class="text-xs text-muted">
            Kapasitas Petugas
          </p>
          <p class="mt-1 font-medium text-highlighted">
            {{ room.staffCapacity }} orang
          </p>
        </div>

        <div class="rounded-lg bg-muted/40 p-3">
          <p class="text-xs text-muted">
            Status
          </p>
          <p class="mt-1 font-medium text-highlighted">
            {{ room.isActive ? 'Aktif' : 'Tidak aktif' }}
          </p>
        </div>

        <div class="rounded-lg bg-muted/40 p-3">
          <p class="text-xs text-muted">
            Stage yang ditangani
          </p>
          <div
            v-if="(room.stageLinks ?? []).length"
            class="mt-1.5 flex flex-wrap gap-1.5"
          >
            <UBadge
              v-for="link in room.stageLinks"
              :key="link.id"
              :label="`${link.stage.code} · ${link.stage.name}`"
              color="info"
              variant="subtle"
            />
          </div>
          <p
            v-else
            class="mt-1 text-xs text-muted"
          >
            Belum ada stage dipetakan
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2 border-t border-default p-3">
        <UButton
          block
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-pencil"
          @click="emit('edit', room)"
        >
          Edit
        </UButton>

        <UButton
          size="sm"
          color="error"
          variant="soft"
          icon="i-lucide-trash"
          @click="emit('delete', room.id)"
        />
      </div>
    </template>
  </UCard>
</template>
