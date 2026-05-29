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
  }

  const removeToken = () => {
    if (!import.meta.client) return

    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
  }

  return {
    getToken,
    setToken,
    removeToken
  }
}
