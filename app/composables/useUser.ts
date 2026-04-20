// composables/useUser.ts  ← pindah ke sini
export const useUser = () => {
  const api = useApi()

  const registerUser = async (payload: {
    name: string
    email: string
    password: string
    confirm_password: string
  }) => {
    return await api.post("/auth/register", payload)
  }

  return {
    registerUser
  }
}