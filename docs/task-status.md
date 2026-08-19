# Project Task Status

Last updated: 2026-08-19

## Completed — 2026-08-19: Tambah role dokter-gigi (menu hasil dental utk dokter1)

- **Masalah:** menu "Hasil Exam Dental" tak tampil utk dokter1 (user 6) walau sudah punya `user_result_access` dept Dental. Penyebab: role user = `dokter` → `roleDefaultDepartment['dokter']='DOK'` → filter Results group cuma tampilkan dept DOK, dental disembunyikan. Role `dokter-gigi` (default DENTAL) tak ada.
- **DB `express_dash`:**
  - Buat role `dokter-gigi` (id 9), copy 10 permission dari role `dokter` (termasuk `exam:read`, `exam:update`, `queue:*`, `patient:read`, `room:read`, `audit:read`, `exam:doctor-result:*`).
  - Pindahkan user6 (`dokter1@kyoai.com`) dari role `dokter` → `dokter-gigi`.
  - Flush redis cache `user:permissions:6`.
- **FE `my-app` `constants/menu.ts`:** tambah `'dokter-gigi'` ke `restrictedRoles` (utk konsisten restricted seperti dokter; `roleDefaultDepartment['dokter-gigi']='DENTAL'` sudah ada).
- **Hasil:** dokter1 login → role dokter-gigi → restricted (allowedRoutes termasuk `/result/exam-results`) + default dept DENTAL → "Hasil Exam Dental" tampil.
- **Note cache role:** role `dokter-gigi` dibuat via Prisma langsung, bukan `roleRepo.createRole`, sehingga cache Redis `roles:all` tak ter-invalidate. `/settings/roles` belum menampilkan role sampai cache `roles:all` di-flush. Setelah flush → role muncul di list.

## Completed — 2026-08-19: Fix "Submit & Release" dental — submit pakai draft tersimpan

- **Masalah:** `/result/exam-results?department=dental` — klik "Submit & Release" error `Hasil dental belum lengkap` padahal data dental sudah terisi (Stain, 2 findings). Penyebab: `DentalResultPanel.submitResult()` kirim payload `{}` ke `POST /dental/submit` (data disimpan panel di DB, tapi submit di-render ulang dari kosong). Backend `submitDentalExam` validasi & butuh field non-kosong dari request → dianggap kosong.
- **Perbaikan backend `express_dash/src/services/dental/dental.service.js` (`submitDentalExam`):**
  - Tambah `_mergeDentalPayload(parsed, existingDental)` — gabung payload request dgn draft `DentalExam` tersimpan di DB. Field kosong/submit-ulang diisi dari DB.
  - Validasi kelengkapan kini pakai `effective` (payload gabungan draft).
- **Verifikasi (live):** `submitDentalExam('92d0735d', {})` → `{success:true, SUBMITTED}`; item dental → `SUBMITTED`; dept Dental (`8c63833a`) → `DEPARTMENT_REVIEW`.
- **Catatan:** FE `submitResult` tetap kirim `{}` — sekarang benar karena backend baca draft. (Alternatif jangka panjang: kartu submit mengirim data terkini; tak wajib.)

## Completed — 2026-08-19: Audit & fix alur dental (queue-work → approval)

- **Latar:** Alur dental di queue-work (`show-submit=false`) hanya Simpan Draft (`POST /dental`); item di-done tanpa submit → dental tak masuk workflow approval. Selain itu done item dental tidak validasi dental tersimpan (bisa done walau kosong).
- **A — cegah done dental kosong (`express_dash/src/services/roomExamItem/roomExamItem.service.js`):**
  - Tambah helper `isDentalExamEmpty(dentalExam)` (ekstra oral/intra oral/oral tandai normal, tak ada findings, tak ada note/comment).
  - Di `doneItem`, cabang `isDental` → wajib `DentalExam` tersimpan (bukan kosong), else `400 "Hasil pemeriksaan gigi belum diisi..."`.
- **B — auto submit dental saat selesaikan room (`my-app/app/pages/rooms/queue-work/[id].vue`):**
  - `handleFinishStage` setelah `PATCH stage/:id/done` → loop dental items yang belum `SUBMITTED` → `POST /mcu/exams/:examId/dental/submit` (best-effort, dedupe per examId, non-blocking).
  - Efek: "Selesaikan Room" dental → dental otomatis masuk workflow department (dept REVIEW), tidak harus buka /result dulu.
- **Alur dental final:**
  ```
  queue-work dental:
    Mulai Pemeriksaan → isi gigi → Simpan Draft → Selesaikan Item (wajib dental terisi) → Selesaikan Room (auto submit /dental/submit → dept REVIEW → approval)
  ```
- **Verifikasi:** backend service import OK & restart bersih. Typecheck FE tetap (error pre-existing di file lain).

## Completed — 2026-08-19: Dokter luar submit → dept result dibuat utk approval nurse

- **Latar:** Item ECG dept Nurse diisi dokter luar (`fillExternalResult`) → `resultStatus=SUBMITTED` + `externalResultAssignment=FILLED`, tapi **tidak membuat `ExamDepartmentResult`** → dept Nurse tak punya status `DEPARTMENT_REVIEW` → tak bisa approve.
- **Perubahan `express_dash/src/services/exam/exam.service.js`:**
  - Tambah `ensureExternalDeptReview(examId, examItemId, userId)` — upsert `ExamDepartmentResult` status `DEPARTMENT_REVIEW` + currentStepOrder dari workflow + action `SUBMIT` (source external).
  - Di `fillExternalResult`, saat `submit !== false` dan ada `examItemId` → panggil `ensureExternalDeptReview` (best-effort, non-blocking).
- **Verifikasi (live):** re-submit ECG dokter luar (user 9) → `exam_department_result` terbuat `{status:DEPARTMENT_REVIEW, step:1, sub:9}`. Nurse (dept 77630803) kini bisa approve (empat-mata: 9 ≠ nurse).
- **Note:** Fix hanya utk submit external yang terjadi SETELAH ini. Data lama yang sudah FILLED (mis. exam `92d0735d`) tetap tanpa dept result sampai re-submit atau dibuat manual.

## Completed — 2026-08-19: Alur Sample Collection → EXAM otomatis DONE (LAB)

- **Latar:** Skema ruangan LAB: Room Sample Collection (stage COLLECT) → Room Sample Receive/Reception (stage RECEIVE) → Result Exam LAB (stage EXAM). Hasil lab diisi di `/result/exam-results`, bukan di workroom. Alur lama: COLLECT DONE → RECEIVE WAITING; RECEIVE DONE → EXAM WAITING (harus di-start & diisi di workroom terpisah) → EXAM nyangkut WAITING.
- **Perubahan `express_dash/src/repositories/queue/queue.repository.js` (fungsi `_completeReceivePhaseIfReady`):**
  - Saat semua sample `RECEIVED` → RECEIVE stage DONE, **EXAM stage otomatis DONE** (sebelumnya hanya `WAITING`).
  - **`RoomQueueItem` → `DONE`** + `doneAt` (sebelumnya `WAITING`).
- **Alur final:**
  ```
  COLLECT DONE → RECEIVE WAITING
  RECEIVE DONE → EXAM otomatis DONE (room queue Selesai)
  ```
- **Verifikasi (live repo):** sample di-reset COLLECTED → `receiveSample` → RoomQueueItem `DONE`, stages `RECEIVE:DONE COLLECT:DONE EXAM:DONE` (sebelum: EXAM:WAITING).
- **Catatan:** fix tidak backfill data lama. Pasien yang sudah COLLECT+RECEIVE DONE sebelum fix tetap EXAM `WAITING` di DB. Backfill opsional: RoomQueueItem LAB dgn COLLECT DONE & RECEIVE DONE & semua sample RECEIVED → set EXAM & room jadi DONE.
- No perubahan DB/migrasi. Backend `npx prisma generate` tidak diperlukan (tidak ada perubahan schema).

## Completed — 2026-08-19: Workflow & Approval Departemen (Opsi A penuh, approval result Lab)

- **Latar:** Alur approval dept (`DEPARTMENT_REVIEW → DEPARTMENT_APPROVED`) tidak ada di backend & FE walau tabel & kolom sudah ada di DB. 25 result nyangkut REVIEW, 7 APPROVED semuanya dr dept DOCTOR (auto-approve). Fitur dibangun penuh (Opsi A): workflow berstep + four-eyes + inbox + tombol approve.
- **Backend `express_dash`:**
  - Service baru `src/services/result-workflow/result-workflow.service.js`: CRUD workflow+step, `ensureDefaultWorkflow` (auto 1-step per dept saat submit pertama, non-DOCTOR), `upsertWorkflowSteps`, `listWorkflows`, `listDepartments`, `canUserReviewStep`.
  - Controller + route baru `/settings/result-workflow` (GET departments, GET workflows, PUT /:departmentId).
  - `exam.service.js`: `approveDepartmentResult` (multi-step, four-eyes, tulis action APPROVE, set approvedAt saat final, `currentStepOrder` dinaikkan per step), `listPendingDepartmentApproval` (inbox, batas akses utk non-super).
  - `exam.repository.js` `submitDepartmentResults`: terima `stepOrder` (baca dr workflow, not hardcode 1).
  - Route mcu: `POST /:id/department-result/approve`, `GET /pending-dept-approval`.
  - `npx prisma generate` (model workflow belum ada di client).
