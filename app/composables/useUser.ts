// composables/useUser.ts  ← pindah ke sini
export const useUser = () => {
  const api = useApi()
  const user = useState<any>('user', () => null)

  const registerUser = async (payload: {
    name: string
    email: string
    password: string
    confirm_password: string
  }) => {
    return await api.post('/auth/register', payload)
  }

  const fetchUser = async () => {
    const { getToken } = useAuth()
    const token = getToken()

    if (!token) return null

    try {
      const data = await api.get('/users/auth')
      console.log('useUser',data.data)

      user.value = data
      return data 
    } catch (err) {
      console.error('Failed get user', err)
      user.value = null
    }
  }

  return {
    user,
    registerUser,
    fetchUser
  }
}
