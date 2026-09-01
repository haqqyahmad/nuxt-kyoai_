export type UserOption = {
  label: string
  value: number
  email?: string | null
}

export function useUsers() {
  const api = useApi()

  const {
    data: usersData,
    pending,
    refresh
  } = useAsyncData<UserOption[]>(
    'users-room-assignment',
    async () => {
      try {
        const res = await api.get('/users?limit=1000')
        const payload = res.data?.data ?? []

        if (!Array.isArray(payload)) return []

        return payload.map(
          (user: { id: number, name: string, email?: string | null }) => ({
            label: user.name,
            value: user.id,
            email: user.email ?? null
          })
        )
      } catch {
        return []
      }
    },
    {
      default: () => []
    }
  )

  const users = computed(() => usersData.value ?? [])

  return {
    users,
    pending,
    refresh
  }
}
