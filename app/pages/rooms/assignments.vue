<script setup lang="ts">
import type { RoomAssignmentBatchRow, RoomAssignmentRecord } from '~/types/room-assignment'

const toast = useToast()
const api = useApi()

const { session: mySession, enterRoomSession, exitRoomSession } = await useRoomSession()

const {
  user: currentUser,
  isPic,
  canSelfAssign,
  allowedSelfRoomIds,
  allowedSelfRooms,
  isSuperAdmin,
  refresh: refreshUser
} = await useCurrentUser()

async function syncRoomAccess() {
  try {
    if (currentUser.value?.id) {
      await api.post(`/room-assignments/sync-room-access/${currentUser.value.id}`)
    }
  } catch {
    // silent
  }
}

function forceRefresh() {
  clearNuxtData('current-user')
  clearNuxtData('room-session-me')
}

const {
  rooms,
  pending: roomsPending,
  refresh: refreshRooms
} = useRooms()

const {
  roomTypes,
  pending: roomTypesPending
} = await useRoomTypes()

const {
  users,
  pending: usersPending
} = useUsers()

const {
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
} = await useRoomAssignments()

type ActiveRoomSession = {
  roomId: string
  roomCode: string
  roomName: string
  roomTypeId: string
  roomTypeName?: string | null
  staffCapacity: number
  activeCount: number
  staff: Array<{
    sessionId: string
    userId: number
    name: string
    startedAt: string
  }>
}

const {
  data: activeRoomSessions,
  pending: activeSessionsPending,
  refresh: refreshActiveSessions
} = await useAsyncData<ActiveRoomSession[]>(
  'room-sessions-active',
  async () => {
    try {
      const res = await api.get('/medical/rooms/sessions/active')
      const payload = res.data?.data ?? res.data ?? []
      return Array.isArray(payload) ? payload : []
    } catch {
      return []
    }
  },
  { default: () => [], server: false }
)

const isTransferOpen = ref(false)
const isDeleteOpen = ref(false)
const singleSaving = ref(false)
const batchSaving = ref(false)
const transferSaving = ref(false)
const deleteSaving = ref(false)
const toggleLoadingId = ref<string | null>(null)
const selectedTransfer = ref<RoomAssignmentRecord | null>(null)
const selectedDelete = ref<RoomAssignmentRecord | null>(null)

const singleForm = reactive({
  userId: '',
  roomId: '',
  assignedDate: filters.assignedDate,
  notes: ''
})

const selfForm = reactive({
  roomId: '',
  assignedDate: filters.assignedDate,
  notes: ''
})

const batchForm = reactive({
  assignedDate: filters.assignedDate,
  assignments: [
    createBatchRow()
  ] as RoomAssignmentBatchRow[]
})

const transferForm = reactive({
  roomId: '',
  notes: ''
})

const myAssignment = ref<RoomAssignmentRecord | null>(null)
const myAssignmentPending = ref(false)
const selfSaving = ref(false)
const exitRoomSaving = ref(false)

const activeSession = computed(() => mySession.value ?? null)

const activeRoomOptions = computed(() =>
  rooms.value
    .filter(room => room.isActive)
    .map(room => ({
      label: `${room.code} - ${room.name}`,
      value: room.id
    }))
)

const selfRoomOptions = computed(() => {
  const allowedRoomIds = allowedSelfRoomIds.value

  if (isPic.value) {
    return rooms.value
      .filter(room => room.isActive)
      .map(room => ({
        label: `${room.code} - ${room.name}${room.roomType?.name ? ` (${room.roomType.name})` : ''}`,
        value: room.id
      }))
  }

  return rooms.value
    .filter(room => room.isActive && allowedRoomIds.includes(room.id))
    .map(room => ({
      label: `${room.code} - ${room.name}${room.roomType?.name ? ` (${room.roomType.name})` : ''}`,
      value: room.id
    }))
})

