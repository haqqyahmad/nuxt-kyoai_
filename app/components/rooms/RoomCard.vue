<!-- app/components/rooms/RoomCard.vue -->
<script setup lang="ts">
import type { Room, RoomState } from '~/types/room'
import { roomTypeConfig } from '~/constants/rooms'

const props = defineProps<{
  room: Room
  state: RoomState
}>()

const emit = defineEmits<{
  edit: [room: Room]
  delete: [id: string]
}>()

const activePatients = computed(() =>
  props.room.patients.filter(patient =>
    ['WAITING', 'IN_PROGRESS'].includes(patient.status)
  )
)

const stateConfig = computed(() => {
  if (props.state === 'INACTIVE') {
    return {
      label: 'Tidak Aktif',
      color: 'neutral' as const,
      icon: 'i-lucide-ban'
    }
  }

  if (props.state === 'OCCUPIED') {
    return {
      label: 'Digunakan',
      color: 'warning' as const,
      icon: 'i-lucide-clock'
    }
  }

  return {
    label: 'Tersedia',
    color: 'success' as const,
    icon: 'i-lucide-check-circle'
  }
})

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
}

function getPatientStatusColor(status: string) {
  if (status === 'IN_PROGRESS') return 'bg-success'
  if (status === 'WAITING') return 'bg-warning'
  return 'bg-muted'
}

function getPatientStatusLabel(status: string) {
  if (status === 'IN_PROGRESS') return 'Sedang dilayani'
  if (status === 'WAITING') return 'Menunggu'
  return 'Selesai'
}
</script>

<template>
  <UCard
    :ui="{
      root: [
        'overflow-hidden transition-all duration-200',
        'shadow-md hover:shadow-xl ring-1 ring-default',
        'ring-1 ring-default',
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

          <div class="mt-1 flex items-center gap-1 text-xs text-muted">
            <UIcon
              name="i-lucide-map-pin"
              class="size-3.5"
            />
            <span>{{ room.floor || '-' }}</span>
          </div>
        </div>

        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <UBadge
            :label="roomTypeConfig[room.type].label"
            :icon="roomTypeConfig[room.type].icon"
            variant="outline"
            :class="roomTypeConfig[room.type].class"
          />

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
        Pasien saat ini
      </p>

      <div
        v-if="room.status === 'INACTIVE'"
        class="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted"
      >
        <UIcon
          name="i-lucide-ban"
          class="size-6"
        />
        <span>Ruangan tidak aktif</span>
      </div>

      <div
        v-else-if="!room.patients.length"
        class="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted"
      >
        <UIcon
          name="i-lucide-user-x"
          class="size-6"
        />
        <span>Tidak ada pasien</span>
      </div>

      <div
        v-else
        class="divide-y divide-default"
      >
        <div
          v-for="patient in room.patients"
          :key="patient.id"
          class="flex items-center gap-3 py-2.5"
        >
          <UAvatar
            :alt="patient.name"
            :text="getInitials(patient.name)"
            size="sm"
          />

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-highlighted">
              {{ patient.name }}
            </p>

            <p class="truncate text-xs text-muted">
              {{ patient.queueNo }} · {{ patient.complaint }}
            </p>

            <p class="truncate text-xs text-muted">
              {{ patient.guarantor }} · Masuk {{ patient.enteredAt }}
            </p>
          </div>

          <span
            class="size-2 rounded-full"
            :class="getPatientStatusColor(patient.status)"
            :title="getPatientStatusLabel(patient.status)"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-default bg-muted/30 px-4 py-3">
      <div class="flex items-center justify-between gap-3 text-xs text-muted">
        <div class="flex items-center gap-1.5">
          <UIcon
            name="i-lucide-users"
            class="size-3.5"
          />
          <span>
            {{ activePatients.length }}/{{ room.capacity || 0 }} orang
          </span>
        </div>

        <div class="flex min-w-0 items-center gap-1.5">
          <UIcon
            name="i-lucide-user-round"
            class="size-3.5"
          />
          <span class="truncate">
            {{ room.pic || '-' }}
          </span>
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
