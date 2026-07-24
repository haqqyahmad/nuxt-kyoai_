# Project Task Status

Last updated: 2026-07-24 10:30

Dokumen ini menurunkan PRD frontend menjadi urutan kerja yang bisa dieksekusi tanpa lompat-lompat.

## Completed

- FE: Hapus checkbox "Only If Creator" duplikat di kolom Role permission matrix.
- FE: Sidebar layout filter menu navigasi berdasarkan permissions user login via `useRoutePermission`.
- BE: Model `MstPermissionAction` + migration + API `/settings/permission-actions`.
- FE: Actions di permission matrix diambil dari API (bukan localStorage).
- FE: `login.vue` — fix form binding + loading state + redirect berdasarkan role.
- FE: `TeamsMenu.vue` — tampilkan nama role dari `useCurrentUser`.
- FE: `settings.vue` — tab Roles & Permission filter langsung dari permissions user.
- FE: `permissions.vue` — tombol "Add Role Permission" modal.
- FE: Sidebar petugas-lab/radiologi/dokter — hanya Dashboard, Examination, Settings.
- BE: Login response include `roles` array.
- BE/FE: Pre-populate UserRoomAccess dari role mapping saat load `/rooms/assignments`.
- BE/FE: Employee ↔ User link — Tab User di EditModal + API link/unlink + auto-copy data.
- FE: Profile /settings tampilkan semua data employee dalam tabs (jika ter-link).
- FE: Profile — Leave Balance card di kanan atas dengan progress bar.
- FE: Profile — format tanggal Indonesia (fmtDate).
- FE: EditModal — fix date fields (toDateStr).
- FE: Token storage — selalu localStorage (fix duplicate tab logout).
- FE: Remember me — JWT expiry berbeda (1d vs 30d).
- BE: Response `GET /registration/number/:id_reg` include `queue` data (queueCode, queueNumber).
- FE: Card Queue Number di halaman detail registrasi — data dari API, permanen.
- BE: Hapus mode ROOM_TYPES — semua self-assignment via UserRoomAccess.
- BE: Fix `stageLinks` Prisma query — regenerate Prisma client.
- FE/BE: Restruktur Departments — Medical (`mst_department`) dan Non Medical (`master_departments`) terpisah.
- FE: Menu restructure — Results (exam-results), Lab (sample-reception), Departments trigger.
- FE: Bersihkan stale files (backup copy, login copy).
- FE: Hapus `useMenu.js` kosong.
- FE: Perbaiki `employee_id: 3` hardcoded di shift-schedule.
- FE: Ganti `employee_id: 2` hardcoded di leaves/create → dinamis.
- FE: Bersihkan console.log debug dari production code (HRIS attendance modals, registration AddModal, UserMenu, guest middleware, handlers).
- FE: Koreksi `docs/bmad/06-fe-code-audit-report.md` — endpoint BE `/questionnaire`, `/medical/service-types`, `/auth/change-password`, `/hris/leave` ternyata **sudah ada** (klaim "missing" sebelumnya salah).
- FE: Perbaiki modul `/users` agar sesuai BE — fix delete path (`/user/`→`/users/`), wire tombol delete ke `api.delete`, dan buat halaman edit `users/[id].vue` (`GET/PUT /users/:id`). Endpoint `sync-room-access` BE terkonfirmasi ada (bukan bug).
- FE/BE: Tambah field `isExternal` (checkbox) & `language` (select) ke modal New User — FE `AddModal.vue` + `useUser.registerUser` payload, BE `registerSchema` & `userCreateDto` sekarang menerima keduanya (dokter eksternal/BMAD bisa dibuat langsung).
- FE: Fix double toast di modal New User — `BaseFormModal` sudah menampilkan success toast, sehingga `AddModal.submit` tidak perlu lagi memanggil `handleSuccess` (hapus import + panggilan).
- FE/BE: Dokumentasikan alur dokter eksternal (BMAD) di `docs/external-doctor-flow.md` — verifikasi FE `DetailDrawer.vue` sudah cocok BE (`assign-external`, `cancel-external`, `external-result`), dan modal New User sudah bisa membuat user `isExternal=true`.
- FE/BE: Redirect login dokter external — **diubah dari flag `isExternal` ke role `dokter-external`**. FE `login.vue` cek `roles.includes('dokter-external')` → `/rooms/exam-results`. FE `AddModal`/`useUser` hapus field `isExternal` (pertahankan `language`). FE `DetailDrawer` filter dokter luar via role `dokter-external`. BE: hapus `isExternal` dari `userResponseDto`/`userCreateDto`/`registerSchema`; `exam.repository.assignExternalDoctor` validasi via role `dokter-external` (bukan flag). Colom `User.isExternal` masih ada di DB tapi unused.
- FE: Fix bug pagination di `/rooms/exam-results` — BE `GET /mcu/exams/results` return `data` (array) + `meta.total`, tapi FE lama hanya baca `payload.data` (undefined) sehingga `total` selalu 0 & tombol Next/Prev disabled. Diperbaiki: baca `res.data.data` (array) + `res.data.meta.total`.
- FE: Sidebar untuk role `dokter-external` — hanya tampil **Hasil Exam Lab** (`/rooms/exam-results`) & **Settings**. Tambah `isExternalDoctor` + `externalDoctorAllowedRoutes` di `layouts/default.vue`; branch khusus di `filterSidebarItems` (bypass permission check, filter murni by allowed routes). Dashboard & menu lain disembunyikan.
- BE: Fix tombol View `/rooms/exam-results` (DetailDrawer) — data dokter external tidak tampil karena `getExamResults` transform `exam` hanya kirim `{id, results}` & `results.select` tidak sertakan field external. Diperbaiki: `results.select` tambah `assignedExternalUserId`/`externalStatus`/`attachmentUrl`; transform ekstrak record sentinel `inputanId='__external__'` → angkat ke `exam.externalStatus`/`assignedExternalUserId`/`attachmentUrl`, dan `exam.results` difilter (buang record `__external__` agar tidak ganggu grading/seed drafts).
- BE: Scoping exam results untuk role `dokter-external` — `GET /mcu/exams/results` kini hanya menampilkan `TrxExamItem` dari exam yang punya `TrxExamResult` dengan `assignedExternalUserId = user.id` & `externalStatus in (ASSIGNED, FILLED)`. Perubahan: `exam.controller.getExamResults` teruskan `req.user`; `exam.service.getExamResults(query, currentUser)` cek role via `getUserWithPermissions`, tambah kondisi ke `where.AND`. Role lain tetap lihat semua.
- FE: Fix select filter kosong di `/rooms/exam-results` — komponen masih pakai API Nuxt UI **v3** (`:options`, `option-attribute`, `value-attribute`) padahal proyek pakai `@nuxt/ui` v4 yang butuh `:items` dengan `{label, value}`. Diperbaiki 3 `USelect` (Department, Status, Result Type) + `USelectMenu` dokter external di `DetailDrawer` (`value-attribute`/`label-attribute` → `value-key`/`label-key`). Tambah computed `departmentItems`.
- FE: Fix error 500 Reka UI (`<SelectItem /> must have a value prop that is not an empty string`) di `/rooms/exam-results` — opsi "All Departments" semula `value: ''` (dilarang v4). Ganti sentinel `''` → `'all'` untuk `departmentFilter` dan sesuaikan semua logika terkait (`departmentItems`, default ref, `applyRouteFilters`, `syncRouteFilters`, `filteredResults`, `loadResults`, `resetFilters`, v-if active).

