import { onMounted, reactive, watch } from 'vue'

export function useSafeLocalStorageState<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
  sanitize: (value: unknown) => Partial<T> | null
) {
  const state = reactive({ ...defaults }) as T
  let storageReady = false

  if (import.meta.client) {
    onMounted(() => {
      try {
        const rawValue = window.localStorage.getItem(key)
        const sanitized = rawValue ? sanitize(JSON.parse(rawValue)) : null
        if (sanitized) Object.assign(state, sanitized)
      } catch {
        window.localStorage.removeItem(key)
      } finally {
        storageReady = true
      }
    })

    watch(
      state,
      (value) => {
        if (!storageReady) return
        try {
          window.localStorage.setItem(key, JSON.stringify(value))
        } catch {
          // Storage dapat ditolak oleh browser/private mode. Filter tetap
          // bekerja di memory tanpa mengganggu request halaman.
        }
      },
      { deep: true }
    )
  }

  return state
}
