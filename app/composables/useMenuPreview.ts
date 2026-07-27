import type { NavigationMenuItem } from '@nuxt/ui'
import { restrictedAllowedRoutes, externalDoctorAllowedRoutes, buildMenuTree } from '~/constants/menu'

type PreviewOptions = {
  isRestricted?: boolean
  isExternal?: boolean
  allowedResultDepartments?: string[]
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
      const routes = collectRoutes(item)
      const allowed = routes.some(r => restrictedAllowedRoutes.includes(r))
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

    // Lab menu: hanya tampilkan jika ada permission sample:receive
    return filtered.map(item => {
      if (item.label === 'Lab') {
        const hasSampleReceive = permissions.some(p => p.includes('sample:receive'))
        return {
          ...item,
          children: hasSampleReceive ? (item.children as NavigationMenuItem[]) : []
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
