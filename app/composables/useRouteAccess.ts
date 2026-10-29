import {
  externalDoctorAllowedRoutes,
  getAllowedRoutes,
  getRoleLandingPath,
  isPathAllowed,
  restrictedRoles
} from '~/constants/menu'

function normalizePath(path: string): string {
  const clean = path.split(/[?#]/, 1)[0] || '/'
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean
}

export async function useRouteAccess() {
  const { user, roles, permissions, isSuperAdmin, isExternalDoctor } = await useCurrentUser()
  const { hasRouteAccess, ensureDocTypesLoaded } = useRoutePermission()
  await ensureDocTypesLoaded()

  const landingPath = getRoleLandingPath({
    isExternal: isExternalDoctor.value,
    roles: roles.value
  })

  function canAccessRoute(path: string): boolean {
    const target = normalizePath(path)
    if (target === '/login') return true
    if (!user.value) return true
    if (isSuperAdmin.value || permissions.value.includes('*:*')) return true

    if (isExternalDoctor.value) {
      return isPathAllowed(target, externalDoctorAllowedRoutes)
    }

    const isRestrictedUser = roles.value.some(role => restrictedRoles.includes(role))

    if (isRestrictedUser) {
      const roleName = roles.value[0] ?? ''
      return isPathAllowed(target, getAllowedRoutes(roleName))
    }

    return hasRouteAccess(target, permissions.value)
  }

  return {
    canAccessRoute,
    landingPath,
    user
  }
}
