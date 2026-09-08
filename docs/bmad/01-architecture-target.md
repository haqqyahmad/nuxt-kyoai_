# BMAD FE — Architecture Target

Target arsitektur frontend yang selaras dengan backend (service-oriented, workflow/status driven, permission-aware).

## Layering Frontend

Lapisan frontend (dari luar ke dalam):

```
Page (app/pages/**)
  └─ Component (app/components/**)
       └─ Composable (app/composables/**)   ← "service layer" FE
            └─ API ($api, app/plugins/api.ts)
                 └─ Backend (../BE/db_express)
```

### Page
Tugas:
- menyusun layout halaman
- mengambil data via composable / `useAsyncData`
- menangani interaksi user & toast
- menentukan `definePageMeta` (layout, middleware, title, SEO)

### Component
Tugas:
- presentasi & interaksi UI
- menerima props, mengeluarkan event
- tidak memanggil API langsung (kecuali panel akhir yang memang akses endpoint)

### Composable
Tugas:
- intern pemanggilan API
- menyusun filter/state
- CRUD domain
- caching via `useAsyncData`
- dianggap **service layer** frontend

### API
Tugas:
- satu instance Axios (`$api`)
- menyuntik token & api-key
- interceptor 401 → redirect login

## Prinsip

### 1. Satu Sumber Auth & API
Semua request melewati `useApi()`/`$api`. Tidak boleh ada `fetch`/`axios` tersebar.

### 2. State Dibagi Dua Kategori
- **Server data** → `useAsyncData` (fetch + cache + dedup + watchable).
- **Shared/client state** → `useState` (module-level, mis. questionnaire sections, full-width mode).

### 3. Permission Di Lapisan UI (Route & Menu)
- Route permission via `useRoutePermission.hasRouteAccess`.
- Menu filter via `useMenuPreview` + `constants/menu.ts`.
- Detail granuler (aksi tombol) memakai `useCurrentUser().permissions`.

### 4. Composable = Domain Boundary
Satu composable per domain (`useRooms`, `useDoctorResult`, `useMedicalReport`, ...). Halaman memakai composable, bukan menulis ulang logika API.

### 5. Auto-Import Aktif
Komponen & composable auto-import. Tidak perlu import manual (kecuali type).

## Data Flow (Ringkas)

1. User buka route → page di-mount.
2. Page/composable memanggil `useAsyncData` → hit `$api` → backend.
3. Backend return data + metadata.
4. Composable memetakan ke type FE & state.
5. Component render; aksi → composable → `$api` → backend → refresh data.

## Rule Engine Placement

Rule & business logic tetap di backend. Frontend hanya:
- validasi form (zod, skema form)
- preparasi payload
- menampilkan status & hasil evaluasi backend

Frontend **tidak** mengimplementasikan rule klinis (normal value, grading, stage transition).

## State Ownership (Frontend)

| State | Dimiliki Oleh |
|---|---|
| Auth token | `useAuth` (localStorage) |
| Current user & permissions | `useCurrentUser` (`useAsyncData 'current-user'`) |
| Room session aktif | `useRoomSession` (`useAsyncData 'room-session-me'`) |
| Questionnaire sections (builder) | `useState 'questionnaire-sections'` |
| Full-width room mode | `useState 'queue-work-full'` |

## Keselarasan Dengan BMAD BE

- Backend meng-own domain state (status, workflow, rule).
- Frontend me-render state & memicu transisi via API.
- Terminologi sama: `QueueEntry`, `RoomQueueItem`, `StageQueueItem`, `document-type`, `{docType}:{action}`.
