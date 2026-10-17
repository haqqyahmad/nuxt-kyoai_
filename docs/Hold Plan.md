# Hold Plan

## Topik: Edit hasil sebelum Approve (exam-results detail) — ON HOLD

### Konteks
- Item `resultStatus=SUBMITTED` + dept `DEPARTMENT_REVIEW`
  (contoh: exam item 2950f028, LAB, exam f1ee3cfe / REG-20261007-01-0001).
- Di halaman exam-results hanya ada tombol "Approve Item"; field hasil read-only (tanpa tombol Edit).

### Penyebab (kode)
- FE `app/pages/result/exam-results/components/DetailDrawer.vue`
  - Approve: :1665-1675 (DEPARTMENT_REVIEW + resultStatus SUBMITTED/PARTIAL)
  - `canEditCurrentResult`: :301-305
  - Toolbar Save/Submit hanya utk status pending / RETURNED_TO_DEPARTMENT: :1692-1732
  - "Process Status" select (bisa revert status): :2336-2362
- BE `src/services/exam/exam.service.js`
  - `canEditResult = resultStatus !== 'SUBMITTED'` (:741, :1894)
  - `submitResults` tolak 409 bila sudah SUBMITTED (:2730)
  - `updateExamItemResultStatus` (:2815-2840), route `POST /mcu/exams/:id/results/status`

### Opsi (belum dipilih)
1. Tombol "Edit" eksplisit saat DEPARTMENT_REVIEW → revert ke DRAFT → edit → submit ulang → approve.
2. Izinkan edit langsung saat SUBMITTED bagi reviewer (longgarkan `canEditResult`; BE jangan 409).
3. "Return to submitter" level departemen (status baru).
4. Biarkan (hanya Approve; revisi via return dokter/MR).

### Pertanyaan terbuka
- Pilih opsi (1/2/3/4).
- Siapa yang boleh edit: reviewer / submitter / keduanya.
- Perlu audit log? (rekomendasi: ya)

---

## Revisi — 2026-10-07: konteks baru & opsi dimatangkan

### Perubahan sejak hold dibuat
- Kontrol manual "Process Status" (POST /mcu/exams/:id/results/status) kini SUPERADMIN-ONLY
  (kecuali NOT_READY -> READY untuk petugas dept). Commit BE 5af0b27, FE 414f659.
- Implikasi: opsi "reopen ke DRAFT" tak lagi bisa lewat kontrol status biasa untuk reviewer non-superadmin.

### Referensi kode (terkini)
- FE `app/pages/result/exam-results/components/DetailDrawer.vue`
  - `canEditCurrentResult`: baris 302-306 (`result.canEditResult ?? status==='pending'`)
  - Tombol Approve: baris 1682-1692 (`DEPARTMENT_REVIEW` + `SUBMITTED/PARTIAL`)
  - Toolbar Save/Submit: baris 1709-1749 (hanya status pending / dept `RETURNED_TO_DEPARTMENT`)
- BE `src/services/exam/exam.service.js`
  - `canEditResult = resultStatus !== 'SUBMITTED'` (baris 794, 1947)
  - `submitResults`: 409 bila item SUBMITTED (baris 2783)
  - `updateExamItemResultStatus`: superadmin-only (baris 2868)

### Opsi (matang, belum dipilih)
1. Tombol "Edit" saat `DEPARTMENT_REVIEW` → reopen item (SUBMITTED→DRAFT) → edit → submit ulang → Approve.
   Butuh ENDPOINT REOPEN khusus (mis. `POST .../items/:id/reopen`) untuk reviewer (`exam:update`). (FE+BE)
2. Izinkan edit langsung saat SUBMITTED bagi reviewer (longgarkan `canEditResult`; `submitResults`
   jangan 409 untuk re-save reviewer). (BE lebih invasif; melonggarkan makna "SUBMITTED = terkunci")
3. "Return to submitter" level departemen (action/status baru) → submitter memperbaiki. (BE sedang)
4. Biarkan (revisi hanya via return dokter/MR).

Rekomendasi: Opsi 1 (endpoint reopen khusus + audit) — menjaga `SUBMITTED` terkunci, jelas, aman.

