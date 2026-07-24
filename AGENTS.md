# AGENTS.md — Panduan untuk AI Agent

## Tech Stack

- **Framework**: Nuxt 4 (SPA, SSR=false)
- **Bahasa**: TypeScript (strict)
- **UI**: @nuxt/ui v4 (Tailwind CSS v4)
- **State**: `useState` + `useAsyncData` (tanpa Pinia/Vuex)
- **HTTP**: Axios (JWT bearer token + API key)
- **Package Manager**: pnpm

## Scripts

| Perintah | Deskripsi |
|---|---|
| `pnpm dev` | Dev server (port 3000) |
| `pnpm build` | Build produksi |
| `pnpm lint` | ESLint seluruh proyek |
| `pnpm typecheck` | Nuxt typecheck |

## Struktur Direktori Utama

```
app/
├── components/        # Vue components (auto-import)
├── composables/       # Shared logic (useXxx)
├── layouts/           # default.vue (sidebar), auth.vue
├── pages/             # File-based routing
├── types/             # TypeScript type definitions
├── constants/         # Konstanta & mock data
├── utils/             # Utility functions
├── plugins/           # Nuxt plugins (api.ts, chart.client.ts)
├── stores/            # useState-based stores
└── assets/css/        # Tailwind CSS
docs/                  # Dokumentasi & worklog
server/api/            # Nitro mock API
```

## Aturan Koding

### Convention

- **Tidak boleh menambahkan komentar** kecuali diminta eksplisit.
- Gunakan composables untuk reusable logic (`useXxx` pattern).
- Auto-import component aktif — jangan import manual.
- Gunakan `type` bukan `interface` untuk props/state.
- Responsive: gunakan Tailwind breakpoint classes.

### API

- Instance Axios via `useApi()`.
- Endpoint di config: `NUXT_PUBLIC_API_BASE`.
- Auth: JWT token disimpan di localStorage (selalu, untuk mencegah logout di tab baru).
- Auth: Middleware `auth.ts` + `guest.ts` cek JWT expiry — redirect ke login jika expired.
- 401 → redirect ke `/login`.

### Permission System

- Format: `{documentType}:{action}` (contoh: `invoice:read`, `patient:write`).
- Fetch user permissions via `useCurrentUser().permissions`.
- Document types dikelola di `/settings/document-types`.
- Permission matrix di `/settings/permissions`.
- Permission actions dikelola via API `/settings/permission-actions` (bukan localStorage).
- Auto-create action dari permission name saat permission dibuat (backend).
- Sidebar filter: `useRoutePermission` composable — matching route ke document type secara dinamis berdasarkan data API `/settings/document-types`.
- Algoritma matching: generate candidate keys dari path segments (join-all, last-segment, reverse-last-2, each-segment), lalu cocokkan dengan document type keys dari API (exact match + singular form).

### Component Patterns

- **Tables**: `UTable` dari @nuxt/ui dengan TanStack Table.
- **Forms**: `UFormField` + `UInput` dengan `@submit.prevent`.
- **Modal**: `UModal` > `UCard` > `form`.
- **Delete**: `BaseDeleteModal` untuk konfirmasi.

### State Management

- `useAsyncData` untuk fetching data (caching + dedup).
- `useState` untuk shared state (jika perlu).
- Hindari Pinia/Vuex.

### Employee vs User vs External Doctor
- **Employee** → data HR (NIK, nama, department). Bisa punya User account (1-to-0..1).
- **User** → akun login sistem. Tidak harus Employee (misal: dokter external).
- **External Doctor** → User dengan flag `isExternal` (BMAD), bukan Employee.
- Saat ini Employee dan User sudah memiliki relasi di Prisma (userId opsional di Employee).

## Sidebar Permission Mapping

Setiap route di sidebar di-map ke document type key secara dinamis via `useRoutePermission`:

| Route | Document Type |
|---|---|
| `/branches` | branch |
| `/customer` | customer |
| `/departments` | department |
| `/patients` | patient |
| `/users` | user |
| `/items/mcu` | mcu-item |
| `/items/groups` | item-group |
| `/items/sample-types` | sample-type |
| `/questionnaire` | questionnaire |
| `/rooms` | room |
| `/rooms/types` | room-type |
| `/rooms/assignments` | room-assignment |
| `/services` | service |
| `/front-office/registration-temp` | temp-registration |
| `/front-office/registration-patient` | registration-patient |
| `/hris` | hris |
| `/hris/employees` | employee |
| `/hris/leaves` | leave |
| `/hris/reimbursement` | reimbursement |
| `/hris/recruitment` | recruitment |
| `/hris/national-holidays` | national-holiday |
| `/hris/attendance` | attendance |
| `/settings` | setting |

