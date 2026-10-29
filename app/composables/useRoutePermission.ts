type DocumentType = {
  id: number
  key: string
  label: string
  sortOrder?: number
  isActive?: boolean
}

let docTypesReady = false
let docTypesPromise: Promise<void> | null = null

export function useRoutePermission() {
  const api = useApi()

  const { data: docTypes, pending, refresh } = useAsyncData<DocumentType[]>(
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
    const last = parts[parts.length - 1]
    if (last) candidates.add(last)
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
    if (userPermissions.includes('*:*')) return true
    return userPermissions.some(p => p.startsWith(`${docType}:`))
  }

  async function ensureDocTypesLoaded() {
    if (docTypesReady) return
    if (!docTypesPromise) {
      docTypesPromise = (async () => {
        if (!pending.value && !(docTypes.value?.length)) {
          await refresh()
        }
        if (pending.value) {
          await new Promise<void>((resolve) => {
            const stop = watch(pending, (value) => {
              if (!value) {
                stop()
                resolve()
              }
            })
          })
        }
        docTypesReady = true
      })().finally(() => {
        docTypesPromise = null
      })
    }
    await docTypesPromise
  }

  return {
    hasRouteAccess,
    ensureDocTypesLoaded,
    docTypeKeys,
    pending
  }
}