- **FE `my-app`:**
  - Halaman baru `/settings/result-workflow.vue`: atur step approval per dept, pilih reviewer user/role.
  - Halaman baru `/result/department-approval.vue`: inbox approval berstep + tombol Approve + buka detail.
  - `DetailDrawer.vue`: tombol **Approve** saat `departmentResultStatus==='DEPARTMENT_REVIEW'` dan current user ≠ submitter (four-eyes).
  - `constants/menu.ts`: item "Persetujuan Hasil (Inbox)" di Results, "Workflow Approval" di Settings.
- **Verifikasi E2E (live API):**
  - Approve oleh submitter → 403 four-eyes rule. ✓
  - Approve oleh petugas lain → `DEPARTMENT_APPROVED`, action APPROVE (+ actor 4, SUBMIT actor 1). ✓
  - Multi-step (2 step): step1 → `DEPARTMENT_REVIEW` + `currentStepOrder` 1→2; step2 → `DEPARTMENT_APPROVED` + `approvedAt`. ✓
  - Audit: SUBMIT(8) → APPROVE step1(1) → APPROVE step2(1). ✓

## Completed — 2026-08-18: Alur Approve Temp wajib pilih Pasien Lama/Baru (Opsi A+ + D + F-ringan)

- **Masalah:** FO menanyakan "sudah pernah MCU disini belum?" tapi jawabannya tidak dipakai. Portal punya pilihan Pasien Lama/Baru hanya sebagai UX autofill (`mapToBackend` tidak kirim `patientType`), dan BE `submitPublic` auto-lookup by identitas lalu set `patientExists`+`patientId` di temp → keputusan FO terabaikan; duplikasi pasien bisa terjadi saat FO mengabaikan hasil lookup.
- **FE `app/pages/front-office/registration-temp/[id].vue` (A+):**
  - Pertanyaan Ya/Tidak kini **wajib** dijawab (`isFormValid` butuh `patientExists !== null`; jika `true` wajib `selectedPatient` + `confirmOverwrite`).
  - Jawaban di-**preload** dari `reg.patientExists` saat `openStatusModal` + auto-select `reg.patientId` (hasil deteksi portal sebagai saran awal, tetap bisa diubah).
  - Saat pilih "Tidak" → **F-ringan**: `checkDuplicateSuggestions()` auto-cari `GET /patient?search=<nama+phone>` → tampilkan kandidat pasien serupa yang bisa dipilih.
  - Redirect ke `create` kini mengirim `patientType=existing|new` sesuai keputusan FO.
- **FE `app/pages/front-office/registration-patient/create.vue`:**
  - Baca query `patientType`: `new` → paksa `isNewPatient` + abaikan `temp.patientId`; `existing` → pakai pasien terpilih.
  - POST `/approve` mengirim `patientType`.
- **BE `express_dash` (D):**
  - `adminApproveSchema`: tambah field opsional `patientType` (`existing`|`new`).
  - `approveTemp`: `patientType === 'new'` → abaikan `temp.patientId`/override; sebelum `createPatient` lakukan **auto-dedup** `findPatientByIdentity(idType, idValue)` → jika sudah terdaftar, reuse pasien existing (cegah duplikasi walau FO pilih "baru"); `createdNewPatient` dihitung dari kondisi nyata; update data pasien existing kini jalan juga untuk pasien hasil dedup.
  - `ErrorHandlingMidd`: P2002 pada `patient_idNumber` → pesan ramah "Nomor identitas sudah terdaftar pada pasien lain."
- **Verifikasi end-to-end (API, server :8000):**
  1. Skenario B (pasien baru, `patientType=new`) → `patientCreated:true`, patient baru dibuat.
  2. Skenario D (FO pilih "baru" tapi identitas sudah terdaftar, `patientType=new`) → `patientCreated:false`, **reuse** pasien existing `0e5a4722` (dedup bekerja, tidak ada duplikat).
  3. Skenario A (pasien lama, `patientType=existing` + patientId) → `patientCreated:false`, data pasien di-update (phone/email dari pendaftaran baru).
  - Lint & typecheck: tidak ada error baru pada file yang diubah.

- **Gejala:** Di `/rooms/queue-work/[id]`, item lab (mis. Diff Count) tidak bisa dimulai setelah sample di-receive. Stage EXAM di-unlock jadi `WAITING` setelah receive, tapi tidak pernah di-call → tombol "Mulai Pemeriksaan" (hanya muncul saat `CALLED`) dan "Mulai Item" (butuh `roomStageInProgress` = EXAM `IN_PROGRESS`) keduanya tidak muncul → petugas macet di queue-work dan harus balik ke index untuk memanggil ulang.
- **Root cause:** `_completeReceivePhaseIfReady` (BE) hanya melepas lock EXAM (`LOCKED` → `WAITING`) tanpa auto-call. FE tidak punya jalur untuk melanjutkan EXAM dari queue-work.
- **Perbaikan `app/pages/rooms/queue-work/[id].vue`:**
  - Tambah computed `allSamplesReceived` (`sampleCollections` tidak kosong & semua `RECEIVED`).
  - Tambah computed `canAutoStartExam` (`activeStage.status === 'WAITING'` && `activeStageCode === 'EXAM'` && `allSamplesReceived`).
  - Tombol "Mulai Pemeriksaan" kini tampil saat `activeStage?.status === 'CALLED' || canAutoStartExam`.
  - Perluas `handleStartStage`: jika status stage `WAITING`, panggil `PATCH /medical/exams/queue/stage/:id/call` (payload `roomId` + `roomTypeId` dari `activeRoomSession`) dulu, lalu `PATCH .../start` → EXAM jadi `IN_PROGRESS` tanpa balik ke index.
- **Alur setelah fix:** "Mulai Pemeriksaan" → EXAM `IN_PROGRESS` → "Mulai Item" → item `IN_PROGRESS` → "Selesaikan Item" → `DONE` → "Selesaikan Room" → EXAM `DONE` → kembali ke `/rooms/queue`. Item deferred (Diff Count) diinput hasilnya di halaman exam-results setelah room selesai.
- **Verifikasi:** `pnpm lint` & typecheck — tidak ada error baru pada baris yang diubah (error yang ada adalah pre-existing baseline proyek).

Dokumen ini menurunkan PRD frontend menjadi urutan kerja yang bisa dieksekusi tanpa lompat-lompat.

## Completed — 2026-08-13: Logo header tidak tampil saat print hasil questionnaire (template Nordic)

- **Gejala:** Di `/front-office/questionnaire-results`, hasil print Nordic tidak menampilkan logo. Logo sudah di-upload dan tampil di modal Print Template.
- **Root cause:** `print_template` Nordic tersimpan dalam kondisi rusak — tag `<img>` kehilangan `src=`: `<img data:image/png;base64,... class="header-logo-img">` (hasil substitusi `{{ logoUrl }}` yang dipakai sebagai atribut polos, bukan `src="{{ logoUrl }}"`). Regex lama `src="(data:image...)"` di `questionnaire-results.vue` tidak mencocokkan format ini → `ctx.logoUrl` kosong → header `.print-head` jatuh ke placeholder "LOGO". Baris lain (MCU) tersimpan valid (`src="data:image..."`) sehingga tidak terpengaruh.
- **Perbaikan `useQuestionnairePrint.ts`:** tambah helper `extractTemplateLogo(tpl)` (dukung `src="data:image"`, `src='data:image'`, dan `<img data:image...` tanpa `src=`) + `normalizeTemplateLogo(tpl, logoUrl)` (perbaiki semua bentuk tag img logo → `src="..."`). `printQuestionnaireHtml` sekarang set `ctx.logoUrl` SEBELUM render body dan normalisasi tag img.
- **Perbaikan `questionnaire-results.vue` `templatePrintHtml`:** ganti regex rapuh dengan `extractTemplateLogo` + `normalizeTemplateLogo`, dan `ctx.logoUrl` di-set sebelum `renderQuestionnaireTemplate`.
- **Perbaikan `QuestionnairePrintTemplateModal.vue`:** `onUploadLogo`, watch load, dan `embeddedTemplate()` memakai helper yang sama → template yang ditulis ulang selalu valid (`src="{{ logoUrl }}"` → `src="data:image..."`), juga format lama yang rusak ikut dinormalisasi.
- **Data:** patch manual `printTemplate` baris Nordic di `db_express.qst_questionnaire` (`<img data:image` → `<img src="data:image"`, tutup quote sebelum `class="header-logo-img"`).
- Verifikasi: helper regex diuji terhadap isi template Nordic asli (broken & fixed) — ekstraksi data URI (14.574 char) dan normalisasi `src=` bekerja. Lint bersih, `nuxt typecheck` tidak menambah error baru.

