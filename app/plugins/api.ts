// plugins/api.ts
import axios from 'axios'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { getToken } = useAuth()

  const api = axios.create({
    baseURL: config.public.apiBase as string
  })

  api.interceptors.request.use((req) => {
    const token = getToken()

    if (token) {
      req.headers.Authorization = `Bearer ${token}`
    }

    if (config.public.apiKey) {
      req.headers['api-key-kyo'] = config.public.apiKey as string
    }

    return req
  })

  return {
    provide: {
      api
    }
  }
})