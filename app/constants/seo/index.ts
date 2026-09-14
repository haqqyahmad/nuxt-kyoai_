import { buildMenuTree, type MenuItem } from '../menu'

/**
 * SEO PAGE (AUTO)
 * Judul halaman di-resolve otomatis dari:
 *   1. label menu sidebar (path + query, mis. /result/exam-results?department=lab)
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

export type MenuEntry = { path: string, query: string, label: string }

function collectMenuEntries(items: MenuItem[], acc: MenuEntry[] = []): MenuEntry[] {
  for (const item of items) {
    if (typeof item.to === 'string') {
      const [pathPart, queryPart = ''] = item.to.split('?')
      if (pathPart && item.label) {
        acc.push({ path: pathPart, query: queryPart, label: String(item.label) })
      }
    }
    if (Array.isArray(item.children)) collectMenuEntries(item.children, acc)
  }
  return acc
}

export const menuEntries: MenuEntry[] = collectMenuEntries(buildMenuTree())

export const menuLabelByPath: Record<string, string> = menuEntries.reduce<Record<string, string>>(
  (acc, entry) => {
    acc[entry.path] = entry.label
    return acc
  },
  {}
)

const isIdLikeSegment = (segment: string): boolean => {
  if (!segment) return true
  if (/^\d+$/.test(segment)) return true
  if (/\d{4,}/.test(segment)) return true
  if (/^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(segment)) return true
  if (/^[A-Z]{2,}-/.test(segment)) return true
  return false
}

function queryMatches(entryQuery: string, query: Record<string, unknown>): boolean {
  if (!entryQuery) return false
  const params = new URLSearchParams(entryQuery)
  for (const [key, value] of params.entries()) {
    const current = query[key]
    const currentValue = Array.isArray(current) ? String(current[0] ?? '') : String(current ?? '')
    if (currentValue !== value) return false
  }
  return true
}

/**
 * Resolve SEO untuk route apa pun:
 *  1. label menu dengan path sama + query cocok (paling spesifik)
 *  2. fallback label menu dengan path sama tanpa query
 *  3. humanisasi segmen terakhir yang bermakna
 *  4. defaultSeo
 */
export function resolvePageSeo(path: string, query: Record<string, unknown> = {}): PageSeo {
  const clean = (path || '/').replace(/\/+$/, '') || '/'

  const samePath = menuEntries.filter(entry => entry.path === clean)
  if (samePath.length > 0) {
    const withQuery = samePath.find(entry => queryMatches(entry.query, query))
    const plain = samePath.find(entry => !entry.query)
    const chosen = withQuery ?? plain ?? samePath[0]
    if (chosen) {
      return { title: chosen.label, description: defaultSeo.description }
    }
  }

  const segments = clean.split('/').filter(Boolean)
  const meaningful = segments.filter(segment => !isIdLikeSegment(segment))
  const last = meaningful[meaningful.length - 1] ?? segments[segments.length - 1]
  if (last) {
    return { title: humanizeSeoTitle(last), description: defaultSeo.description }
  }

  return defaultSeo
}
