import type { AxiosInstance } from 'axios'

// export const useApi = () => {
//   return useNuxtApp().$api as AxiosInstance
// }

export const useApi = () => {
  const { $api } = useNuxtApp()
  return $api
}
