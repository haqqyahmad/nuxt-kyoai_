# Project Task Status

Last updated: 2026-07-31

Dokumen ini menurunkan PRD frontend menjadi urutan kerja yang bisa dieksekusi tanpa lompat-lompat.

## Completed

- BE/PORTAL: Back-fill `QstAnswer.registrationId` saat approve — sebelumnya selalu NULL karena jawaban disubmit sebelum Registration dibuat. `approveTemp` kini update `qst_answer` set `registrationId=reg.id` where `regId=temp.id` dalam transaksi. Terverifikasi E2E.

- BE/PORTAL: Verifikasi E2E alur portal → MCU → FO approve (`docs/backend-alignment-worklog.md`). Fix bug: `QstAnswer.regId` `VarChar(20)` → `VarChar(100)` (UUID refCode 36-char overflow); migration `20260804000000_widen_qst_answer_regid`. Alur lengkap tersimpan benar (RegistrationTemp → QstAnswer by refCode → approve → Patient + Registration + Address).

- BE: Uniform email template — semua template di `express_dash/src/lib/email-templates/` (`registration-received`, `admin-new-submission`, `appointment-confirmed`, `registration-rejected`) di-rewrite mengikuti layout portal `regist_portal/src/lib/server/email/template.ts` (header gradient + logo, thank-you box, details-table, important-note, contact box, social media, footer), isi menyesuaikan subject masing-masing + accent color per jenis. "Registration Received" memakai template portal.
- BE: Hapuskan duplikat email ke pasien — `public-registration.service.js` tidak lagi mengirim `registrationReceived`; konfirmasi pendaftaran ke pasien hanya lewat portal (`template.ts`). Worklog: `docs/backend-alignment-worklog.md` + `express_dash/docs/bmad/task-status.md`.
- BE/PORTAL: Alur `/registration` — (1) BE `public-registration.validation.js` field optional jadi `.nullish()` (terima `null`, bukan hanya `undefined`); (2) `RegButton.svelte` fix: Back disabled di `currentStep===0` (bukan `1`), `isLast` pakai `totalStep-1` (0-based). Worklog: `docs/backend-alignment-worklog.md`.
- PORTAL: Fix blocker alur `/registration` (audit portal→BE) — (1) `mapper.ts` tambah `normalizePhone()` agar format phone `+62 812-3456-7890` lolos validasi BE; (2) hapus opsi gender `Other` di `PersonalInfo.svelte` (BE hanya `male/female`); (3) map `WORK → OFFICE` di `mapper.ts` + typeMap `BILLING → OTHER` di `PatientSearch.svelte` (enum BE tidak punya `WORK`). Worklog: `docs/backend-alignment-worklog.md`.
- PORTAL/BE: Fix non-blocker alur `/registration` — (1) `api/patient/+server.ts` baca `backendResult.data?.refCode`/`patientExists` (sebelumnya top-level → undefined); (2) BE `lookupPatient` verifikasi `dob` (sebelumnya diabaikan); (3) `Appointment.svelte` hapus hardcoded tanggal `2025-10-24/25/26` → pakai `tomorrowStr/day2Str/day3Str` dinamis; (4) hapus dead code `submitToBackend` di `mapper.ts`. Worklog: `docs/backend-alignment-worklog.md`.
- BE/PORTAL: Sinkronisasi & pengamanan alur `/registration` — cek DB: semua 10 branch sudah ada di DB live → seed `seed.js` disinkronkan (10 branch, loop idempotent by `branchId`); `ApiKeyMiddleware` dipasang di `/public/register` (key terverifikasi cocok); rate limit `5→20`/10 menit; cegah `Patient.email @unique` gagal saat approve. Worklog: `docs/backend-alignment-worklog.md` + `express_dash/docs/bmad/task-status.md`.
- PORTAL: Template email — `template.ts` tambah branch `04` (Clinique Suisse, alamat = 01, telp/WA `085195562898`, tanpa email, map baru); baris Email kondisional + helper `telHref()` (normalisasi tel link). Worklog: `docs/backend-alignment-worklog.md`.
- PORTAL/BE: Re-audit alur `/registration` — fix temuan sisa: (1) `notes` MCU diteruskan ke BE (mapper + store + `defaultForm`, sekalian hilangkan TS error `+page.svelte:235`); (2) link dashboard email admin diperbaiki (path `/front-office/registration-temp/...` + `DASHBOARD_URL` di `.env` BE); (3) `patient-search` uppercase `idNumber`; (4) dedup email admin (portal tidak kirim admin lagi, BE `adminNewSubmission` yang menangani). Worklog: `docs/backend-alignment-worklog.md` + `express_dash/docs/bmad/task-status.md`.
- FE: Audit & fix modul `/questionnaire` (bagian 1, FE) — `index.vue`: `handleDeleteById` memakai `deleteQuestionnaire` (bukan `deletePatient` yang tidak ada), kolom Code/Version/Active benar (sebelumnya `PatientId`/`gender`/`idNumber`), type `Questionnaire` + field `version`, buang `columnFilters` stale `PatientId`, kolom isActive pakai `UBadge`. `AddModal.vue`: toast template literal (sebelumnya `${...}` literal), buang `questionnaire_id` dari schema/state/hidden input. `useQuestionOptions.ts`: tambah `value` pada option (perbaiki TS error). Lint bersih; sisa TS `table` ref adalah pola lama. Catatan: BE `/questionnaire` masih stub (GET `[]`, DELETE no-op) — bagian 2 menyusul.
- FE: Preview questionnaire diperbesar — ekstrak markup modal preview builder menjadi komponen bersama `components/questionnaire/Preview/QuestionnairePreviewForm.vue` (header besar, section card rounded-3xl, badge Section, input lengkap, tombol Submit). Dipakai di: modal preview `[id]/builder.vue` (ganti markup inline) dan halaman `[id]/preview.vue` (kontainer full-screen `min-h-screen bg-elevated/30`, layout blank). Hapus komponen lama yang tak terpakai (`QuestionnairePreview.vue`, `PreviewSection.vue`, `PreviewQuestion.vue`).
- FE: Builder questionnaire — fix badge "Unsaved" palsu saat drag & drop question. Akar masalah: objek section diganti instance baru (`{...section}`) saat reorder → watcher array `[sectionTitle, description]` membandingkan referensi (bukan nilai) → salah menyalakan badge. Solusi: badge jadi `computed` yang membandingkan nilai terhadap snapshot baseline (di-reset saat Save), watcher lama dihapus. Sekalian fix `vue/no-mutating-props` di `SectionCard.vue` (v-model title/description lewat computed + store `updateSection`).
- FE: Preview questionnaire dibuka di tab baru — item dropdown "Preview Questionnaire" di `/questionnaire` diberi `external: true` + `target: '_blank'`.
- FE: Drag & drop builder tersimpan otomatis — `builder.vue` menangani `@update:sections` → `setSections()` → autosave (`PUT /:id/sections`) → `sortOrder` ter-persist di DB (sebelumnya reorder tidak sampai ke store).
- FE: Duplicate section/question di builder tidak tersimpan — `duplicateSection`/`duplicateQuestion` meng-clone **option dengan id asli** (via `structuredClone`/spread) padahal id itu sudah dipakai soal aslinya → autosave `PUT /:id/sections` gagal unique constraint → duplikat tidak persist. Fix: generate `crypto.randomUUID()` baru untuk setiap option clone di store `questionnaire.ts`.
- FE: Update nama & deskripsi questionnaire di builder tidak tersimpan — `questionnaireTitle`/`questionnaireDescription` hanya ref lokal; autosave hanya mengirim sections. Fix: `builder.vue` tambah `watchDebounced` (1.5s) pada title/description → `PUT /questionnaire/:id` (guard `loaded` setelah fetch). BE `PUT /:id` terverifikasi.
- BE/FE: Implementasi modul `/questionnaire` end-to-end (bagian 2) — Prisma models `QstQuestionnaire/QstSection/QstQuestion/QstOption/QstAnswer` (id UUID, enum 7 tipe, cascade delete) + migration; route lengkap (CRUD header, `PUT /:id/sections` simpan pohon builder, section/question/option CRUD, `PUT /sort`, `POST /:id/submit` jawaban + snapshot soal); permission `questionnaire:create/update/delete` ditambah ke seed + role superadmin/admin. FE: builder/preview load by id (`GET /questionnaire/:id`), autosave + tombol Save (`PUT /questionnaire/:id/sections`), fix `v-model` date. Diverifikasi HTTP end-to-end (create→save→detail→submit→sort→delete). Worklog: `docs/backend-alignment-worklog.md` + `express_dash/docs/bmad/task-status.md`.
- FE: Hapus checkbox "Only If Creator" duplikat di kolom Role permission matrix.
- FE: Sidebar layout filter menu navigasi berdasarkan permissions user login via `useRoutePermission`.
- BE: Model `MstPermissionAction` + migration + API `/settings/permission-actions`.
- FE: Actions di permission matrix diambil dari API (bukan localStorage).
- FE: `login.vue` — fix form binding + loading state + redirect berdasarkan role.
- FE: `TeamsMenu.vue` — tampilkan nama role dari `useCurrentUser`.
- FE: `settings.vue` — tab Roles & Permission filter langsung dari permissions user.
- FE: `permissions.vue` — tombol "Add Role Permission" modal.
- FE: Sidebar petugas-lab/radiologi/dokter/nurse — hanya Dashboard, Examination, Settings.
- FE: Preview Menu UI — `useMenuPreview` composable + `MenuPreviewModal` component di `/settings/roles`.
- FE: Permission Cleanup — "Set Recommended Permissions" button di `/settings/permissions` dengan 8 role matrices + "Bulk Cleanup" modal untuk reset semua role sekaligus.
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
- FE: Sample Collection enhance — `sample-collection/[id].vue` tambah room session management (enter/exit), "Mulai Pemeriksaan" (stage start), "Selesaikan" (stage done saat semua sample final), sidebar collapse, hapus duplicate UAlert. Hapus modal "Ambil Pasien" duplikat (sudah ada di index).
- FE: `SampleCollectionPickModal.vue` — tambah filter Date Between (dari/sampai), fix call stage endpoint sebelum navigate — fetch queue detail → `PATCH /stage/:stageId/call` → navigate ke [id]. Fix pakai `waitingStage.id` (bukan `waitingStage.stageId`).
- Documentation audit: compare seluruh kode FE dengan docs — update `02-fe-be-mapping.md`, `03-fe-components.md`, `04-fe-todo.md`, `system-flow.md`, `task-status.md`. Tambah 15+ section baru (inbox, services, sample flow, exam-results, audit, questionnaire builder, stores, types, utils, constants, plugins, middleware, server mocks).
- FE/BE: Fix reject sample — backend `rejectSample` izinkan status `PENDING` + fix `sampleStageForStatus()`. FE `canReject`/`canReschedule` cek `IN_PROGRESS` stage.
- Flow: self-assign ke LAB/LAB-MCU → redirect sample-collection → ambil pasien (dari index, dengan call stage) → masuk room → mulai pemeriksaan → ambil/tolak/reschedule per sample → selesaikan.
- FE: History table — group by patient, sample type badges dengan warna, dropdown aksi (Lanjutkan/Detail). Hapus kolom Collection/Receive/Status.
- FE: Modal detail — tampilkan semua sample pasien dengan Jenis Sample (Status), Tanggal Exam, Diambil oleh, Diterima oleh. Perbesar font.
- BE: `excludeCalled` filter — exclude queue entries dengan stage CALLED/IN_PROGRESS dari daftar sample pick modal.
- FE: `SampleCollectionPickModal` — group by patient, sample type & status badges, warna spesifik per sample type.

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