## Completed — 2026-08-13: Gambar samping tidak menimpa pernyataan di halaman berikutnya

- Setelah consent & tanda tangan dibuat full-width, gambar nordic (position: fixed) berulang di tiap halaman → di halaman berikutnya gambar berada di atas teks pernyataan (tumpang tindih).
- `useQuestionnairePrint.ts`: gambar samping diganti dari `position: fixed` menjadi `position: absolute; top: 55mm; right: 0` (relatif ke `.document-page.with-side-image { position: relative }`) dan dipindah ke DALAM `.document-page` (bukan sibling) via `wrapDocumentImage` → gambar hanya muncul SEKALI di halaman pertama, tidak berulang & tidak menimpa pernyataan/ttd di halaman selanjutnya. Posisi visual halaman 1 identik (kanan atas, x=464-550pt).
- Verifikasi headless: 1 halaman → gambar kanan atas (y219-393), consent di bawahnya (y507) full-width tanpa overlap; 2 halaman → gambar hanya halaman 1, halaman 2 bersih (consent full-width + ttd rata kanan x531).

## Completed — 2026-08-13: Consent & tanda tangan full-width di hasil print (tidak terbagi 2 kolom)

- Awalnya `wrapDocumentImage` membungkus SELURUH dokumen ke `.document-page.with-side-image` (padding-right 62mm) → consent (PERNYATAAN DAN PERSETUJUAN) + area tanda tangan ikut terjepit ke kolom kiri, tampak terbagi 2 (isi kiri, kanan kosong).
- `useQuestionnairePrint.ts` `documentImageCss()` (media print): tambah `margin-right:-62mm` pada `.consent-section`, `.signature-wrapper`, `> .signature-area`, `.consent-signature`, `.document-footer` → consent & tanda tangan memakai lebar penuh halaman.
- `front-office/questionnaire-results.vue` `legacyPrintHtml`: bungkus consent + signature dalam `<div class="consent-signature">` (page-break-inside: avoid) agar tetap satu blok, tidak terbelah antar halaman.
- Verifikasi headless Chrome: template-path & legacy-path → tanda tangan rata kanan penuh (ujung teks ~523pt = 15mm margin dikurangi padding-right 40px), consent full-width, gambar diagram tetap di kanan atas (y211-443), tidak ada tumpang tindih dengan tanda tangan (y699).

## Completed — 2026-08-11: Gambar samping (mis. diagram Nordic) per questionnaire — portal isi & hasil print

**Permintaan user:** Nordic questionnaire butuh gambar tambahan di samping (form kiri, gambar kanan), diatur khusus per Nordic. Tampil saat pasien mengisi di portal DAN di hasil print, semua halaman.

**Backend `express_dash`:**
- `QstQuestionnaire.image` (`String? @db.MediumText`) — schema + `prisma db push` (DB `db_express`).
- expose `image` di `toListItem`/`toDetail`; create `image: payload.image ?? null`; update set saat `payload.image !== undefined`; `listResults` sertakan `questionnaire_image` per row.

**my-app:**
- `useQuestionnairePrint.ts`: `documentImageCss()` (`.document-side-image` fixed kanan 44mm di print, static di screen; `.document-page.with-side-image` padding-right 62mm) + `wrapDocumentImage(content, src)`; `printQuestionnaireHtml` mengambil `ctx.image`.
- `QuestionnairePrintTemplateModal.vue`: bagian "Gambar Samping (mis. diagram tubuh Nordic)" — preview, upload (resize max 1024), hapus; load `detail.image`; Simpan PUT `image`.
- `front-office/questionnaire-results.vue`: type `questionnaire_image`; `legacyPrintHtml` & `templatePrintHtml` pakai `wrapDocumentImage` + `documentImageCss`; tampilkan di preview iframe.

**Portal `regist_portal`:**
- `MCUQuestionnaire.svelte`: jika `display.image` → grid 2 kolom (soal kiri `nordic-layout-main`, gambar kanan sticky `nordic-layout-img`), stack di mobile. `class:nordic-layout={display.image}` (class statis untuk main/img, svelte-check aman).

**Verifikasi print headless (Chrome):** A4 6 halaman, gambar solid tampil di kanan SAMA di tiap halaman (x 390-506pt, y 211-443pt, tepat di bawah header), konten soal selalu di kiri ≤365pt → tidak bertabrakan.

## Completed — 2026-08-11: Sembunyikan answer-summary (ikut document-info yang tidak muncul)

- User tanya apakah blok `document-info` (No. Registrasi / Tanggal Pemeriksaan / Perusahaan) muncul di hasil print.
- Fakta: TIDAK muncul — `document-info` berada di dalam `.document-header`, dan `.document-header` di `display:none` oleh `pageSetupCss()` (media screen & print) sejak header dipindah ke `<thead>`.
- User minta `answer-summary` tidak muncul juga, tapi TIDAK dihapus — hanya **disembunyikan**: blok dibungkus `{% if false %}` di `defaultTemplate` (`QuestionnairePrintTemplateModal.vue`), kode tetap ada di template. Aktifkan kembali dengan `{% if true %}`. Engine template sudah mendukung literal boolean `false`/`true`.

## Completed — 2026-08-11: Jeda di bawah border header (tiap halaman)

- `printHeaderHtml`: tambah `<div class="print-head-gap"></div>` setelah `.print-head` (di dalam `<thead>`) — jeda muncul di tiap halaman karena thead diulang.
- `printHeaderCss`: `.print-head-gap { height: var(--hdr-gap, 6mm) }` — bisa disesuaikan via CSS var.
- Verifikasi print headless: gap 20.4pt di bawah border, identik di page 1 & 2; header tetap sejajar.

## Completed — 2026-08-11: Ganti margin-box → header tabel `<thead>` (berulang, tajam, sejajar, tidak pojok)

**Perintah:** "gambar pecah, No.RM terlalu pojok, gambar/title/No.RM tidak sejajar. buildPageChromeCss diganti bisa? ada opsi?"

**Riset empiris 3 teknik header print (Chrome):**
- `position:fixed` → berulang tiap halaman tapi **konten halaman 2+ overlap** (first_body y0=-0.4) → gagal.
- `<thead>` tabel → **berulang tiap halaman, konten rapi di bawah header (y0≈141), kontrol CSS penuh** → menang.
- margin-box → keterbatasan ukuran/tajam/posisi (akar semua keluhan).

**Perubahan (`useQuestionnairePrint.ts`):**
- `buildPageChromeCss` di-rename → **`pageSetupCss()`** (fungsi kecil & jelas): HANYA `@page` (ukuran/margin + footer margin-box `@bottom-left` nama|no & `@bottom-right` Page X of Y) + hide `.document-header/.document-footer` di screen & print. Referensi diperbarui di `questionnaire-results.vue` (2 tempat) — nama konsep "chrome" dihapus.
- Baru `printHeaderCss()` + `printHeaderHtml(ctx)` — header letterhead (`div.print-head`) berisi logo/LOGO, judul+subtitle, No.RM; kontrol via `var(--hdr-*)`; No.RM `padding-right:10mm` (tidak pojok); `align-items:center` (sejajar).
- `printQuestionnaireHtml` membungkus body dalam `<table class="printwrap"><thead><tr><th>HEADER</th></tr></thead><tbody><tr><td>BODY</td></tr></tbody></table>` → Chrome mengulang `<thead>` di setiap halaman.
- Catatan empiris: `<tfoot>` berulang per halaman tapi `counter(page)` di dalamnya menghasilkan "Page 0 of 0" → footer tetap pakai margin-box.

**Modal (`QuestionnairePrintTemplateModal.vue`):** logo disimpan hingga **512px** (`LOGO_MAX_DIM`) — tajam saat ditampilkan 96px (sebelumnya 96px → pecah); `Lebar/Atas/Kiri` kini hanya mengubah CSS var (tanpa re-encode); hapus `chromeOpts` di `runPreview`/`openPrintPreview`.

**Results (`questionnaire-results.vue`):** `legacyPrintHtml` & `templatePrintHtml` dibungkus `<thead>`; logo diekstrak dari template → `ctx.logoUrl` untuk `printHeaderHtml`; `screenChrome*` dihapus; `.document-page` tanpa `min-height` (hindari halaman kosong di dalam td).

**Verifikasi (headless + bbox):** 3 halaman, header (logo/img, judul, No.RM) identik di tiap halaman; No.RM x0=497.6 (~34mm dari tepi kanan, tidak pojok); logo tajam (sumber 512px, tampil 96px); layar: logo 583/5000 nonwhite, border header di y=30, judul tengah. `eslint` 0 error, `vue-tsc --noEmit` lulus.

## Completed — 2026-08-11: Screen-chrome header — layar WYSIWYG dengan hasil Ctrl+P

**Perintah:** "buildPageChromeCss ini buat apa? saat Ctrl+P hasilnya tidak sesuai dengan sebelum tekan Ctrl+P".

