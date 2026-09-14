export const useApi = () => {
  const { $api } = useNuxtApp()
  const config = useRuntimeConfig()
  $api.defaults.baseURL = config.public.apiBase
  $api.defaults.headers.common['api-key-kyo'] = config.public.apiKey
  return $api
}
