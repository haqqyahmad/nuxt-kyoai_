import { PIC_PERMISSION, collectSelfAssignableRoomTypeCodes } from '~/constants/room-assignment-rules'

type AuthPermission = {
  permission?: {
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
    roomType?: {
      id: string
      code?: string
      name?: string
    }
  }
}

type AuthUser = {
  id: number
  name: string
  email: string
  avatar?: string | null
  roles?: AuthRole[]
  roomAccesses?: AuthRoomAccess[]
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
      default: () => null
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
        if (item.permission?.name) {
          allowed.add(item.permission.name)
        }
      }
    }

    return [...allowed]
  })

  const isPic = computed(() => permissions.value.includes(PIC_PERMISSION))

  const allowedSelfRoomIds = computed(() => {
    if (isPic.value) return []
    return (user.value?.roomAccesses ?? [])
      .map(item => item.roomId)
      .filter((value): value is string => Boolean(value))
  })

  const allowedSelfRoomTypeCodes = computed(() => {
    if (isPic.value) return []
    if (allowedSelfRoomIds.value.length > 0) {
      return [...new Set(
        (user.value?.roomAccesses ?? [])
          .map(item => item.room?.roomType?.code)
          .filter((value): value is string => Boolean(value))
      )]
    }
    return collectSelfAssignableRoomTypeCodes(roles.value)
  })

  const canSelfAssign = computed(() =>
    isPic.value
    || allowedSelfRoomIds.value.length > 0
    || allowedSelfRoomTypeCodes.value.length > 0
  )

  return {
    user,
    roles,
    permissions,
    isPic,
    canSelfAssign,
    allowedSelfRoomIds,
    allowedSelfRoomTypeCodes,
    pending,
    refresh
  }
}
