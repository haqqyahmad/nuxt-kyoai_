# MCU Flow Audit — Registrasi Portal s/d MR Released & Checkout

Last updated: 2026-10-20
Scope: `Portal/regist_portal` → `BE/db_express` → `FE/my-app`
Sumber kontrak domain: `BE/db_express/docs/bmad/12-mcu-flow.md`

Dokumen ini mencatat hasil audit alur MCU end-to-end beserta temuan dan status perbaikannya.

---

## 1. Aktor

| Aktor | Peran |
|---|---|
| Pasien (Portal) | Mengisi form registrasi mandiri → `RegistrationTemp` |
| Front Office | Review temp, approve, buat Registration + Exam, check-in, checkout |
| Nurse / Ruangan | TTV, vital sign, panggil/mulai/selesaikan stage & item |
| Lab | Collect/Receive/Reject sample, input hasil (deferred) |
| Radiologi | Input hasil (deferred) |
| Dokter internal | Pemeriksaan fisik, doctor test, treadmill screening/clearance, grading |
| Dokter eksternal | Isi hasil item `externalResult` + lampiran PDF |
| Medical Record (MR) | Verifikasi & release laporan akhir |

## 2. Layer Status (sumber kebenaran)

- `RoomExamItem.status`: `PENDING / IN_PROGRESS / DONE / SKIPPED / RESCHEDULED / REFUSED / RETEXT`
- `TrxExamItem.workStatus` (mirror operasional FO) & `resultStatus`: `NOT_READY / READY / DRAFT / SUBMITTED / RETURNED`
- `ExamDepartmentResult.status`: `DRAFT / DEPARTMENT_REVIEW / RETURNED_TO_DEPARTMENT / DEPARTMENT_APPROVED / SUBMITTED_TO_DOCTOR`
- `MedicalReport.status`: `DOCTOR_REVIEW / RETURNED_TO_DEPARTMENT / DOCTOR_APPROVED / MR_REVIEW / MR_RETURNED_TO_DOCTOR / MR_VERIFIED / READY_TO_RELEASE / RELEASED`
- `Registration.statusRegistration`: `Open / Reschedule / Checkin / CheckOut / PartialExam / Cancel`
- `RegistrationTemp.status`: `PENDING / PROCESS / APPROVED / REJECTED / EXPIRED`

## 3. Alur per Tahap

### A. Portal → RegistrationTemp
- Form: `regist_portal/src/routes/registration/+page.svelte` + komponen step; submit via `POST /api/patient` (proxy `+server.ts`) → BE `POST /public/register/:branchCode` (`api-key-kyo`).
- BE: `public-registration.service.js` `submitFromPublic` → `createTemp` (address/company/marital temp, allergy/disease notes, `expiredAt` 24 jam).

### B. FO review → Patient + Registration + Exam
- `registration-temp/[id].vue`: status `APPROVED` → `POST /registration-temp/:id/process` → redirect ke `registration-patient/create`.
- `create.vue` submit → `POST /registration-temp/:id/approve` (Patient + Registration + **TrxExam + items atomik** sejak A1) → status `Open`.
- Paket & additional items dikirim di payload approve (`paketId`, `additionalItems`).

### C. Check-in → Queue
- `POST /registration/:id/checkin` → `queue.service.checkin`: `QueueEntry` + `RoomQueueItem` (tier) + `StageQueueItem` + `QueueSampleCollection`; `Registration = Checkin`.
- Tier: FREE & strict tier pertama `WAITING`, lainnya `LOCKED`; unlock via `unlockNextTier` setelah tier sebelumnya final.

### D. Eksekusi Ruangan
- Stage: call → start → done / skip / return; Item: start → done / skip / refuse / retest / reschedule.
- Lab: sample collect → receive (buat `TrxExamResult`), reject, reschedule (resample).
- Dokter internal: physical/doctor-test/treadmill (ECG attach + clearance).
- Dokter eksternal: assign → upload PDF → PROCESSING → FILLED (`ExternalResultAssignment`, deadline 3 jam).

