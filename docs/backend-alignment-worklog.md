# Backend Alignment Worklog

Tanggal: 2026-07-10  
Scope: Menyamakan frontend, PRD, dan dokumentasi kerja dengan backend aktif di `C:\laragon\www\express_dash`.

## 2026-08-05 — Full Review (BE/FE/Portal) + Fix Bug Kritis

Audit menyeluruh ketiga codebase. Fix yang dilakukan:

1. **`schema.prisma` restore** — commit merge `6567627` menghapus semua model `Qst*` + `CompanyQuestionnaire` dari schema (tabel DB tetap ada via migration). `Registration.qstAnswers QstAnswer[]` menjadi referensi broken → `prisma validate`/`generate` gagal. Restore penuh dari commit `7534d13`, tambah opposite relation `companyQuestionnaires CompanyQuestionnaire[]` di `QstQuestionnaire`, lalu `prisma generate`. **Unblock `GET /questionnaire/public/default`.**

## 2026-08-05 — Print Function Medical Questionnaires (FE)

- Tambahkan fungsi print di halaman detail registrasi temporary (`/front-office/registration-temp/[id]`) pada section Medical Questionnaires List.
- Fitur: Print All Results (header), Print per-row (icon printer tiap baris), Print Answers (modal).
- Teknik: `window.print()` + CSS `@media print` — zero dependency, native browser print dialog.
- File: `app/pages/front-office/registration-temp/[id].vue`.

## 2026-08-05 — Fix DOB "Invalid Date" di Patient Information (FE)

- **Akar:** `dob` dari BE (format `YYYY-MM-DD` / MySQL `YYYY-MM-DD HH:MM:SS`) tidak dapat diparse `new Date()` konsisten di browser → render `Invalid Date`.
- **Fix:** tambah `parseLocalDate()` — coba `new Date(d)` dulu, bila Invalid Date lakukan regex `YYYY-MM-DD` manual → `new Date(YYYY, MM-1, DD)` (lokasi/angka positif, aman timezone). `fmtDate()` pakai parser ini; bila tetap gagal kembalikan raw string (graceful).
- Tambahan: field **Tanggal Lahir (DOB)** ditambahkan di grid Patient Information, format `dd MMMM yyyy` (mis. `15 Januari 1990`).
- File: `app/pages/front-office/registration-temp/[id].vue`.

## 2026-08-05 — Audit Modal Approve (FE)

**Pertanyaan:** "Untuk Approved, ada indikasi FO ditanya sudah pernah MCU di Kyoai belum?"

**Jawaban:** **Ada.** Di `registration-temp/index.vue` — modal status approve bertanya *"Apakah pasien sudah pernah MCU di Kyoai?"* dengan tombol **Ya** / **Tidak**.
- **Ya** → muncul patient search (nama/RM) → `selectPatient` mengisi `formApprove.patientId` → approve kirim `patientId` (pakai pasien existing).
- **Tidak** → `patientId` undefined → BE buat pasien baru.
- Ini selaras alur worklog: *"tanpa patientId → buat pasien baru, dengan patientId → pakai existing."*

**Re-order alur modal (sesuai permintaan):** blok "Apakah pasien sudah pernah MCU?" dipindah jadi elemen **pertama** (selalu tampil), **sebelum** "Pilih Status" — mengikuti marker `<!-- 🔥 PINDAHKAN KE SINI -->`. Jadi urutan modal jadi: (1) tanya Ya/Tidak MCU, (2) pilih status APPROVED/REJECTED, (3) form masing-masing (examDate+priority untuk APPROVED; reason untuk REJECTED), (4) konfirm. Blok ini dikeluarkan dari `v-if="selectedStatus === 'APPROVED'"` agar tampil sejak modal dibuka. Lint: 15 error semua pre-existing, tidak ada yang baru.

