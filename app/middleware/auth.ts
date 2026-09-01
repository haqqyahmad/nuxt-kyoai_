export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const { getToken, removeToken, isJwtExpired } = useAuth()

  const token = getToken()

  if (!token) {
    return navigateTo('/login')
  }

  if (isJwtExpired(token)) {
    removeToken()
    return navigateTo('/login')
  }
})