### E. Department Review → Doctor → MR
- Submit hasil → `DEPARTMENT_REVIEW` (+ snapshot immutable, `resultStatus=SUBMITTED`).
- Approve per item (four-eyes, multi-step) → `DEPARTMENT_APPROVED`; semua dept → `SUBMITTED_TO_DOCTOR` + `MedicalReport=DOCTOR_REVIEW`.
- Doctor result: agregasi + grading (`MstGradeRule`, `gradingMode`) → submit (`finalGrade`+`fitnessLevel`) → `DOCTOR_APPROVED`.
- MR: `DOCTOR_APPROVED → MR_REVIEW → MR_VERIFIED → READY_TO_RELEASE → RELEASED`; `RELEASED` → `TrxExam=completed`.

### F. FO Checkout
- `GET /registration/:id/checkout-eligibility` → `PATCH /checkout` (`CheckOut`).
- Item `RESCHEDULED` → boleh CheckOut dengan warning (aturan kanonik, lihat §5).

---

## 4. Perbaikan yang Diterapkan (2026-09-28)

| Kode | Masalah | Perbaikan |
|---|---|---|
| A1-a | Approve & create exam tidak atomik (3 call) | `TrxExam + items` dibuat dalam transaksi `POST /registration-temp/:id/approve`; FE `create.vue` cukup 1 call |
| A2 | `registrationId ?? 19` hardcode | `registrationId` wajib (400 bila kosong) |
| A3-a | Grading arah (INC/DEC) tak pernah terbentuk | `_calculateFlag` kembalikan `direction`; `computeItemGrading(flag, direction)`; helper `resolveResultDirection` |
| A4 | Job `expire-temp` mati | Diaktifkan di `index.js` |
| B1 | FE Abaikan otorisasi reviewer | Tombol Approve pakai `departmentCanApprove` / `departmentApproveDisableReason` |
| B2-a | Return multi-step selalu mulai step 1 | Field `ExamDepartmentResult.returnedStepOrder`; resubmit resume dari level itu |
| B3 | `gradingMode` tak ditegakkan | `saveDoctorResultGrade` menolak department `gradingMode=department` |
| B4 | Normal value tak difilter edisi di Doctor Result | Filter `examCode` via `_pickByExamCode` di `getDoctorResult` & `saveDoctorResultGrade` |
| B5 | MR worklist tanpa gate status | Default `DOCTOR_APPROVED`; dukung multi-status koma |
| B6-a | MR return langsung buat revisi department | Revisi hanya dibuat via `returnDoctorResultToDepartment` |
| B7 | `RETURNED_TO_DEPARTMENT` tak pernah dipakai | Dipakai saat dokter return ke department; worklist dokter terima status ini |
| C2 | Pesan error verify/release tidak akurat | Pesan menyebut kedua status yang diterima |
| C3 | `exam-status` pakai `resultStatus='APPROVED'` legacy + sample dari roomExamItems | Pakai enum sebenarnya + `itemApproved`; sample dari `queue.sampleCollections` |

### Endpoint tanpa pemanggil FE (C4 — didokumentasikan)
- `PATCH /medical/exams/queue/stage/:id/skip`
- `PATCH /medical/exams/queue/samples/:id/reschedule`
- `PATCH /medical/exams/queue/room-item/:id/reschedule`

FE melakukan reschedule via `exam-item/:id/reschedule` atau `/registration/:id/reschedule-dates`.

## 5. Aturan Kanonik Checkout vs RESCHEDULED (C7)
Bila ada item `RESCHEDULED`: **CheckOut diperbolehkan dengan warning** (mengikuti kode saat ini). `QueueEntry` tetap tidak boleh `DONE` selama masih ada room `RESCHEDULED`.

## 6. Catatan (C5)
Sample reception list sengaja tidak dibatasi room-assignment (biarkan seperti sekarang); COLLECT tetap dibatasi room/stage.

---

## 7. Verifikasi Runtime

Dijalankan pada DB dev (`db_express_dev`), 2026-09-28:

