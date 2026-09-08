# BMAD FE — Domain Modules

Modul frontend dikelompokkan sesuai domain backend. Setiap modul terdiri dari halaman, komponen, dan composable.

## 1. Front Office

### registration-temp
- `pages/front-office/registration-temp/{index,[id]}.vue`
- melihat daftar pendaftaran sementara dari portal, review & **approve/reject**.
- approve: `POST /registration-temp/{id}/approve` (membuat Patient + Registration + address).
- reject: `POST /registration-temp/{id}/reject`.

### registration-patient
- `pages/front-office/registration-patient/{create,index,[id]}.vue`
- **create**: membuat registrasi manual, termasuk dari temp (query `tempId`).
- **[id]**: detail registrasi → status, meal countdown, questionnaire list, checkout-eligibility, tombol aksi.
- auto-fill perusahaan & posisi dari patient history / temp.

### questionnaire-results
- `pages/front-office/questionnaire-results.vue`
- daftar hasil kuesioner lintas pasien, view & print.

## 2. Rooms (Operasional)

### queue
- `pages/rooms/queue.vue`
- daftar waiting, modal ambil pasien.
- "Ambil Pasien" butuh `stageId` dari stage `WAITING`.

### queue-work `[id]`
- `pages/rooms/queue-work/[id].vue`
- pekerjaan room: renderer per item (physical/dental/doctor test/ECG/external/generic).
- stage action: mulai pemeriksaan, kembalikan ke waiting, selesaikan room.
- meal prerequisite & countdown.
- **ECG/treadmill clearance** via `EcgResultPanel`.

### assignments
- `pages/rooms/assignments.vue`
- assign room, self-assign.

### sample-collection / sample-reception
- `pages/rooms/sample-collection/{index,[id]}.vue`
- `pages/rooms/sample-reception/index.vue`
- pengambilan & penerimaan sampel lab.

### types / dental
- `pages/rooms/types/index.vue` — tipe ruangan + stage.
- `pages/rooms/dental/{[id],print/[id]}.vue` — pemeriksaan gigi.

## 3. Results

### exam-results
- `pages/result/exam-results/{index,[id]}.vue` + `components/`.
- hasil pemeriksaan per pasien, panel per tipe item (physical/dental/ECG/detail drawer).
- **department approval** (four-eyes).

### exam-status
- `pages/result/exam-status/{index,[id]}.vue`
- status pemeriksaan per pasien.

### doctor-result
- `pages/result/doctor-result/{index,[id]}.vue`
- grading hasil dokter, approval/return.
- `useDoctorResult` — optimistic update & rollback.

### mr-review
- `pages/result/mr-review/{index,[id]}.vue`
- review laporan medis: verify/return/release. `useMedicalReport`.

### department-approval
- `pages/result/department-approval.vue`
- inbox persetujuan hasil per departemen.

## 4. Medical / Items / Questionnaire

### items/mcu
- `pages/items/mcu/{index,[id]}.vue`
- master item MCU, template inputan, **meal config** (durasi + prerequisite).

### items/groups, sample-types
- group item & tipe sampel.

### questionnaire
- `pages/questionnaire/index` — list kuesioner.
- `[id]/builder.vue` — builder section/question/option & conditional logic.
- `[id]/preview.vue` — preview isi.

### master-grading
- `pages/medical/master-grading.vue`
- aturan grading hasil.

## 5. HRIS

- `hris/index` — dashboard HR.
- `hris/employees` — data karyawan.
- `hris/leaves/{index,create,[id]}` — cuti (approve/reject).
- `hris/attendance/*` — kehadiran, tracking, analytics, shift config/schedule.
- `hris/national-holidays`, `hris/reimbursement`, `hris/recruitment`.

## 6. Settings / Master

- `pages/settings/index` — pemisah tab.
- `settings/{members,notifications,permissions,roles,security,result-workflow}.vue`
- `branches`, `departments`, `patients`, `users`, `customer`.
- `services/{packages,types}`.

## Keterkaitan Composable ↔ Modul

| Modul | Composable Utama |
|---|---|
| Front Office | `useAuth`, `useCurrentUser`, `useApi` |
| Rooms | `useRoomSession`, `useRoomAssignments`, `useRooms`, `useRoomTypes` |
| Results | `useDoctorResult`, `useMedicalReport` |
| Questionnaire | `useQuestionnaire*`, `useQuestionnairePrint` |
| MCU | `useMcuReportPrint` |
| Access | `useRoutePermission`, `useMenuPreview` |