**Fix state-leak:** `watch(isStatusModalOpen)` (baris 438) sebelumnya reset `examDate`/`priorityRegist`/`rejectReason` tapi **tidak** `patientExists`/`selectedPatient`/`patientId`/`patientSearchQuery` → pasien dari sesi approve sebelumnya bocor ke baris berikutnya. Ditambah reset penuh di buka modal agar keputusan Ya/Tidak selalu clean per baris.
- File: `app/pages/front-office/registration-temp/index.vue`.

## 2026-08-05 — Fix "Ya" tidak munculkan patient search di modal approve (FE)

**Bug:** Klik **Ya** di *"Apakah pasien sudah pernah MCU di Kyoai?"* tidak ada respon — field pencarian pasien tidak muncul.

**Akar:** handler tombol `@click="formApprove.patientExists = true; clearPatient()"` — `clearPatient()` (baris 138) juga mengeset `formApprove.patientExists = false`, sehingga eksekusi berurutan `true → false` meniadakan pilihan Ya (toggle kembali false, `v-if="patientExists && !selectedPatient"` tetap false).

**Fix:** `clearPatient()` tidak lagi mereset `patientExists` — fungsinya hanya mengosongkan `selectedPatient` + `patientId`. Reset toggle Ya/Tidak dialihkan ke `watch(isStatusModalOpen)` (baris 438), jadi bersih per sesi modal terbuka. Flow sekarang:
- **Ya** → `patientExists=true`, `clearPatient()` bersihkan data (bukan toggle) → search muncul ✅
- **Tidak** → `patientExists=false` → search tersembunyi ✅
- **Ganti** pasca-pilih → `selectedPatient=null`, toggle tetap true → search re-open ✅
- File: `app/pages/front-office/registration-temp/index.vue`.

## 2026-08-05 — Full Review (BE/FE/Portal) + Fix Bug Kritis (lanjutan)

2. **Portal proxy by-ID** (`regist_portal/src/routes/api/questionnaire/+server.ts`) — bug segment count (2 vs 3) → `/api/questionnaire/:id` selalu 404. Fix ke `segments.length === 3 && segments[1] === 'questionnaire'`.
3. **`DELETE /registration-temp/:id`** — route BE tidak ada, FE memanggilnya (404). Tambah repo/service/controller/route.
4. **`POST/PATCH /patient/:id/history`** — `createPatientSchema.pick({companyId, startDate})` dengan key yang tidak ada → 500. Ganti ke `companyHistorySchema`.
5. **HRIS auth** — 8 router HRIS kini pakai `auth` middleware (sebelumnya hanya API key).
6. **`approveTemp` transaction** — `repo.createPatient`/`repo.updateTempStatus` terima `tx` (rollback benar).
7. **`rescheduleSampleValidation`** — terima `rescheduleNote`; repo pakai note user (bukan hardcoded).
8. **`getDefaultByCompany`** — filter `isActive`.
9. **FE fixes** — `assignments.vue` `const api = useApi()`, autosave `portalKey` watch source, `handleError`→`showErrors`.

## 2026-08-05 — Minor Fixes (M8, M7, M3, M14)

1. **M8 — hapus `POST /api/email/test`** — open relay, dead code. File `+server.ts` + `$lib/server/email/test.ts` dihapus.
2. **M7 — hapus kredensial SMTP di komentar** — `api/appointment/+server.ts` (blok komentar `website@kyoaims.com`/`Reg!@#123` + `sendMail` mati + import `MAIL_TO` unused).
3. **M3 — tab Leave di settings profile** — entry `{ id: 'leave' }` ditambahkan ke `empTabs` (`settings/index.vue`).
4. **M14 — questionnaire asli di detail registration-temp** — endpoint BE baru `GET /registration-temp/:id/questionnaires` (query `qst_answer` by `regId`, group per questionnaire, fallback default MCU sebagai Pending); FE `registration-temp/[id].vue` ganti mock + modal render jawaban asli.

## 2026-08-04 — Audit & Fix front-office registration (FE ↔ BE alignment)

### Temuan & Fix di `registration-temp/index.vue` (Approval Flow):

