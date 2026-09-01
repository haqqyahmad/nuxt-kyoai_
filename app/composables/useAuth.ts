function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true
    const decoded = JSON.parse(base64UrlDecode(payload))
    return decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

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
    removeToken,
    isJwtExpired
  }
}