## Completed — 2026-08-04: Audit & Finalisasi Flow Front-Office Registration

- FE/BE: Reject mismatch fix — `registration-temp/index.vue` kirim `reason` (bukan `rejectReason`), sesuai `adminRejectSchema` di BE.
- FE: Hapus opsi PENDING dari dropdown status — route `/:id/pending` tidak ada di backend (404). PENDING adalah status awal, bukan target perubahan.
- FE: Field name `rejectedReason` — type `TempRegist` & update lokal kini pakai `rejectedReason` (sesuai Prisma `RegistrationTemp.rejectedReason`).
- FE `[id].vue`: Hapus dead code `cancelRegistration`/`checkinPatient`/`isCancelled`/`isCheckedIn`/`isMCU` (operasi Registration bukan Temp, tidak dipakai di template).
- FE `[id].vue`: Fix `statusRegistration` → `status` di `statusHistory` + tambah status REJECTED.
- FE `[id].vue`: Fix `reg.patient.patientCode` → `reg.patientId` + fallback Service No. `registrationId ?? '-'`.
- FE `[id].vue`: Fix type — `idValue: string`, `patientId: string | null`, `rejectedReason: string | null`, `registrationId: number | null`.
- FE `[id].vue`: Hapus `statusRegistration` & `patient` object dari type (tidak ada di response temp).
- FE/BE: E2E approve flow verified — tanpa patientId → buat pasien baru, dengan patientId → pakai existing.
- FE/BE: Create patient + registration + exam MCU flow verified via API.
- BE: `QstAnswer.regId` VarChar(20) → VarChar(100) — fix UUID overflow saat submit kuesioner portal.
- BE: Back-fill `QstAnswer.registrationId` saat approve — jawaban MCU terkait ke Registration final.