const roomFilterOptions = computed(() => [
  {
    label: 'All rooms',
    value: 'ALL'
  },
  ...rooms.value.map(room => ({
    label: `${room.code} - ${room.name}`,
    value: room.id
  }))
])

const roomTypeFilterOptions = computed(() => [
  {
    label: 'All room types',
    value: 'ALL'
  },
  ...roomTypes.value.map(roomType => ({
    label: `${roomType.code} - ${roomType.name}`,
    value: roomType.id
  }))
])

const userFilterOptions = computed(() => [
  {
    label: 'All users',
    value: 'ALL'
  },
  ...users.value.map(user => ({
    label: `${user.label}${user.email ? ` - ${user.email}` : ''}`,
    value: String(user.value)
  }))
])

const userOptions = computed(() =>
  users.value.map(user => ({
    label: `${user.label}${user.email ? ` - ${user.email}` : ''}`,
    value: String(user.value)
  }))
)

const orderedAssignments = computed(() =>
  [...assignments.value].sort((a, b) => {
    if (a.assignedDate !== b.assignedDate) {
      return b.assignedDate.localeCompare(a.assignedDate)
    }

    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return right - left
  })
)

const activeAssignments = computed(() =>
  orderedAssignments.value.filter(assignment => assignment.isActive)
)

const selectedRoomTypeName = computed(() => {
  const room = rooms.value.find(item => item.id === singleForm.roomId)
  return room?.roomType?.name || '-'
})

const selectedSelfRoomTypeName = computed(() => {
  const room = [
    ...rooms.value,
    ...allowedSelfRooms.value
  ].find(item => item.id === selfForm.roomId)
  return room?.roomType?.name || '-'
})

const canManageAssignments = computed(() => isPic.value)
const assignmentModeLabel = computed(() => {
  if (isPic.value) return 'PIC'
  if (canSelfAssign.value) return 'Self Assignment'
  return 'No Access'
})

function createBatchRow(): RoomAssignmentBatchRow {
  return {
    userId: '',
    roomId: '',
    notes: ''
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = error as { response?: { data?: { message?: string } } }
    return response.response?.data?.message || fallback
  }

  return fallback
}

function formatSessionTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

const endingSessionId = ref<string | null>(null)

async function handleEndSession(sessionId: string, staffName: string) {
  if (endingSessionId.value) return
  if (!confirm(`End the room session for ${staffName}? The session will be force-ended and the room freed from this staff member.`)) return

  endingSessionId.value = sessionId
  try {
    await api.post(`/medical/rooms/sessions/${sessionId}/exit`, {})
    toast.add({
      title: 'Success',
      description: `Room session for ${staffName} ended successfully.`,
      color: 'success'
    })
    await refreshActiveSessions()
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to end session',
      description: getErrorMessage(error, 'An error occurred while ending the room session.'),
      color: 'error'
    })
  } finally {
    endingSessionId.value = null
  }
}

function resetSingleForm() {
  singleForm.userId = ''
  singleForm.roomId = ''
  singleForm.assignedDate = filters.assignedDate
  singleForm.notes = ''
}

function resetBatchForm() {
  batchForm.assignedDate = filters.assignedDate
  batchForm.assignments = [createBatchRow()]
}

function openTransferModal(assignment: RoomAssignmentRecord) {
  if (assignment.isActive) {
    toast.add({
      title: 'Transfer not allowed',
      description: 'Deactivate the assignment first before moving it to another room.',
      color: 'error'
    })
    return
  }

  selectedTransfer.value = assignment
  transferForm.roomId = assignment.roomId
  transferForm.notes = assignment.notes || ''
  isTransferOpen.value = true
}

function openDeleteModal(assignment: RoomAssignmentRecord) {
  selectedDelete.value = assignment
  isDeleteOpen.value = true
}

function addBatchRow() {
  batchForm.assignments.push(createBatchRow())
}

function removeBatchRow(index: number) {
  if (batchForm.assignments.length === 1) {
    batchForm.assignments[0] = createBatchRow()
    return
  }

  batchForm.assignments.splice(index, 1)
}