1. **Reject mismatch** — FE mengirim `rejectReason` saat reject, tapi BE `adminRejectSchema` membutuhkan field `reason`. Reject selalu gagal 422 "Alasan wajib diisi". **Fix:** ubah payload dari `rejectReason` → `reason` di `confirmChangeStatus`.
2. **Route `/pending` tidak ada** — FE `updateStatus` untuk status PENDING memanggil `POST /registration-temp/:id/pending` yang tidak ada di backend → 404. Status PENDING adalah status awal, bukan target perubahan. **Fix:** hapus branch PENDING dari `updateStatus`, hapus opsi PENDING dari dropdown status modal, guard `isFormValid` return `false` jika status kosong, default badge click untuk PENDING rows kosongkan selectedStatus.
3. **Field name mismatch (rejectReason → rejectedReason)** — Prisma model pakai `rejectedReason` tapi FE type `TempRegist` memakai `rejectReason` dan update lokal `rejectReason: formReject.rejectReason`. **Fix:** type & update lokal pakai `rejectedReason`.

### Temuan & Fix di `registration-temp/[id].vue` (Detail Page):

1. **Dead code** — `cancelRegistration`, `checkinPatient`, `isCancelled`, `isCheckedIn`, `isMCU` tidak terpakai di template dan mereferensikan `statusRegistration` yang tidak ada di response temp (temp pakai `status`). **Fix:** hapus dead code + unused refs.
2. **Field mismatch `statusRegistration`** — `statusHistory` menggunakan `reg.value.statusRegistration` (undefined untuk temp). **Fix:** ganti ke `reg.value.status` + tambah status history REJECTED.
3. **Field mismatch `reg.patient`** — Response temp tidak mengembalikan relasi `patient`. Header "ID: `reg.patient.patientCode`" tidak tampil. **Fix:** tampilkan `reg.patientId` atau fallback.
4. **`registrationId` null** — Sebelum approve, `registrationId` null; "Service No." kosong. **Fix:** fallback `'-'`.
5. **Type `idValue: number`** — Response berisi string. **Fix:** ganti ke `string`.
6. **`toast` unused** setelah hapus action. **Fix:** hapus import.
7. **`statusRegistration` dihapus dari type** (field tidak ada di response temp).

### Nota:
- Lint: semua error pre-existing (pola `any`, `unused-vars`, stylistic).
- Typecheck: error pre-existing (`table` implicit any, dsb). Perubahan tidak menambah error baru.
- `create.vue` + `index.vue` flow create patient → registration → exam sudah terverifikasi via API.
- `registration-patient/[id].vue` fetch dari `/registration/number/:id_reg` → response includes patient/branch/company/exam/queue. `examType` top-level tidak di-expose BE; FE pakai fallback computed berdasarkan `serviceType`. Non-blocker.
- `registration-patient/create.vue` → `scheduleDateExam` default hari ini, tidak ditampilkan di form. Non-blocker.

## 2026-08-04 — Back-fill `QstAnswer.registrationId` saat approve

`QstAnswer.registrationId` selalu NULL karena jawaban MCU disubmit portal **sebelum** approve (Registration belum ada), dan approve tidak pernah meng-update `qst_answer`. Traceability sebelumnya hanya via `regId` → `RegistrationTemp.registrationId`.

Fix: di `approveTemp` (`public-registration.service.js`), dalam transaksi setelah Registration dibuat, tambah `tx.qstAnswer.updateMany({ where: { regId: temp.id }, data: { registrationId: reg.id } })`.

Verifikasi E2E: register → submit 2 jawaban (`registrationId` NULL) → approve → kedua baris `qst_answer.registrationId` terisi id Registration (`70`/`REG-20260804-01-0002`). Data test dibersihkan.

## 2026-08-04 — Verifikasi E2E alur portal → MCU → FO approve

Jalankan backend (`:8000`) + portal (`:5173`), verifikasi end-to-end seluruh alur registrasi portal hingga approve front-office:

1. **Registrasi** — `POST /api/public/register/01` (api-key) → `RegistrationTemp` dibuat dengan `refCode` = UUID id. Respon `{ success, data: { refCode, patientExists } }` sesuai yang dibaca portal.
2. **Submit kuesioner MCU** — `POST /api/questionnaire/public/:id/submit` dengan `regId` = refCode → jawaban masuk `qst_answer`. **Bug ditemukan:** kolom `QstAnswer.regId` hanya `VarChar(20)` tapi refCode UUID 36-char → error "value is too long". Fix: schema + migration → `VarChar(100)` (`20260804000000_widen_qst_answer_regid`). Re-generate Prisma client + restart BE.
3. **FO approve** — `POST /api/registration-temp/:id/approve` (JWT superadmin) → Patient (`PAT-…-…-…`) + Registration (`REG-…`) + Address (dari addressTemp) + PatientCompanyHistory dibuat. ✓
4. **Jawaban** tersimpan benar dengan `regId` = refCode, terkait ke temp/registrasi. ✓

Catatan:
- Header API key yang benar adalah `api-key-kyo` (bukan `x-api-key`).
- `maritalStatus` harus uppercase enum Prisma (`SINGLE/MARRIED/DIVORCED`); portal mengirim uppercase → aman.
- Email SMTP (`web13-cpn.neohosting.id:465`) timeout dari lokal — env, bukan bug kode; worker queue jalan.
- Sebelumnya bug header api-key di curl test bukan bug aplikasi.
- Data test E2E dibersihkan dari DB setelah verifikasi.

## 2026-07-31 — Audit & Fix alur /registration (tahap 3: sinkronisasi & pengamanan)

Berdasarkan keputusan: cek DB lalu sinkronkan; pasang api-key middleware; naikkan rate limit; cegah email duplikat.

1. **Cek DB branch** — query Prisma: DB live ternyata **sudah punya semua 10 branch** (`01–10`) dengan nama/alamat aktual. Seed `seed.js` ketinggalan (hanya 5) → di-sinkronkan ke 10 branch dan loop upsert diubah jadi `findFirst by branchId → update/create` (sebelumnya `upsert where id` berisiko duplikat karena `id` di DB memakai UUID).
2. **`ApiKeyMiddleware` di `/public/register`** — `routers/index.js` sekarang `.use("/public/register", ApiKeyMiddleware, publicRegistrationRouter)`. Key portal (`PUBLIC_API_KEY`) terverifikasi sama dengan BE (`API_KEY`) → aman.
3. **Rate limit** — `public-registration.route.js`: `max: 5` → `max: 20` per 10 menit per IP.
4. **Email duplikat saat approve** — `public-registration.service.js`: saat buat pasien baru, jika `temp.email` sudah dipakai pasien lain → email di-null-kan (hindari gagal karena `Patient.email @unique`); approval tetap jalan.

Masih terbuka: info kontak branch `04` (Clinique Suisse) untuk `template.ts` portal (`clinicLocations` belum punya entry 04).

## 2026-07-31 — Re-audit alur /registration: fix temuan sisa

Re-audit penuh setelah semua fix sebelumnya. Temuan sisa yang diperbaiki:

1. **`notes` (MCU "Puasa 8 jam") tidak sampai ke BE** — `appointmentSchema` punya `notes` dan `+page.svelte` set nilai untuk MCU, tapi `mapToBackend` tidak meneruskan. Fix: tambah `notes?: string` di `FormData`/`BackendPayload` + `notes: form.notes || undefined` di `mapper.ts`; tambah `notes: ""` di store `form.ts` + `defaultForm()` `+page.svelte` (juga menghilangkan TS error pre-existing `registration/+page.svelte:235`).
2. **Link dashboard email admin rusak** — `public-registration.service.js`: path diubah ke `/front-office/registration-temp/${temp.id}` (cocok route my-app); `DASHBOARD_URL=http://localhost:3000` ditambahkan di `.env` BE (sebelumnya tidak ada → link `undefined/...`).
3. **`patient-search` tidak uppercase `idNumber`** — `patient-search/+server.ts` kini `.trim().toUpperCase()` (stored idNumber uppercase di BE; passport huruf kecil sebelumnya tidak ketemu).
4. **Dedup email admin** — portal `sendPatientRegistrationEmails` tidak lagi kirim email admin (dibuang, `admin: null`); notifikasi admin ditangani BE `adminNewSubmission` (dengan link dashboard). `getAdminRecipient` import dihapus dari `patient.ts`.

