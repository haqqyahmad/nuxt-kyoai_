# BMAD FE — Access Control & Sidebar

## Format Permission

Format: **`{documentType}:{action}`** — contoh:
- `patient:read`, `patient:write`
- `room:update`
- `questionnaire:create`

## `useCurrentUser` — Sumber Permission

Fetch `/users/auth` ke `useAsyncData 'current-user'`.

Menampilkan:
- `roles: string[]`
- `permissions: Set<string>` — flatten dari role → permission
- `isExternalDoctor`
- `isSuperAdmin` (permission `*:*`)
- `isPic`
- `canSelfAssign`
- `allowedSelfRoomIds` / `allowedSelfRooms`
- `allowedSelfRoomTypeCodes`
- `allowedResultDepartments` / `allowedResultDepartmentCodes`

## `useRoutePermission` — Route → Permission

Mengambil document types dari `/settings/document-types` (key `sidebar-document-types`).

### `getDocTypeForRoute(path)`
Generate candidate keys dari segment path:
1. gabung semua segment dengan `-` (mis. `/items/mcu` → `items-mcu`)
2. segment terakhir (mis. `mcu`)
3. dua segment terakhir dibalik (mis. `mcu-items`)
4. tiap segment individual (mis. `items`, `mcu`)
5. untuk setiap candidate: exact match lalu singular (hapus trailing `s`)

### `hasRouteAccess(path, permissions)`
- permission `*:*` (super admin) → selalu true
- else cek `permissions.some(p => p.startsWith(docType + ':'))`

## `useMenuPreview` — Menu Filter

Membangun menu items sesuai role & permission. Memakai:
- `constants/menu.ts` untuk definisi & allowed routes
- `useRoutePermission` untuk route access

### `constants/menu.ts`

| Konstanta | Isi |
|---|---|
| `restrictedAllowedRoutes` | Dashboard, room ops, exam-results, settings |
| `frontOfficeAllowedRoutes` | Front office routes |
| `externalDoctorAllowedRoutes` | exam-results + settings/security |
| `getAllowedRoutes(roleName)` | per-role route list |
| `restrictedRoles` | petugas-lab, petugas-radiologi, dokter, dokter-gigi, nurse, front-office |
| `externalRoles` | dokter-external |
| `roleDefaultDepartment` | role → dept code (LAB/RAD/NURSE/DOK/DENTAL) |

## Sidebar (`layouts/default.vue`)

Sidebar difilter via `filterSidebarItems` + `useMenuPreview`.
- tersimpan list menu di `layouts/default.vue` (baris 227–535) — **duplikat** dari `constants/menu.ts` (perlu konsolidasi).
- menyembunyikan/menampilkan sesuai `getAllowedRoutes(role)` & permission.

## Matriks Akses Ringkas

| Role | Route utama |
|---|---|
| `superadmin` | semua (`*:*`) |
| `front-office` | registration-temp, registration-patient, questionnaire-results |
| `petugas-lab` | Dashboard, room ops, exam-results, settings |
| `petugas-radiologi` | sama seperti petugas-lab |
| `dokter` | room ops, exam-results, settings |
| `dokter-gigi` | room ops (dental), exam-results, settings |
| `nurse` | room ops (nurse), settings |
| `dokter-external` | exam-results, settings/security |

## Catatan

- Permission detail (tombol aksi) memakai `useCurrentUser().permissions` langsung di komponen/halaman.
- Route-level check (`hasRouteAccess`) dipakai untuk sidebar & gate halaman utama.
- Penentuan halaman setelah login di `login.vue` memakai `roles` dari response login.
