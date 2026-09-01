import { onMounted, reactive, watch } from 'vue'

export function useSafeLocalStorageState<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
  sanitize: (value: unknown) => Partial<T> | null
) {
  const state = reactive({ ...defaults }) as T

  if (import.meta.client) {
    try {
      const rawValue = window.localStorage.getItem(key)
      const sanitized = rawValue ? sanitize(JSON.parse(rawValue)) : null
      if (sanitized) {
        for (const key of Object.keys(defaults)) {
          if (Object.hasOwn(sanitized, key)) state[key as keyof T] = sanitized[key as keyof T] as T[keyof T]
        }
      }
    } catch {
      window.localStorage.removeItem(key)
    }

    watch(
      state,
      (value) => {
        try {
          window.localStorage.setItem(key, JSON.stringify(value))
        } catch {
          // ignore storage errors
        }
      },
      { deep: true }
    )
  }

  return state
}
