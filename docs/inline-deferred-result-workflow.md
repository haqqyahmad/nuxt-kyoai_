# Rencana Kerja: Inline/Deferred Result, Dynamic Approval, dan Release

> Document ini mendeskripsikan rencana implementasi workflow approval untuk hasil pemeriksaan medis, dari pengisian hasil hingga release final report.

---

## Summary

Rencana sebelumnya perlu diperluas:
- **DEPARTMENT_APPROVED** bukan akhir
- Sesuai BMAD, hasil baru boleh masuk final report setelah melewati:
  **Department Approval → Doctor Review → MR Verification → Release**
- Hanya report berstatus **RELEASED** yang boleh dipakai untuk Current, Previous, dan Last

---

## Key Status Layers

### 1. RoomExamItem.status
Status pengerjaan di ruangan:
```
PENDING → IN_PROGRESS → DONE / SKIPPED / REFUSED / RETEST / RESCHEDULED
```

### 2. TrxExamItem.resultStatus
Status hasil per item:
```
NOT_READY → READY → DRAFT → SUBMITTED → RETURNED
```

### 3. ExamDepartmentResult.status
Approval hasil per department:
```
DRAFT → DEPARTMENT_REVIEW → RETURNED_TO_DEPARTMENT
                                ↓
                        DEPARTMENT_APPROVED → SUBMITTED_TO_DOCTOR
```

### 4. MedicalReport.status
Status review dokter, MR, dan release:
```
DOCTOR_REVIEW → RETURNED_TO_DEPARTMENT
       ↓
DOCTOR_APPROVED → MR_REVIEW → MR_RETURNED_TO_DOCTOR
       ↓
MR_VERIFIED → READY_TO_RELEASE → RELEASED
```

---

## Workflow

### Inline Result
1. Diisi dan submit dari room
2. Setelah submit, `TrxExamItem.resultStatus = SUBMITTED`
3. Di menu Result tampil **read-only** dan tidak boleh submit ulang
4. Department masuk **DEPARTMENT_REVIEW**

### Deferred Result
1. Baru **READY** setelah item pemeriksaan **DONE**
2. Diisi dari menu Result sebagai **DRAFT**
3. Saat submit menjadi **SUBMITTED** dan masuk **DEPARTMENT_REVIEW**

### Dynamic Department Approval
1. Workflow configurable per department via `ResultReviewWorkflow` dan `ResultReviewStep`
2. Approval berurutan
3. **Inputter tidak boleh approve level pertama** (four-eyes rule)
4. Return wajib memilih item/inputan dan alasan
5. Final approval department menghasilkan **snapshot immutable** dan status **DEPARTMENT_APPROVED**

### Doctor / MR / Release
1. Hanya department **DEPARTMENT_APPROVED** yang masuk worklist dokter
2. Dokter bisa **approve** atau **return** ke department
3. Setelah dokter approve → report masuk **MR_REVIEW**
4. MR bisa **return** ke dokter atau **verify**
5. MR verified → **READY_TO_RELEASE**
6. Aksi release → **RELEASED** dan mengunci versi report

---

## Data Model Additions

### Department Approval
- `ResultReviewWorkflow` — konfigurasi workflow per department
- `ResultReviewStep` — step-step approval
- `ExamDepartmentResult` — hasil per department
- `ExamDepartmentResultVersion` — versi snapshot immutable
- `ExamDepartmentReviewAction` — log aksi review
- `ExamResultRevisionItem` — item yang di-revisi

### Report / Release
- `MedicalReport` — report gabungan
- `MedicalReportDepartmentVersion` — versi per department
- `MedicalReportAction` — log aksi report

### Prinsip Snapshot
Snapshot harus menunjuk **version ID** yang disetujui, bukan mengambil master/result terbaru secara langsung.

---

## FE Contract

### Room (queue-work)
- Inline submitted: tombol submit **disabled**
- Badge: `Submitted` / `Waiting approval`

### Result Menu
- Inline submitted: **read-only**
- Deferred: **ready** → editable
- Tombol edit/submit mengikuti `canEditResult` dan `canSubmitResult`

### Reviewer (Department Approval)
- Inbox department approval dengan tombol **Approve** dan **Return**

### Dokter
- Worklist hanya dari department **DEPARTMENT_APPROVED**
- Bisa grading/comment, approve, atau return department

### MR (Medical Record)
- Worklist report dokter approved
- Bisa **verify** atau **return** ke dokter

### Release
- Preview final sebelum release
- Setelah **RELEASED**, report **locked**

### Status Exclusion
Status berikut **tidak boleh masuk** final history:
- DRAFT
- DEPARTMENT_REVIEW
- RETURNED
- DOCTOR_REVIEW
- MR_REVIEW
- READY_TO_RELEASE

### Audit Trail
Semua submit, approve, return, revise, verify, dan release wajib masuk **append-only audit**.

---

## Test Plan

| No | Test Case | Expected Result |
|----|-----------|-----------------|
| 1 | Inline submit dari room | Tidak bisa submit ulang di Result menu |
| 2 | Deferred input | Baru bisa input setelah item DONE |
| 3 | Department approval | Berurutan sesuai workflow dynamic |
| 4 | Four-eyes rule | Inputter tidak boleh approve level pertama |
| 5 | Doctor worklist | Hanya menerima department DEPARTMENT_APPROVED |
| 6 | Doctor return | Membuka revision item/inputan terkait |
| 7 | MR verified | Menghasilkan READY_TO_RELEASE |
| 8 | Release | Mengubah report menjadi RELEASED dan mengunci version |
| 9 | Current/Previous/Last | Hanya membaca report RELEASED |

---

## Assumptions

1. V1 dynamic workflow dibatasi per department + ordered steps
2. Rule engine bebas (berdasarkan item/result/company/paket) **tidak dibuat dulu**
3. `TrxExam.status = completed` tetap aggregate operasional, bukan tanda final release report