async function submitSingleAssignment() {
  if (singleSaving.value) return
  if (!singleForm.userId || !singleForm.roomId || !singleForm.assignedDate) {
    toast.add({
      title: 'Validation failed',
      description: 'User, room, and date are required.',
      color: 'error'
    })
    return
  }

  singleSaving.value = true
  try {
    const roomId = singleForm.roomId
    const assignedUserId = Number(singleForm.userId)
    // For superadmin assigning themselves: enter the room directly
    // and navigate to /rooms/queue so they can immediately take patients.
    const shouldEnterQueue = isSuperAdmin.value
      && assignedUserId === Number(currentUser.value?.id)

    await createAssignment({
      userId: assignedUserId,
      roomId,
      assignedDate: singleForm.assignedDate,
      notes: singleForm.notes.trim() || null
    })

    toast.add({
      title: 'Success',
      description: 'Assignment created successfully',
      color: 'success'
    })

    resetSingleForm()

    if (shouldEnterQueue) {
      try {
        await enterRoomSession({ roomId })
      } catch (error: unknown) {
        toast.add({
          title: 'Room session not active',
          description: getErrorMessage(error, 'Assignment created, but failed to auto-enter the room. Please enter manually from the queue page.'),
          color: 'warning'
        })
      }
      await navigateTo('/rooms/queue')
    }
  } catch (error: unknown) {
    toast.add({
      title: 'Failed',
      description: getErrorMessage(error, 'Failed to create assignment'),
      color: 'error'
    })
  } finally {
    singleSaving.value = false
  }
}

async function submitBatchAssignment() {
  if (batchSaving.value) return

  const assignmentsPayload = batchForm.assignments
    .filter(row => row.userId && row.roomId)
    .map(row => ({
      userId: Number(row.userId),
      roomId: String(row.roomId),
      notes: row.notes.trim() || ''
    }))

  if (!batchForm.assignedDate || !assignmentsPayload.length) {
    toast.add({
      title: 'Validation failed',
      description: 'Date and at least 1 assignment are required.',
      color: 'error'
    })
    return
  }

  batchSaving.value = true
  try {
    const result = await batchAssign({
      assignedDate: batchForm.assignedDate,
      assignments: assignmentsPayload
    })

    const summary = result?.data?.summary

    toast.add({
      title: 'Success',
      description: summary
        ? `${summary.assigned} assignment(s) created, ${summary.failed} failed`
        : 'Batch assignment processed successfully',
      color: 'success'
    })

    resetBatchForm()
  } catch (error: unknown) {
    toast.add({
      title: 'Failed',
      description: getErrorMessage(error, 'Failed to submit batch assignment'),
      color: 'error'
    })
  } finally {
    batchSaving.value = false
  }
}

async function refreshMyAssignment() {
  myAssignmentPending.value = true
  try {
    const api = useApi()
    const res = await api.get('/room-assignments/me', {
      params: { assignedDate: filters.assignedDate }
    })

    myAssignment.value = res.data?.data ?? res.data ?? null
  } catch {
    myAssignment.value = null
  } finally {
    myAssignmentPending.value = false
  }
}

async function handleExitRoom() {
  exitRoomSaving.value = true
  try {
    await exitRoomSession({})
    toast.add({ title: 'Success', description: 'Room session ended successfully', color: 'success' })
    await refreshMyAssignment()
  } catch (error: unknown) {
    toast.add({
      title: 'Failed',
      description: getErrorMessage(error, 'Failed to exit the room'),
      color: 'error'
    })
  } finally {
    exitRoomSaving.value = false
  }
}

