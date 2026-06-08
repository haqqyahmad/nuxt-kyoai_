// app/composables/useRooms.ts
import { mockRooms } from '~/constants/rooms.mock'
import type { Room, RoomForm, RoomState } from '~/types/room'

export function useRooms() {
  const api = useApi()

  const search = ref('')
  const typeFilter = ref<string>('ALL')
  const stateFilter = ref<string>('ALL')

  const useMock = true

  const {
    data: roomsData,
    pending,
    refresh
  } = useAsyncData<Room[]>(
    'rooms',
    async () => {
      if (useMock) return mockRooms

      try {
        const res = await api.get('/medical/rooms')
        return res.data.data
      } catch {
        return mockRooms
      }
    },
    {
      default: () => []
    }
  )

  const rooms = computed(() => roomsData.value ?? [])

  function getRoomState(room: Room): RoomState {
    if (room.status === 'INACTIVE') return 'INACTIVE'

    const hasActivePatient = room.patients.some(patient =>
      ['WAITING', 'IN_PROGRESS'].includes(patient.status)
    )

    return hasActivePatient ? 'OCCUPIED' : 'AVAILABLE'
  }

  const filteredRooms = computed(() => {
    return rooms.value.filter((room) => {
      const q = search.value.toLowerCase()
      const state = getRoomState(room)

      const matchSearch
        = !q
          || room.name.toLowerCase().includes(q)
          || room.code.toLowerCase().includes(q)

      const matchType
        = typeFilter.value === 'ALL' || room.type === typeFilter.value

      const matchState
        = stateFilter.value === 'ALL' || state === stateFilter.value

      return matchSearch && matchType && matchState
    })
  })

  const stats = computed(() => ({
    total: rooms.value.length,
    available: rooms.value.filter(room => getRoomState(room) === 'AVAILABLE').length,
    occupied: rooms.value.filter(room => getRoomState(room) === 'OCCUPIED').length,
    inactive: rooms.value.filter(room => getRoomState(room) === 'INACTIVE').length
  }))

  async function createRoom(payload: RoomForm) {
    if (useMock) return
    await api.post('/medical/rooms', payload)
    await refresh()
  }

  async function updateRoom(id: string, payload: RoomForm) {
    if (useMock) return
    await api.put(`/medical/rooms/${id}`, payload)
    await refresh()
  }

  async function deleteRoom(id: string) {
    if (useMock) return
    await api.delete(`/medical/rooms/${id}`)
    await refresh()
  }

  return {
    rooms,
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
  }
}
