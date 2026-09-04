# BMAD FE — HTTP & Auth

## HTTP Layer: Satu Instance Axios

Semua akses API melalui satu instance:

```ts
// app/plugins/api.ts
const api = axios.create({ baseURL: config.public.apiBase })
api.interceptors.request.use((req) => {
  const token = getToken()
  if (token) req.headers.Authorization = `Bearer ${token}`
  if (config.public.apiKey) req.headers['api-key-kyo'] = config.public.apiKey
  return req
})
api.interceptors.response.use(res => res, (error) => {
  if (error.response?.status === 401) {
    removeToken()
    router.push('/login')
  }
  return Promise.reject(error)
})
```

Fungsi:
- **baseURL** diambil dari `runtimeConfig.public.apiBase` (`NUXT_PUBLIC_API_BASE`).
- **Authorization**: JWT token dari localStorage.
- **api-key-kyo**: API key statis (`NUXT_PUBLIC_API_KEY`).
- **401** → hapus token + redirect `/login`.
- Plugin menyediakan `{ api }` → `$api` (dideklarasikan di `types/api.d.ts`).

## `useApi()` — Choke Point Tunggal

```ts
// app/composables/useApi.ts
export const useApi = () => {
  const { $api } = useNuxtApp()
  const config = useRuntimeConfig()
  $api.defaults.baseURL = config.public.apiBase
  $api.defaults.headers.common['api-key-kyo'] = config.public.apiKey
  return $api
}
```

Setiap pemanggilan menyet ulang `baseURL` & `api-key-kyo` agar tidak stale.

## Auth Token (`useAuth`)

| Fungsi | Perilaku |
|---|---|
| `getToken()` | baca `localStorage.token` (guard `import.meta.client`) |
| `setToken(token)` | **selalu** tulis localStorage (bukan sessionStorage, agar tidak logout di tab baru); clear Nuxt data keys |
| `removeToken()` | hapus token + clear Nuxt data keys |
| `isJwtExpired(token)` | decode payload JWT (base64url) & bandingkan `exp` |

## Runtime Config

Dari `.env`:
```
NUXT_PUBLIC_API_BASE=http://localhost:8000/api
NUXT_PUBLIC_API_KEY=<api-key>
NUXT_PUBLIC_PORTAL_URL=http://localhost:5173
```

## Auth Middleware

Dua middleware **named** (bukan global):

| Middleware | Behavior | Dipakai |
|---|---|---|
| `auth` | tanpa token / expired → `removeToken` + navigate `/login` | index, rooms/assignments, hris/*, login |
| `guest` | token valid → navigate `/`; expired → removeToken | login |

Catatan:
- Sebagian besar halaman CRUD **tidak** memasang `middleware: 'auth'` secara eksplisit — mengandalkan interceptor 401 + enforcement backend.
- Ini hardening gap (lihat `00-current-state.md`).

## Alur Login

```
login.vue
  → submit → api.post('/auth/login', { email, password, remember })
  → setToken(res.data.data.token)
  → tentukan halaman tujuan berdasar roles:
      externalDoctor → /result/exam-results
      front-office    → /front-office/registration-temp
      staff           → /rooms/assignments
      lain            → /
  → navigateTo(target)
```

## API Key

Header `api-key-kyo` wajib untuk semua endpoint (backend middlewares `ApiKeyMiddleware`). Frontend menyuntikkan otomatis dari `NUXT_PUBLIC_API_KEY`.