async function submitSelfAssignment() {
  if (selfSaving.value) return
  if (!selfForm.roomId || !selfForm.assignedDate) {
    toast.add({
      title: 'Validation failed',
      description: 'Room and date are required.',
      color: 'error'
    })
    return
  }

  selfSaving.value = true
  try {
    await selfAssign({
      roomId: selfForm.roomId,
      assignedDate: selfForm.assignedDate,
      notes: selfForm.notes.trim() || null
    })

    toast.add({
      title: 'Success',
      description: 'Self assignment created successfully',
      color: 'success'
    })

    await refreshMyAssignment()

    // [SELF-ASSIGN] automatically activate the room session for the selected room,
    // then navigate to /rooms/queue so they can immediately take patients.
    try {
      await enterRoomSession({ roomId: selfForm.roomId })
    } catch (error: unknown) {
      toast.add({
        title: 'Room session not active',
        description: getErrorMessage(error, 'Assignment created, but failed to auto-enter the room. Please enter manually from the queue page.'),
        color: 'warning'
      })
    }

    await navigateTo('/rooms/queue')
  } catch (error: unknown) {
    toast.add({
      title: 'Failed',
      description: getErrorMessage(error, 'Failed to create self assignment'),
      color: 'error'
    })
  } finally {
    selfSaving.value = false
  }
}

async function submitTransfer() {
  if (transferSaving.value || !selectedTransfer.value?.id || !transferForm.roomId) return

  transferSaving.value = true
  try {
    await transferAssignment(selectedTransfer.value.id, {
      roomId: transferForm.roomId,
      notes: transferForm.notes.trim() || null
    })

    toast.add({
      title: 'Success',
      description: 'Assignment moved successfully',
      color: 'success'
    })

    isTransferOpen.value = false
    selectedTransfer.value = null
  } catch (error: unknown) {
    toast.add({
      title: 'Failed',
      description: getErrorMessage(error, 'Failed to move assignment'),
      color: 'error'
    })
  } finally {
    transferSaving.value = false
  }
}

async function handleToggleActive(assignment: RoomAssignmentRecord) {
  if (toggleLoadingId.value) return

  toggleLoadingId.value = assignment.id
  try {
    await toggleAssignmentActive(assignment.id, !assignment.isActive)
    toast.add({
      title: 'Success',
      description: assignment.isActive
        ? 'Assignment deactivated'
        : 'Assignment activated',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed',
      description: getErrorMessage(error, 'Failed to update assignment status'),
      color: 'error'
    })
  } finally {
    toggleLoadingId.value = null
  }
}

async function handleDeleteAssignment() {
  if (!selectedDelete.value?.id) return

  deleteSaving.value = true
  try {
    await deleteAssignment(selectedDelete.value.id)
    toast.add({
      title: 'Success',
      description: 'Assignment deleted successfully',
      color: 'success'
    })
    selectedDelete.value = null
    isDeleteOpen.value = false
  } catch (error: unknown) {
    toast.add({
      title: 'Failed',
      description: getErrorMessage(error, 'Failed to delete assignment'),
      color: 'error'
    })
  } finally {
    deleteSaving.value = false
  }
}

watch(
  () => filters.assignedDate,
  (value) => {
    if (!singleForm.assignedDate) singleForm.assignedDate = value
    if (!batchForm.assignedDate) batchForm.assignedDate = value
    if (!selfForm.assignedDate) selfForm.assignedDate = value
  }
)

onMounted(async () => {
  await syncRoomAccess()
  forceRefresh()
  await refreshUser()
  await refreshMyAssignment()
  await refreshActiveSessions()
})
</script>

