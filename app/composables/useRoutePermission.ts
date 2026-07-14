type DocumentType = {
  id: number
  key: string
  label: string
  sortOrder?: number
  isActive?: boolean
}

export function useRoutePermission() {
  const api = useApi()

  const { data: docTypes, pending } = useAsyncData<DocumentType[]>(
    'sidebar-document-types',
    async () => {
      try {
        const res = await api.get('/settings/document-types')
        return res.data.data ?? res.data ?? []
      } catch {
        return []
      }
    },
    { default: () => [], server: false }
  )

  const docTypeKeys = computed(() =>
    (docTypes.value ?? []).map(dt => dt.key)
  )

  function getDocTypeForRoute(path: string): string | null {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) return null

    const candidates = new Set<string>()
    candidates.add(parts.join('-'))
    candidates.add(parts[parts.length - 1])
    if (parts.length >= 2) {
      candidates.add(parts.slice(-2).reverse().join('-'))
    }
    for (const part of parts) {
      candidates.add(part)
    }

    const keys = docTypeKeys.value

    for (const candidate of candidates) {
      if (keys.includes(candidate)) return candidate
      if (candidate.endsWith('s') && keys.includes(candidate.slice(0, -1))) {
        return candidate.slice(0, -1)
      }
    }

    return null
  }

  function hasRouteAccess(path: string, userPermissions: string[]): boolean {
    const docType = getDocTypeForRoute(path)
    if (!docType) return true
    return userPermissions.some(p => p.startsWith(`${docType}:`))
  }

  return {
    hasRouteAccess,
    docTypeKeys,
    pending
  }
}
