import type { AxiosInstance } from 'axios'

export const useApi = () => {
  return useNuxtApp().$api as AxiosInstance
}