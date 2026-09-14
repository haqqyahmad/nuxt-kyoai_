const TOKEN_KEY = 'token'
const PERSIST_KEY = 'kyoai_persist'
const SESSION_MARKER = 'kyoai_session'

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

function hasSessionCookie(): boolean {
  if (!import.meta.client) return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${SESSION_MARKER}=`))
}

function setSessionCookie() {
  document.cookie = `${SESSION_MARKER}=1; path=/; SameSite=Lax`
}

function clearSessionCookie() {
  document.cookie = `${SESSION_MARKER}=; path=/; Max-Age=0; SameSite=Lax`
}

// "Session marker": session cookie (dibagi antar tab, hilang saat browser ditutup).
// Fallback ke sessionStorage bila cookie tak bisa di-set (mis. cookie diblokir).
function setSessionMarker() {
  setSessionCookie()
  if (!hasSessionCookie()) {
    try {
      sessionStorage.setItem(SESSION_MARKER, '1')
    } catch {
      // abaikan
    }
  }
}

function hasSessionMarker(): boolean {
  if (hasSessionCookie()) return true
  try {
    return sessionStorage.getItem(SESSION_MARKER) === '1'
  } catch {
    return false
  }
}

function clearSessionMarker() {
  clearSessionCookie()
  try {
    sessionStorage.removeItem(SESSION_MARKER)
  } catch {
    // abaikan
  }
}

export const useAuth = () => {
  const removeToken = () => {
    if (!import.meta.client) return

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PERSIST_KEY)
    clearSessionMarker()

    clearNuxtData('current-user')
    clearNuxtData('permission-catalog')
    clearNuxtData('room-session-me')
  }

  const getToken = () => {
    if (!import.meta.client) return null

    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null

    // Token non-persist ("remember me" tidak dicentang): valid hanya selama sesi browser.
    // Kalau marker sesi hilang (browser sudah ditutup), token dianggap kedaluwarsa.
    const persisted = localStorage.getItem(PERSIST_KEY) === '1'
    if (!persisted && !hasSessionMarker()) {
      removeToken()
      return null
    }

    return token
  }

  const setToken = (token: string, remember = false) => {
    if (!import.meta.client) return

    removeToken()

    localStorage.setItem(TOKEN_KEY, token)
    if (remember) {
      localStorage.setItem(PERSIST_KEY, '1')
    } else {
      setSessionMarker()
    }

    clearNuxtData('current-user')
    clearNuxtData('permission-catalog')
    clearNuxtData('room-session-me')
  }

  const logout = async () => {
    if (import.meta.client) {
      try {
        const api = useApi()
        await api.post('/medical/rooms/sessions/exit', {}, { timeout: 5000 })
      } catch {
        // best-effort: sesi room mungkin tidak aktif / gagal keluar
      }
    }

    removeToken()
  }

  return {
    getToken,
    setToken,
    removeToken,
    logout,
    isJwtExpired
  }
}
