import { defineNuxtPlugin } from '#app'
import { useTheme } from '@/composables/useTheme'

export default defineNuxtPlugin(() => {
  const theme = useTheme()
  // Initialize theme from localStorage on client side
  theme.initTheme()
})
