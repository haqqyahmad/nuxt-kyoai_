export const useAuth = () => {
  const getToken = () => {
    if (!import.meta.client) return null

    return localStorage.getItem('token')
  }

  const setToken = (token: string, _remember = false) => {
    if (!import.meta.client) return

    removeToken()

    localStorage.setItem('token', token)

    clearNuxtData('current-user')
    clearNuxtData('permission-catalog')
    clearNuxtData('room-session-me')
  }

  const removeToken = () => {
    if (!import.meta.client) return

    localStorage.removeItem('token')

    clearNuxtData('current-user')
    clearNuxtData('permission-catalog')
    clearNuxtData('room-session-me')
  }

  return {
    getToken,
    setToken,
    removeToken
  }
}
