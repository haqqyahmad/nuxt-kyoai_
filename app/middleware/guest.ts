export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const { getToken, removeToken, isJwtExpired } = useAuth()

  const token = getToken()

  if (token) {
    if (isJwtExpired(token)) {
      removeToken()
    } else {
      return navigateTo('/')
    }
  }
})