| Uji | Endpoint/Aksi | Hasil |
|---|---|---|
| A1 approve atomik | `POST /registration-temp/b9cf0c32…/approve` (+`paketId`) | ✅ Registration `REG-20260928-01-0001` (id 107) + `TrxExam` `registrationId=107` + 1 item, 1 request |
| A2 registrationId benar | query DB | ✅ `exam.registrationId = 107` (bukan 19) |
| A3 grading arah | unit `computeItemGrading`/`resolveResultDirection` | ✅ `abnormal+increase→ABNORMAL_INC`, `abnormal+decrease→ABNORMAL_DEC` |
| A4 job expire-temp | log BE | ✅ `[expire-temp] Scheduled every 15 minutes` |
| B4 normal edisi | `GET /mcu/exams/:id/doctor-result` | ✅ 200, 5 dept, submission DOCTOR_REVIEW |
| B5 MR gate | `GET /medical-reports` vs `?status=RELEASED` | ✅ default hanya `DOCTOR_APPROVED`; `RELEASED` OK |
| B7 worklist multi-status | `GET /mcu/exams/results?medicalReportStatus=MR_RETURNED_TO_DOCTOR,RETURNED_TO_DEPARTMENT` | ✅ 200 (sebelumnya 500 — diperbaiki di `getExamResultsLight`) |
| C3 itemApproved | `GET /registration/number/:id_reg` | ✅ 7 examItems + key `itemApproved` |
| Regresi test BE | `npm test` | ✅ 45 pass / 3 fail (3 pre-existing: grading visibility & checkout i18n) |
| Lint/typecheck FE | `eslint` + `nuxt typecheck` | ✅ bersih |

**Belum diuji (perlu UI/browser):** happy-path penuh via UI untuk `REG-20260926-01-0001` (check-in → ruangan → hasil → dept → dokter → MR → checkout) dan verifikasi visual tab Result/Exam di MR Review.

---

## 8. P0 Fix Batch � 2026-10-20 (pra-merge `feature/dev` ? `master`)

### Diperbaiki
- **Security**: escape nilai dinamis + CSP di print questionnaire (`useQuestionnaireResultPrint.ts`, `useQuestionnairePrint.ts`) dan CSS string print MR (`useMrPrintHtml.ts`); DTO minimal `patient-lookup` (tanpa `diseaseNotes`/data internal) + rate limit lookup 10/10 menit (`public-registration.service.js`, `public-registration.route.js`); Portal result memakai `PUBLIC_DECODE_URL` (`env.ts`, `result/+page.svelte`).
- **Print/release**: `GET /mcu/exams/:id/print` & `print.pdf` hanya untuk report `RELEASED`; endpoint baru `GET /mcu/exams/:id/print/preview` (status `MR_VERIFIED`/`READY_TO_RELEASE`) dengan `internalNote` hanya di preview. FE MR: tombol `Preview MR` (watermark, tanpa auto-print) saat belum released, `Cetak PDF` hanya saat `RELEASED` (`MrMcuDetail.vue`, `useMrPrintHtml.ts`, `exam.service.js`, `exam.controller.js`, `mcu.route.js`).
- **Audit/status**: `status=all` (atau status tak dikenal) ? 400 + validasi enum (`medical-report.service.js`); MR list memuat status awal yang benar (`mr-review/index.vue`); verify/release/return atomik + payload audit; return pasca-verify wajib pilih item + clear `mrVerifiedBy/At`.
- **Locking**: grade dokter & hasil dental terkunci setelah `DOCTOR_APPROVED`; hasil dokter luar terkunci pasca-approve (`exam.service.js`, `dental.service.js`, `exam.repository.js`).
- **Konsistensi**: item terminal dikecualikan dari validasi grading submit dokter; sample `RESCHEDULED`/`REJECTED` menyinkronkan `TrxExamItem.workStatus`; version snapshot menerima department `SUBMITTED_TO_DOCTOR`; kunjungan kembali tidak lagi men-set `TrxExam=completed`.
- **FO/FE**: delete patient diganti **Cancel registration** (`PATCH /registration/:id/cancel`); pilihan company tidak lagi terhapus saat pilih pasien; submit menampilkan field yang kurang; autoselect opsi pertama & default `"-"` dihapus; `clearNuxtData()` global saat login/logout; validasi password login min 8 dihapus; jawaban kuesioner Portal retry 3� + antrean `pending_questionnaire_answers` + warning.

