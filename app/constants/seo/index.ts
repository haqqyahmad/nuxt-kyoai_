import { buildMenuTree, type MenuItem } from '../menu'

/**
 * SEO PAGE (AUTO)
 * Judul halaman di-resolve otomatis dari:
 *   1. label menu sidebar (constants/menu.ts)
 *   2. humanisasi segmen path (id/uuid diabaikan)
 *   3. defaultSeo
 * Deskripsi otomatis memakai defaultSeo.description.
 */

export type PageSeo = {
  title: string
  description: string
}

export const defaultSeo: PageSeo = {
  title: 'Kyoai Medical Services',
  description: 'Medical management system.'
}

export function humanizeSeoTitle(segment: string): string {
  return String(segment ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

// path -> label dari menu sidebar
function flattenMenuLabels(items: MenuItem[], acc: Record<string, string> = {}): Record<string, string> {
  for (const item of items) {
    const to = typeof item.to === 'string' ? item.to.split('?')[0] : null
    if (to && item.label) acc[to] = String(item.label)
    if (Array.isArray(item.children)) flattenMenuLabels(item.children, acc)
  }
  return acc
}

export const menuLabelByPath: Record<string, string> = flattenMenuLabels(buildMenuTree())

const isIdLikeSegment = (segment: string): boolean => {
  if (!segment) return true
  if (/^\d+$/.test(segment)) return true
  if (/\d{4,}/.test(segment)) return true
  if (/^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(segment)) return true
  if (/^[A-Z]{2,}-/.test(segment)) return true
  return false
}

/**
 * Resolve SEO untuk path apa pun secara otomatis:
 *  1. label menu sidebar (exact)
 *  2. humanisasi segmen terakhir yang bermakna (bukan id/uuid)
 *  3. defaultSeo
 */
export function resolvePageSeo(path: string): PageSeo {
  const clean = (path || '/').replace(/\/+$/, '') || '/'

  if (menuLabelByPath[clean]) {
    return { title: menuLabelByPath[clean], description: defaultSeo.description }
  }

  const segments = clean.split('/').filter(Boolean)
  const meaningful = segments.filter(segment => !isIdLikeSegment(segment))
  const last = meaningful[meaningful.length - 1] ?? segments[segments.length - 1]

  if (last) {
    return { title: humanizeSeoTitle(last), description: defaultSeo.description }
  }

  return defaultSeo
}