**Akar masalah:** margin-box `@page` hanya dirender saat print, tidak di layar → sebelum Ctrl+P layar menampilkan header flow template, setelah Ctrl+P header diganti margin-box → berbeda.

**Perubahan (`useQuestionnairePrint.ts`):**
- `screenChromeCss()`: header tiruan `position:fixed top:0 height:36mm` + border bawah `#24364f` 2px, hanya aktif `@media screen` (default `display:none` → otomatis hilang saat print, digantikan margin-box). Posisi/size logo mengikuti `var(--hdr-*)`.
- `screenChromeHtml(ctx)`: markup logo/title/subtitle/No.RM yang sama persis dengan margin-box.
- `printQuestionnaireHtml` selalu sisipkan kedua + hide `.document-header` di layar → layar dan print memakai tampilan header yang sama.

**Terapkan juga di `questionnaire-results.vue`:** `legacyPrintHtml` & `templatePrintHtml` (hide `h1` legacy di layar; `screenChromeCss()`/`screenChromeHtml()` masuk).

**Modal preview (`QuestionnairePrintTemplateModal.vue`):** `runPreview` kini memakai `printQuestionnaireHtml` (bukan render manual) → iframe preview = print window = print. Ref `previewHtml`/`previewCssExtra`/`previewDoc` dihapus.

**Verifikasi:** screenshot headless — tie border header hadir di y≈101px (36mm×0.75), judul & logo tampil di atas; PDF print tak berubah (IMG x0=57 y0=9, judul y0=43.6). `eslint` 0 error, `vue-tsc --noEmit` lulus.

## Completed — 2026-08-11: Kontrol posisi/ukuran logo di modal (kembali) — Lebar px, Atas mm, Kiri mm

**Perintah:** "Tidak bisa lagi mengubah posisi logo lewat modal seperti sebelumnya" + header print & preview masih belum sesuai.

**Riset empiris (Chrome print):** margin box `@top-left` dengan `padding-left`/`padding-top` BERHASIL menggeser gambar logo (x0 42.8→57→84.8 sesuai mm; y0 turun bersama judul & No.RM). Karena margin box content di-center di area top-margin, konten ketiganya turun bersama saat `padding-top` ditambah → alignment terjaga.

**Perubahan:**
- `useQuestionnairePrint.ts`: `buildPageChromeCss` + `printQuestionnaireHtml` terima `PageChromeOpts { topMm?, leftMm? }`. CSS: `@top-left { padding-top: topMm; padding-left: leftMm }`, `@top-center { padding-top: 8+topMm }`, `@top-right { padding-top: topMm; padding-right: 5mm }`.
- `QuestionnairePrintTemplateModal.vue`:
  - Refs baru `logoWidth` (px, default 96), `logoTop` (mm, default 0), `logoLeft` (mm, default 5) + `setLogoOpt()`.
  - `resizeHeaderLogo(dataUrl, widthPx)` — resize panjang-terpanjang ke `logoWidth` (idempotent, tidak lagi bake padding).
  - `watch([logoWidth, logoLeft, logoTop])` debounce 300ms → re-resize + re-preview.
  - `embeddedTemplate()` sisipkan `<!--print-opts--><style>:root{--hdr-left;--hdr-top;--hdr-width}</style>` di akhir template (persist antar save/reopen); `openPrintPreview` teruskan `{topMm, leftMm}`.
  - Watch reopen: parse var `--hdr-*` lalu strip tag, extract logo → set logoUrl.
  - Template default CSS: `.header-logo-img { width: var(--hdr-width,96px); height:auto; padding-left: var(--hdr-left,5mm) }`, `.document-header { margin-top: var(--hdr-top,0mm) }`.
  - UI: baris kontrol "Posisi Logo" (Lebar px / Atas mm / Kiri mm) muncul saat logo ada.
- `questionnaire-results.vue` `templatePrintHtml`: parse `--hdr-top`/`--hdr-left` dari template → teruskan ke `buildPageChromeCss`.

**Verifikasi:** render default template + logo (40 jawaban) lewat `printQuestionnaireHtml`:
- default {top0,left5}: logo x0=57, judul y0=43.6, No.RM y0=40.8.
- +{top8,left15}: logo x0=84.8 (naik 27.8≈10mm), y0=22.5, judul/No.RM turun ~11pt bersama → alignment terjaga.
`eslint` 0 error, `vue-tsc --noEmit` lulus.

## Completed — 2026-08-11: Template default disesuaikan dengan header print (layar = print)

**Perintah:** "apakah template defaultnya sudah disesuaikan juga?"

**Penjelasan:** Header print sepenuhnya berasal dari `buildPageChromeCss` (margin box) yang di-inject otomatis saat print — jadi template apa pun (termasuk default) menghasilkan header print yang benar tanpa perlu ubah template. Yang perlu disesuaikan adalah **tampilan layar (preview)** agar konsisten dengan hasil print.

**Perbaikan (`app/components/questionnaire/QuestionnairePrintTemplateModal.vue` defaultTemplate CSS):**
- `.header-logo-img` 60px → **90px** (mengikuti ukuran logo print yang kini lebih besar).
- `.header-code` tambah `padding-right: 5px` (No.RM tidak menempel pojok, mengikuti `@top-right` print).

**Verifikasi:** render template default 40 jawaban → print 3 halaman: tiap halaman ada judul + No.RM (header margin box ter-inject); layar preview tampilkan logo 90px. `eslint` 0 error + `vue-tsc --noEmit` lulus.

## Completed — 2026-08-11: Penyesuaian header print — logo besar & sejajar, No.RM tidak ke pojok

**Perintah:** (1) posisi No. RM terlalu ke pojok saat print; (2) logo kurang besar, blur, dan kurang ke atas (tidak sejajar dengan judul).

**Perbaikan (`app/composables/questionnaire/useQuestionnairePrint.ts` `buildPageChromeCss`):**
- `@top-left` logo: hapus `width/height/vertical-align` (diabaikan Chrome di margin box); gambar tampil pada ukuran intrinsik (resize menentukan).
- `@top-center`: judul+subtitle + `border-bottom: 2px solid #24364f; width:100%; padding-top: 8mm` — `padding-top` MENARIK judul turun sehingga sejajar dengan logo (hanya padding yang berpengaruh di margin box, bukan vertical-align/margin/height).
- `@top-right`: No.RM + `padding-right: 5mm` — ditarik sedikit ke dalam (tidak menempel pojok kanan).
- `@page margin: 36mm 15mm 18mm` (margin atas diperbesar untuk logo besar).
- `app/components/questionnaire/QuestionnairePrintTemplateModal.vue`: `HEADER_LOGO_MAX` 64 → **96** (logo lebih besar ±25mm dan lebih tajam).

**Verifikasi (headless Chrome print → PyMuPDF):** halaman 1, 2, 3 — logo besar di kiri sejajar judul, judul+subtitle center, No.RM agak ke dalam, garis bawah full-width, footer tiap halaman. `eslint` 0 error + `vue-tsc --noEmit` lulus.

## Completed — 2026-08-11: Header print (logo + judul + No.RM + garis bawah) berulang di semua halaman — SOLUSI FINAL

**Perintah:** (1) header (logo + judul + No.RM) muncul di SETIAP halaman print seperti reference `Screenshot 2026-08-11 095437.png` (ada garis bawah); (2) logo ukuran pas, tidak besar & tidak blur; (3) save → buka kembali → template tersimpan benar (gambar tidak broken).

**Temuan teknis (diverifikasi via headless Chrome + PyMuPDF):**
- `@page` margin box untuk teks → andal berulang di semua halaman.
- `position: fixed` untuk ELEMEN IMG → berulang semua halaman TAPI **konflik** jika ada `@page` margin box (gambar terlempar ke bawah halaman).
- `position: fixed` untuk TEKS (flex/block) → teks ter-render di BOTTOM halaman (bug Chrome).
- Margin box `content: url()` TIDAK bisa di-scale (width/height/max-width diabaikan) → ukuran = px intrinsik × 0.75pt (96dpi efektif).
- `@top-center` dengan `border-bottom: 2px solid` + `width:100%` + `height:34mm` → **garis bawah full-width** di bawah judul, berfungsi.
- SVG-wrap di margin box tidak ter-render → gunakan PNG langsung.

**Solusi final (semua di margin box, TANPA fixed element):**
- `@top-left` → logo: `content: url("data:image/png;base64,...")` (fallback teks "LOGO"); logo di-resize ke 64px saat upload → tampil ±48pt (±16mm).
- `@top-center` → judul + subtitle + `border-bottom: 2px solid #24364f; width:100%; height:34mm`.
- `@top-right` → "No. RM" + kode pasien.
- `@bottom-left` + `@bottom-right` → footer (nama pasien | no, "Page X of Y").
- `@page { margin: 34mm 15mm 18mm }`.
- `@media print { .document-header, .header-placeholder, .document-footer { display:none !important } }` — flow header disembunyikan (margin box yang tampil), mencegah duplikasi.

