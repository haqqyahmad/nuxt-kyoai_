import type { Room, RoomForm, RoomState } from '~/types/room'

export function useRooms() {
  const api = useApi()

  const search = ref('')
  const typeFilter = ref<string>('ALL')
  const stateFilter = ref<string>('ALL')

  const {
    data: roomsData,
    pending,
    refresh
  } = useAsyncData<Room[]>(
    'rooms',
    async () => {
      try {
        const res = await api.get('/medical/rooms/rooms', {
          params: {
            page: 1,
            limit: 1000
          }
        })

        const payload = res.data?.data ?? res.data
        return Array.isArray(payload) ? payload : payload?.data ?? []
      } catch {
        return []
      }
    },
    {
      default: () => []
    }
  )

  const rooms = computed(() => roomsData.value ?? [])

  function getRoomState(room: Room): RoomState {
    return room.isActive ? 'ACTIVE' : 'INACTIVE'
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
        = typeFilter.value === 'ALL' || room.roomTypeId === typeFilter.value

      const matchState
        = stateFilter.value === 'ALL' || state === stateFilter.value

      return matchSearch && matchType && matchState
    })
  })

  const stats = computed(() => ({
    total: rooms.value.length,
    active: rooms.value.filter(room => getRoomState(room) === 'ACTIVE').length,
    inactive: rooms.value.filter(room => getRoomState(room) === 'INACTIVE').length
  }))

  async function createRoom(payload: RoomForm) {
    await api.post('/medical/rooms/rooms', payload)
    await refresh()
  }

  async function updateRoom(id: string, payload: RoomForm) {
    await api.put(`/medical/rooms/rooms/${id}`, payload)
    await refresh()
  }

  async function deleteRoom(id: string) {
    await api.delete(`/medical/rooms/rooms/${id}`)
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