Koreksi: temuan "timezone bug examDate" sebelumnya ternyata bukan bug (UTC+7 tetap tanggal sama; hari ini tetap diizinkan, konsisten portal & BE).

## 2026-08-03 — Portal /registration: null-tolerant + stepper

1. **BE validasi null** — `public-registration.validation.js`: field optional (`middleName`, `email`, `maritalStatus`, `addressType`, `detail`, `note`, `district`, `addressCity/Province/Country`, `position`, `companyName`, `notes`) diubah `.optional()` → `.nullish()` agar menerima `null` (sebelumnya "Invalid input: expected string, received null"). Service memakai `?? null`/`|| null` sehingga aman. Diverifikasi via HTTP (payload dengan null → sukses).
2. **Stepper /RegButton fix** — `RegButton.svelte`: (a) tombol Back `disabled` di `currentStep === 0` (sebelumnya `=== 1` → Back mati di step Data Pasien padahal bukan step pertama); (b) `isLast = currentStep === totalStep - 1` (sebelumnya `=== totalStep`, tidak pernah true karena currentStep 0-based → panah " →" selalu tampil di Submit).
3. Observasi (belum diubah): label step "MCU Questionnaire" / subtitle "Medical History" tidak sesuai konten step 2 (PersonalInfo + ContactInfo + Appointment editable, tanpa field medical history).

## 2026-08-03 — Portal /registration: MCU Questionnaire integration

1. **BE: `portalKey` di QstQuestionnaire** — tambah kolom `portalKey String?` + migration + `db push` + restart BE. Set `portalKey='MCU'` di kuesioner existing "MCU Questionnaire".
2. **BE: Endpoint publik (api-key saja, tanpa JWT)** — ditambahkan ke router `questionnaire`:
   - `GET /questionnaire/public/active?portalKey=MCU` → ambil kuesioner aktif (sections/questions/options) tanpa auth JWT.
   - `POST /questionnaire/public/:id/submit` → simpan jawaban (pakai `regId` = temp refCode untuk traceability).
3. **BE: Create/Update mendukung `portalKey`** — service create/update terima `payload.portalKey` untuk manajemen kuesioner portal.
4. **Portal: Route proxy** — `src/routes/api/questionnaire/+server.ts` (GET) + `src/routes/api/questionnaire/answers/+server.ts` (POST) proxy ke BE publik.
5. **Portal: Komponen `MCUQuestionnaire.svelte`** — fetch kuesioner aktif, render sections/questions/options dengan input `value+oninput` (hindari `bind:value` pada properti dinamis), `shouldShow` untuk conditional logic, `bind:answers` + `bind:questionnaireId` dipakai parent.
6. **Portal: Step 2 "MCU Questionnaire"** — ganti tampilan step 2 dari data pasien (sudah di step 1) ke kuesioner interaktif. State `questionnaireAnswers` + `loadedQuestionnaireId` disimpan di `+page.svelte`.
7. **Portal: Submit jawaban** — setelah `/api/patient` sukses, POST jawaban ke `/api/questionnaire/answers` dengan `regId` = `refCode` (temp refCode). Gagalnya tidak membatalkan registrasi.
8. **Cleanup** — hapus import tidak terpakai (PersonalInfo, ContactInfo, Appointment di +page). Lint + svelte-check bersih.

## 2026-07-31 — Branch 04 di template email portal

