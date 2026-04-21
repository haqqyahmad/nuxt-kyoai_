export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const { getToken } = useAuth()

  console.log('guest-middleware', getToken())
  // kalau sudah login → redirect ke dashboard
  if (getToken()) {
    return navigateTo('/')
  }
})
