<!-- app/pages/rooms/index.vue -->
<script setup lang="ts">
import type { Room, RoomForm } from '~/types/room'

const toast = useToast()

const {
  filteredRooms,
  pending,
  search,
  typeFilter,
  stateFilter,
  stats,
  refresh,
  getRoomState,
  createRoom,
  updateRoom,
  deleteRoom
} = useRooms()

const isFormOpen = ref(false)
const isDeleteOpen = ref(false)

const saving = ref(false)
const deleting = ref(false)

const selectedRoom = ref<Room | null>(null)
const selectedDeleteId = ref<string | null>(null)

const polling = ref(false)

let interval: ReturnType<typeof setInterval> | null = null

function openAddModal() {
  selectedRoom.value = null
  isFormOpen.value = true
}

function openEditModal(room: Room) {
  selectedRoom.value = room
  isFormOpen.value = true
}

function openDeleteModal(id: string) {
  selectedDeleteId.value = id
  isDeleteOpen.value = true
}

function closeDeleteModal() {
  if (deleting.value) return

  selectedDeleteId.value = null
  isDeleteOpen.value = false
}

async function handleSubmit(payload: RoomForm) {
  if (saving.value) return

  saving.value = true

  try {
    if (selectedRoom.value?.id) {
      await updateRoom(selectedRoom.value.id, payload)

      toast.add({
        title: 'Berhasil',
        description: 'Ruangan berhasil diperbarui',
        color: 'success'
      })
    } else {
      await createRoom(payload)

      toast.add({
        title: 'Berhasil',
        description: 'Ruangan berhasil ditambahkan',
        color: 'success'
      })
    }

    isFormOpen.value = false
    selectedRoom.value = null
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description:
        error?.response?.data?.message
        || 'Terjadi kesalahan saat menyimpan ruangan',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!selectedDeleteId.value || deleting.value) return

  deleting.value = true

  try {
    await deleteRoom(selectedDeleteId.value)

    toast.add({
      title: 'Berhasil',
      description: 'Ruangan berhasil dihapus',
      color: 'success'
    })

    selectedDeleteId.value = null
    isDeleteOpen.value = false
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description:
        error?.response?.data?.message
        || 'Terjadi kesalahan saat menghapus ruangan',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

watch(isDeleteOpen, (value) => {
  if (!value && !deleting.value) {
    selectedDeleteId.value = null
  }
})

watch(polling, (enabled) => {
  if (interval) {
    clearInterval(interval)
    interval = null
  }

  if (enabled) {
    interval = setInterval(() => {
      if (document.hidden) return
      refresh()
    }, 5000)
  }
})

onBeforeUnmount(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <UDashboardPanel id="rooms">
    <template #header>
      <UDashboardNavbar
        title="Rooms"
        subtitle="Manage Rooms"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/rooms/assignments"
            label="Room Assignment"
            icon="i-lucide-users-round"
            color="neutral"
            variant="soft"
          />

          <UButton
            to="/rooms/queue"
            label="Room Queue"
            icon="i-lucide-clipboard-list"
            color="neutral"
            variant="soft"
          />

          <UButton
            to="/rooms/types"
            label="Room Types"
            icon="i-lucide-folder-cog"
            color="neutral"
            variant="soft"
          />

          <USwitch
            v-model="polling"
            label="Realtime"
          />

          <UButton
            label="Tambah Ruangan"
            icon="i-lucide-plus"
            @click="openAddModal"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <RoomsRoomStats
          :total="stats.total"
          :active="stats.active"
          :inactive="stats.inactive"
        />

        <RoomsRoomToolbar
          v-model:search="search"
          v-model:type="typeFilter"
          v-model:state="stateFilter"
        />

        <div
          v-if="pending"
          class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]"
        >
          <USkeleton
            v-for="item in 8"
            :key="item"
            class="h-72 rounded-xl"
          />
        </div>

        <div
          v-else-if="!filteredRooms.length"
          class="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center"
        >
          <UIcon
            name="i-lucide-door-closed"
            class="mb-3 size-10 text-muted"
          />

          <h3 class="text-base font-semibold text-highlighted">
            Tidak ada ruangan ditemukan
          </h3>

          <p class="mt-1 max-w-md text-sm text-muted">
            Coba ubah kata kunci pencarian atau filter status ruangan.
          </p>
        </div>

        <div
          v-else
          class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]"
        >
          <RoomsRoomCard
            v-for="room in filteredRooms"
            :key="room.id"
            :room="room"
            :state="getRoomState(room)"
            @edit="openEditModal"
            @delete="openDeleteModal"
          />
        </div>
      </div>

      <RoomsRoomFormModal
        v-model:open="isFormOpen"
        :room="selectedRoom"
        :loading="saving"
        @submit="handleSubmit"
      />

      <BaseDeleteModal
        v-model:open="isDeleteOpen"
        :loading="deleting"
        :count="1"
        entity="ruangan"
        title="Hapus ruangan?"
        description="Data ruangan yang dihapus tidak dapat dikembalikan."
        @close="closeDeleteModal"
        @confirm="handleDelete"
      />
    </template>
  </UDashboardPanel>
</template>
