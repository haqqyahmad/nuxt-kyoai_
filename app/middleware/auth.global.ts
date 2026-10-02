// Global guard: semua route wajib login, kecuali halaman publik (login).
const PUBLIC_ROUTES = new Set(['/login'])

export default defineNuxtRouteMiddleware((to) => {
  if (PUBLIC_ROUTES.has(to.path)) return

  // Token hidup di localStorage (client-only): saat SSR token tak terbaca,
  // jadi guard server selalu menganggap belum login dan melempar ke /login
  // setiap buka tab baru / reload. Lewati di server; guard client yang
  // memutuskan setelah hydration (sama seperti middleware auth/guest).
  if (import.meta.server) return

  const { getToken, isJwtExpired } = useAuth()
  const token = getToken()
  const authenticated = !!token && !isJwtExpired(token)

  if (!authenticated) {
    return navigateTo('/login')
  }
})