### Masih perlu diperhatikan (minor, non-blocker):
- `scheduleDateExam` di `create.vue` default ke hari ini — tidak ditampilkan di form, selalu beda dari `examDate` jika pemeriksaan masa depan.
- `examType` di `[id].vue` registrasi detail — fallback ke computed `MCU`/`RAWAT_JALAN` (bukan dari API).
- Questionnaire list di `registration-temp/[id].vue` masih static mock — perlu fetch dari API `qst_answer`.

## Completed — Integrasi regist_portal → express_dash → my-app

**Status:** Selesai ✅ (30 Juli 2026)

### Keputusan: Portal Address = Single
- Portal hanya 1 address per registrasi (opsi A)
- FE `/patients/:id` tetap multi-address (sudah ada)
- FO bisa tambah/edit address lain di `/patients/:id`
- Address dari portal → di-update ke address existing (tidak duplikat)

### Email Templates + Worker (BARU)
- 4 template: registrationReceived, adminNewSubmission, appointmentConfirmed, registrationRejected
- Worker email.js: render template + kirim via transporter.sendMail()
- SMTP: Production (web13-cpn.neohosting.id)
- Template format: HTML dengan branding Kyoai Medical Services

### Portal Multi-Step Flow (BARU)
- Step 0: BranchServiceSelect — pilih branch + service type (icon grid)
- Step 1: PatientSearch — pilih pasien lama (search ID+DOB) atau baru
- Step 2: PersonalInfo + ContactInfo + Appointment (auto-fill jika pasien lama)
- Step 3: Verification + Captcha → Submit
- Branch & Service Type di Step 0, otomatis readonly di Step 2
- `/api/patient-search` → `/public/register/patient-lookup` (endpoint public)