**File yang diubah:**
- `app/composables/questionnaire/useQuestionnairePrint.ts`: `buildPageChromeCss(patientName, patientCode, documentTitle?, logoUrl?)` — margin box header+footer lengkap (logo @top-left, judul+border @top-center, No.RM @top-right, footer @bottom-*). `printQuestionnaireHtml` meneruskan `ctx.logoUrl`.
- `app/components/questionnaire/QuestionnairePrintTemplateModal.vue`:
  - Kembalikan struktur template: `<img class="header-logo-img">` DI DALAM `.document-header > .header-top` (layout layar normal).
  - Hapus `imgPositionStyle`, `composedTemplate`, input posisi (Atas/Kiri/Lebar), CSS fixed-logo `top:-14mm`.
  - Tambah `resizeHeaderLogo(dataUrl)` → resize logo maks 64px (canvas, PNG) — dipakai saat upload & saat membuka template lama.
  - `embeddedTemplate()` sederhana (tanpa strip if-blocks — tidak diperlukan lagi).
  - Watch: parse `src="data:image..."` → resize → set logoUrl + restore placeholder.
- `app/pages/front-office/questionnaire-results.vue`: `templatePrintHtml` ekstrak `src="data:image..."` dari template → diteruskan ke `buildPageChromeCss` (logo margin box ikut tampil di print hasil).

**Verifikasi (headless Chrome print-to-pdf → PyMuPDF screenshot):**
- Dengan logo (64px): halaman 1, 2, 3 — header IDENTIK (logo kiri, judul+subtitle tengah, No.RM kanan, garis bawah full-width), footer tiap halaman.
- Tanpa logo: teks "LOGO" di kiri-atas + judul + No.RM + garis bawah.
- `eslint` 0 error + `vue-tsc --noEmit` lulus.
- Catatan: trade-off 96dpi efektif untuk logo di margin box (inkeharen sebesar ~16mm dari 64px) — untuk logo header kecil ini dapat diterima; gambar tampil tajam di layar, agak soft saat print 300dpi.

## Completed — 2026-08-10: Hapus "Page 1" statis yang tersisa (fallback layar)

**Perintah:** "Page 1" non-dinamis masih muncul.

**Penyebab:** Sisa 3 titik "Page 1" statis:
1. `.page-number::after { content: "Page 1" }` di template default & `previewCss` (modal) — fallback untuk tampilan layar (print window/preview) sehingga tampil "Page 1" padahal dokumen bisa multi-halaman.
2. `printCss` questionnaire-results — fallback yang sama.
3. Modal view answers: `<div class="qr-footer">Page 1</div>` hardcode di layar.

**Perbaikan:**
- Hapus semua `.page-number::after { content: "Page 1" }` (template default, `previewCss`, `printCss`) — nomor halaman hanya dihasilkan saat print via `@page @bottom-right` (dynamic), footer nama pasien tetap `position: fixed` di print.
- Hapus `<div class="qr-footer">Page 1</div>` di modal view answers + CSS `.qr-footer` yang tidak terpakai.
- Hapus CSS `.footer-page` yang sudah tidak terpakai di `previewCss` & `printCss`.
- Verifikasi: print template default 40 jawaban → PDF hanya "Page 1 of 3 / 2 of 3 / 3 of 3" (tanpa "Page 1" statis); grep memastikan tidak ada `content: "Page 1"` / `>Page 1<` tersisa; lint bersih.

## Completed — 2026-08-10: Footer print "nama pasien | no pasien" + "Page X of Y" sejajar & tampil di print

**Perintah:** (1) "Page 1 of 2" berada di bawah, tidak sejajar dengan nama pasien | no pasien.
(2) "nama pasien | no pasien" tidak tampil saat mau diprint.

**Akar:** Footer pakai `position: fixed` (nama pasien) dan `@bottom-right` margin box (nomor halaman) → berada di *band* berbeda (area konten vs area margin), jadi tidak sejajar. Fixed footer juga tak Selalu tampil di Chrome print preview.

**Perbaikan:**
- `composables/questionnaire/useQuestionnairePrint.ts`: tambah `buildPageFooterCss(patientName, patientCode)` — menghasilkan `@page` dengan `@bottom-left { content: "nama | kode" }` + `@bottom-right { content: "Page " counter(page) " of " counter(pages) }` (font/saat-warna sama) serta `@media print { .document-footer { display: none !important } }`.
- `printQuestionnaireHtml`: inject `buildPageFooterCss` **setelah** style template (cascade menimpa `@page` milik template), dengan `!important` untuk menonaktifkan fixed footer template.
- `QuestionnairePrintTemplateModal.vue` (`defaultTemplate`): hapus `@page`, `@bottom-right`, aturan fixed `.document-footer` & `.page-number` pada `@media print`, serta `<div class="page-number"></div>` kosong. Footer tampil di layar (preview iframe) via flex `.document-footer`; print memakai margin boxes.
- `previewCss` (modal): sama — hapus `@page`/`@bottom-right` + fixed footer; `printQuestionnaireHtml` (via tombol "Buka di Print Window") sudah inject footer dinamis.
- `pages/front-office/questionnaire-results.vue`:
  - `printCss`: hapus `@page`/`@bottom-right` + fixed footer.
  - `legacyPrintHtml`: `<style>` gabungkan `printCss` + `buildPageFooterCss(row.patientName, row.patientCode)`.
  - `templatePrintHtml`: inject `<style>${buildPageFooterCss(ctx.patientName, ctx.patientCode)}</style>` **setelah** `${styles}`.
  - Hapus `<div class="page-number"></div>` kosong.
- CSS nama pasien di `bottom-left` (margin box kiri) dan nomor halaman di `bottom-right` (margin box kanan) → **satu baris sejajar**, berulang tiap halaman, selalu terlihat di print preview.

**Verifikasi:** headless Chrome print template default dengan 40 jawaban → PDF tiap halaman footer: `Tes Sinkron | PAT-20260810-BR-001` (kiri) + `Page X of Y` (kanan) pada satu baris; tidak ada `>Page 1<` / `content: "Page 1"` tersisa; `eslint` pada 3 file yang diubah bersih; `vue-tsc --noEmit` lulus.

## Completed — 2026-08-10: Footer print dinamis — "Page X of Y" per halaman

**Perintah:** "Page 1" di footer print masih hardcoded dan tidak dinamis (tidak mengikuti halaman saat dokumen multi-halaman).

**Masalah:** `counter(page)` TIDAK bekerja di elemen `position: fixed` di Chrome (test headless print → "Page 0" di semua halaman). Solusi yang benar: CSS `@page` margin box `@bottom-right { content: "Page " counter(page) " of " counter(pages) }` — diverifikasi menghasilkan "Page 1 of 3", "Page 2 of 3", "Page 3 of 3" di Chrome.

**Perbaikan (diterapkan konsisten di 3 tempat):**
- `components/questionnaire/QuestionnairePrintTemplateModal.vue`:
  - Template default: tambah `@page { margin: 20mm 15mm 18mm; @bottom-right { content: "Page " counter(page) " of " counter(pages) } }`; `.document-footer` jadi `position: fixed; bottom: 0; padding: 4px 15mm` di `@media print` (nama pasien berulang tiap halaman); `.page-number { display: none }` di print (diganti margin box). HTML footer: `<div class="page-number"></div>` (tanpa "Page 1" hardcode).
  - `previewCss`: aturan `@page` + fixed footer + `.page-number` display:none yang sama.
- `pages/front-office/questionnaire-results.vue`: `printCss` sama; `legacyPrintHtml` footer jadi `.document-footer` (nama + `<div class="page-number"></div>`).
  - Verifikasi: render template default (40 jawaban → 3 halaman) → headless Chrome print-to-pdf → pdftotext menampilkan footer "Tes Sinkron | PAT-..." di tiap halaman + "Page 1 of 3 / 2 of 3 / 3 of 3"; 8/8 static checks PASS; lint bersih.

## Completed — 2026-08-10: Tombol upload gambar di Print Template (logo Nordic Questionnaire)

**Perintah:** "di modal Print Template tidak ada tombol untuk menambahkan gambar"; ingin menaruh gambar (mis. logo Nordic Questionnaire) di posisi tertentu.

**Perbaikan:**
- `app/composables/questionnaire/useQuestionnairePrint.ts`:
  - `buildQuestionnairePrintContext` menerima & meneruskan opsi/ctx `logoUrl`.
