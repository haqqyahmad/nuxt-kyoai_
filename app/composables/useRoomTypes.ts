import type { RoomTypeForm, RoomTypeOption, RoomTypeRecord } from '~/types/room'

export async function useRoomTypes() {
  const api = useApi()

  const {
    data: roomTypesData,
    pending,
    refresh
  } = await useAsyncData<RoomTypeRecord[]>(
    'room-types',
    async () => {
      try {
        const res = await api.get('/medical/rooms/room-types', {
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

  const roomTypes = computed(() => roomTypesData.value ?? [])

  const roomTypeOptions = computed<RoomTypeOption[]>(() =>
    roomTypes.value.map(item => ({
      label: `${item.code} - ${item.name}`,
      value: item.id,
      serviceType: item.serviceType
    }))
  )

  async function createRoomType(payload: RoomTypeForm) {
    const res = await api.post('/medical/rooms/room-types', payload)
    await refresh()
    return res
  }

  async function updateRoomType(id: string, payload: RoomTypeForm) {
    const res = await api.put(`/medical/rooms/room-types/${id}`, payload)
    await refresh()
    return res
  }

  async function deleteRoomType(id: string) {
    const res = await api.delete(`/medical/rooms/room-types/${id}`)
    await refresh()
    return res
  }

  async function createStage(roomTypeId: string, payload: {
    code: string
    name: string
    stageOrder: number
    slotLimit?: number
    isActive?: boolean
  }) {
    const res = await api.post(`/medical/rooms/room-types/${roomTypeId}/stages`, payload)
    await refresh()
    return res
  }

  async function updateStage(roomTypeId: string, stageId: string, payload: {
    code?: string
    name?: string
    stageOrder?: number
    slotLimit?: number
    isActive?: boolean
  }) {
    const res = await api.put(`/medical/rooms/room-types/${roomTypeId}/stages/${stageId}`, payload)
    await refresh()
    return res
  }

  async function deleteStage(roomTypeId: string, stageId: string) {
    const res = await api.delete(`/medical/rooms/room-types/${roomTypeId}/stages/${stageId}`)
    await refresh()
    return res
  }

  return {
    roomTypes,
    roomTypeOptions,
    pending,
    refresh,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    createStage,
    updateStage,
    deleteStage
  }
}
