export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const { getToken } = useAuth()

  // kalau sudah login → redirect ke dashboard
  if (getToken()) {
    return navigateTo('/')
  }
})
