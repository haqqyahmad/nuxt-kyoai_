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

  return {
    getToken,
    setToken,
    removeToken
  }
}