Algoritma matching di `useRoutePermission.getDocTypeForRoute()` generate candidate keys dari path:
1. Semua segment digabung dengan `-` (e.g., `/items/mcu` → `items-mcu`)
2. Segment terakhir (e.g., `/items/mcu` → `mcu`)
3. Dua segment terakhir dibalik lalu digabung (e.g., `/items/mcu` → `mcu-items`)
4. Setiap segment individually (e.g., `/items/mcu` → `items`, `mcu`)
5. Untuk setiap candidate, coba exact match lalu singular (hapus trailing `s`)

## Sejarah Pengerjaan (perubahan besar)

### 2026-07-17 — Fix stageLinks + DB sync
- Generate Prisma Client → `stageLinks` berfungsi.
- DB sync: isExternal, externalResult (revert), prisma db push FK error.

### 2026-07-17 — Profile Employee Tabs, Employee↔User Link
- Employee ↔ User: relasi Prisma (userId di Employee) + Tab User di EditModal + auto-copy data.
- Profile /settings: tampilkan semua data employee dalam tabs jika ter-link + Leave Balance card.
- BE: endpoint `/users/auth/employee` + `/users/profile` untuk self-update.
- Perbaikan date fields di EditModal + Profile.

### 2026-07-24 — Sample Collection Flow + Documentation Audit
- `assignments.vue`: self-assign redirect ke `/rooms/sample-collection` jika room type code `LAB` atau `LAB-MCU`.
- `sample-collection/[id].vue`: enhance major — tambah room session management (enter/exit), "Mulai Pemeriksaan" (stage start), "Selesaikan" (stage done saat semua sample final), sidebar collapse, hapus duplicate UAlert. Hapus modal "Ambil Pasien" duplikat (sudah ada di index).
- `SampleCollectionPickModal.vue`: tambah filter Date Between (dari/sampai), fix call stage endpoint sebelum navigate — fetch queue detail → `PATCH /stage/:stageId/call` → navigate ke [id].
- Documentation audit: compare seluruh kode FE dengan docs — update `02-fe-be-mapping.md`, `03-fe-components.md`, `04-fe-todo.md`, `system-flow.md`, `task-status.md`. Tambah 15+ section baru (inbox, services, sample flow, exam-results, audit, questionnaire builder, stores, types, utils, constants, plugins, middleware, server mocks).
- Flow: self-assign ke LAB/LAB-MCU → redirect sample-collection → ambil pasien (dari index, dengan call stage) → masuk room → mulai pemeriksaan → ambil/tolak/reschedule per sample → selesaikan.

### 2026-07-14 — Permission Matrix, Sidebar Filter & Settings Tabs
- `/settings/permissions`: hapus Only If Creator duplikat + Add Role Permission modal.
- `layouts/default.vue`: sidebar navigasi difilter permissions user login + untuk petugas-lab/radiologi/dokter hanya tampilkan Dashboard, Examination, Settings.
- `composables/useRoutePermission.ts`: dynamic route-to-docType matching.
- Backend `MstPermissionAction` model + API `/settings/permission-actions`.
- `settings.vue`: tab Roles & Permission berdasarkan permission user langsung.
- `login.vue`: fix form binding + loading state + redirect berdasarkan role.
- `TeamsMenu.vue`: tampilkan nama role, bukan "PIC".
- Backend auth: login response include `roles` array.
- Room access pre-populate: BE auto-create `UserRoomAccess` dari role mapping saat user buka `/rooms/assignments`.
- Restruktur menu: Departments (Medical + Non Medical), Results (exam-results), Lab (sample-reception).
- Room access sync: backend saat login + skip jika sudah ada akses. Cache fix dengan clearNuxtData.
- Buat docs/project-flow.md — alur lengkap ERP.
- Fix hardcoded employee_id di leaves/create — pakai useCurrentUser.
- Dokumentasi: `docs/permissions-worklog.md`.

## Workflow

1. **Pahami kode yang ada** sebelum ubah — baca file, cek imports, pahami pola.
2. **Gunakan existing patterns** — jangan perkenalkan library baru tanpa diskusi.
3. **Jalankan lint & typecheck** setelah perubahan.
4. **Catat perubahan** di `docs/` worklog + update `docs/task-status.md`.