- `regist_portal/src/lib/server/email/template.ts`: tambah entry `"04"` (Clinique Suisse Jakarta) ke `clinicLocations` — alamat sama dengan 01 (Wisma Keiai), telp/WhatsApp `085195562898` (WA `6285195562898`), email kosong, map `https://maps.app.goo.gl/9DmpZtgKQhU83qDK7`.
- Baris Email di contact-box kini kondisional (`emailRow`) — branch tanpa email tidak render `mailto:` kosong.
- Tambah helper `telHref()` — buang `0` di awal + prefix `+62`, sehingga link `tel:` benar (mis. `085195562898` → `tel:+6285195562898`; `021-5724330` → `tel:+62215724330`).

## 2026-07-31 — Audit & Fix alur /registration (lanjutan, non-blocker)

Fix level kode dari temuan audit non-blocker:

1. **refCode response mismatch** — BE mengembalikan `{ success, data: { refCode, ... } }` tapi portal membaca `backendResult.refCode` (top-level) → `undefined`. Fix: `regist_portal/src/routes/api/patient/+server.ts` baca `backendResult.data?.refCode` / `data?.patientExists`.
2. **`patient-lookup` BE mengabaikan dob** — `public-registration.service.js` `lookupPatient` sekarang memverifikasi tanggal lahir (YYYY-MM-DD dari portal vs `patient.dob`), cocok → return patient, tidak cocok → null.
3. **Hardcoded tanggal `2025-10-24/25/26`** di `Appointment.svelte` (stale) — `showCustomDate` kini memakai `tomorrowStr/day2Str/day3Str` dinamis.
4. **Dead code `submitToBackend`** di `mapper.ts` — dihapus beserta import `ENV` yang tidak terpakai.

Temuan audit yang masih terbuka (butuh data/keputusan): cakupan branch portal 10 vs seed BE 5 (`04/06/08/09/10` berisiko "Branch tidak ditemukan"); `clinicLocations` portal `template.ts` tidak punya branch `04` (email fallback Wisma Keiai); validasi `examDate` memakai parse UTC (`new Date("YYYY-MM-DD")`) sehingga hari ini ditolak — tapi portal & BE konsisten dan UI `min=tomorrow`, jadi bukan mismatch aktif; `api-key-kyo` tidak divalidasi di `/public/register` (router tanpa `ApiKeyMiddleware`); rate limit 5 submit/10 menit; `Patient.email @unique` bisa bikin approve gagal bila email sudah dipakai pasien lain.

## 2026-07-31 — Audit & Fix alur /registration (portal → BE)

Audit menyeluruh alur registrasi portal → express_dash menemukan blocker + mismatch; fix 3 blocker di portal:

1. **Phone format mismatch** — portal mengizinkan `+62 812-3456-7890`/`0812-3456-7890` (spasi/dash) sedangkan BE strict `/^(\+62|62|0)8[1-9][0-9]{6,10}$/`. Fix: `mapper.ts` tambah `normalizePhone()` (strip spasi/dash/tanda kurung) sebelum dikirim.
2. **Gender "Other"** — dropdown portal punya opsi `Other` tapi BE hanya `male`/`female`. Fix: hapus opsi `Other` di `PersonalInfo.svelte`.
3. **AddressType "WORK"** — portal punya opsi `WORK` tapi enum BE hanya `HOME/OFFICE/BILLING/OTHER` → address di-skip diam-diam. Fix: `mapper.ts` map `WORK → OFFICE`; `PatientSearch.svelte` typeMap `BILLING → OTHER` (dulu `→ WORK`).

Temuan audit lain yang belum difix (dilaporkan, bukan blocker): `refCode` response BE nested di `data` tapi portal baca top-level (`+server.ts`); cakupan branch portal 10 vs seed BE 5 (04/06/08/09/10 berisiko tidak ditemukan); `clinicLocations` portal `template.ts` tidak punya branch `04` (email fallback ke Wisma Keiai); bug timezone validasi `examDate` BE (UTC vs WIB, tanggal hari ini ditolak); `patient-lookup` BE mengabaikan `dob`; hardcoded tanggal `2025-10-24/25/26` di `Appointment.svelte`; `submitToBackend` dead code di `mapper.ts`.