- FE: `/settings/permissions` sudah punya matrix role-permission, sync `roleId`, dan modal `Manage Actions`.
- FE: `/settings/roles` sudah compact, punya add/edit/delete role, dan link jumlah permission ke permissions page.
- FE: modal `Manage Actions` dan list permission sudah dibuat scrollable dan responsif.
- FE/BE: master document type backend ditambahkan dan `/settings/permissions` sudah merge document type kosong dari endpoint `/settings/document-types`.
- FE: `/settings/permissions` sudah punya tombol `Add DocType` untuk membuat document type dari UI.
- PRD frontend sudah diselaraskan dengan backend docs `docs/bmad`.
- FE: Dokumentasi lengkap — update `02-fe-be-mapping.md` (tambah inbox, services, sample flow, exam-results, audit, questionnaire builder endpoints), `03-fe-components.md` (tambah 21 questionnaire components, HRIS leaves detail/create, attendance sub-components, stores, types, utils, constants, plugins, middleware, server mocks), `04-fe-todo.md` (update status services, exam-results, sample flow, leaves detail, reimbursement/recruitment), `system-flow.md` (tambah sample flow, exam-results flow, inbox/services/audit flows, perbarui endpoint map 40+ entries), `task-status.md`.
- FE: Self-assign redirect — `assignments.vue` redirect ke `/rooms/sample-collection` jika room type code `LAB` atau `LAB-MCU`, selainnya tetap.
- FE: Sample Collection enhance — `sample-collection/[id].vue` tambah room session management (enter/exit), "Mulai Pemeriksaan" button (stage start), "Selesaikan" button (stage done saat semua sample final), sidebar collapse, hapus duplicate UAlert.
- FE: Hapus modal "Ambil Pasien" duplikat dari `sample-collection/[id].vue` — sudah ada di index.
- FE: Tambah filter Date Between (dari/sampai) di `SampleCollectionPickModal.vue` untuk filter sample berdasarkan tanggal exam.
- FE: Fix `SampleCollectionPickModal.vue` — fetch queue detail + call stage endpoint (`PATCH /stage/:stageId/call`) sebelum navigate ke [id]. Sebelumnya hanya navigate tanpa call, sehingga stage tetap WAITING dan tombol "Mulai Pemeriksaan" tidak muncul.
- Flow: self-assign → redirect → ambil pasien (dari index, dengan call stage) → masuk room → mulai pemeriksaan → ambil/tolak/reschedule per sample → selesaikan.