- `app/components/questionnaire/QuestionnairePrintTemplateModal.vue`:
  - State: `logoUrl` (data URL), `logoFile` ref, `imgTop/imgLeft/imgWidth` (default 120/300/120).
  - Tombol **Upload Gambar** (`ref="logoFile"` tersembunyi, `accept="image/*"`, `onUploadLogo` via `FileReader` → base64 ke `logoUrl`; normalisasi literal `src="data:image..."` kembali ke placeholder `{{ logoUrl }}` agar re-edit bersih; panggil `runPreview`).
  - Input angka **Atas/Kiri/Lebar (px)** mengendalikan kotak posisi via `imgPositionStyle` computed (prepend `<style>.print-img-1 { position:absolute !important; top/left/width ... }</style>` ke template) — **tersimpan ke `print_template`** sehingga posisi persisten.
  - `defaultTemplate`: placeholder `{% if logoUrl %}<img src="{{ logoUrl }}" class="print-img-1" />{% endif %}` + CSS `.print-img-1` (absolute, width).
  - `runPreview`/`openPrintPreview`/`submit` memakai `composedTemplate` (`imgPositionStyle` + `template.value`); `ctxWithLogo` meng‑inject `logoUrl` pada preview/print.
  - `submit` embed literal data URL ke dalam `print_template` (ganti `{{ logoUrl }}`) → template **self-contained**, jalan juga dari print di halaman `/front-office/questionnaire-results`.
  - Watch `props.row`: saat buka kembali, parse `src="data:image..."` dan nilai posisi dari `print_template` yang tersimpan → restore `logoUrl` + `imgTop/Left/Width` + placeholder.
  - Daftar placeholder di textarea termasuk `{{ logoUrl }}`.
- `app/pages/front-office/questionnaire-results.vue`: `templatePrintHtml`/`legacyPrintHtml` tidak berubah — sudah pakai `buildQuestionnairePrintContext` (tidak set logoUrl) sehingga `{{ logoUrl }}` kosong → img tidak tampil di sana kecuali template menyimpan literal data URL (yang disimpan via submit di atas) — karena submit menulis literal, print dari results **akan** menampilkan gambar.
- Catatan: posisi logo berlaku sampai halaman ke-1 saja pada `@page`-less screen CSS; di print, `.print-img-1` position absolute relatif `.document-page`.

**Verifikasi:** render `printQuestionnaireHtml` dengan default template + logo 1×1 PNG + 12 jawaban (2 halaman) → headless Chrome print-to-pdf → footer tiap halaman `Tes Sinkron | PAT-456` + `Page X of 2`; logo data URL ter-embed di HTML; `eslint` (0 error) + `vue-tsc --noEmit` lulus.

## Completed — 2026-08-11: Fix logo header print blur + tidak bisa di-scale di margin box

**Perintah:** Setelah resize 64px, logo jadi blur; sebelumnya (margin box) logo besar.

**Akar:** 
1. Margin box (`@page @top-left`) **tidak bisa menskalakan gambar** — `width`/`max-width`/`width:100%` semua diabaikan, gambar selalu ukuran intrinsik (diverifikasi: PNG 200px → 150pt). Logo margin box selalu 96dpi efektif → tidak mungkin kecil & tajam sekaligus.
2. Resize canvas ke 64px (fix sebelumnya) menurunkan resolusi → blur di print (~300dpi butuh ~200px).

**Perbaikan (logo tajam + kecil + berulang):**
- Logo dipindah dari margin box ke **elemen `position: fixed`** dalam template: `@media print { .print-img-1 { position: fixed !important; top: -14mm !important; left: 15mm !important; width: 16mm !important; height: 16mm !important; object-fit: contain !important; z-index: 10 !important; } }`. Elemen fixed BISA di-scale CSS (16mm) tanpa kehilangan resolusi sumber → tajam (~317dpi efektif). Diverifikasi berulang di SEMUA halaman termasuk halaman terakhir.
- `buildPageChromeCss`: hapus `@top-left` logo; judul tetap `@top-center`, No.RM `@top-right`, footer `@bottom-*`; list hide print jadi `.document-header, .header-placeholder, .document-footer` (logo `.print-img-1` tidak disembunyikan).
- `buildPageChromeCss` signature: `(patientName, patientCode, documentTitle?)` — parameter `logoUrl` dihapus; caller di-results di-update.
- Modal template: img `.print-img-1` dipindah keluar `.document-header` (sibling), header-top jadi `{% if logoUrl %}{% else %}<div class="header-logo">LOGO</div>{% endif %}` — box "LOGO" hanya tampil saat tanpa logo di layar; print logo fixed di kiri-atas.
- Hapus resize 64px (`resizeHeaderLogo`, `HEADER_LOGO_MAX`) — pakai resolusi asli upload.

**Verifikasi:** print template 45 jawaban (4 halaman) → tiap halaman: logo `LTFigure w=45×45.7pt` (16mm) di kiri (x0=85.5), judul center (x0=188), No.RM kanan (x0=488), tanpa overlap; logo muncul di 4/4 halaman termasuk terakhir; tanpa logo → judul+No.RM saja di tiap halaman; `eslint` 0 error + `vue-tsc --noEmit` lulus.

## Completed — 2026-08-11: Fix logo margin box tampil terlalu besar

**Perintah:** Gambar logo di header print tampil sangat besar (memenuhi area header).

**Akar:** `content: url("data:...")` di `@page @top-left` margin box menampilkan gambar pada **ukuran intrinsik** (tanpa scaling). `width:50px/height:50px` pada margin box TIDAK mengekang gambar (diverifikasi: PNG 64px → 48pt; SVG 200px → 150pt). Jadi logo besar yang di-upload tampil raksasa.

**Perbaikan:**
- `app/components/questionnaire/QuestionnairePrintTemplateModal.vue`:
  - `resizeHeaderLogo(dataUrl)` — canvas resize ke maks 64px pada sisi terpanjang (jika sudah kecil, tetap asli); dikonversi ke PNG.
  - `onUploadLogo` & watch reopen: `logoUrl` di-resize via `resizeHeaderLogo` sebelum dipakai → intrinsic size ≤64px → margin box menampilkan ~48pt (±16mm), ukuran wajar untuk header.
  - Efek lanjutan: saat save ulang, data URL yang ter-embed otomatis kecil (template juga lebih ringan).
- Verifikasi: PNG 64×64 → PDF `LTFigure w=48×48pt` di pojok kiri-atas header; judul tetap tercentering; `eslint` 0 error + `vue-tsc --noEmit` lulus.
- Catatan: template lama yang di-save SEBELUM fix (logo besar) perlu dibuka & di-save ulang sekali agar print di halaman hasil ikut memakai logo kecil.

## Completed — 2026-08-11: Header (logo + judul + No. RM) berulang di setiap halaman print

**Perintah:** "saya mau bagian ini jadi header untuk setiap halamannya" — header template (logo + judul + No. RM) ingin muncul di tiap halaman saat print.

**Temuan:** `position: fixed` di print **tidak reliabel** untuk header berulang:
- Header fixed + placeholder hanya bekerja di halaman 1; konten halaman 2+ mengalir dari atas area halaman dan **menimpa** header (diverifikasi via pdfminer: section "2 KHUSUS WANITA" y=718 tumpang-tindih header y=688-720).
- Pendekatan `top` negatif (header ditaruh di zona margin) juga gagal — header hilang di halaman terakhir.

**Solusi (terbukti):** pindahkan header ke **`@page` margin box** (sama seperti footer yang sudah berjalan):
- `@top-left`: logo (`content: url("data:...")`) atau teks "LOGO".
- `@top-center`: judul dokumen (`content: "<documentTitle>"`).
- `@top-right`: "No. RM" + kode pasien (dengan `\A` newline).
- `@bottom-left` / `@bottom-right`: footer yang sudah ada (nama pasien | no, "Page X of Y").
- `@page { margin: 32mm 15mm 18mm }` — top margin diperbesar untuk menampung header.
- `@media print { .document-header, .header-placeholder, .print-img-1, .document-footer { display: none !important } }` — flow header/footer disembunyikan saat print (margin box yang tampil), mencegah duplikasi.

**File yang diubah:**
- `app/composables/questionnaire/useQuestionnairePrint.ts`: `buildPageFooterCss` → `buildPageChromeCss(patientName, patientCode, documentTitle?, logoUrl?)` (header + footer margin boxes + hide flow header/footer); `printQuestionnaireHtml` pakai `buildPageChromeCss(ctx.patientName, ctx.patientCode, ctx.documentTitle, ctx.logoUrl)`.
- `app/components/questionnaire/QuestionnairePrintTemplateModal.vue`: revert CSS header fixed + placeholder (kembali flow normal untuk screen/preview); `.header-placeholder` dihapus dari body.
- `app/pages/front-office/questionnaire-results.vue`: import `buildPageChromeCss`; `legacyPrintHtml` pakai `buildPageChromeCss(row.patientName, row.patientCode)`; `templatePrintHtml` ekstrak `src="data:image..."` dari template untuk logo margin box; `printCss` `@media print` sembunyikan `h1` (legacy, mencegah judul duplikat).
- Efek: print dari modal ("Buka di Print Window"), halaman hasil, dan print template — semua dapat header + footer berulang di tiap halaman.

**Verifikasi:** render template default 45 jawaban (4 halaman) → headless Chrome print-to-pdf → pdfminer: header-title=1 di **setiap** halaman (4/4), konten di bawah tanpa overlap (DATA DIRI y=662 vs header y=740-756), flow header tersembunyi; `eslint` 0 error + `vue-tsc --noEmit` lulus.

