<script setup lang="ts">
import type { RoomSession } from '~/types/room'
import type { RoomAssignmentRecord } from '~/types/room-assignment'

const api = useApi()
const toast = useToast()
const { roles } = await useCurrentUser()
const {
  session: roomSession,
  pending: roomSessionPending,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()

const isSuperAdmin = computed(() =>
  (roles.value ?? []).some(role => String(role).toLowerCase().includes('superadmin'))
)

const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value as RoomSession
})

const {
  data: assignmentData,
  pending: assignmentPending
} = await useAsyncData<RoomAssignmentRecord | null>(
  'sample-reception-assignment',
  async () => {
    try {
      const res = await api.get('/room-assignments/me', {
        params: { assignedDate: new Date().toISOString().slice(0, 10), _: Date.now() }
      })
      const payload = res.data
      return (payload && Object.prototype.hasOwnProperty.call(payload, 'data')
        ? payload.data
        : payload) as RoomAssignment | null
    } catch {
      return null
    }
  },
  { default: () => null, server: false }
)

const assignment = computed(() => assignmentData.value ?? null)
const canEnterRoom = computed(() => Boolean(assignment.value?.roomId) && !activeRoomSession.value)

async function handleEnterRoom() {
  if (!assignment.value?.roomId) {
    toast.add({
      title: 'Belum ada assignment room',
      description: 'Anda harus di-assign ke ruangan sample reception hari ini.',
      color: 'warning'
    })
    return
  }
  try {
    await enterRoomSession({ roomId: assignment.value.roomId })
    toast.add({ title: 'Berhasil masuk room', color: 'success' })
  } catch {
    toast.add({ title: 'Gagal masuk room', color: 'error' })
  }
}

async function handleExitRoom() {
  try {
    await exitRoomSession()
    toast.add({ title: 'Keluar room', color: 'success' })
  } catch {
    toast.add({ title: 'Gagal keluar room', color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="sample-reception">
    <template #header>
      <UDashboardNavbar title="Sample Reception">
        <template #right>
          <UBadge
            v-if="activeRoomSession"
            color="success"
            variant="soft"
            icon="i-lucide-circle-check"
          >
            {{ activeRoomSession.room?.name || activeRoomSession.roomType?.name || 'Room aktif' }}
          </UBadge>
          <UButton
            v-else-if="canEnterRoom"
            color="primary"
            variant="soft"
            icon="i-lucide-log-in"
            :loading="roomSessionPending"
            @click="handleEnterRoom"
          >
            Masuk Room
          </UButton>
          <UButton
            v-else
            color="warning"
            variant="soft"
            icon="i-lucide-log-out"
            @click="handleExitRoom"
          >
            Keluar Room
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="!activeRoomSession"
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Sesi room belum aktif"
          description="Masuk ke ruangan sample reception terlebih dahulu untuk mulai mengambil antrian sample. Antrian diambil dari data sample collection, bukan ruang tunggu umum."
        />

        <UAlert
          v-if="!assignmentPending && !assignment && !isSuperAdmin"
          color="warning"
          title="Belum ada assignment aktif"
          description="Anda harus di-assign ke ruangan sample reception untuk mengakses menu ini."
        />

        <RoomsSampleReceptionPanel
          v-if="activeRoomSession"
          :active-room-session="activeRoomSession"
          :is-super-admin="isSuperAdmin"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