## Current Priority

1. FE/BE: finalkan flow front office registration dan temporary patient agar create patient, submit registration, dan feedback error/sukses selaras dengan backend.
2. FE/BE: finalkan master data medical yang masih kritis, terutama department, group, item, sample type, service type, dan package.
3. FE/BE: finalkan queue, room assignment, dan room operational flow agar visibility item mengikuti assignment aktif.
4. FE/BE: finalkan questionnaire, HRIS, dan settings security setelah core operations stabil.

## Pending

- FE/BE: Finalkan shift schedule, attendance, dan HRIS module.
- FE: Hapus hardcoded mock data `employeesOnLeave` di leaves/index.vue.
- BE: Tambah endpoint `POST /hris/attendance/manual` — saat ini tidak ada (ManualEntryModal 404).
- FE: Fix sample-collection — `:click`→`@click`, modal di luar panel, `[id].vue` import error.
- FE: Auth + Guest middleware — cek JWT expiry + fix infinite loop.
- BE: Sync room access saat login (Opsi C) + skip jika sudah ada akses (Opsi A).
- FE: Force refresh cache (`clearNuxtData`) di `/rooms/assignments` + Room Access modal.
- FE/BE: Verifikasi wiring FE ↕ BE untuk questionnaire, service-types, change-password, dan leave-create (endpoint BE sudah ada, tinggal pastikan shape request/response cocok).
- FE/BE: Implementasi `resultTiming` (inline/deferred) dan discriminator `examType`/`exam_code` sesuai BMAD.
- FE/BE: Implementasi external doctor assignment + upload PDF (`User.isExternal`, `TrxExamResult.externalStatus`).
- FE: Buat halaman `/hris/reimbursement` & `/hris/recruitment` atau hapus dari sidebar.
- BE: Hapus stale file `src/routers/user.route.js` (root level) dan `error.middleware.js`/`ErrorHandlingMidd.js` duplikat.
- QA Engineer: turunkan tiap prioritas menjadi smoke test minimal sebelum status dipindah ke completed.

## Working Rules

- Satu prioritas aktif dalam satu waktu.
- Task baru tidak boleh langsung dikerjakan tanpa dicatat statusnya.
- Jika ada perubahan PRD atau kontrak backend, perbarui dokumen ini sebelum implementasi lanjutan.
- Jika task menyentuh FE dan BE, pecah menjadi dua task dengan owner yang jelas.
- Semua perubahan penting harus punya history singkat dan status pengerjaan.
