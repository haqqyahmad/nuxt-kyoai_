export const useAuth = () => {
  const getToken = () => {
    if (import.meta.client) {
      return localStorage.getItem('token')
    }
    return null
  }

  const setToken = (token: string) => {
    if (import.meta.client) {
      console.log('set token', token)
      localStorage.setItem('token', token)
    }
  }

  const removeToken = () => {
    if (import.meta.client) {
      localStorage.removeItem('token')
    }
  }

  const api = useApi() // pastikan kamu sudah punya instance axios/fetch

  const registerUser = async (payload: {
    name: string
    email: string
    password: string
    confirm_password: string
  }) => {
    return await api.post("/auth/register", payload)
  }

  return {
    getToken,
    setToken,
    removeToken,
    registerUser
  }
}