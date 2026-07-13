import type {
  RoomSession,
  RoomSessionEnterPayload,
  RoomSessionExitPayload
} from '~/types/room'

type RoomSessionRefreshOptions = {
  throwOnError?: boolean
}

export async function useRoomSession() {
  const api = useApi()

  const session = ref<RoomSession | null>(null)
  const pending = ref(false)
  let refreshRequestId = 0

  async function refresh(options: RoomSessionRefreshOptions = {}) {
    const requestId = ++refreshRequestId
    pending.value = true

    try {
      const res = await api.get('/medical/rooms/sessions/me', {
        params: {
          _: Date.now()
        }
      })
      const payload = res.data
      const nextSession = (payload && Object.prototype.hasOwnProperty.call(payload, 'data')
        ? payload.data
        : payload) as RoomSession | null

      if (requestId === refreshRequestId) {
        session.value = nextSession
      }

      return nextSession
    } catch (error) {
      if (requestId === refreshRequestId) {
        session.value = null
      }
      if (options.throwOnError) throw error
      return null
    } finally {
      if (requestId === refreshRequestId) {
        pending.value = false
      }
    }
  }

  await refresh()

  async function enterRoomSession(payload: RoomSessionEnterPayload) {
    const res = await api.post('/medical/rooms/sessions/enter', payload)
    await refresh()
    return res
  }

  async function exitRoomSession(payload: RoomSessionExitPayload = {}) {
    refreshRequestId += 1
    session.value = null
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
