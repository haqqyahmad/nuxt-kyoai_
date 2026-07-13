import type {
  RoomSession,
  RoomSessionEnterPayload,
  RoomSessionExitPayload
} from '~/types/room'

export async function useRoomSession() {
  const api = useApi()

  const {
    data: sessionData,
    pending,
    refresh
  } = await useAsyncData<RoomSession | null>(
    'room-session-me',
    async () => {
      try {
        const res = await api.get('/medical/rooms/sessions/me')
        return (res.data?.data ?? res.data ?? null) as RoomSession | null
      } catch {
        return null
      }
    },
    {
      default: () => null
    }
  )

  const session = computed(() => sessionData.value ?? null)

  async function enterRoomSession(payload: RoomSessionEnterPayload) {
    const res = await api.post('/medical/rooms/sessions/enter', payload)
    await refresh()
    return res
  }

  async function exitRoomSession(payload: RoomSessionExitPayload = {}) {
    const res = await api.post('/medical/rooms/sessions/exit', payload)
    await refresh()
    return res
  }

  return {
    session,
    pending,
    refresh,
    enterRoomSession,
    exitRoomSession
  }
}
