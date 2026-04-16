export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return // 🔥 WAJIB

  const { getToken } = useAuth()

  const token = getToken()

  // kalau belum login → redirect ke login
  if (!token) {
    return navigateTo('/login')
  }
})