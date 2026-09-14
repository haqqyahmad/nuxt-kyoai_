// Global guard: semua route wajib login, kecuali halaman publik (login).
const PUBLIC_ROUTES = new Set(['/login'])

export default defineNuxtRouteMiddleware((to) => {
  if (PUBLIC_ROUTES.has(to.path)) return

  const { getToken, isJwtExpired } = useAuth()
  const token = getToken()
  const authenticated = !!token && !isJwtExpired(token)

  if (!authenticated) {
    return navigateTo('/login')
  }
})