### Backend Approval Fix
- Hapus unique constraint `@@unique([idType, idValue, status])` di RegistrationTemp
  - Pasien bisa daftar MCU berkali-kali tanpa error constraint
- Cek email unik: jika sudah dipakai pasien lain, skip (null)
- Update data pasien existing saat approve + audit log
- Buat Address record dari addressTemp saat approve
- Generate PatientId format `PAT-YYYYMMDD-BR-SEQ`

### Aturan Update Pasien
- idNumber/idType berubah → CREATE pasien baru
- Data lain berubah (phone, email, address, dll) → UPDATE existing

### Portal API (SvelteKit)
- `/api/patient` → validasi Zod → map to BE format → POST `/public/register/:branchCode` → email
- Submit panggil portal's own API, bukan BE langsung

### Backend (express_dash)
- Validation: tambah address fields + maritalStatus ke `publicRegisterSchema`
- `submitFromPublic`: simpan address di `addressTemp` (JSON), simpan marital di `maritalTemp`
- `approveTemp`: buat Address record dari `addressTemp`, set `maritalStatus` saat create patient
- Fix: `generatePatientId` format `PAT-YYYYMMDD-BR-SEQ` (include branchId untuk unique global)
- Migration: `ALTER TABLE RegistrationTemp ADD COLUMN addressTemp TEXT, maritalTemp VARCHAR(20)`

### alur:
```
Portal → POST /api/patient → validasi → POST /public/register/:branchCode
  → RegistrationTemp (addressTemp, maritalTemp)
  → Front Office Approve
  → Buat Patient + Registration + Address record
  → Data tampil di /registration-patient
```

