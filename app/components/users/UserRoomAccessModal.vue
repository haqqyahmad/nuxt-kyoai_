<script setup lang="ts">
type RoomType = {
  id: string
  code: string
  name: string
}

type Room = {
  id: string
  code: string
  name: string
  isActive?: boolean
  roomType?: RoomType | null
}

type User = {
  id: number
  name: string
  email: string
}

type UserRoomAccess = {
  roomId: string
  room?: Room | null
}

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const api = useApi()
const toast = useToast()

const open = defineModel<boolean>('open')

const { rooms, pending: roomsPending } = useRooms()

const loading = ref(false)
const loadingData = ref(false)
const search = ref('')
const selectedRoomIds = ref<string[]>([])

async function fetchUserRoomAccess() {
  if (!props.user) return

  loadingData.value = true
  try {
    const res = await api.get(`/users/${props.user.id}/room-access`)
    const data = res.data.data ?? res.data ?? []

    if (Array.isArray(data)) {
      selectedRoomIds.value = data
        .map((item: UserRoomAccess) => item.roomId)
        .filter(Boolean)
    } else {
      selectedRoomIds.value = []
    }
  } catch {
    selectedRoomIds.value = []
    toast.add({
      title: 'Gagal memuat room access',
      color: 'error'
    })
  } finally {
    loadingData.value = false
  }
}

watch(open, async (value) => {
  if (value && props.user) {
    search.value = ''
    selectedRoomIds.value = []

    await fetchUserRoomAccess()
  }
})

watch(
  () => props.user,
  () => {
    selectedRoomIds.value = []
    search.value = ''
  }
)

const filteredRooms = computed(() => {
  const q = search.value.toLowerCase().trim()

  return rooms.value.filter((room) => {
    const roomText = `${room.code} ${room.name} ${room.roomType?.code || ''} ${room.roomType?.name || ''}`.toLowerCase()
    return !q || roomText.includes(q)
  })
})

const activeRooms = computed(() => filteredRooms.value.filter(room => room.isActive !== false))

function toggleRoom(roomId: string) {
  if (selectedRoomIds.value.includes(roomId)) {
    selectedRoomIds.value = selectedRoomIds.value.filter(id => id !== roomId)
  } else {
    selectedRoomIds.value = [...selectedRoomIds.value, roomId]
  }
}

function selectAllVisible() {
  selectedRoomIds.value = [
    ...new Set([
      ...selectedRoomIds.value,
      ...activeRooms.value.map(room => room.id)
    ])
  ]
}

function clearAll() {
  selectedRoomIds.value = []
}

async function saveRoomAccess() {
  if (!props.user || loading.value) return

  loading.value = true
  try {
    await api.put(`/users/${props.user.id}/room-access`, {
      roomIds: selectedRoomIds.value
    })

    toast.add({
      title: 'Room access berhasil disimpan',
      color: 'success'
    })

    open.value = false
    clearNuxtData('current-user')
    emit('updated')
  } catch (error: unknown) {
    const response = error as { response?: { data?: { message?: string } } }
    toast.add({
      title: 'Gagal simpan room access',
      description: response.response?.data?.message ?? 'Terjadi kesalahan',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Room Access — ${user?.name ?? '-'}`"
    description="Pilih room yang boleh diakses user ini."
  >
    <template #body>
      <div
        v-if="loadingData"
        class="flex justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin text-2xl text-muted"
        />
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari room atau room type..."
          />

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-check-check"
            @click="selectAllVisible"
          >
            Select visible
          </UButton>

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-trash-2"
            @click="clearAll"
          >
            Clear
          </UButton>
        </div>

          <div class="flex items-center justify-between gap-2 rounded-xl border border-default p-3 text-sm">
          <span class="text-muted">
            Selected room
          </span>
          <UBadge
            :label="`${selectedRoomIds.length} room`"
            color="neutral"
            variant="subtle"
          />
        </div>

        <div
          v-if="roomsPending || !filteredRooms.length"
          class="rounded-xl border border-dashed border-default p-6 text-center text-sm text-muted"
        >
          {{ roomsPending ? 'Memuat room...' : 'Tidak ada room yang cocok.' }}
        </div>

        <div
          v-else
          class="max-h-[420px] space-y-2 overflow-auto pr-1"
        >
          <button
            v-for="room in activeRooms"
            :key="room.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-default p-3 text-left transition hover:border-primary/50"
            :class="selectedRoomIds.includes(room.id) ? 'bg-primary/5 border-primary' : 'bg-transparent'"
            @click="toggleRoom(room.id)"
          >
            <UCheckbox :model-value="selectedRoomIds.includes(room.id)" />

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ room.code }} - {{ room.name }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ room.roomType?.code || '-' }} - {{ room.roomType?.name || '-' }}
              </p>
            </div>

            <UBadge
              :label="room.isActive === false ? 'Inactive' : 'Active'"
              :color="room.isActive === false ? 'neutral' : 'success'"
              variant="subtle"
            />
          </button>

          <div class="pt-2">
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Inactive room
            </p>
            <button
              v-for="room in filteredRooms.filter(room => room.isActive === false)"
              :key="room.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-dashed border-default p-3 text-left opacity-60 transition hover:opacity-100"
              :class="selectedRoomIds.includes(room.id) ? 'bg-muted/30' : 'bg-transparent'"
              @click="toggleRoom(room.id)"
            >
              <UCheckbox :model-value="selectedRoomIds.includes(room.id)" />

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ room.code }} - {{ room.name }}
                </p>
                <p class="truncate text-xs text-muted">
                  {{ room.roomType?.code || '-' }} - {{ room.roomType?.name || '-' }}
                </p>
              </div>

              <UBadge
                label="Inactive"
                color="neutral"
                variant="subtle"
              />
            </button>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-default pt-4">
          <UButton
            label="Batal"
            color="neutral"
            variant="soft"
            @click="open = false"
          />
          <UButton
            label="Simpan Access"
            :loading="loading"
            @click="saveRoomAccess"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