<template>
  <UDashboardPanel id="room-assignments">
    <template #header>
      <UDashboardNavbar
        title="Room Assignment"
        subtitle="Manage staff, rooms, and daily assignments"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="isSuperAdmin"
            to="/rooms"
            label="Rooms"
            icon="i-lucide-door-open"
            color="neutral"
            variant="soft"
          />

          <UButton
            v-if="isSuperAdmin"
            to="/rooms/types"
            label="Room Types"
            icon="i-lucide-folder-cog"
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
            v-if="activeSession"
            :loading="exitRoomSaving"
            label="Exit Room"
            icon="i-lucide-log-out"
            color="error"
            variant="soft"
            @click="handleExitRoom"
          >
            <template #trailing>
              <span v-if="activeSession?.room" class="text-xs text-muted">
                {{ activeSession.room.code }}
              </span>
            </template>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <RoomAssignmentStats
          :total="stats.total"
          :active="stats.active"
          :inactive="stats.inactive"
          :unique-users="stats.uniqueUsers"
        />

        <UAlert
          v-if="activeSession"
          color="warning"
          variant="soft"
          icon="i-lucide-door-open"
          :title="`Active room session: ${activeSession.room?.code || ''} - ${activeSession.room?.name || ''}`"
          description="You are still in this room. Exit first before creating/changing today's assignments."
        >
          <template #actions>
            <UButton
              :loading="exitRoomSaving"
              label="Exit Room Now"
              icon="i-lucide-log-out"
              color="error"
              size="sm"
              @click="handleExitRoom"
            />
          </template>
        </UAlert>

        <UAlert
          color="neutral"
          variant="soft"
          :title="`Mode akses: ${assignmentModeLabel}`"
          :description="
            isPic
              ? 'This account can manage single assignments, batch assignments, transfers, and room access.'
              : canSelfAssign
                ? 'This account can only self-assign to allowed rooms.'
                : 'This account does not have room assignment access yet.'
          "
        />

        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Currently Occupied Rooms
                </h2>
                <p class="text-sm text-muted">
                  List of rooms with active staff inside
                </p>
              </div>
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="soft"
                size="sm"
                :loading="activeSessionsPending"
                @click="() => refreshActiveSessions()"
              >
                Refresh
              </UButton>
            </div>
          </template>

          <div
            v-if="activeSessionsPending"
            class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <USkeleton v-for="index in 3" :key="index" class="h-28 rounded-xl" />
          </div>

          <div
            v-else-if="activeRoomSessions.length === 0"
            class="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center"
          >
            <UIcon name="i-lucide-door-open" class="mb-2 size-8 text-muted" />
            <p class="text-sm font-medium text-highlighted">
              No occupied rooms
            </p>
            <p class="mt-1 text-xs text-muted">
              No staff have entered a room yet.
            </p>
          </div>

          <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="room in activeRoomSessions"
              :key="room.roomId"
              class="rounded-xl border p-4"
              :class="room.activeCount >= room.staffCapacity
                ? 'border-error/40 bg-error/5'
                : 'border-default bg-muted/20'"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-highlighted">
                    {{ room.roomCode ? `${room.roomCode} - ` : '' }}{{ room.roomName }}
                  </p>
                  <p class="mt-0.5 text-xs text-muted">
                    {{ room.roomTypeName || '-' }}
                  </p>
                </div>
                <UBadge
                  :label="`${room.activeCount}/${room.staffCapacity}`"
                  :color="room.activeCount >= room.staffCapacity ? 'error' : 'success'"
                  variant="subtle"
                />
              </div>

              <div class="mt-3 space-y-1.5">
                <div
                  v-for="staff in room.staff"
                  :key="staff.sessionId"
                  class="flex items-center gap-2 rounded-lg border border-default bg-background px-2.5 py-1.5"
                >
                  <UIcon name="i-lucide-user-round" class="size-3.5 shrink-0 text-primary" />
                  <span class="min-w-0 flex-1 truncate text-xs font-medium text-highlighted">
                    {{ staff.name }}
                  </span>
                  <span class="shrink-0 text-[10px] text-muted">
                    {{ formatSessionTime(staff.startedAt) }}
                  </span>
                  <UButton
                    icon="i-lucide-log-out"
                    size="xs"
                    color="error"
                    variant="ghost"
                    :loading="endingSessionId === staff.sessionId"
                    title="Force end session"
                    @click="handleEndSession(staff.sessionId, staff.name)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <div
          v-if="canManageAssignments"
          class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <UCard>
            <template #header>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Single Assignment
                </h2>
                <p class="text-sm text-muted">
                  Assign one user to one room for a specific date
                </p>
              </div>
            </template>

            <form
              class="grid gap-4 md:grid-cols-2"
              @submit.prevent="submitSingleAssignment"
            >
              <UFormField
                label="Date"
                required
              >
                <UInput
                  v-model="singleForm.assignedDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="User"
                required
              >
                <USelect
                  v-model="singleForm.userId"
                  :items="userOptions"
                  placeholder="Select user"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Room"
                required
              >
                <USelect
                  v-model="singleForm.roomId"
                  :items="activeRoomOptions"
                  placeholder="Select an active room"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Preview Room Type">
                <UInput
                  :model-value="selectedRoomTypeName"
                  disabled
                  class="w-full"
                />
              </UFormField>

              <UFormField class="md:col-span-2">
                <template #label>
                  Notes
                </template>
                <UTextarea
                  v-model="singleForm.notes"
                  :rows="3"
                  placeholder="Assignment notes"
                />
              </UFormField>

              <div class="md:col-span-2 flex justify-end gap-2 border-t border-default pt-4">
                <UButton
                  type="button"
                  color="neutral"
                  variant="soft"
                  @click="resetSingleForm"
                >
                  Reset
                </UButton>

                <UButton
                  type="submit"
                  :loading="singleSaving"
                  icon="i-lucide-user-plus"
                >
                  Save Assignment
                </UButton>
              </div>
            </form>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Batch Assignment
                </h2>
                <p class="text-sm text-muted">
                  Create assignments for multiple users at once for the same date
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <UFormField
                label="Batch Date"
                required
              >
                <UInput
                  v-model="batchForm.assignedDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>

              <div class="space-y-3">
                <div
                  v-for="(row, index) in batchForm.assignments"
                  :key="index"
                  class="rounded-xl border border-default p-4"
                >
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <p class="text-sm font-medium text-highlighted">
                      Row {{ index + 1 }}
                    </p>

                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-trash"
                      @click="removeBatchRow(index)"
                    />
                  </div>

                  <div class="grid gap-3 md:grid-cols-2">
                    <UFormField
                      label="User"
                      required
                    >
                      <USelect
                        v-model="row.userId"
                        :items="userOptions"
                        placeholder="Select user"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      label="Room"
                      required
                    >
                      <USelect
                        v-model="row.roomId"
                        :items="activeRoomOptions"
                        placeholder="Select a room"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField class="md:col-span-2">
                      <template #label>
                        Notes
                      </template>
                      <UTextarea
                        v-model="row.notes"
                        :rows="2"
                        placeholder="Assignment notes"
                      />
                    </UFormField>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap justify-between gap-2 border-t border-default pt-4">
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-plus"
                  @click="addBatchRow"
                >
                  Add Row
                </UButton>

                <div class="flex gap-2">
                  <UButton
                    color="neutral"
                    variant="soft"
                    @click="resetBatchForm"
                  >
                    Reset
                  </UButton>

                  <UButton
                    :loading="batchSaving"
                    icon="i-lucide-layers-3"
                    @click="submitBatchAssignment"
                  >
                    Save Batch
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <div
          v-else-if="canSelfAssign"
          class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <template v-if="!selfRoomOptions.length">
            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-alert-triangle"
              title="No rooms available"
              description="There are currently no rooms available for self assignment. Contact an admin to get room access."
              class="xl:col-span-2"
            />
          </template>

          <template v-else>
            <UCard>
              <template #header>
                <div>
                  <h2 class="text-lg font-semibold text-highlighted">
                    Self Assignment
                  </h2>
                  <p class="text-sm text-muted">
                    Select an allowed room for today's duty
                  </p>
                </div>
              </template>

              <form
                class="grid gap-4 md:grid-cols-2"
                @submit.prevent="submitSelfAssignment"
              >
                <UFormField
                  label="Date"
                  required
                >
                  <UInput
                    v-model="selfForm.assignedDate"
                    type="date"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Staff">
                  <UInput
                    :model-value="currentUser?.name || 'Current user'"
                    disabled
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Room"
                  required
                  class="md:col-span-2"
                >
                  <USelect
                    v-model="selfForm.roomId"
                    :items="selfRoomOptions"
                    placeholder="Select an allowed room"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Room Type Preview">
                  <UInput
                    :model-value="selectedSelfRoomTypeName"
                    disabled
                    class="w-full"
                  />
                </UFormField>

                <UFormField class="md:col-span-2">
                  <template #label>
                    Notes
                  </template>
                  <UTextarea
                    v-model="selfForm.notes"
                    :rows="3"
                    placeholder="Self assignment notes"
                  />
                </UFormField>

                <div class="md:col-span-2 flex justify-end gap-2 border-t border-default pt-4">
                  <UButton
                    type="button"
                    color="neutral"
                    variant="soft"
                    @click="selfForm.roomId = ''"
                  >
                    Reset
                  </UButton>

                  <UButton
                    type="submit"
                    :loading="selfSaving"
                    icon="i-lucide-user-check"
                  >
                    Save Assignment
                  </UButton>
                </div>
              </form>
            </UCard>

            <UCard>
              <template #header>
                <div>
                  <h2 class="text-lg font-semibold text-highlighted">
                    My Assignment
                  </h2>
                  <p class="text-sm text-muted">
                    Your active assignment status for today
                  </p>
                </div>
              </template>

              <div
                v-if="myAssignmentPending"
                class="space-y-3"
              >
                <USkeleton class="h-24 rounded-xl" />
                <USkeleton class="h-24 rounded-xl" />
              </div>

              <div
                v-else-if="myAssignment"
                class="space-y-3"
              >
                <div class="rounded-xl border border-default p-4">
                  <p class="text-xs text-muted">
                    Assignment Source
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ myAssignment.assignmentSource || 'PIC' }}
                  </p>
                </div>

                <div class="rounded-xl border border-default p-4">
                  <p class="text-xs text-muted">
                    Room
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ myAssignment.room?.code || '-' }} - {{ myAssignment.room?.name || '-' }}
                  </p>
                </div>

                <div class="rounded-xl border border-default p-4">
                  <p class="text-xs text-muted">
                    Room Type
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ myAssignment.roomType?.code || '-' }} - {{ myAssignment.roomType?.name || '-' }}
                  </p>
                </div>

                <div class="rounded-xl border border-default p-4">
                  <p class="text-xs text-muted">
                    Session Status
                  </p>
                  <p
                    class="mt-1 font-medium"
                    :class="activeSession ? 'text-success' : 'text-muted'"
                  >
                    {{ activeSession ? 'Active - currently in room' : 'Inactive' }}
                  </p>
                </div>
              </div>

              <div
                v-else
                class="rounded-xl border border-dashed border-default p-6 text-sm text-muted"
              >
                No assignment today. Please select an allowed room.
              </div>
            </UCard>
          </template>
        </div>

        <UAlert
          v-else
          color="warning"
          title="Room assignment unavailable"
          description="This account has neither PIC nor self assignment access."
        />

        <UCard v-if="canManageAssignments">
          <template #header>
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Assignment Filters
                </h2>
                <p class="text-sm text-muted">
                  Filter assignments by date, room, room type, user, and status
                </p>
              </div>
            </div>
          </template>

          <div class="grid gap-3 lg:grid-cols-5">
            <UFormField label="Date">
              <UInput
                v-model="filters.assignedDate"
                type="date"
              />
            </UFormField>

            <UFormField label="Room Type">
              <USelect
                v-model="filters.roomTypeId"
                :items="roomTypeFilterOptions"
                placeholder="All room types"
              />
            </UFormField>

            <UFormField label="Room">
              <USelect
                v-model="filters.roomId"
                :items="roomFilterOptions"
                placeholder="All rooms"
              />
            </UFormField>

            <UFormField label="User">
              <USelect
                v-model="filters.userId"
                :items="userFilterOptions"
                placeholder="All users"
              />
            </UFormField>

            <UFormField label="Status">
              <USelect
                v-model="filters.isActive"
                :items="[
                  { label: 'All statuses', value: 'ALL' },
                  { label: 'Active', value: 'true' },
                  { label: 'Inactive', value: 'false' }
                ]"
              />
            </UFormField>
          </div>
        </UCard>

        <div
          v-if="canManageAssignments"
          class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"
        >
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-highlighted">
                    Assignment List
                  </h2>
                  <p class="text-sm text-muted">
                    All assignments matching the active filters
                  </p>
                </div>
                <UButton
                  icon="i-lucide-refresh-cw"
                  color="neutral"
                  variant="soft"
                  :loading="pending || roomsPending || roomTypesPending || usersPending"
                  @click="syncRoomAccess(); forceRefresh(); refresh(); refreshUser(); refreshRooms(); refreshActiveSessions()"
                >
                  Refresh
                </UButton>
              </div>
            </template>

            <div
              v-if="pending"
              class="grid gap-3 md:grid-cols-2"
            >
              <USkeleton
                v-for="index in 4"
                :key="index"
                class="h-72 rounded-xl"
              />
            </div>

            <div
              v-else-if="!orderedAssignments.length"
              class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center"
            >
              <UIcon
                name="i-lucide-list-todo"
                class="mb-3 size-10 text-muted"
              />

              <h3 class="text-base font-semibold text-highlighted">
                No assignments yet
              </h3>

              <p class="mt-1 max-w-lg text-sm text-muted">
                Please create a single or batch assignment first.
              </p>
            </div>

            <div
              v-else
              class="grid gap-3 md:grid-cols-2"
            >
              <RoomAssignmentCard
                v-for="assignment in orderedAssignments"
                :key="assignment.id"
                :assignment="assignment"
                @transfer="openTransferModal"
                @toggle-active="handleToggleActive"
                @delete="openDeleteModal"
              />
            </div>
          </UCard>

          <RoomAssignmentDoctorList
            title="Active Staff Today"
            :assignments="activeAssignments"
          />
        </div>
      </div>

      <UModal
        v-model:open="isTransferOpen"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #content>
          <UCard :ui="{ body: 'p-0' }">
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-highlighted">
                    Transfer Assignment
                  </h2>
                  <p class="text-sm text-muted">
                    Move the assignment to another room
                  </p>
                </div>

                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  @click="isTransferOpen = false"
                />
              </div>
            </template>

            <div class="space-y-4 p-6">
              <div class="rounded-xl border border-default p-4 text-sm">
                <p class="text-muted">
                  User
                </p>
                <p class="font-medium text-highlighted">
                  {{ selectedTransfer?.user?.name || `User #${selectedTransfer?.userId}` }}
                </p>
                <p class="mt-2 text-muted">
                  Current room
                </p>
                <p class="font-medium text-highlighted">
                  {{ selectedTransfer?.room?.name || '-' }}
                </p>
              </div>

              <div class="grid gap-4">
                <UFormField
                  label="New Room"
                  required
                >
                  <USelect
                    v-model="transferForm.roomId"
                    :items="activeRoomOptions"
                    placeholder="Select a new room"
                  />
                </UFormField>

                <UFormField label="Notes">
                  <UTextarea
                    v-model="transferForm.notes"
                    :rows="3"
                    placeholder="Transfer notes"
                  />
                </UFormField>
              </div>

              <div class="flex justify-end gap-2 border-t border-default pt-4">
                <UButton
                  color="neutral"
                  variant="soft"
                  @click="isTransferOpen = false"
                >
                  Cancel
                </UButton>

                <UButton
                  :loading="transferSaving"
                  icon="i-lucide-arrow-right-left"
                  @click="submitTransfer"
                >
                  Transfer
                </UButton>
              </div>
            </div>
          </UCard>
        </template>
      </UModal>

      <BaseDeleteModal
        v-model:open="isDeleteOpen"
        :loading="deleteSaving"
        :count="1"
        entity="assignment"
        title="Delete assignment"
        description="Deleted assignments cannot be restored."
        @confirm="handleDeleteAssignment"
      />
    </template>
  </UDashboardPanel>
</template>