## Completed — 2026-08-10: Fix Print Template — setelah save, buka ulang kembali ke awal

**Perintah:** Setelah berhasil save dan membuka kembali modal Print Template, template yang tersimpan hilang/kembali ke awal.

**Akar masalah:** Modal membaca `print_template` dari objek **row list** (`props.row`). Data list bisa stale (belum ter-refresh setelah save) atau tidak memuat `print_template` sama sekali → saat buka ulang, `stored = ''` → textarea kosong / "kembali ke awal".

**Perbaikan:** Saat modal dibuka (watch `props.row`), fetch **detail** `GET /questionnaire/:id` (endpoint yang juga dipakai preview/builder) untuk mendapat `print_template` otoritatif dari server: `detail.print_template ?? detail.printTemplate ?? row.print_template ?? row.printTemplate`. Fallback ke row list bila fetch gagal. Sekalian rapikan urutan: parse posisi logo (`top/left/width`) dari style injected **sebelum** strip blok style (agar nilai tersimpan tidak ter-reset ke default).

**Verifikasi:** `eslint` 0 error + `vue-tsc --noEmit` lulus.

## Completed — 2026-08-10: Fix bug Print Template — kotak "LOGO" tetap tampil, template tidak tersimpan, dsb

**Perintah:** (1) kotak "LOGO" masih muncul padahal sudah upload gambar; (2) template default sepertinya tidak bisa disimpan; (3) "coba cek lagi masih ada bug kayaknya".

**Bug yang ditemukan & diperbaiki:**
1. **Kotak "LOGO" tetap tampil saat ada gambar** — default template menaruh `.print-img-1` (positioned img) TERPISAH dari `.header-logo` berisi teks "LOGO". Fix: blok `{% if logoUrl %}` → tampilkan `<img class="print-img-1">`; `{% else %}` → box "LOGO". Jadi saat ada gambar, box "LOGO" hilang.
2. **Template tidak bisa disimpan (terasa)** — modal membaca `row.printTemplate` (camelCase), padahal BE mengembalikan `print_template` (snake_case) → `stored = ''` tiap dibuka, template tersimpan tampak kosong. Fix: `row.print_template ?? row.printTemplate`.
3. **Modal tidak bisa dibuka ulang untuk baris yang sama** — watch `props.row` hanya re-fire jika referensi berubah; `printTemplateRow.value = row.original` selalu objek sama. Fix di `pages/questionnaire/index.vue`: set `null` dulu lalu `nextTick` set row.
4. **CSS `.print-img-1 img` salah** — `.print-img-1` adalah elemen `<img>` itu sendiri, jadi `.print-img-1 img` tidak pernah match; diganti `.print-img-1 { width; height:auto; display:block }`.
5. **Logo tidak tampil di print hasil** — saat save, literal data URL ter-embed tapi tetap dibungkus `{% if logoUrl %}`; di halaman `/front-office/questionnaire-results` ctx tanpa `logoUrl` → kondisi false → img disembunyikan. Fix `embeddedTemplate()`: setelah embed literal, strip blok `{% if logoUrl %}...{% endif %}` dan sisakan hanya `<img ...>`.
6. **Style posisi menggandakan tiap save** — `imgPositionStyle` di-prepend ke `composedTemplate`; saat reopen `template.value` menyimpan blok style itu lagi → setiap save blok bertambah. Fix: saat watch row, strip blok style yang mengandung `top: Npx !important` (ciri khusus injected; aman karena style template tidak punya `top:...!important`).

**Verifikasi:** simulasi save→reopen→save ulang: `{% if logoUrl %}` hilang, `<style>` tetap 2 (injected+template), `.no-print` utuh, placeholder `{{ logoUrl }}` restor, tidak ada doubling; render tanpa logo → box "LOGO" tampil, dengan logo → `print-img-1` tampil tanpa box; `eslint` 0 error + `vue-tsc --noEmit` lulus.

## Completed — 2026-08-10: Fix preview iframe — logo tampil broken (data URL diblokir di `srcdoc`)

**Perintah:** Saat preview di modal, gambar logo muncul broken (ikon + alt "Gambar dokumen"), padahal render HTML benar (terverifikasi: `<img src="data:image/png;base64,...">` valid).

**Akar masalah:** Iframe preview memakai `:srcdoc="previewDoc"`. Chrome memblokir `data:` URL di dalam `srcdoc` iframe (unique opaque origin) → gambar tidak pernah dimuat. (Tes headless Chrome: srcdoc dengan data:image → broken; `document.write()` di iframe inherited-origin → `data:` gambar justru bisa dimuat.)

**Perbaikan:**
- `app/components/questionnaire/QuestionnairePrintTemplateModal.vue`:
  - Ganti `<iframe :srcdoc="previewDoc" />` → `<iframe ref="previewIframeRef" />`.
  - Tambah `writePreviewDoc()` yang menulis `previewDoc.value` via `iframe.contentDocument.open()/write()/close()`.
  - `watch(previewDoc)` → tulis ulang saat konten preview berubah; `watch(previewOpen)` + `nextTick` → tulis saat modal preview terbuka (iframe sudah ter-mount).
  - `embeddedTemplate()` helper (pre-replace `{{ logoUrl }}` dengan literal data URL) dipakai di `runPreview`, `openPrintPreview`, dan `submit` — memastikan `src` img selalu literal dan tidak tergantung resolusi variabel renderer.
- Verifikasi: `eslint` (0 error) + `vue-tsc --noEmit` lulus. (Catatan: Chrome headless `--screenshot` tidak me-render konten iframe sama sekali — bukan indikasi bug; print window `window.open + document.write` terbukti memuat data:image dari test sebelumnya.)

## Completed — 2026-08-10: Fix nama kota di area tanda tangan (sign-city)

**Perintah:** Nama kota di area tanda tangan hanya menampilkan 3 huruf (mis. "JKT") padahal seharusnya "Jakarta".

**Penyebab:** `branchName.split(' - ')[0]` mengambil bagian pertama `nameBranch` sebelum `" - "` — itu adalah kode cabang, bukan nama kota (mis. `"JKT - Jakarta"` → `"JKT"`). Format `nameBranch` di DB tidak seragam: `"Jakarta - Wisma Keiai (Main Clinic)"`, `"KIIC - Karawang"`, `"Delta Mas - Cikarang"`, `"Kyoai Medical EJIP Cikarang"`, dll.

**Perbaikan (heuristik cerdas):**
- `composables/questionnaire/useQuestionnairePrint.ts`: tambah `extractBranchCity(branchName)` + daftar `KNOWN_CITIES` (Jakarta, Cikarang, Karawang, Bekasi, Bogor, Depok, Tangerang, Bandung, Semarang, Yogyakarta, Surabaya, Sidoarjo, Gresik, Malang, Denpasar, Bali, Medan, Batam, Pekanbaru, Palembang, Lampung, Makassar, Manado, Balikpapan, Samarinda, Solo). Algoritma: (1) cari kota dikenal dalam seluruh string via regex word-boundary; (2) jika tidak ada, ambil segmen terakhir setelah `" - "` (bukan pertama); (3) fallback nama lengkap.
- `buildQuestionnairePrintContext`: `branchCity` memakai `extractBranchCity`.
- `pages/front-office/questionnaire-results.vue`: `signCityDate` (modal) dan `sign-city` (print legacy) memakai `extractBranchCity`.
- Verifikasi: 12 kasus test (JKT - Jakarta, KIIC - Karawang, Delta Mas - Cikarang, Kyoai Medical EJIP Cikarang, Bali, null/undefined/kosong) semua PASS; lint bersih.

## Completed — 2026-08-10: Print Template — template default baru (layout paper-document profesional)

**Perintah:** Ganti template default ("Gunakan Template Default") di modal Print Template dengan template CSS + HTML lengkap bergaya form MCU profesional.

- `components/questionnaire/QuestionnairePrintTemplateModal.vue`: `defaultTemplate` diganti penuh —
  - `<style>` block besar di atas template (reset, header, document-info grid 3 kolom, section-title/subtitle dengan nomor bulat, data-diri-table striped, answer-summary, question-list dengan answer box, consent, signature, footer, page-break, `@media print`, responsive preview) yang otomatis terekstrak & ditaruh di `<head>` saat render (fitur `extractTemplateStyles`).
  - Konten: header (LOGO + title + No. RM), document-info (No. Registrasi, Tanggal Pemeriksaan, Perusahaan), DATA DIRI 8 baris, summary Terjawab/Total, loop section + loop pertanyaan dengan `loop.index` & nested `{% if q.answerValue %}`/`{% else %}` ("Belum diisi"), consent, signature, footer "Page 1", plus blok `{% else %}` "Belum terdapat pertanyaan".
