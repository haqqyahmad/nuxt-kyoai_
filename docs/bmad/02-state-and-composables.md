# BMAD FE — State Management & Composable

## Pola Umum

Frontend **tidak memakai Pinia/Vuex**. Dua primitif inti:

### 1. `useAsyncData` — fetching server data
- menyediakan cache + dedup + watchable.
- pola: `{ default: () => [], server: false }` karena SPA.
- dipakai hampir di semua composable domain.

Contoh (`app/composables/useCurrentUser.ts`):
```ts
const { data, refresh } = await useAsyncData(
  'current-user',
  async () => (await api.get('/users/auth')).data?.data ?? null,
  { default: () => null, server: false }
)
```

### 2. `useState` — shared/client state
- shared antar komponen dalam satu session.
- contoh: `useState<boolean>('queue-work-full', () => false)` (mode full-width room).

## Letak State

| State | Key / Lokasi | Pemilik |
|---|---|---|
| Token (localStorage) | `token` | `useAuth` |
| Current user | `current-user` | `useCurrentUser` |
| Permission catalog | `permission-catalog` | `useCurrentUser` |
| Room session | `room-session-me` | `useRoomSession` |
| Questionnaire sections | `questionnaire-sections` | `stores/questionnaire/questionnaire.ts` |
| Full-width room mode | `queue-work-full` | `layouts/default.vue` |

## Composable (Service Layer FE)

Setiap domain mengintern logika:
- data fetching + filter
- aksi CRUD
- optimistic update & rollback (contoh `useDoctorResult`)

Daftar composable utama:

| Composable | Domain | Catatan |
|---|---|---|
| `useApi` | HTTP | mengembalikan `$api`, set baseURL + api-key |
| `useAuth` | Auth | get/set/remove token, isJwtExpired |
| `useCurrentUser` | Auth/User | roles, permissions (Set), external-doctor, room access |
| `useRoutePermission` | Access | route → document-type matching |
| `useMenuPreview` | Menu | menu items filtered per role/permission |
| `useRooms` | Room | rooms list + CRUD |
| `useRoomTypes` | Room Type | room types + stages |
| `useRoomAssignments` | Assignment | list + assign (single/batch/self) |
| `useRoomSession` | Room Session | enter/exit/refresh, single-active-room |
| `useDoctorResult` | Result | grade logic, optimistic + rollback, grade rules cache |
| `useMedicalReport` | Medical Report | verify/return/release |
| `useDashboard` | Dashboard | shared shortcuts + slideover state |
| `useQuestionnaire*` | Questionnaire | builder, autosave, print, logic, options, DnD |
| `useMcuReportPrint` | MCU | print report |

## Kategori Composable

1. **HTTP/Auth** — `useApi`, `useAuth`, `useCurrentUser`.
2. **Access** — `useRoutePermission`, `useMenuPreview`.
3. **Domain CRUD** — `useRooms`, `useRoomTypes`, `useRoomAssignments`, dll.
4. **Domain Workflow** — `useDoctorResult`, `useMedicalReport`, `useRoomSession`.
5. **Builder/Print** — `useQuestionnaire*`, `useMcuReportPrint`, `useQuestionnairePrint`.

## Cache Invalidation

`clearNuxtData()` dipakai saat data harus di-refresh:
- `useAuth.setToken`/`removeToken`: clear `current-user`, `permission-catalog`, `room-session-me` (`app/composables/useAuth.ts:32-34,42-44`).
- `useRoomAssignments` self-assign: clear `room-session-me`.

## Optimistic Pattern

`useDoctorResult` melakukan:
1. update state lokal optimistik
2. kirim ke backend
3. rollback bila gagal
4. cache grade rules di ref lokal

Ini pola yang disarankan untuk aksi yang butuh respons cepat (grade, approval tunggal).