### Verifikasi
- `node --check` 10 file BE: OK.
- `npm test` BE: 68 pass / 1 fail (pre-existing `checkout-eligibility` i18n expectation), tidak ada failure baru.
- FE `npx vue-tsc --noEmit -p .nuxt/tsconfig.json`: EXIT=0.
- Portal `svelte-check`: file yang diubah (env, result, registration) tanpa error; 80 error lama di halaman service/statis tidak terkait.

### Belum dikerjakan / deferred
- **Non-MCU/Outpatient (HOLD)**: reuse encounter `CANCELLED`/`DONE`, cancel reset registration, check-in atomik, `today()` UTC, history `statusIn`, `call` default doctor, permission FO, eligibility preview, picker `Open`.
- Enforce `UserResultAccess` menyeluruh, four-eyes efektif di semua jalur approval, helper tunggal checkout list/detail, light revision map `id`, dan normalisasi timezone MCU/queue/exam/registration belum disentuh pada batch ini.
- E2E UI penuh (Portal ? FO ? ruangan ? dokter ? MR ? checkout) belum dijalankan pada batch ini.

---

## 9. Phase 1 Closure � 2026-10-20

### Implementasi
- **UserResultAccess**: `approveExamItem` selalu memanggil `assertCanAccessResultDepartment` (superadmin bypass, dokter luar via assignment); helper akses yang sama dipakai list/detail approval.
- **Four-eyes efektif**: `resolveEffectiveSubmitterId` (dept `submittedBy` ? audit SUBMIT terakhir ? `TrxExamItem.resultSubmittedBy`), dipakai di approve dan badge `departmentCanApprove`.
- **Checkout satu helper**: `evaluateCheckoutEligibility` dipakai list & detail; kanonik semua item `paket` + `additional`; reschedule room tetap boleh checkout dengan warning.
- **Revision map `id`**: `examResultRevisionItem.id` disertakan di response; tipe FE diperbarui.
- **Timezone WIB**: `src/utils/date.js` (`APP_TIME_ZONE`, default `Asia/Jakarta`), dipakai queue/registration/queue repository; `generateCode` menerima tanggal lokal dari registration.
- **Preview print**: status preview mencakup `DOCTOR_APPROVED`/`MR_REVIEW`/`MR_VERIFIED`/`READY_TO_RELEASE`; final print tetap hanya `RELEASED`.

### Verifikasi
- `npm test` BE: **75 pass / 0 fail** (termasuk test checkout helper & timezone).
- FE `vue-tsc`: EXIT=0. Portal `svelte-check`: file yang diubah bersih (80 error lama tidak terkait).
- Runtime: `GET /medical-reports?status=all` ? **400**; status valid ? 200.
- E2E Playwright: **10/10 check** (`tests/e2e/mcu-flow.e2e.mjs`), artefak `tests/e2e/artifacts/2026-10-20T04-36-49-007Z`.
  - Portal registration page 200 + form tampil.
  - MR preview 200; verify ? `MR_VERIFIED`; ready ? `READY_TO_RELEASE`; release ? `RELEASED`.
  - Final print API 200, `internalNote` kosong di final; UI memicu `/print.pdf` 200 dan membuka output.
  - Checkout `REG-20261019-01-0002` ? `CheckOut` (run sebelumnya, artefak `2026-10-20T04-35-13-455Z`).
- Data uji: report `a30d4d19-e18c-4567-ad93-26f91e651cf0` (exam `d8ddf7a7�`) di-release; 2 department (Nurse, Lab) di-approve; item ECG & Dental di-submit; attachment `ECG.pdf` yang file-nya hilang ditandai deleted agar PDF bisa dibuat. Tidak ada data E2E- baru; data lama dev yang dipakai.

### Catatan
- Print pre-release 409 sudah tervalidasi sebelum report di-release (run `2026-10-20T04-33-18-902Z`).
- Negative test lintas-department/four-eyes via UI belum ditambahkan ke script; enforcement-nya ada di service dan unit test dasar.

