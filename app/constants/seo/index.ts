import { buildMenuTree, type MenuItem } from '../menu'
import { masterSeo } from './master'
import { medicalSeo } from './medical'
import { frontOfficeSeo } from './front-office'
import { settingsSeo } from './settings'
import { hrisSeo } from './hris'
import { loginSeo } from './login'

/**
 * SEO CONFIG PER PAGE
 */

export type PageSeo = {
  title: string
  description: string
}

export const defaultSeo: PageSeo = {
  title: 'Kyoai Medical Services',
  description: 'Medical management system.'
}

export const pageSeo: Record<string, PageSeo> = {
  '/': {
    title: 'Dashboard',
    description: 'Ringkasan data dan aktivitas sistem.'
  },

  ...loginSeo,
  ...masterSeo,
  ...medicalSeo,
  ...frontOfficeSeo,
  ...settingsSeo,
  ...hrisSeo
}

export function humanizeSeoTitle(segment: string): string {
  return String(segment ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

// path -> label dari menu sidebar (untuk judul halaman yang tidak ada di pageSeo)
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
 * Resolve SEO untuk path apa pun secara dinamis:
 *  1. exact match di pageSeo
 *  2. pola dynamic (/x/:id) untuk route ber-parameter
 *  3. label dari menu sidebar
 *  4. humanisasi segmen terakhir yang bermakna
 *  5. defaultSeo
 */
export function resolvePageSeo(path: string): PageSeo {
  const clean = (path || '/').replace(/\/+$/, '') || '/'
  if (pageSeo[clean]) return pageSeo[clean]

  const segments = clean.split('/').filter(Boolean)

  // 2) dynamic match: ganti segmen terakhir dengan :id secara bertahap
  for (let i = segments.length; i >= 1; i--) {
    const pattern = `/${[...segments.slice(0, i - 1), ':id'].join('/')}`
    if (pageSeo[pattern]) return pageSeo[pattern]
  }

  // 3) label menu
  if (menuLabelByPath[clean]) {
    return { title: menuLabelByPath[clean], description: defaultSeo.description }
  }

  // 4) humanisasi segmen terakhir yang bukan id/uuid
  const meaningful = segments.filter(segment => !isIdLikeSegment(segment))
  const last = meaningful[meaningful.length - 1] ?? segments[segments.length - 1]
  if (last) {
    return { title: humanizeSeoTitle(last), description: defaultSeo.description }
  }

  return defaultSeo
}
