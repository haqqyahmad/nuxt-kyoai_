# BMAD FE — Current State

Kondisi aktual codebase frontend Nuxt 4, sebagai baseline untuk desain arsitektur yang selaras dengan backend ERP kesehatan.

## Teknologi & Konfigurasi

| Aspek | Nilai | Path |
|---|---|---|
| Framework | Nuxt 4, mode **SPA** (`ssr: false`) | `nuxt.config.ts:8` |
| Bahasa | TypeScript (strict) | `tsconfig.json` |
| UI | @nuxt/ui v4 (Tailwind CSS v4), reka-nova (shadcn) | `nuxt.config.ts:6`, `components.json` |
| State | `useState` + `useAsyncData` (tanpa Pinia/Vuex) | `app/composables/*`, `app/stores/*` |
| HTTP | Axios (satu instance global) | `app/plugins/api.ts`, `app/composables/useApi.ts` |
| Package Manager | pnpm | `package.json:52` |
| Modules | `@nuxt/eslint`, `@nuxt/ui`, `@vueuse/nuxt` | `nuxt.config.ts:4-8` |
| Runtime Config (public) | `apiBase`, `apiKey`, `portalUrl` | `nuxt.config.ts:18-24` |
| Icons | @iconify-json/lucide + @lucide/vue | `package.json` |
| Charts | chart.js + vue-chartjs, @unovis | `package.json` |
| Formatting | Prettier + ESLint (commaDangle `never`, braceStyle `1tbs`) | `eslint.config.mjs:6-8`, `prettier.config.mjs` |

## Struktur Direktori Utama (`app/`)

```
app/
├── app.vue, app.config.ts, error.vue, loading.vue
├── assets/css/main.css        # Tailwind v4 + @nuxt/ui + theme tokens
├── components/                # auto-import, ~200 file
│   ├── base/                  # IconGridPicker.vue
│   ├── ui/table/              # primitif UTable (reka-nova)
│   └── <domain>/              # per-domain component folders
├── composables/               # useXxx pattern (service layer FE)
│   ├── questionnaire/
│   └── mcu/
├── constants/                 # menu, room-types, rooms, exam-renderers, seo
├── layouts/                   # default (sidebar), auth, blank
├── middleware/                # auth.ts, guest.ts (named, bukan global)
├── pages/                     # file-based routing
├── plugins/                   # api.ts, chart.client.ts, theme.client.ts
├── stores/                    # questionnaire/questionnaire.ts (useState-based)
├── types/                     # room, questionnaire, doctor-result, medical-report, dll
├── utils/                     # handlers, jinjaTemplate, physical-examination-report, dll
└── lib/                       # utils.ts (cn helper)
```

Top-level (non-`app/`):
- `server/api/` — Nitro mock API (customers, mails, members, notifications) untuk UI dashboard/inbox.
- `types/api.d.ts` — deklarasi `$api: AxiosInstance`.

## Pola Yang Sudah Berjalan

### HTTP Tunggal
Semua akses API melewati satu instance Axios (`$api`):
- `plugin api.ts` menyuntik `Authorization: Bearer <token>` + `api-key-kyo`.
- Response interceptor: `401` → hapus token → redirect `/login`.
- `useApi()` mengembalikan `$api` dan menyet ulang `baseURL` + `api-key-kyo` tiap pemanggilan.

### Composable Sebagai Service Layer
Setiap domain mengekspos composable yang mengintern pemanggilan API, filter, dan aksi CRUD:
- `useRooms`, `useRoomTypes`, `useRoomAssignments`, `useRoomSession`.
- `useDoctorResult` (grade + optimistic update), `useMedicalReport` (verify/return/release).
- `useCurrentUser` — menyediakan roles, permissions, external-doctor, room access.
- `useRoutePermission` — matching route → document-type → permission.

### Access-Control Berbasis Permission
- Format permission: `{documentType}:{action}` (mis. `patient:read`).
- `useCurrentUser` mengekspos `permissions` sebagai `Set<string>`.
- `useRoutePermission` mencocokkan route ke document type lalu mengecek permission.
- Menu sidebar difilter via `useMenuPreview` + `constants/menu.ts`.

## Yang Belum Rapi / Catatan

- **Middleware global**: `auth`/`guest` hanya dipasang di beberapa halaman, bukan global. Sebagian besar halaman CRUD mengandalkan interceptor 401 + enforcement backend.
- **Duplikasi menu**: `layouts/default.vue` menyimpan definisi sidebar terpisah dari `constants/menu.ts` (duplikat manual).
- **Mock API**: `server/api/*` hanya data statis untuk UI — bukan backend sebenarnya (backend di `../BE/db_express`).
- **Kualitas lint**: banyak error pre-existing (unused vars, indentation) di file besar `queue-work/[id].vue`, `create.vue`, dll.

## Baseline Interpretation

Fondasi frontend sudah cukup untuk:
- akses API terpusat dengan auth & api-key
- state per-domain via composable
- akses kontrol berbasis permission & document-type
- halaman operasional front-office, rooms, result, HRIS, settings

Namun perlu diperkuat pada konsistensi middleware, pengurangan duplikasi menu, dan pembersihan lint.
