import axios from 'axios'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { getToken, removeToken } = useAuth()
  const router = useRouter()

  const api = axios.create({
    baseURL: config.public.apiBase as string
  })

  // request interceptor
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

  // response interceptor ← tambahkan ini
  api.interceptors.response.use(
    res => res,
    (error) => {
      if (error.response?.status === 401) {
        removeToken()
        router.push('/login')
      }
      return Promise.reject(error)
    }
  )

  return { provide: { api } }
})
