# MCU Flow Audit — Registrasi Portal s/d MR Released & Checkout

Last updated: 2026-09-28
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