## 2026-07-31 — Uniform Email Template (referensi portal)

- Keputusan: template email "Registration Received" memakai template portal `regist_portal/src/lib/server/email/template.ts`.
- Semua template email di `express_dash/src/lib/email-templates/` di-rewrite mengikuti layout portal tersebut (header gradient + logo, thank-you box, registration-info, details-table, important-note, contact box, social media, footer) dengan isi menyesuaikan subject masing-masing:
  - `registration-received.js` — accent biru, detail pendaftaran (nama, no. referensi, lokasi, layanan, tanggal).
  - `admin-new-submission.js` — accent biru, tabel detail + badge status pasien + tombol "Lihat di Dashboard" + notifikasi hangus 24 jam.
  - `appointment-confirmed.js` — accent hijau, detail pemeriksaan (no. registrasi/service, lokasi, layanan, tanggal).
  - `registration-rejected.js` — accent merah, alasan penolakan.
- Setiap template menambah helper `formatDateIndonesian` (format `d Bulan yyyy`) dan konstanta kontak (telp/WhatsApp/email).
- Verifikasi: `node --check` semua file lolos, render smoke test keempat template OK.
- Worklog di `express_dash/docs/bmad/task-status.md` diupdate.
- BE: hematkan duplikat email — `public-registration.service.js` tidak lagi mengirim `registrationReceived` ke pasien; email konfirmasi pendaftaran ke pasien hanya dikirim oleh portal pakai `template.ts`. Template `registrationReceived` tetap terdaftar di `express_dash/src/lib/email.js` sebagai referensi siap pakai.

## History Pengerjaan

1. Backend repository diperiksa untuk route, router mount, dan schema Prisma yang aktif.
2. Ditemukan bahwa backend aktif melayani API di `/api` pada port `8000`.
3. Ditemukan bahwa `mst_department` hanya memiliki field `code` dan `name`; field `type` belum ada di schema aktif.
4. Frontend `/departments` yang sempat ditambahkan field `type` disesuaikan agar tidak mengirim payload yang tidak didukung backend.
5. Backend Prisma schema diperbarui dengan enum `DataType` berisi `office` dan `medical`, lalu `MstDepartment` mendapat field `type`.
6. Migration SQL dibuat untuk menambahkan kolom `type` ke tabel `mst_department` dengan default aman `medical`.
7. Frontend `/departments` diperbarui lagi untuk mengirim dan menampilkan `type`, lalu halaman edit department ditambahkan supaya action list tidak dead link.
8. PRD diperbarui untuk merekam kontrak backend aktual dan kebutuhan type department.
9. Dokumen alur kerja agent disiapkan untuk menjaga urutan kerja Project Manager sampai Tester.
10. Lint frontend dijalankan ulang dan lulus pada file yang tersentuh.
11. Prisma client backend berhasil digenerate ulang setelah proses backend sempat dihentikan sementara untuk melepas lock file engine.
12. Backend dev server di port 8000 dinyalakan kembali setelah generate selesai.
13. Endpoint `GET /medical/departments/:id` diperbaiki agar record yang tidak ada mengembalikan 404, bukan error generik.
14. Halaman edit department menampilkan pesan error backend yang sebenarnya supaya kasus fetch gagal tidak selalu terbaca sebagai not found.
15. Repository backend department diperbaiki agar `id` UUID tidak lagi di-cast ke `Number()`, yang sebelumnya memicu 500 saat membuka detail/edit department.
16. Tampilan edit department dipindahkan ke modal dari halaman list `/departments`, dengan data row dipakai langsung tanpa fetch detail ulang.
17. Halaman `/front-office/registration-patient/create` diperbaiki: create patient kini mengirim `branchId` numerik, prioritas diselaraskan ke kontrak backend `Emegency`, mapping company tetap memakai `codeCostumer`, dan submit flow dirapikan agar lolos lint.
18. Opsi department di `/items/groups` dan modal add item `/items/mcu` dibatasi hanya menampilkan department bertipe `medical`.
19. Halaman `/settings/permissions` diubah menjadi role permissions manager bergaya matrix agar lebih mendekati referensi visual yang diberikan user.
20. Wrapper halaman `/settings` dibuat responsif per-route supaya `/settings/permissions` dan `/settings/roles` bisa memakai lebar penuh.
21. Setelah review ulang, `/settings/roles` dikembalikan ke layout compact dan difokuskan ke daftar role plus add role, tanpa duplikasi edit permission.
22. Role list di `/settings/roles` ditambah link pada jumlah permission dan tombol delete role, lalu backend diberi endpoint delete role agar aksi benar-benar bekerja.
23. Jumlah permission pada role tertentu kini mengirim `roleId` ke `/settings/permissions`, dan role list mendapat tombol edit role dengan backend update endpoint.
24. `/settings/permissions` sekarang punya tombol `Manage Actions` untuk CRUD action yang dipakai di matrix permission, dengan penyimpanan lokal agar daftar action bisa diatur dari UI.
25. Backend ditambah master `mst_document_type` dan endpoint `/settings/document-types`, lalu `/settings/permissions` frontend menggabungkan master document type dengan permission yang sudah ada agar document type kosong tetap tampil.
26. `/settings/permissions` ditambah tombol `Add DocType` yang menyimpan document type baru ke backend lewat `/settings/document-types`.
27. Tombol dan modal `Add A New Rule` dihapus dari `/settings/permissions` karena fungsi create/assign permission sudah dilakukan dari matrix checkbox, lalu tombol `Add DocType` dibuat putih.
28. Kolom `Level` di `/settings/permissions` diubah agar menampilkan nilai `id` dari role yang sedang dipilih.