## Future Plan: Database Menu System

**Status:** Planned (menunggu stabilisasi fitur lain)
**Effort:** 9-12 hari (Database 0.5h, BE 3-4h, FE 4-5h, Testing 1-2h, Docs 0.25h)

### Deskripsi
Simpan struktur menu di database agar bisa diatur via UI dan preview menu 100% sync dengan sidebar.

### Database Changes
- Tabel `MenuItem` (id, label, icon, to, parentId, sortOrder, isActive)
- Tabel `MenuItemPermission` (menuItemId, permission)
- Migration + seed data

### Backend Changes
- Route: `GET/POST/PUT/DELETE /settings/menu-items`
- Service: tree builder + permission filter
- Cache: Redis cache invalidation

### Frontend Changes
- New page: `pages/settings/menus.vue` (CRUD + drag-drop tree)
- Update: `layouts/default.vue` (fetch menu dari API)
- Update: `composables/useMenuPreview.ts` (fetch menu dari API yang sama)
- New composable: `composables/useMenuItems.ts`

### Benefits
- Menu bisa diubah via UI tanpa deploy
- Preview menu 100% sync dengan sidebar
- Permission per menu item (lebih granular)

### Risiko
- Sidebar loading state saat fetch
- API failure → sidebar tidak muncul
- Menu nesting complexity
- Migration downtime

### Kapan Dieksekusi
- Setelah core operations stabil
- Setelah fitur lain yang lebih prioritas selesai

## Future Plan: Inline/Deferred Result + Dynamic Approval + Release

**Status:** Planned (menunggu stabilisasi fitur lain)
**Effort:** 21-31 hari (Database 2h, BE 10-13h, FE 10-14h, Testing 7-9h)
**Dokumentasi:** `docs/inline-deferred-result-workflow.md`

### Deskripsi
Workflow approval untuk hasil pemeriksaan medis, dari input hasil hingga release final report.

### Key Status Layers
- `RoomExamItem.status`: PENDING → IN_PROGRESS → DONE/SKIPPED/REFUSED/RETEST/RESCHEDULED
- `TrxExamItem.resultStatus`: NOT_READY → READY → DRAFT → SUBMITTED → RETURNED
- `ExamDepartmentResult.status`: DRAFT → DEPARTMENT_REVIEW → DEPARTMENT_APPROVED → SUBMITTED_TO_DOCTOR
- `MedicalReport.status`: DOCTOR_REVIEW → DOCTOR_APPROVED → MR_REVIEW → MR_VERIFIED → READY_TO_RELEASE → RELEASED

### Workflow
1. **Inline Result**: Input dari room → SUBMITTED → Department Review
2. **Deferred Result**: READY setelah item DONE → Input dari Result Menu → SUBMITTED → Department Review
3. **Dynamic Department Approval**: Workflow configurable per department, four-eyes rule, snapshot immutable
4. **Doctor Review**: Worklist dari DEPARTMENT_APPROVED → approve/return
5. **MR Verification**: Worklist dari DOCTOR_APPROVED → verify/return
6. **Release**: Preview → RELEASED → report locked

### Data Model Baru (7 tabel)
- ResultReviewWorkflow, ResultReviewStep
- ExamDepartmentResult, ExamDepartmentResultVersion
- ExamDepartmentReviewAction, ExamResultRevisionItem
- MedicalReport, MedicalReportDepartmentVersion, MedicalReportAction

### Dependencies
- resultTiming (inline/deferred) — harus selesai dulu
- examType discriminator — mempengaruhi workflow
- Department master data — harus lengkap
- Audit trail backend — perlu dibangun

### Kapan Dieksekusi
- Setelah core operations stabil
- Setelah resultTiming dan examType diimplementasi

## Working Rules

- Satu prioritas aktif dalam satu waktu.
- Task baru tidak boleh langsung dikerjakan tanpa dicatat statusnya.
- Jika ada perubahan PRD atau kontrak backend, perbarui dokumen ini sebelum implementasi lanjutan.
- Jika task menyentuh FE dan BE, pecah menjadi dua task dengan owner yang jelas.
- Semua perubahan penting harus punya history singkat dan status pengerjaan.
