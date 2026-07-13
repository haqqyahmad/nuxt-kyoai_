import type {
  RoomAssignmentBatchForm,
  RoomAssignmentFilters,
  RoomAssignmentForm,
  RoomAssignmentSelfForm,
  RoomAssignmentRecord
} from '~/types/room-assignment'

export async function useRoomAssignments() {
  const api = useApi()

  const filters = reactive<RoomAssignmentFilters>({
    assignedDate: new Date().toISOString().slice(0, 10),
    roomTypeId: 'ALL',
    roomId: 'ALL',
    userId: 'ALL',
    isActive: 'ALL'
  })

  const queryParams = computed(() => ({
    assignedDate: filters.assignedDate || undefined,
    roomTypeId: filters.roomTypeId !== 'ALL' ? filters.roomTypeId : undefined,
    roomId: filters.roomId !== 'ALL' ? filters.roomId : undefined,
    userId: filters.userId !== 'ALL' ? filters.userId : undefined,
    isActive: filters.isActive === 'ALL' ? undefined : filters.isActive === 'true'
  }))

  const {
    data: assignmentsData,
    pending,
    refresh
  } = await useAsyncData<RoomAssignmentRecord[]>(
    'room-assignments-list',
    async () => {
      try {
        const res = await api.get('/room-assignments', {
          params: queryParams.value
        })

        const payload = res.data?.data ?? res.data
        return Array.isArray(payload) ? payload : payload?.data ?? []
      } catch {
        return []
      }
    },
    {
      default: () => [],
      watch: [
        () => filters.assignedDate,
        () => filters.roomTypeId,
        () => filters.roomId,
        () => filters.userId,
        () => filters.isActive
      ]
    }
  )

  const assignments = computed(() => assignmentsData.value ?? [])

  const stats = computed(() => ({
    total: assignments.value.length,
    active: assignments.value.filter(item => item.isActive).length,
    inactive: assignments.value.filter(item => !item.isActive).length,
    uniqueUsers: new Set(assignments.value.map(item => item.userId)).size
  }))

  async function createAssignment(payload: RoomAssignmentForm) {
    const res = await api.post('/room-assignments', payload)
    await refresh()
    return res
  }

  async function batchAssign(payload: RoomAssignmentBatchForm) {
    const res = await api.post('/room-assignments/batch', payload)
    await refresh()
    return res
  }

  async function selfAssign(payload: RoomAssignmentSelfForm) {
    const res = await api.post('/room-assignments/self', payload)
    await refresh()
    clearNuxtData('room-session-me')
    return res
  }

  async function transferAssignment(
    id: string,
    payload: { roomId: string, notes?: string | null }
  ) {
    const res = await api.patch(`/room-assignments/${id}/transfer`, payload)
    await refresh()
    return res
  }

  async function toggleAssignmentActive(id: string, isActive: boolean) {
    const res = await api.patch(`/room-assignments/${id}/active`, { isActive })
    await refresh()
    return res
  }

  async function deleteAssignment(id: string) {
    const res = await api.delete(`/room-assignments/${id}`)
    await refresh()
    return res
  }

  return {
    filters,
    assignments,
    pending,
    stats,
    refresh,
    createAssignment,
    batchAssign,
    selfAssign,
    transferAssignment,
    toggleAssignmentActive,
    deleteAssignment
  }
}