### Pertanyaan terbuka (tetap)
- Pilih opsi (1/2/3/4).
- Siapa yang boleh edit: reviewer (`exam:update`) / submitter / keduanya.
- Perlu audit log (aktor + waktu + sebelum/sesudah)? (rekomendasi: ya)

---

## Topik: Reschedule MCU -> Fase 1 (riwayat + alasan reschedule) -> ON HOLD

### Konteks
- Desain reschedule MCU (dari user) + temuan: sistem Kyoai **reuse nomor registrasi lama** (tidak buat registrasi baru).
- Dua jalur status: item reschedule -> `Registration.statusRegistration = PartialExam`; reschedule level registrasi (`POST /registration/:id/reschedule`) -> `Reschedule` (endpoint ini tak dipakai halaman FO).
- Alur item reschedule sudah **aman** (anti-duplikasi resample, hasil DONE dipertahankan, return-visit idempotent). Fase 1 hanya menambah **jejak audit** (siapa/kapan/berapa kali/item apa/alasan) - bukan perbaikan bug.
- Belum ada tabel riwayat reschedule; hanya `DiffAuditLog`.

### Titik kode (BE)
- `src/services/registration/registration.service.js`
  - `reschedule()` 530-551 (set `Reschedule` + `scheduleDateExam`)
  - `saveRescheduleVisitDates()` 745-784 (set `rescheduleVisitDate` per item + `scheduleDateExam`=earliest)
- `src/repositories/roomExamItem/roomExamItem.repository.js`
  - `rescheduleRoomExamItem()` 399-453 (item->RESCHEDULED, workStatus RESCHEDULED, reg->PartialExam; `roomExamItemInclude` sudah punya `trxExamItem.exam.registrationId/examId`, `trxExamItem.id/item.name`)
- `src/services/roomExamItem/roomExamItem.service.js` -> `rescheduleItem()` 350-355 (titik tulis history item)
- `src/controller/registration/registration.controller.js` -> `saveRescheduleVisitDates` 242-245 (belum kirim actorId)
- `src/validation/registration/registration.validation.js` -> `rescheduleValidation` 94-98 (belum ada `reason`)
- `src/repositories/registration/registration.repositories.js` -> `findByRegNumber()` ~618 (expose)

### Titik kode (FE)
- `app/pages/front-office/registration-patient/[id].vue`
  - Tipe `Registration` (~52) + `queue` (64)
  - Modal reschedule 2751-2793 (`saveRescheduleDatesOnly` 1511-1536, `doCheckout` 1550-1564)
  - Banner "Reschedule Items" ~1799-1822 (lokasi card history)

### Rencana Fase 1 (disetujui arah)
- DB: model `RescheduleHistory` (`registrationId, examId, roomExamItemId, examItemId, scope, itemName, oldDate, newDate, reason, statusAfter, actorId, createdAt`; `@@map("reschedule_history")`). Migrasi manual (stop BE -> CREATE TABLE -> `prisma generate`; jangan `db push`).
- BE tulis: (A) `reschedule()` scope=registration; (B) `saveRescheduleVisitDates()` scope=visit_date (+ kirim actorId + reason); (C) `rescheduleItem()` scope=item (reason=`rescheduleNote`, statusAfter=PartialExam, best-effort).
- BE expose: `findByRegNumber` -> `registration.rescheduleHistory`.
- FE: card "Reschedule History" + field `reason` di modal (mode dates & checkout).

### Keputusan default (silakan koreksi)
- Item-path tetap `PartialExam` (perilaku tak diubah); `statusAfter` disimpan sebagai jejak.
- `itemName` disimpan.
- Tidak ada entri terpisah untuk transisi status registrasi ke PartialExam.

### Pertanyaan terbuka
- Card history hanya di halaman detail FO, atau juga halaman lain?
- Fase lanjutan (belum masuk Fase 1): NO-SHOW + rapikan status (Fase 2); status pemeriksaan terpisah (Fase 3); jadwal terpisah `McuSchedule` (Fase 4, besar); `trx_payment` (Fase 5, proyek baru).