- Verifikasi: render test via Node (template diekstrak dari file modal, di-render dengan `renderQuestionnaireTemplate` + sample context) — style terekstrak, title/gender label/loop/summary/footer ter-render, tanpa placeholder mentah; lint bersih. (Catatan: `answerValue` kosong menghasilkan `-`, bukan kosong, jadi "Belum diisi" tidak tampil — perilaku existing.)

## Completed — 2026-08-10: Print Template — dukungan `<style>` di dalam template + perbaikan modal

**Perintah:** Dukung CSS di dalam template (tempatkan `<style>` di template agar ikut ter-render saat print), dan perbaiki modal editor agar bagian "Placeholder yang tersedia" terlihat (tidak terpotong).

- `composables/questionnaire/useQuestionnairePrint.ts`: tambah `extractTemplateStyles(tpl)` — ekstrak semua tag `<style>` dari template → `{ styles, body }`. `printQuestionnaireHtml` kini memakai `extractTemplateStyles` lalu render body dan menyisipkan `styles` di `<head>` (setelah CSS bawaan). Dengan ini user bisa menulis `<style>` di bagian atas template, dan saat print/preview style tersebut di-apply.
- `components/questionnaire/QuestionnairePrintTemplateModal.vue`:
  - Konten modal dibuat scrollable (`max-h-[62vh] overflow-y-auto`) dan textarea dikurangi ke 12 baris (`shrink-0`) agar blok "Placeholder yang tersedia" di bawah selalu terlihat.
  - `runPreview` ekstrak style template → disimpan di `previewCssExtra`; iframe preview kini memakai computed `previewDoc` (HTML lengkap: `<head>` berisi `previewCss` + style template, body berisi `.document-page`).
  - `openPrintPreview` memakai `printQuestionnaireHtml` (seragam dengan hasil print nyata, termasuk style template).
  - Tambah panduan: "Styling: tulis `<style>` di dalam template ... akan ikut di-render saat print/preview."
- `pages/front-office/questionnaire-results.vue`: `templatePrintHtml` memakai `extractTemplateStyles` sehingga style di dalam template ikut di-render.
- Verifikasi: lint bersih; typecheck tanpa error untuk file yang diubah (error lain pre-existing di HEAD).

## Completed — 2026-08-10: Dynamic Print Template Questionnaire (ala Jinja/Frappe)

**Perintah:** Buat template print questionnaire agar dinamis dan bisa diatur di `/questionnaire`. Diputuskan menyimpan template sebagai **teks HTML + placeholder Jinja-like** di kolom baru `printTemplate` (bukan JSON config), dirender di FE via composable sendiri (tanpa dependency baru).

### Backend (express_dash)
- `prisma/schema.prisma`: tambah kolom `printTemplate String? @db.MediumText` di model `QstQuestionnaire` + `prisma db push`.
- `questionnaire.service.js`: `toListItem`/`toDetail` expose `print_template`; `create`/`update` menerima `printTemplate` (camel) dan `print_template` (snake).
- `public-registration.service.js` `getQuestionnaires`: detail `GET /registration/number/:id_reg/questionnaires` sertakan `print_template` per questionnaire.
- Verifikasi: list mengembalikan `print_template`; PUT `print_template` tersimpan & muncul di list; detail menyertakan `print_template`.

### Frontend (my-app)
- `composables/questionnaire/useQuestionnairePrint.ts` (baru): renderer template Jinja-like —
  - `{{ var }}` (path dot, literals string/angka/boolean/null),
  - `{% for x in list %}` + `loop.index`/`loop.index0`, `{% if %}`/`{% else %}`/`{% endif %}` (nested didukung),
  - filter `upper`/`lower`/`capitalize`/`trim`/`default('x')`/`safe`,
  - `buildQuestionnairePrintContext` — data pasien (nama, gender label, tgl lahir long-format, umur, marital label, telepon, alamat, posisi, No RM/registrasi), company/branch/city (`branchName.split(' - ')[0]`), signature (`CITY, tanggal`), examDate, jawaban (`answers`), dikelompokkan per section (`sections[]` dengan `section.questions[]` + `q.answerValue`).
  - `printQuestionnaireHtml` helper untuk HTML lengkap + CSS bawaan.
- `components/questionnaire/QuestionnairePrintTemplateModal.vue` (baru): editor di `/questionnaire` (dropdown row "Print Template") — textarea HTML, tombol "Gunakan Template Default", "Preview" (iframe srcdoc dari sample context), "Buka di Print Window", Simpan (PUT `print_template`), panduan placeholder/loop/filter.
- `pages/questionnaire/index.vue`: type `Questionnaire` + `printTemplate`; aksi "Print Template" di dropdown baris; modal terpasang.
- `pages/front-office/questionnaire-results.vue`: `printSingle` kini render dari `print_template` questionnaire (melalui `buildQuestionnairePrintContext` + `renderQuestionnaireTemplate`); jika template kosong → fallback `legacyPrintHtml` (layout paper-document lama). TempQuestionnaire type + `print_template`.
- Verifikasi: unit test renderer (loop, if/else, nested, loop.index, filter, default) semua PASS; lint bersih; typecheck bersih untuk file yang diubah (error `questionnaire/index.vue` TS7022/7023 pre-existing di HEAD); headless Chrome — menu "Print Template" muncul, modal editor terbuka, simpan berhasil, print dari hasil questionnaire ter-render dari template (data pasien tersubstitusi, section loop, consent, ttd, footer "Page 1"), fallback tanpa placeholder mentah.

## Completed — 2026-08-08: Hasil Questionnaire — view answers & print gaya form KUESIONER MCU

**Perintah:** Ubah tampilan view answers (modal) agar menyerupai print form MCU1 lama (`ci/application/views/menu/print_quest_mcu2.php`): blok DATA DIRI + pertanyaan bernomor dengan jawaban inline. Modal **dan** print sekaligus, DATA DIRI lengkap (umur, jenis kelamin, status pernikahan, telepon, alamat).

### Backend (express_dash)
- `questionnaire.service.js` `listResults`: tambah `patientGender`, `patientDob`, `patientAge` (dihitung dari dob), `patientMaritalStatus`, `patientPhone`, `patientAddress` (dari `Address` polimorfik `PATIENT` → detail + district + city + province, diambilkan 1 per patient terbaru via promise paralel).
- `public-registration.service.js` `getQuestionnaires`: detail `GET /registration/number/:id_reg/questionnaires` kini mengembalikan **semua** soal berurutan (tidak difilter yang terjawab) + flag `answered` per soal, agar form bernomor lengkap seperti print form.
- Verifikasi: `GET /api/questionnaire/results` mengembalikan field baru; detail questionnaires mengembalikan semua soal + `answered`.

### Frontend (my-app)
- `pages/front-office/questionnaire-results.vue`: modal "View answers" dirombak jadi gaya form — blok **DATA DIRI** (Nama Lengkap + Jenis Kelamin, Umur, No. RM, Perusahaan, Status Pernikahan, Alamat Rumah, Telepon, Registrasi, Exam Date, Branch) lalu bagian **"ISILAH PERTANYAAN DIBAWAH INI DENGAN SEBENARNYA"** dengan soal bernomor (1., 2., …) dan jawaban inline (jawaban kosong tampil "-"). Helper baru: `genderLabel`, `maritalLabel`, `dataDiriRows`. Print (`printSingle`) juga dibuat gaya form serupa: judul KUESIONER MEDICAL CHECK-UP + DATA DIRI + tabel No/Pertanyaan/Jawaban + area tanda tangan Pasien & Dokter.
- Verifikasi: lint bersih, typecheck tanpa error untuk file ini, headless Chrome — modal menampilkan 11 baris DATA DIRI + soal bernomor dengan jawaban inline.

## Completed — 2026-08-08: View Answers Hasil Questionnaire gaya form KUESIONER MCU (paper-document)

**Perubahan terakhir:** ritel modal & print agar menyerupai referensi `gemini-code-1786166780281.html`:
- BE `listResults` tambah `patientPosition` (dari `PatientCompanyHistory`, current position); detail `GET /registration/number/:id_reg/questionnaires` sertakan `sectionTitle` per soal + kirim semua soal (bukan hanya terjawab) + flag `answered`.
- FE modal view answers: paparan paper-document — blok DATA DIRI sebagai tabel `label : value` (Nama Lengkap+gender, Tgl Lahir+Umur, Perusahaan, Status Pernikahan, Alamat, Telepon, **Posisi Pekerjaan**, No. RM/Registrasi, Exam Date, Branch), soal dikelompokkan per **section** (e.g. KHUSUS WANITA) dengan numbering, hanya soal **berjawab** yang tampil, consent (PERNYATAAN & PERSETUJUAN — 2 poin izin), area tanda tangan (JAKARTA, tanggal, (ttd)), footer "Page 1". Print (`printSingle`) serupa (tanpa grup section — satu daftar terjawab, plus posisi, consent, ttd, footer).
- Verifikasi: lint + typecheck bersih, headless Chrome — 8 baris DATA DIRI, numbering decimal, adanya consent/ttd/Page 1.

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
