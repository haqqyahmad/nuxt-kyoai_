<!-- app/components/rooms/RoomAudioMappingModal.vue -->
<script setup lang="ts">
import type { Room } from '~/types/room'

const open = defineModel<boolean>('open', {
  default: false
})

const api = useApi()
const toast = useToast()

const rooms = ref<Room[]>([])
const files = ref<string[]>([])
const loading = ref(false)
const syncing = ref(false)
const savingIds = ref<Set<string>>(new Set())

const fileOptions = computed(() => {
  const opts = files.value.map(f => ({ label: f, value: f }))
  const missing = rooms.value
    .map(r => r.voiceCode)
    .filter((v): v is string => !!v && !files.value.includes(v))
  const seen = new Set<string>()
  return [
    ...missing
      .filter((v) => {
        if (seen.has(v)) return false
        seen.add(v)
        return true
      })
      .map(v => ({ label: `${v} (no file)`, value: v })),
    ...opts
  ]
})

function fileExists(voiceCode?: string | null) {
  return !!voiceCode && files.value.includes(voiceCode)
}

async function loadRooms() {
  try {
    const res = await api.get('/medical/rooms/rooms', { params: { page: 1, limit: 1000 } })
    const payload = res.data?.data ?? res.data
    rooms.value = Array.isArray(payload) ? payload : payload?.data ?? []
  } catch {
    rooms.value = []
  }
}

async function loadFiles() {
  try {
    const res = await api.get('/medical/rooms/audio-files')
    files.value = (res.data?.data?.files ?? []) as string[]
  } catch {
    files.value = []
  }
}

async function loadAll() {
  if (!open.value) return
  loading.value = true
  try {
    await Promise.all([loadRooms(), loadFiles()])
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (value) loadAll()
})

async function syncFiles() {
  if (syncing.value) return
  syncing.value = true
  try {
    const res = await api.post('/medical/rooms/audio-codes/sync')
    const created = res.data?.data?.created ?? 0
    await loadFiles()
    toast.add({
      title: 'Synced',
      description: `${created} new audio code(s) added from files.`,
      color: 'success'
    })
  } catch (err: unknown) {
    toast.add({
      title: 'Sync failed',
      description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to sync audio files',
      color: 'error'
    })
  } finally {
    syncing.value = false
  }
}

async function assignAudio(room: Room, value: string | null) {
  const previous = room.voiceCode ?? null
  if (value === previous || savingIds.value.has(room.id)) return

  savingIds.value = new Set(savingIds.value).add(room.id)
  try {
    await api.patch(`/medical/rooms/rooms/${room.id}/audio`, { voiceCode: value || null })
    room.voiceCode = value || null
    toast.add({
      title: 'Saved',
      description: `${room.name} → ${value || '(none)'}`,
      color: 'success'
    })
  } catch (err: unknown) {
    room.voiceCode = previous
    toast.add({
      title: 'Failed',
      description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update room audio',
      color: 'error'
    })
  } finally {
    const next = new Set(savingIds.value)
    next.delete(room.id)
    savingIds.value = next
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Room Audio Mapping"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Choose the audio file (recording) for each room. Saved automatically. The file name equals the room's voice code.
          </p>
          <UButton
            label="Sync audio files"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="syncing"
            @click="syncFiles"
          />
        </div>

        <div v-if="loading" class="py-10 text-center text-sm text-muted">
          Loading…
        </div>

        <div v-else-if="!rooms.length" class="py-10 text-center text-sm text-muted">
          No rooms found.
        </div>

        <div v-else class="overflow-hidden rounded-lg border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/60 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th class="px-3 py-2">
                  Code
                </th>
                <th class="px-3 py-2">
                  Name
                </th>
                <th class="px-3 py-2">
                  Room Type
                </th>
                <th class="px-3 py-2">
                  Audio
                </th>
                <th class="px-3 py-2 text-center">
                  File
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="room in rooms"
                :key="room.id"
                class="border-t border-default"
              >
                <td class="px-3 py-2 font-mono text-xs text-muted">
                  {{ room.code }}
                </td>
                <td class="px-3 py-2 font-medium">
                  {{ room.name }}
                </td>
                <td class="px-3 py-2 text-muted">
                  {{ room.roomType?.name ?? '-' }}
                </td>
                <td class="px-3 py-2 min-w-64">
                  <USelectMenu
                    :model-value="room.voiceCode ?? undefined"
                    :items="fileOptions"
                    value-key="value"
                    search-input
                    :loading="savingIds.has(room.id)"
                    placeholder="Select audio…"
                    class="w-full"
                    @update:model-value="(val) => assignAudio(room, (val as string) ?? null)"
                  />
                </td>
                <td class="px-3 py-2 text-center">
                  <UIcon
                    :name="fileExists(room.voiceCode) ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
                    :class="fileExists(room.voiceCode) ? 'text-success' : 'text-muted'"
                    class="size-4"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </UModal>
</template>
