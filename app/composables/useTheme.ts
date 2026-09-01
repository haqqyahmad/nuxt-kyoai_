import { useColorMode, useAppConfig } from '#imports'
import { useSafeLocalStorageState } from './useSafeLocalStorageState'

export const useTheme = () => {
  const colorMode = useColorMode()
  const appConfig = useAppConfig()

  const stored = useSafeLocalStorageState('theme-preference', {
    mode: 'system',
    primary: 'blue',
    neutral: 'slate',
  }, (v) => {
    if (v && typeof v === 'object') {
      return {
        mode: v.mode as 'light' | 'dark' | 'system',
        primary: v.primary as string,
        neutral: v.neutral as string,
      }
    }
    return null
  })

  const initTheme = () => {
    if (stored.mode && stored.mode !== 'system') {
      colorMode.preference = stored.mode
    }
    if (stored.primary) {
      appConfig.ui.colors.primary = stored.primary
    }
    if (stored.neutral) {
      appConfig.ui.colors.neutral = stored.neutral
    }
  }

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    colorMode.preference = mode
    stored.mode = mode
  }

  const setPrimaryColor = (color: string) => {
    appConfig.ui.colors.primary = color
    stored.primary = color
  }

  const setNeutralColor = (color: string) => {
    appConfig.ui.colors.neutral = color
    stored.neutral = color
  }

  const toggleTheme = () => {
    const next = colorMode.value === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return {
    colorMode,
    stored,
    initTheme,
    setTheme,
    setPrimaryColor,
    setNeutralColor,
    toggleTheme,
  }
}