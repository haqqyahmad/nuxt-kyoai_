# Project Task Status

Last updated: 2026-08-08

Dokumen ini menurunkan PRD frontend menjadi urutan kerja yang bisa dieksekusi tanpa lompat-lompat.

## Completed — 2026-08-08: Hasil Questionnaire — view answers & print gaya form KUESIONER MCU

**Perintah:** Ubah tampilan view answers (modal) agar menyerupai print form MCU1 lama (`ci/application/views/menu/print_quest_mcu2.php`): blok DATA DIRI + pertanyaan bernomor dengan jawaban inline. Modal **dan** print sekaligus, DATA DIRI lengkap (umur, jenis kelamin, status pernikahan, telepon, alamat).

### Backend (express_dash)
- `questionnaire.service.js` `listResults`: tambah `patientGender`, `patientDob`, `patientAge` (dihitung dari dob), `patientMaritalStatus`, `patientPhone`, `patientAddress` (dari `Address` polimorfik `PATIENT` → detail + district + city + province, diambilkan 1 per patient terbaru via promise paralel).
- `public-registration.service.js` `getQuestionnaires`: detail `GET /registration/number/:id_reg/questionnaires` kini mengembalikan **semua** soal berurutan (tidak difilter yang terjawab) + flag `answered` per soal, agar form bernomor lengkap seperti print form.
- Verifikasi: `GET /api/questionnaire/results` mengembalikan field baru; detail questionnaires mengembalikan semua soal + `answered`.

### Frontend (my-app)
- `pages/front-office/questionnaire-results.vue`: modal "View answers" dirombak jadi gaya form — blok **DATA DIRI** (Nama Lengkap + Jenis Kelamin, Umur, No. RM, Perusahaan, Status Pernikahan, Alamat Rumah, Telepon, Registrasi, Exam Date, Branch) lalu bagian **"ISILAH PERTANYAAN DIBAWAH INI DENGAN SEBENARNYA"** dengan soal bernomor (1., 2., …) dan jawaban inline (jawaban kosong tampil "-"). Helper baru: `genderLabel`, `maritalLabel`, `dataDiriRows`. Print (`printSingle`) juga dibuat gaya form serupa: judul KUESIONER MEDICAL CHECK-UP + DATA DIRI + tabel No/Pertanyaan/Jawaban + area tanda tangan Pasien & Dokter.
- Verifikasi: lint bersih, typecheck tanpa error untuk file ini, headless Chrome — modal menampilkan 11 baris DATA DIRI + soal bernomor dengan jawaban inline.

## Completed — 2026-08-08: Hasil Questionnaire di Front Office (list lintas pasien)

**Perintah:** Buat list "Hasil Questionnaire" dari data pasien di menu Front Office — tabel pasien + status questionnaire, filter company/branch/tanggal/status, tombol lihat & print.

### Backend (express_dash)
- `questionnaire.service.js`: tambah `listResults({ companyId, branchId, dateFrom, dateTo, status })` — query `qstAnswer` yang sudah punya `registrationId` saja (**hanya registrasi yang sudah di-approve**, temp dari portal dieksklusi), group per `registrationId`, gabung `Registration` (+patient), map nama branch/customer. Filter: company (match `String(companyId)`), branch, tanggal (thd `examDate`), status (`Completed` jika ada baris jawaban non-kosong, else `Pending`). Output per (registrasi × questionnaire): `registrationKey`, `registrationRef` (`id_reg`), `patientCode` (`PatientId`), `patientName`, `companyId/companyName`, `branchId/branchName`, `examDate`, `questionnaire_id/name`, `status`, `completionDate`.
- `questionnaire.controller.js`: tambah `listResults` (baca `req.query`, response.success).
- `questionnaire.route.js`: route `GET /results` (auth + `permit("questionnaire:read")`) **sebelum** `GET /:id` agar "results" tidak dianggap sebagai id.
- Verifikasi: list 10 baris (semua punya `registrationRef` REG-..., tidak ada UUID temp), filter company/branch/date/status bekerja.

