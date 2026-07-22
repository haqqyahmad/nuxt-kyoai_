import { PIC_PERMISSION, collectSelfAssignableRoomTypeCodes } from '~/constants/room-assignment-rules'

type AuthPermission = {
  permissionId?: number
  name?: string
  permission?: {
    id?: number
    name?: string
  }
}

type AuthRole = {
  role?: {
    name?: string
    permissions?: AuthPermission[]
  }
}

type AuthRoomAccess = {
  roomId: string
  room?: {
    id: string
    code?: string
    name?: string
    isActive?: boolean
    roomType?: {
      id: string
      code?: string
      name?: string
    }
  }
}

type AuthResultAccess = {
  departmentId: string
  department?: {
    id: string
    code?: string
    name?: string
  }
}

type AuthUser = {
  id: number
  name: string
  email: string
  avatar?: string | null
  roles?: AuthRole[]
  roomAccesses?: AuthRoomAccess[]
  resultAccesses?: AuthResultAccess[]
}

export async function useCurrentUser() {
  const api = useApi()

  const {
    data: userData,
    pending,
    refresh
  } = await useAsyncData<AuthUser | null>(
    'current-user',
    async () => {
      try {
        const res = await api.get('/users/auth')
        return res.data?.data ?? res.data ?? null
      } catch {
        return null
      }
    },
    {
      default: () => null,
      server: false
    }
  )

  const user = computed(() => userData.value ?? null)

  const roles = computed(() =>
    (user.value?.roles ?? [])
      .map(item => item.role?.name)
      .filter((value): value is string => Boolean(value))
  )

  const permissions = computed(() => {
    const allowed = new Set<string>()

    for (const role of user.value?.roles ?? []) {
      for (const item of role.role?.permissions ?? []) {
        const permissionName
          = item.permission?.name
            || item.name
        if (permissionName) {
          allowed.add(permissionName)
        }
      }
    }

    return [...allowed]
  })

  const isPic = computed(() =>
    permissions.value.includes(PIC_PERMISSION)
  )
  const allowedSelfRoomIds = computed(() => {
    if (isPic.value) return []
    return (user.value?.roomAccesses ?? [])
      .map(item => item.roomId)
      .filter((value): value is string => Boolean(value))
  })

  const allowedSelfRooms = computed(() => {
    if (isPic.value) return []
    return (user.value?.roomAccesses ?? [])
      .map(item => item.room)
      .filter((value): value is NonNullable<AuthRoomAccess['room']> => Boolean(value))
  })

  const allowedSelfRoomTypeCodes = computed(() => {
    return collectSelfAssignableRoomTypeCodes(roles.value)
  })

  const canSelfAssign = computed(() =>
    isPic.value || allowedSelfRoomIds.value.length > 0
  )

  const allowedResultDepartments = computed(() =>
    (user.value?.resultAccesses ?? [])
      .map(access => access.department)
      .filter((department): department is NonNullable<AuthResultAccess['department']> => Boolean(department))
  )

  const allowedResultDepartmentCodes = computed(() =>
    allowedResultDepartments.value
      .map(department => department.code?.toUpperCase())
      .filter((code): code is string => Boolean(code))
  )

  return {
    user,
    roles,
    permissions,
    isPic,
    canSelfAssign,
    allowedSelfRoomIds,
    allowedSelfRooms,
    allowedSelfRoomTypeCodes,
    allowedResultDepartments,
    allowedResultDepartmentCodes,
    pending,
    refresh
  }
}