### 9.1 Follow-up � Superadmin reviewer bypass (2026-10-20)
- `canUserReviewStep` menerima `isSuperAdmin` dan langsung `allowed`; dipakai di approve item, list result, dan detail result.
- Halaman `/result/exam-results/b05f0061�` sebagai superadmin: warning `Step "Approve FInal" hanya boleh diapprove oleh role yang ditunjuk` hilang; `departmentCanApprove=true`.
- Nilai `0` pada Refraction Left/Right tetap tampil (bukan bug); input disabled karena hasil sudah `SUBMITTED`.
- Test BE: `tests/result-access.test.mjs` (superadmin bypass, non-super ditolak, four-eyes).

### 9.2 Default answers dokter luar (2026-10-20)
- `DetailDrawer.vue`: saat external doctor workspace berstatus `PROCESSING`, input `selected` yang masih kosong diisi default: `Normal` -> `No` -> `Sinus Rhythm`; input number/string/calculated tidak diisi.
- Default juga diterapkan tepat setelah `Start Process` sukses dan saat membuka item yang sudah PROCESSING; nilai existing tidak ditimpa dan belum disimpan sampai Save Draft/Submit.
- Banner "Default answers applied" ditampilkan sebagai pengingat review.
- Verifikasi Playwright sebagai `dokter2@kyoai.com` pada ECG `4be357c6�`: Hypertrophy/Transition/ST/T/W/Arrhythmia/Q/P/Axis = Normal, Others = No, Heart Rhythm = Sinus Rhythm, tanpa console error. User internal tidak mendapat default.

- Perluasan default Radiologi: normal-equivalent `Tidak Ada` dan `CTR < 50 %`. Verifikasi Thorax AP/PA `32184bf1�` sebagai `dokter2`: 14/14 field terisi (Cor `CTR < 50 %`, Nodul/Infiltrat `Tidak Ada`), tanpa error.

### 9.3 Doctor Result status lock (2026-10-20)
- Badge Doctor Result sekarang memakai `submission.status` (bukan hardcoded `DOCTOR_REVIEW`).
- `canSubmit` hanya untuk status editable (`not_submitted`, `DOCTOR_REVIEW`, `MR_RETURNED_TO_DOCTOR`, `RETURNED_TO_DEPARTMENT`); grade/komentar/final grade/fitness/return dikunci saat read-only.
- Auto-grade normal tidak dijalankan saat read-only (mencegah POST grade ditolak backend).
- Verifikasi `c980fd33�` (`DOCTOR_APPROVED`): badge benar, banner view-only, dua tombol Submit disabled, tanpa console error.

### 9.4 Doctor Result worklist (2026-10-20)
- Default filter worklist = `DOCTOR_REVIEW`; opsi `All Status` tetap tersedia.
- `meta.summary` ditambahkan di BE (`needsDoctorReview`, `readyForMrReview`, `needsRevision`, `totalItems`) untuk `groupBy=exam`.
- Status/aksi list memakai `medicalReportStatus`: `Fill Result` hanya untuk status editable, selain itu `View Result`.
- Exam code list memakai field root `examCode` (sebelumnya kolom Exam menampilkan `-`).
- Statistik total tidak lagi per halaman; Export disabled.
- Verifikasi: default 5 `Needs Review`, stats 5/1/1/295, `All Status` menampilkan `Ready for MR Review` + `View Result`, 78/78 test BE, `vue-tsc` EXIT=0.

### 9.5 MR release audit labels (2026-10-20)
- `releaseMedicalReport` menyimpan payload audit `step` (`ready`/`release`), `fromStatus`, `toStatus`.
- FE MR timeline memetakan `RELEASE` step `ready` ? **Ready to Release**, step `release` ? **Released** (fallback legacy via `toStatus`).
- Backfill 27 aksi RELEASE lama: pasangan pertama `ready`, terakhir `release`. Report `8dd4f82f�` sekarang menampilkan satu **Ready to Release** dan satu **Released**.

### 9.6 Print logo CSP (2026-10-20)
- Logo print MR/History tidak tampil karena CSP `img-src data: blob:` memblokir `http://localhost:3000/logo.png`.
- Util baru `app/utils/printCsp.ts`: `img-src` menyertakan origin FE secara dinamis; script/connect/frame tetap diblokir.
- Diterapkan di print MR, questionnaire result, questionnaire template, dan MCU report preview.
- Verifikasi Playwright MR History -> Cetak PDF: `<img src="/logo.png">` `naturalWidth=150` (sebelumnya 0).
