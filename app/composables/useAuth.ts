export const useAuth = () => {
  const getToken = () => {
    if (!import.meta.client) return null

    return (
      localStorage.getItem('token')
      || sessionStorage.getItem('token')
    )
  }

  const setToken = (token: string, remember = false) => {
    if (!import.meta.client) return

    removeToken()

    if (remember) {
      localStorage.setItem('token', token)
    } else {
      sessionStorage.setItem('token', token)
    }

    clearNuxtData('current-user')
    clearNuxtData('permission-catalog')
    clearNuxtData('room-session-me')
  }

  const removeToken = () => {
    if (!import.meta.client) return

    localStorage.removeItem('token')
    sessionStorage.removeItem('token')

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
