import type { AxiosInstance } from 'axios'

export const useApi = () => {
  const { $api } = useNuxtApp()
  const config = useRuntimeConfig()
  $api.defaults.baseURL = config.public.apiBase
  $api.defaults.headers.common['api-key-kyo'] = config.public.apiKey
  return $api
}