### Frontend (my-app)
- `pages/front-office/questionnaire-results.vue` (baru): UTable pasien × questionnaire dengan filter bar (company/branch/date from/to/status), kolom Patient (nama + RM), Regist, Exam Date, Company, Branch, Questionnaire, Status (badge), Completion, aksi dropdown Lihat/Print. Modal detail memakai endpoint `GET /registration/number/:id_reg/questionnaires` + print via `window.open`. Pola pagination/display-control meniru `registration-patient/index.vue`.
- `constants/menu.ts`: tambah `/front-office/questionnaire-results` ke `frontOfficeAllowedRoutes` + menu item "Hasil Questionnaire" di Front Office.
- `layouts/default.vue`: tambah menu item "Hasil Questionnaire" di grup Front Office.
- `constants/seo/front-office.ts`: SEO entry baru.
- Verifikasi: lint bersih untuk file diubah, typecheck tidak ada error untuk file baru, route HTTP 200.

## Completed — 2026-08-06: Portal — Fix pilih Company di /registration (pasien baru)

- **Masalah**: company tidak bisa dipilih di dropdown `Appointment` (pasien baru).
- **Akar**: pola `onclick` + `onblur` (race) yang sama dengan bug branch — dropdown menutup sebelum klik item tercatat.
- **Fix** (`Appointment.svelte`): item dropdown company & branch diganti ke `onmousedown` + `e.preventDefault()` (seleksi sebelum blur). Proxy `/api/customers` sudah menyediakan data (verified: CUST001 Maju Jaya).
- Verifikasi: `/api/customers` 200, `Appointment.svelte` compile 200, `/registration` 200, svelte-check bersih.

## Completed — 2026-08-06: Portal — Fix pilih Branch di /registration

- **Masalah**: branch tidak bisa dipilih di portal `/registration`.
- **Akar**: daftar branch **hardcoded** + dropdown rentan race `onblur` (dropdown menutup sebelum klik item tercatat). BE `/branch` butuh JWT, tidak bisa dipakai portal.
- **Fix**:
  - BE: endpoint publik `GET /branch/public` (hanya api-key) → `{ branchId, nameBranch }` — service `getPublic`, controller `getPublicBranches`, route diletakkan sebelum `/:id`.
  - Portal: proxy baru `src/routes/api/branch/+server.ts` ke `/branch/public`; `BranchServiceSelect.svelte` fetch dinamis dari API dengan fallback daftar hardcoded.
  - Interaksi dropdown: item pakai `onmousedown` + `e.preventDefault()` (bukan `onclick`) agar seleksi terjadi sebelum blur menutup dropdown (Svelte 5 tidak dukung `|preventDefault`).
- Verifikasi: BE `/branch/public` 200 (10 branch), proxy portal `/api/branch` 200, `/registration` 200, svelte-check bersih untuk file diubah.

## Completed — 2026-08-06: FE Polish Questionnaire (toast ganda, lebar modal, filter MCU)

