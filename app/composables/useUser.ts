// composables/useUser.ts  ← pindah ke sini
type UserProfile = {
  id?: string
  name?: string
  email?: string
  avatar?: string | null
}

type UserResponse = {
  data?: {
    data?: UserProfile
  }
}

export const useUser = () => {
  const api = useApi()
  const user = useState<UserResponse | null>('user', () => null)

  const registerUser = async (payload: {
    name: string
    email: string
    password: string
    confirm_password: string
    language?: string
    isExternal?: boolean
  }) => {
    return await api.post('/auth/register', payload)
  }

  const fetchUser = async () => {
    const { getToken } = useAuth()
    const token = getToken()

    if (!token) return null

    try {
      const data = await api.get('/users/auth')
      user.value = data
      return data
    } catch {
      user.value = null
    }
  }

  return {
    user,
    registerUser,
    fetchUser
  }
}
