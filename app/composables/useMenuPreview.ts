import type { NavigationMenuItem } from '@nuxt/ui'
import { getAllowedRoutes, externalDoctorAllowedRoutes, roleDefaultDepartment, buildMenuTree } from '~/constants/menu'

type PreviewOptions = {
  isRestricted?: boolean
  isExternal?: boolean
  allowedResultDepartments?: string[]
  roleName?: string
}

function normalizePath(path: string): string {
  return path.split(/[?#]/, 1)[0] || '/'
}

function collectRoutes(item: NavigationMenuItem): string[] {
  if (typeof item.to === 'string') return [normalizePath(item.to)]
  if (item.children) return (item.children as NavigationMenuItem[]).flatMap(collectRoutes)
  return []
}

function filterMenuItems(
  items: NavigationMenuItem[],
  permissions: string[],
  hasRouteAccess: (path: string, perms: string[]) => boolean,
  options: PreviewOptions
): NavigationMenuItem[] {
  return items.reduce<NavigationMenuItem[]>((acc, item) => {
    if (options.isExternal) {
      const routes = collectRoutes(item)
      const allowed = routes.some(r => externalDoctorAllowedRoutes.includes(r))
      if (!allowed) return acc

      if (item.children) {
        const filtered = filterMenuItems(item.children as NavigationMenuItem[], permissions, hasRouteAccess, options)
        if (filtered.length > 0) {
          acc.push({ ...item, children: filtered })
        }
        return acc
      }
      acc.push(item)
      return acc
    }

    if (options.isRestricted) {
      const allowedRoutes = getAllowedRoutes(options.roleName ?? '')
      const routes = collectRoutes(item)
      const allowed = routes.some(r => allowedRoutes.includes(r))
      if (!allowed) return acc
    }

    if (item.children) {
      const filtered = filterMenuItems(item.children as NavigationMenuItem[], permissions, hasRouteAccess, options)
      if (filtered.length > 0) {
        acc.push({ ...item, children: filtered })
      }
      return acc
    }

    if (typeof item.to === 'string') {
      if (hasRouteAccess(normalizePath(item.to), permissions)) {
        acc.push(item)
      }
      return acc
    }

    acc.push(item)
    return acc
  }, [])
}

export function useMenuPreview() {
  function getMenuPreview(
    permissions: string[],
    hasRouteAccess: (path: string, perms: string[]) => boolean,
    options: PreviewOptions = {}
  ): NavigationMenuItem[] {
    const menuItems = buildMenuTree()
    const filtered = filterMenuItems(menuItems, permissions, hasRouteAccess, options)

    // Filter Results berdasarkan role → department mapping
    const defaultDept = options.roleName ? roleDefaultDepartment[options.roleName.toLowerCase()] : null

    return filtered.map(item => {
      // Lab menu: hanya tampilkan jika ada permission sample:receive
      if (item.label === 'Lab') {
        const hasSampleReceive = permissions.some(p => p.includes('sample:receive'))
        return {
          ...item,
          children: hasSampleReceive ? (item.children as NavigationMenuItem[]) : []
        }
      }

      // Examination menu: hanya tampilkan Sample Collection jika ada permission sample:collect
      if (item.label === 'Examination') {
        const hasSampleCollect = permissions.some(p => p.includes('sample:collect'))
        return {
          ...item,
          children: (item.children as NavigationMenuItem[]).filter(
            child => child.label !== 'Sample Collection' || hasSampleCollect
          )
        }
      }

      // Results menu: filter berdasarkan department
      if (item.label === 'Results' && defaultDept) {
        return {
          ...item,
          children: (item.children as NavigationMenuItem[]).filter(child => {
            const code = (child as Record<string, unknown>).resultDepartmentCode
            return code === defaultDept
          })
        }
      }

      return item
    })
  }

  function isMenuVisible(
    menuPath: string,
    permissions: string[],
    hasRouteAccess: (path: string, perms: string[]) => boolean,
    options: PreviewOptions = {}
  ): boolean {
    const preview = getMenuPreview(permissions, hasRouteAccess, options)
    const routes = preview.flatMap(collectRoutes)
    return routes.includes(normalizePath(menuPath))
  }

  return {
    getMenuPreview,
    isMenuVisible,
    buildMenuTree
  }
}