- **Double toast saat add questionnaire**: `AddModal.vue` memanggil `handleSuccess` sendiri (toast #1) + `BaseFormModal.onSubmit` juga menampilkan toast sukses `handleSuccessGeneral` (toast #2). Fix: hapus `handleSuccess` di `AddModal.submit` → andalkan toast dari `BaseFormModal` (pola sama dengan `branches/AddModal.vue`).
- **Lebar `CompanyMappingModal`**: `:ui="{ content: 'sm:max-w-4xl' }"`.
- **Trigger UModal v4**: default slot (bukan `#trigger`); `load()` dipicu `watch(open)`.
- **Dropdown questionnaire mengecualikan `portalKey === 'MCU'`** (sudah default di portal) — BE `toListItem`/`toDetail` kini mengekspos `portalKey`; data MCU Questionnaire di-update `portalKey='MCU'` via API.

## Completed — 2026-08-06: Questionnaire per Company/Branch di Portal Registrasi

**Perintah:** Portal registrasi harus menampilkan questionnaire sesuai company/branch yang dipilih pasien, sambil tetap menampilkan questionnaire MCU default.

### Keputusan Desain
- Questionnaire tampil **pisah** (satu questionnaire = satu step tambahan di stepper), bukan digabung.
- Satu company/branch boleh punya **banyak** mapping (beberapa questionnaire).
- Scope penuh: Backend (express_dash) + Portal (regist_portal) + UI manajemen (my-app).

### Backend (express_dash)
- `questionnaire.service.js`:
  - `getDefaultByCompany` kini **return array** (MCU default + semua mapping company/branch aktif) — tidak lagi return tunggal.
  - Tambah CRUD: `listCompanyMappings`, `createCompanyMapping`, `updateCompanyMapping`, `removeCompanyMapping`.
  - Helper: `toCompanyMapping`, `resolveCompanyNames`, `findFullById`.
- `questionnaire.repositories.js`: `findCompanyQuestionnaireMapping` ditambah param `questionnaireId`; tambah `findCompanyQuestionnaireMappings` (where companyId + isActive, OR branch null/branchId), `listCompanyQuestionnaireMappings`, `findCompanyQuestionnaireMappingById`, `createCompanyQuestionnaireMapping`, `updateCompanyQuestionnaireMapping`, `removeCompanyQuestionnaireMapping`.
- `questionnaire.controller.js`: expose `listCompanyMappings`, `createCompanyMapping`, `updateCompanyMapping`, `removeCompanyMapping`.
- Router baru `company-questionnaire.route.js` → CRUD di `/settings/company-questionnaires`, mount di `routers/index.js` dengan `ApiKeyMiddleware`.
- Model: `CompanyQuestionnaire` (`@@map("company_questionnaire")`, unique [companyId, branchId, questionnaireId], branchId nullable = berlaku semua branch).

### Portal (regist_portal)
- `MCUQuestionnaire.svelte`: props baru `questionnaire` (object pre-loaded, **tidak fetch ulang**), render dinamis; fix TS `e.target` → `e.currentTarget`.
- `+page.svelte` `/registration`: steps **dinamis via `$derived`** (baseSteps 2 + `questionnaires.map` + verification). State `questionnaires` array + `questionnaireAnswers` = `Record<questionnaireId, Record<qid, value>>`. `loadQuestionnaires()` fetch `/api/questionnaire/default?companyId=&branchId=` (return array). `next()` memuat saat keluar step Data Pasien (currentStep===1). `submit()` loop semua questionnaire dan kirim semua jawaban per questionnaire (null untuk kosong, optionId/optionIds/answerText).
- Verifikasi: `svelte-check` bebas error untuk file diubah; `vite build` sukses.

### Frontend my-app
- `components/questionnaire/CompanyMappingModal.vue` (baru): modal 2 mode (list & form) — kelola mapping company/branch/questionnaire (create/edit/delete). UTable v4: `TableColumn<Mapping>[]` + slot `#<id>-cell="{ row }"` memakai `row.original`.
- `pages/questionnaire/index.vue`: tombol "Mapping Per Company" ditambahkan di header (#right) sebelah tombol tambah questionnaire.
- `CompanyMappingModal.vue` (perbaikan): trigger memakai default slot UModal (bukan `#trigger`), `load()` di-trigger via `watch(open)`. Pilihan questionnaire **mengecualikan** yang ber-`portalKey: MCU` (sudah default muncul di portal) — BE `toListItem` kini mengekspos `portalKey`.

### Verifikasi
- BE: `node --check` semua file OK; uji service — return array, mapping dibuat/di-list/dihapus.
- my-app: `eslint` bersih + `nuxi typecheck` bebas error pada file baru (error lain pre-existing).
- Portal: `svelte-check` + `vite build` sukses.

Files: express_dash `src/services/questionnaire/questionnaire.service.js`, `src/repositories/questionnaire/questionnaire.repositories.js`, `src/controller/questionnaire/questionnaire.controller.js`, `src/routers/company-questionnaire/company-questionnaire.route.js`, `src/routers/index.js`; regist_portal `src/lib/components/registration/MCUQuestionnaire.svelte`, `src/routes/registration/+page.svelte`; my-app `app/components/questionnaire/CompanyMappingModal.vue`, `app/pages/questionnaire/index.vue`.

## Completed — 2026-08-06: Audit Alur FE → BE Questionnaire (index + builder)

**Perintah:** Cek alur `/questionnaire` dan `/questionnaire/[id]/builder` sampai backend.

### Peta alur
- **`/questionnaire`** → `GET /api/questionnaire` (list, kini sertakan `portalKey`) · `QuestionnaireAddModal` → `POST /api/questionnaire` · delete → `DELETE /api/questionnaire/:id`.
- **`/questionnaire/[id]/builder`** → `onMounted`: `GET /api/questionnaire/:id` · autosave header (debounce 1.5s) → `PUT /api/questionnaire/:id` (name/description/portalKey) · autosave sections (deep) → `PUT /api/questionnaire/:id/sections` (upsert + delete yang dihapus) · tombol Simpan → `PUT /api/questionnaire/:id/sections`.
- Semua route BE memakai `auth` + `permit("questionnaire:*")`; endpoint individual section/question/option masih ada tapi **tidak dipakai** builder (builder sync pohon utuh).

### Bug ditemukan & diperbaiki
1. **`toDetail` tidak mengekspos `portalKey`** → builder selalu load `portalKey=''`, lalu autosave header mengirim `portalKey: null` → **menghapus flag MCU** saat edit questionnaire. Fix: tambah `portalKey: q.portalKey` di `toDetail` (`questionnaire.service.js`).
2. **Data: `portalKey` MCU Questionnaire = NULL** → filter `portalKey !== 'MCU'` di CompanyMappingModal tidak jalan, badge portal di index kosong, dan default hanya tercapai lewat fallback. Fix data via `PUT /api/questionnaire/:id {"portalKey":"MCU"}`.

### Verifikasi live
- `GET /api/questionnaire` & `GET /api/questionnaire/:id` kini menampilkan `portalKey`.
- `PUT /api/questionnaire/:id` (header) persist portalKey=MCU.
- `PUT /api/questionnaire/:id/sections` roundtrip 2 section / 25 soal + conditional logic terjaga.
- `GET /api/questionnaire/public/default` memakai prioritas-1 (portalKey='MCU').

## Completed — 2026-08-06: Detail Registration — DOB, Questionnaire Dinamis, Status History

**Perintah:** `/front-office/registration-patient/[id]` — tambah DOB di Patient Information, Medical Questionnaire List dinamis (seperti di temp), dan cek apakah Status History benar-benar mencatat perubahan.

### 1. Patient Information — DOB
- Tambah field **Tanggal Lahir** di sebelah Gender (baris atas 4 kolom: Full Name | Gender | Tanggal Lahir | Contact Status).
- Helper `formatDob` + `parseLocalDate` (handle ISO UTC & format `YYYY-MM-DD`).

### 2. Medical Questionnaire List — dinamis
- Backend: endpoint baru `GET /registration/number/:id_reg/questionnaires` — refactor `getQuestionnaires()` generik di `public-registration.service.js`, query via `registrationId` pada `QstAnswer` (temp page pakai `regId`).
- FE: hapus array hardcoded → fetch dari BE + loading/empty state. Modal tampil jawaban asli per pertanyaan (ganti dummy Allergies/Medications).
- Verifikasi: `REG-20260805-01-0004` → MCU Questionnaire, Completed, 14 answers.

### 3. Status History — via tabel `diff_audit_logs`
- **Temuan awal:** `Registration` tidak punya `updatedAt` dan tidak ada tabel history; `updateStatus/reschedule/cancel` hanya overwrite field — tidak ada riwayat nyata.
- **Fix backend:**
  - `recordDiff()` ditambahkan di semua titik perubahan status: CREATE, updateStatus, reschedule, cancel (registration.service), checkin/undoCheckin/partialExam (queue.service), approve portal (public-registration.service).
  - Endpoint baru `GET /registration/number/:id_reg/status-history` — baca dari `diff_audit_logs` (`entity='Registration'`).
- **FE:** Status History dinamis dari endpoint, loading/empty state, menampilkan transisi status (`Open → Cancel`), auto-refresh setelah cancel/checkin/uncheck. **Urutan:** backend tetap `createdAt` asc (tidak diubah), FE pakai `statusHistoryDisplay` (`reverse()`) agar **terbaru tampil di atas** dengan dot biru di item teratas.
- **Actor:** `diff_audit_logs` kini diisi `actorId` + `actorRole` (via `resolveActor` di `audit.service.js`; semua titik perubahan status Registration meneruskan `req.user?.id`). `getStatusHistory` resolve `actorName` (join `User.name`); FE tampilkan nama + role di tiap item. Catatan: data audit lama (sebelum fix) tidak punya actor → tidak tampil.
- **Scroll:** container Status History pakai `max-h-72 overflow-y-auto` — riwayat panjang bisa di-scroll, item terbaru tetap di atas.

## Completed — 2026-08-06: Status History untuk RegistrationTemp (diff_audit_logs)

**Perintah:** `/front-office/registration-temp/[id]` — Status History dinamis mirip registration-patient, pakai `diff_audit_logs` entity `RegistrationTemp`.

### Backend (express_dash)
- **recordDiff** untuk entity `RegistrationTemp` di semua titik perubahan status:
  - `submitFromPublic` → **CREATE** (PENDING)
  - `markAsProcess` → **STATUS_CHANGE** PENDING → PROCESS
  - `resetToPending` → **STATUS_CHANGE** PROCESS → PENDING
  - `approveTemp` → **STATUS_CHANGE** PROCESS → APPROVED
  - `rejectTemp` → **STATUS_CHANGE** PENDING/APPROVED → REJECTED
- **Endpoint baru:** `GET /api/registration-temp/:id/status-history` — return `{ createdAt, currentStatus, history: [...] }` dengan `actorId`, `actorRole`, `actorName`.

### Frontend (my-app)
- **`registration-temp/[id].vue`**:
  - `loadStatusHistory()` fetch ke endpoint baru
  - `statusHistoryDisplay` computed (reverse → terbaru di atas)
  - Template menampilkan: label transisi (`PENDING → PROCESS` dsb), timestamp, actorName + actorRole, notes
  - Loading/empty state, scroll `max-h-72 overflow-y-auto`, dot biru di item teratas
  - Auto-load di `onMounted`

### Verifikasi
- Typecheck FE/BE bersih
- Test end-to-end: submit temp → process (PENDING→PROCESS) → approve (PROCESS→APPROVED) → status-history menampilkan transisi dengan `actorName: Super Admin`, `actorRole: superadmin`

Files: `app/pages/front-office/registration-temp/[id].vue`, express_dash `public-registration.service.js`, `public-registration.controller.js`, `public-registration.route.js`

## Completed — 2026-08-06: Status History untuk RegistrationTemp (diff_audit_logs)
- **Catatan:** data registrasi lama tidak punya history (hanya terisi untuk perubahan baru).

Files: `app/pages/front-office/registration-patient/[id].vue`, express_dash `registration.service.js`, `queue.service.js`, `public-registration.service.js`, `registration.route.js`, `registration.controller.js`

## Completed — 2026-08-06: Fix Invalid CSRF Token di Portal (submit pasien baru)

**Perintah:** Submit pasien baru di portal `/registration` muncul error `Invalid CSRF token`.

### Penyebab
- Duplikasi CSRF setup: `+layout.server.ts` DAN `+page.server.ts` (root `/`) dua-duanya generate `randomBytes()` + `cookies.set('csrf_token')` setiap load.
- Saat SPA **client-side navigation** (dari `/` → `/registration` via tombol Patient Portal), cookie `csrf_token` di-overwrite token baru di background, sementara `data.csrfToken` yang dipakai form masih token lama → mismatch → 403.
- Pasien existing lebih jarang kena karena melewati `/api/patient-search` dulu (refresh state); pasien baru submit langsung.

### Fix
- `+layout.server.ts`: token **stabil per sesi** — generate hanya jika cookie belum ada, tidak overwrite tiap load.
- Hapus `+page.server.ts` root (duplikasi; halaman home tidak mengonsumsi `data.csrfToken`).

### Verifikasi
- Buka `/` → cookie `7fe6...`; buka `/registration` (session sama) → cookie & token HTML tetap sama (sebelumnya berubah-ubah).
- POST `/api/patient` dengan token → lolos CSRF (respons 400 validasi field, bukan 403).

Files (regist_portal): `src/routes/+layout.server.ts`, `src/routes/+page.server.ts` (hapus)

## Completed — 2026-08-06: Alur Portal → FO Registration (companyId + approve → create + PROCESS status)

**Perintah:** Rapikan alur portal `/registration` sampai FO `/registration-patient`; companyId konsisten; approve → redirect create; MCU Breakdown terisi setelah simpan; status PROCESS.

### CompanyId konsisten (id format)
- Portal & create.vue kirim `companyId = String(customer.id)`.
- `registration.repositories.js`: JOIN company handle **dua format** (`codeCostumer` dan `id` numeric) di `findAll`, `findByRegNumber`, `findCheckinPreviewById` — kolom Company tampil untuk data lama & baru.
- `exam.service.js`: lookup company `OR [{ codeCostumer }, { id }]` + map keduanya; `getDoctorResult` resolve nama company (tidak raw id).

### Alur baru approve → create
- Approve di `/registration-temp` **tidak membuat registrasi** — set status **PROCESS** (endpoint `POST /:id/process`) lalu redirect ke `/registration-patient/create?tempId=...`.
- `create.vue`: prefill data dari temp (patient existing → ditampilkan sebagai pasien terpilih; patient baru → form terisi), FO pilih Paket MCU, **Simpan** → backend `approveTemp` (buat patient + Registration + address + company history) → buat exam → MCU Breakdown terisi.
- **Batal** di create → `POST /:id/reset` → status kembali **PENDING** → kembali ke detail temp.
- Status **PROCESS** tampil **biru** (`info`) di index & detail temp.
- `adminApproveSchema` + `approveTemp`: overwrite data pasien existing kini benar-benar diterima (sebelumnya di-strip Zod).

### Fix lain
- `registration-patient/index.vue`: `useTemplateRef`→`ref`, fix `accessorKey: 'idNumber'` (sorting kolom ID Number).
- Portal (`regist_portal`) `PatientSearch.svelte`: DOB patient existing bergeser 1 hari (ISO UTC `17:00Z` di-`slice`); fix `formatDobLocal()` via `new Date()` lokal.

Files: `app/pages/front-office/registration-patient/{index,create}.vue`, `app/pages/front-office/registration-temp/{index,[id]}.vue`

## Status history: tidak menulis log perubahan status

## Completed — 2026-08-05: Print Function Medical Questionnaires (FE)

**Perintah:** Tambahkan fungsi print di `/front-office/registration-temp/[id]` pada Medical Questionnaires List.

Implementasi:
- **Print All Results** (header tabel) — cetak daftar semua questionnaire Completed
- **Per-row print** (icon printer tiap baris) — cetak satu questionnaire dengan detail jawaban
- **Modal "Print Answers"** — cetak detail jawaban dari modal

Teknik: `window.print()` + CSS `@media print` (zero dependency, native browser print dialog, simpel).

File: `app/pages/front-office/registration-temp/[id].vue`

## Completed — 2026-08-05: Fix DOB "Invalid Date" + Tambahkan Tanggal Lahir di Patient Information

**Perintah:** DOB pada `/front-office/registration-temp/[id]` tampil `Invalid Date`; tambahkan DOB di Patient Information.

- Akar: `new Date(dob)` gagal parse format BE (`YYYY-MM-DD` / `YYYY-MM-DD HH:MM:SS`) → `Invalid Date`.
- Fix: `parseLocalDate()` (ISO dulu, lalu regex `YYYY-MM-DD` manual sebagai fallback).
- Tambahan field **Tanggal Lahir** di grid Patient Information (format `dd MMMM yyyy`).

File: `app/pages/front-office/registration-temp/[id].vue`

## Status history: tidak menulis log perubahan status

- `statusHistory` (line 167) adalah **computed display-only** — memodelkan ulang satu fetch `GET /registration-temp/:id`, tidak ada write/create/update record.
- Alur status saat ini: PENDING → **PROCESS** (klik Approve, redirect ke create) → **APPROVED** (klik Simpan di create, `approveTemp` dibuatkan Registration). Batal di create → **PENDING** kembali via `POST /:id/reset`.
- Perubahan status ditulis oleh **backend** via endpoint `POST /.../:id/process`, `/.../:id/approve`, `/.../:id/reject`, `/.../:id/reset`; FE hanya menampilkan `status`/`rejectedReason`/`updatedAt` hasil fetch.

## Completed — 2026-08-05: Fix Portal 404 — Routing SvelteKit Sub-path

**Akar masalah (tahap 2):** Setelah `portalKey` di-set, portal masih 404. Penyebab: logika proxy `/api/questionnaire/default` & `/api/questionnaire/:id` ditaruh DI DALAM `src/routes/api/questionnaire/+server.ts`, padahal SvelteKit hanya me-route **path persis** ke file itu — sub-path `/default` dan `/:id` TIDAK masuk ke file tersebut → SvelteKit 404. Hanya `/api/questionnaire/answers` yang bekerja karena punya file route sendiri.

Fix:
- Buat `src/routes/api/questionnaire/default/+server.ts` — proxy ke BE `/questionnaire/public/default?companyId=&branchId=`.
- Buat `src/routes/api/questionnaire/[id]/+server.ts` — proxy ke BE `/questionnaire/public/:id`.
- Sederhanakan `src/routes/api/questionnaire/+server.ts` — hanya tangani `/api/questionnaire?portalKey=` (legacy → BE `/public/active`).
- **Verifikasi curl:** `/api/questionnaire/default` → 200 (MCU Questionnaire), `/api/questionnaire/:id` → 200, `/api/questionnaire/answers` POST → 400 (validasi, route benar), `/api/questionnaire?portalKey=MCU` → 200.

## Completed — 2026-08-05: Fix Portal Gagal Memuat Kuesioner

**Akar masalah:** Kuesioner "MCU Questionnaire" di DB punya `portalKey = NULL` (dibuat sebelum field `portalKey` ditambahkan ke UI). Portal memanggil `/api/questionnaire/public/default?companyId=&branchId=` → BE fallback `findFirst({ isActive: true, portalKey: 'MCU' })` → tidak ketemu → 404 "Questionnaire default tidak ditemukan" → portal tampil "Gagal memuat kuesioner".

Fix:
- **Data:** `UPDATE qst_questionnaire SET portalKey='MCU' WHERE questionnaireCode='QST-001-001'`.
- **BE robust** (`getDefaultByCompany`): prioritas 1 = questionnaire `portalKey='MCU'`; prioritas 2 = questionnaire active pertama yang masih punya sections (fallback agar portal tidak gagal bila admin lupa set portalKey).
- **Verifikasi:** `GET /questionnaire/public/default` mengembalikan MCU Questionnaire (sections + questions); `POST /questionnaire/public/:id/submit` sukses (skip pertanyaan yang tidak valid). Test data dibersihkan.

## Completed — 2026-08-05: Fix Pertanyaan Hilang di Answers Questionnaire

**Akar masalah:** Portal hanya mengirim jawaban yang TERISI (`Object.entries(questionnaireAnswers)`), jadi pertanyaan yang tidak dijawab pasien (opsional/kosong) tidak pernah tercatat di `qst_answer` → tampak "hilang" di daftar answer.

Fix:
- **Portal** (`regist_portal/src/routes/registration/+page.svelte`): submit sekarang mengiterasi SEMUA pertanyaan dari `loadedQuestionnaire.sections` — pertanyaan terjawab dikirim sesuai tipe (radio/select → optionId, checkbox → optionIds, lainnya → answerText); pertanyaan kosong dikirim `answerText: null`. Kondisi submit juga diubah dari "ada jawaban" → "questionnaire ter-load".
- **BE** (`submitAnswers`): tambah dedup — `deleteAnswersForSubmission` (deleteMany by regId/registrationId + questionnaireId) sebelum insert, cegah duplikat bila pasien submit ulang/retry.
- **BE display** (`getTempQuestionnaires`): endpoint `/registration-temp/:id/questionnaires` menampilkan **hanya pertanyaan yang dijawab** (non-empty) — pertanyaan kosong tidak muncul. Storage tetap menyimpan semua pertanyaan (aman), display memfilter.
- **Keputusan user:** display answer → "Hanya pertanyaan yang dijawab".

## Completed — 2026-08-05: Full Code Review & Critical Bug Fixes**Review menyeluruh** dilakukan terhadap BE (express_dash), FE (my-app), dan Portal (regist_portal), dibandingkan dengan seluruh docs.

- 🔴 K1: **Restore model Qst\* + CompanyQuestionnaire di `schema.prisma`** — commit merge `6567627` menghapus semua model Qst (QstQuestionnaire/Section/Question/Option/Answer) + CompanyQuestionnaire dari schema, membuat `prisma validate`/`generate` gagal (`Registration.qstAnswers` mereferensikan model yang tidak ada). Restore penuh dari commit `7534d13` + opposite relation `companyQuestionnaires` di QstQuestionnaire. Prisma client di-regenerate → `prisma.companyQuestionnaire` tersedia. **`GET /questionnaire/public/default` kembali berfungsi.**
- 🔴 K2: **Portal proxy by-ID** (`regist_portal/src/routes/api/questionnaire/+server.ts`) — cek `segments.length === 2` padahal path `/api/questionnaire/:id` menghasilkan 3 segment → selalu 404. Diperbaiki menjadi `segments.length === 3 && segments[1] === 'questionnaire'`.
- 🔴 K4: **Tambah `DELETE /registration-temp/:id` di BE** — FE memanggil endpoint ini tapi tidak ada di route → 404. Tambah repo `deleteTemp`, service `deleteTemp`, controller `removeTemp`, route `DELETE /:id` (permission `registration:delete`).
- 🔴 K5: **Fix `POST/PATCH /patient/:id/history`** — route memakai `createPatientSchema.pick({companyId, startDate})` padahal `companyId` tidak ada di schema tersebut → 500. Diganti pakai `companyHistorySchema` yang sudah benar.
- 🔴 K3: **`assignments.vue`** — `api` undefined di module scope (hanya ada di dalam `refreshMyAssignment`) → sync room access diam-diam gagal. Tambah `const api = useApi()`.
- 🟠 S1: **Tambah `auth` middleware ke 8 router HRIS** — employeePersonal, employeeHealth, employeeDocument, employeeEmergencyContact, employeePosition, leave, shift, nationalHoliday. Sebelumnya hanya dilindungi API key (ada di bundle FE) → data PII terekspos.
- 🟠 S2: **Fix transaction boundary `approveTemp`** — `repo.createPatient` & `repo.updateTempStatus` kini menerima argumen `tx` sehingga ikut rollback bila transaksi gagal (sebelumnya pakai global prisma → orphan patient).
- 🟠 S3: **Fix autosave `portalKey`** — `watchDebounced` di `builder.vue` kini memasukkan `questionnairePortalKey` di watch sources (sebelumnya hanya title/description, jadi portalKey tidak tersimpan bila hanya field itu diubah).
- 🟠 S4: **Fix `handleError` typo** — `handlers.ts` memanggil `showError` (global Nuxt) padahal helper yang benar `showErrors` → error toast tidak pernah muncul. Diperbaiki.
- 🟠 S5: **Fix `rescheduleNote` user di-drop** — `rescheduleSampleValidation` kini menerima `rescheduleNote`, repo `rescheduleSample` menggunakannya (sebelumnya note hardcoded).
- 🟠 S6: **Filter `isActive`** di `getDefaultByCompany` — questionnaire non-aktif tidak lagi disajikan ke portal.
- Fix lain: duplicate `branchId` di `patient.validation.js`.

## Completed — 2026-08-05: Minor Fixes (M8, M7, M3, M14)

- 🟡 M8: **Hapus route `POST /api/email/test`** (open relay) + helper `$lib/server/email/test.ts` di portal — dead code, tidak ada caller.
- 🟡 M7: **Hapus blok komentar kredensial SMTP** (`website@kyoaims.com`/`Reg!@#123`) + import `MAIL_TO` unused di `regist_portal/src/routes/api/appointment/+server.ts`.
- 🟡 M3: **Tab `leave` kini tampil di profile settings** — tambah entry `{ id: 'leave' }` di `empTabs` (template & data `leaveBalanceData` sudah ada).
- 🟡 M14: **Ganti mock questionnaire di `registration-temp/[id].vue` dengan data asli**:
  - BE: endpoint baru `GET /registration-temp/:id/questionnaires` (repo/service/controller/route) — query `qst_answer` by `regId`, group by questionnaire, tambah default MCU sebagai Pending bila belum diisi.
  - FE: hapus mock `questionnaires` statis + modal isi statis; fetch data asli, render jawaban (`questionText` → `answerText`/`optionText`), status Completed/Pending.

## Completed

- FE: Room Queue menampilkan metadata pasien; Queue Work memuat detail pasien melalui GET /patient/:id dengan fallback data queue bila endpoint detail gagal.

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
- FE: Fix sample-collection — `:click`→`@click`, modal di luar panel, `[id].vue` import error. **(Resolved — sudah diverifikasi benar)**
- FE: Auth + Guest middleware — cek JWT expiry + fix infinite loop. **(Resolved — sudah diverifikasi benar)**
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
