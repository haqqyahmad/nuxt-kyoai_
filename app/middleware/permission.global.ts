export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path === '/login') return

  const { getToken, isJwtExpired } = useAuth()
  const token = getToken()
  if (!token || isJwtExpired(token)) return

  const { canAccessRoute, landingPath, user } = await useRouteAccess()
  if (!user.value) return

  if (canAccessRoute(to.path)) return

  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    fatal: true,
    data: { redirect: landingPath }
  })
})