## Status Saat Ini

- PRD sudah mengacu ke backend aktif dan menyebut type department.
- `/departments` frontend memakai type `office` dan `medical`.
- Edit department sekarang dibuka sebagai modal dari list `/departments`.
- Backend schema dan migration untuk department type sudah dibuat.
- Prisma client backend sudah sinkron dengan schema terbaru.
- Backend dev server kembali aktif di port 8000.
- Department detail endpoint sekarang mengembalikan 404 saat id tidak ditemukan.
- Repository department memakai string UUID untuk find/update/delete.
- Workflow agent dari Project Manager sampai Tester sudah terdokumentasi.
- Halaman create registration patient sudah selaras dengan kontrak backend untuk create patient dan registration.
- Dropdown department pada item/group hanya menampilkan data medical.
- `/settings/permissions` kini memakai tampilan matrix role-permission yang lebih mendekati screenshot referensi.
- `/settings/permissions` dan `/settings/roles` sekarang memakai layout full width di bawah wrapper settings.
- `/settings/roles` fokus ke role list dan add role, sedangkan edit permission tetap di `/settings/permissions`.
- Jumlah permission pada role list menjadi link ke `/settings/permissions`, dan role bisa dihapus dari page roles.
- Klik jumlah permission di roles akan membuka permissions page dengan role terkait sudah terpilih.
- `/settings/permissions` punya manager action CRUD di level UI untuk menambah, mengubah, dan menghapus action.
- `/settings/permissions` sekarang membaca master document type dari backend sehingga document type dapat tampil walaupun belum memiliki permission.
- `/settings/permissions` sekarang bisa menambahkan document type langsung dari UI.
- `/settings/permissions` tidak lagi menampilkan flow `Add A New Rule`.
- Kolom `Level` pada matrix permissions sekarang mengikuti `role.id` terpilih.

## Catatan

- Semua perubahan lanjutan harus dicatat di worklog berikutnya dengan status yang jelas.

## Next Step

- Validasi runtime backend setelah schema dan migration diterapkan.
- Review apakah ada route frontend lain yang masih mengasumsikan field backend yang tidak ada.
