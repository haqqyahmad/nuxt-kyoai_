# Product Requirements Document

## Kyoai Medical Services - Medical Examination Management System

Versi: 1.3  
Tanggal: 2026-07-25  
Status: Diperbarui — penambahan Sample Collection flow, Room Queue Work stage management, Room Assignments, External Doctor (BMAD), Exam Results detail, Permission System detail, Audit Trail  
Platform: Web dashboard berbasis Nuxt 4, Vue 3, Nuxt UI, Axios  

## 1. Ringkasan Produk

Kyoai Medical Services - Medical Examination Management System adalah aplikasi web internal untuk mengelola alur operasional layanan medis dan medical check-up, mulai dari master data, registrasi pasien, konfigurasi layanan dan item pemeriksaan, pengelolaan ruangan, questionnaire, hingga modul HRIS seperti employee, absensi, shift, hari libur nasional, dan cuti.

Produk ini ditujukan untuk tim operasional klinik atau medical service provider agar proses administrasi lebih terstruktur, data pemeriksaan lebih mudah dikelola, dan aktivitas front office, medical, serta HR dapat dipantau dari satu dashboard.

## 2. Latar Belakang

Codebase saat ini berasal dari dashboard template Nuxt UI yang sudah dikembangkan menjadi sistem operasional Kyoai Medical Services. Modul yang sudah terlihat di aplikasi meliputi:

- Authentication dan session token.
- Dashboard utama dengan ringkasan aktivitas.
- Master Data: branches, customers, departments, patients, users.
- Medical: MCU items, sample types, questionnaire, rooms, service types, service packages.
- Front Office: temporary registration dan patient appointment.
- HRIS: dashboard HRIS, employees, attendance, shift configuration, shift schedule, national holidays, leave management.
- Settings: roles, permissions, security, members, notifications.

PRD ini mendefinisikan kebutuhan produk tingkat pertama agar pengembangan berikutnya memiliki acuan scope, prioritas, acceptance criteria, dan asumsi yang eksplisit.

## 2.1 Snapshot Implementasi Saat Ini

Codebase saat ini sudah memuat area berikut:

- Dashboard utama dengan statistik, chart, recent activity, date range, period selector, dan keyboard shortcuts.
- Master Data: branches, customers, departments (medical + non-medical), patients, users.
- Medical master data: MCU items, sample types, questionnaire builder (7 tipe question, conditional logic, DnD, autosave), rooms, room types, service types, service packages, dan master group.
- **Room Assignments**: PIC mode (single/batch assign), Self-assign mode (role-based room type mapping), room access whitelist.
- **Room Queue Work**: Stage workflow (WAITING → CALLED → IN_PROGRESS → DONE), per-item actions (skip, reschedule, retest, refuse), normal range evaluation berdasarkan gender/umur.
- **Sample Collection Flow**: Dedicated pages untuk collect/receive/reject/reschedule sample, dengan stage management (COLLECT → RECEIVE).
- **Sample Reception**: Dedicated page untuk lab sample reception.
- **Exam Results**: Detail viewer dengan grading, external doctor assignment.
- **External Doctor (BMAD)**: Role `dokter-external`, assign/cancel external doctor, upload PDF results.
- Front Office: temporary registration, patient appointment, create registration flow (2676 baris).
- HRIS: dashboard, employees, attendance dashboard, analytics, tracking/report, print, shift configuration, shift schedule, national holidays, leave management (dengan bulk approve).
- Settings: permissions (matrix role x document type x actions), roles, members, notifications, security.
- **Permission System**: Dynamic route-to-docType matching, sidebar filtering, document types, permission actions.
- **Audit Trail**: Diff-based audit log per entity (`useAudit` composable).
- Utility/operational pages: inbox (mock API), room queue history.
- **Server Mock APIs**: notifications, mails, members, customers (Nitro server).

Beberapa file legacy/template masih ada di repo, tetapi tidak menjadi target produk utama.

## 3. Tujuan Produk

1. Menyediakan dashboard operasional terpadu untuk aktivitas layanan medis dan HR.
2. Mempercepat proses registrasi pasien dan appointment, termasuk pasien baru maupun pasien existing.
3. Mengelola master data medis seperti item MCU, sample type, questionnaire, service type, package, room, dan department.
4. Mengelola data relasi bisnis seperti branch, customer atau perusahaan, dan user internal.
5. Mendukung proses HRIS dasar: data employee, absensi, shift, hari libur nasional, dan cuti.
6. Menyediakan role dan permission untuk membatasi akses sesuai tanggung jawab pengguna.
7. Mengintegrasikan frontend dengan backend API menggunakan autentikasi token dan API key opsional.

## 4. Non-Tujuan

Fitur berikut tidak termasuk scope PRD versi ini kecuali ditentukan pada fase berikutnya:

- Integrasi billing, invoice, payment gateway, atau accounting penuh.
- Integrasi alat laboratorium otomatis.
- Electronic medical record lengkap di luar kebutuhan pemeriksaan dan registrasi.
- Portal pasien publik.
- Mobile app native.
- Multi-tenant white labeling.
- Modul reimbursement dan recruitment detail, karena di navigasi sudah ada tetapi halaman implementasi belum terlihat lengkap.
- Mengubah file legacy/template yang tidak dipakai alur utama, kecuali bila dibutuhkan untuk menghindari gangguan build atau typecheck.

## 5. Pengguna dan Persona

### 5.1 Admin Sistem

Mengelola user, role, permission, konfigurasi keamanan, dan data dasar sistem. Membutuhkan akses penuh ke Settings, Master Data, dan audit operasional.

### 5.2 Front Office

Mendaftarkan pasien, membuat appointment, mengelola temporary registration, memilih branch, customer, service, paket MCU, dan jadwal pemeriksaan.

### 5.3 Medical Admin

Mengelola item pemeriksaan, sample type, service type, service package, questionnaire, ruangan, dan department medical.

### 5.4 HR Admin

Mengelola employee, jadwal shift, absensi, hari libur nasional, approval cuti, dan laporan attendance.

### 5.5 Manager Operasional

Melihat dashboard, statistik, trend operasional, status absensi, aktivitas terbaru, dan ringkasan performa cabang atau layanan.

## 6. Prinsip Produk

- Data operasional harus mudah dicari, difilter, dan diperbarui.
- Workflow utama harus bisa diselesaikan tanpa berpindah konteks terlalu banyak.
- Aksi destruktif seperti delete dan cancel harus dikonfirmasi.
- Form harus memvalidasi input penting sebelum dikirim ke backend.
- Error dari backend harus ditampilkan dengan pesan yang bisa ditindaklanjuti.
- Status data harus terlihat jelas: loading, empty, error, success, pending approval.
- Akses halaman harus dibatasi oleh autentikasi dan, pada fase berikutnya, permission.

## 7. Scope Modul

## 7.1 Authentication

### Deskripsi

Pengguna login menggunakan email dan password. Token disimpan di `sessionStorage` atau `localStorage` berdasarkan pilihan "Remember me". Semua request API menyertakan Bearer token bila tersedia.

### Requirement

- User dapat login dengan email dan password.
- User dapat memilih "Remember me".
- Sistem menyimpan token di browser storage.
- Halaman private mengarahkan user yang belum login ke `/login`.
- Halaman guest seperti login mengarahkan user yang sudah login ke dashboard.
- Jika API mengembalikan HTTP 401, token dihapus dan user diarahkan ke login.
- Request API menyertakan header `Authorization: Bearer <token>`.
- Request API menyertakan header `api-key-kyo` jika `NUXT_PUBLIC_API_KEY` tersedia.

### Acceptance Criteria

- Login sukses mengarahkan user ke `/` (superadmin/admin/front-office) atau `/rooms/assignments` (petugas-lab/radiologi/dokter).
- Login gagal menampilkan pesan error dari backend bila tersedia.
- Refresh halaman tetap mempertahankan session bila token masih tersimpan.
- Akses halaman private tanpa token selalu redirect ke `/login`.

## 7.2 Dashboard Utama

### Deskripsi

Dashboard utama menampilkan ringkasan data dan aktivitas sistem dengan kontrol rentang tanggal dan periode.

### Requirement

- Menampilkan statistik ringkas operasional.
- Menampilkan grafik berdasarkan rentang tanggal dan periode.
- Menampilkan daftar aktivitas atau sales/recent records.
- Menyediakan quick action untuk membuat patient, appointment, user, dan customer.
- Menyediakan akses notifikasi.

### Acceptance Criteria

- User dapat mengubah date range dan period.
- Komponen statistik dan chart mengikuti filter yang dipilih.
- Quick action mengarahkan ke halaman yang relevan.

## 7.3 Master Data

### Modul

- Branches.
- Customers.
- Departments.
- Patients.
- Users.

### Requirement Umum

- User dapat melihat daftar data dalam tabel.
- User dapat mencari atau memfilter data bila didukung halaman.
- User dapat membuat data baru.
- User dapat melihat detail data.
- User dapat memperbarui data.
- User dapat menghapus data dengan konfirmasi.
- Sistem menampilkan loading, empty state, dan toast sukses atau gagal.

### Branches

Branch menyimpan lokasi atau unit layanan.

Requirement:

- Membuat branch dengan identitas branch dan alamat.
- Mengubah detail branch.
- Menghapus branch yang tidak lagi digunakan.
- Branch dapat dipilih saat registrasi pasien.

### Customers

Customer merepresentasikan perusahaan atau pihak penanggung/bill-to company.

Requirement:

- Membuat customer dengan kode dan nama customer.
- Mengelola alamat customer.
- Mengelola contact customer.
- Menandai contact default.
- Customer dapat digunakan pada registrasi dan appointment.

### Departments

Department digunakan untuk pengelompokan layanan atau item medical.

Requirement:

- Membuat, mengubah, dan menghapus department medical.
- Department memiliki type dengan enum `office` dan `medical`.
- Type wajib dipilih saat membuat atau mengubah department.
- Department dapat digunakan pada item pemeriksaan.

### Patients

Patient menyimpan data personal pasien.

Requirement:

- Membuat data pasien dengan nama, gender, tipe identitas, nomor identitas, kontak, dan tanggal lahir.
- Mencari pasien saat registrasi.
- Melihat detail pasien.
- Mengelola alamat pasien.
- Memperbarui data pasien.
- Menghapus pasien bila diizinkan.

### Users

User adalah akun internal aplikasi.

Requirement:

- Membuat user.
- Mengubah data user.
- Menghapus user.
- Mengatur role user.
- Mengambil data user login dari endpoint auth.

## 7.3.1 Observed Routes and Modules

Route yang saat ini terlihat di codebase:

- `/branches`
- `/customer`
- `/customers`
- `/departments`
- `/departments/:id`
- `/patients`
- `/users`
- `/items/mcu`
- `/items/groups`
- `/items/sample-types`
- `/questionnaire`
- `/questionnaire/:id/builder`
- `/questionnaire/:id/preview`
- `/rooms`
- `/rooms/queue`
- `/services`
- `/services/types`
- `/services/types/create`
- `/services/types/:id`
- `/services/packages`
- `/services/packages/create`
- `/services/packages/:id`
- `/front-office/registration-temp`
- `/front-office/registration-temp/:id`
- `/front-office/registration-patient`
- `/front-office/registration-patient/create`
- `/front-office/registration-patient/:id`
- `/registration/create`
- `/hris`
- `/hris/employees`
- `/hris/attendance`
- `/hris/attendance/analytics`
- `/hris/attendance/tracking`
- `/hris/attendance/tracking/print`
- `/hris/attendance/shift-configuration`
- `/hris/attendance/shift-schedule`
- `/hris/national-holidays`
- `/hris/leaves`
- `/hris/leaves/create`
- `/hris/leaves/:id`
- `/settings`
- `/settings/permissions`
- `/settings/roles`
- `/settings/security`
- `/settings/members`
- `/settings/notifications`
- `/inbox`

Catatan:

- `services` berperan sebagai landing internal dan mengarahkan ke subroute types/packages.
- `rooms/queue` adalah page operasional antrian ruang berbasis assignment aktif.
- `items/groups` adalah master group laboratorium yang diambil dari department dan struktur hierarchy.
- `/customers` masih ada sebagai route legacy/alternatif selain `/customer`.

## 7.4 Medical

### Modul

- MCU Items.
- Sample Types.
- Questionnaire.
- Rooms.
- Room Queue.
- Service Types.
- Service Packages.
- Master Group.

### MCU Items

MCU item adalah master pemeriksaan. Item dapat memiliki inputan, tipe input, opsi, satuan, rumus, nilai normal, department, dan group.

Requirement:

- Menampilkan daftar item MCU.
- Membuat item MCU.
- Mengubah detail item MCU.
- Menghapus item MCU.
- Mengelola inputan item.
- Mendukung tipe input: number, string, selected, calculated.
- Mendukung opsi untuk input selected.
- Mendukung nilai normal numerik dan selected berdasarkan gender atau umur bila tersedia.
- Mendukung sample type per item.
- Mendukung template input atau exam template bila digunakan oleh UI.

Acceptance Criteria:

- Item baru tersimpan dan muncul di daftar.
- Detail item menampilkan inputan dan konfigurasi nilai normal.
- Item yang sudah menjadi bagian paket atau exam tidak boleh dihapus tanpa validasi backend.

### Sample Types

Sample type mengatur jenis sampel pemeriksaan.

Requirement:

- Membuat sample type.
- Mengubah sample type.
- Menghapus sample type.
- Menandai sample type aktif atau nonaktif.
- Sample type aktif dapat dipilih pada konfigurasi item.

### Questionnaire

Questionnaire builder digunakan untuk membuat formulir pertanyaan dinamis.

Requirement:

- Membuat questionnaire baru.
- Menampilkan daftar questionnaire.
- Membuka builder questionnaire berdasarkan ID.
- Menambahkan section dan question.
- Mendukung tipe pertanyaan text, textarea, number, date, radio, checkbox, select.
- Mendukung option editor.
- Mendukung required field.
- Mendukung conditional logic.
- Mendukung drag and drop untuk menyusun section atau question.
- Mendukung preview questionnaire.
- Mendukung autosave agar perubahan tidak mudah hilang.

Acceptance Criteria:

- User dapat membuat questionnaire minimal satu section dan satu question.
- Preview menampilkan bentuk questionnaire sesuai konfigurasi builder.
- Conditional logic yang dikonfigurasi terlihat pada preview atau runtime.

### Rooms

Rooms digunakan untuk mengelola ruangan layanan medis.

Requirement:

- Menampilkan daftar room dan statistik room.
- Membuat room.
- Mengubah room.
- Menghapus room.
- Menampilkan assignment dokter atau petugas bila tersedia.

### Room Queue

Room queue digunakan untuk melihat antrian operasional berdasarkan assignment aktif dan tipe room.

Requirement:

- Menampilkan queue sesuai assignment user yang aktif.
- Menampilkan item queue, stage, dan status per exam item.
- Menyediakan polling atau refresh untuk pembaruan data operasional.
- Menampilkan state empty bila belum ada assignment atau queue kosong.

### Room Assignments

Room assignments digunakan untuk mengelola penugasan petugas ke ruangan.

Requirement:

- Menampilkan daftar assignment berdasarkan tanggal.
- **PIC Mode**: Single assign (1 petugas ke 1 room) dan batch assign (banyak petugas ke banyak room per tanggal).
- **Self-Assign Mode**: Petugas memilih room sendiri berdasarkan role yang dimiliki (role-based room type mapping).
- Transfer assignment dari satu room ke room lain.
- Toggle active/inactive assignment.
- Delete assignment.
- Room access whitelist per user (ditampilkan di halaman Users).
- Auto-create UserRoomAccess saat self-assignment berdasarkan role mapping.

Acceptance Criteria:

- Self-assign ke room LAB/LAB-MCU redirect ke halaman Sample Collection.
- Self-assign ke room lain redirect ke halaman Queue Work.
- Role `petugas-lab` hanya bisa self-assign ke room type LAB/LAB-MCU.
- Role `petugas-radiologi` hanya bisa self-assign ke room type RAD.
- Role `dokter` hanya bisa self-assign ke room type DOK.

### Room Queue Work

Room queue work adalah halaman kerja operasional untuk memproses pemeriksaan pasien di ruangan.

Requirement:

- Menampilkan detail queue item beserta stage workflow.
- **Stage Workflow**: WAITING → CALLED → IN_PROGRESS → DONE (multi-stage: COLLECT → EXAM → RECEIVE).
- **Room Session Management**: Enter room (single active room per user) dan exit room.
- **Stage Actions**: Mulai Pemeriksaan (start), Kembalikan ke Waiting (return), Selesaikan (done).
- **Per-Item Actions**: Start item, Done item, Skip, Reschedule, Retest, Refuse — masing-masing dengan alasan/note.
- **Result Entry**: Input hasil per item dengan tipe number, string, selected, calculated.
- **Normal Range Evaluation**: Auto-evaluasi nilai normal berdasarkan gender dan umur pasien.
- **Sample Collection Integration**: Ambil sample (collect), terima sample (receive) langsung dari halaman kerja.
- **Deferred Items**: Item dengan `resultTiming: 'deferred'` ditangani terpisah setelah stage done.
- Permission `queue:admin` diperlukan untuk manage item actions.

Acceptance Criteria:

- Tombol "Mulai Pemeriksaan" muncul saat stage = CALLED.
- Tombol "Selesaikan" muncul saat stage = IN_PROGRESS dan semua item final.
- Nilai di luar range normal ditandai dengan warna (kuning: out-of-range, merah: critical).
- Jika ada deferred items, redirect ke exam-results setelah stage done.

### Sample Collection

Sample collection adalah halaman dedicated untuk pengelolaan pengambilan sample pasien.

Requirement:

- **Index Page**: History table dengan grouping per pasien, sample type badges, status badges, dropdown aksi (Lanjutkan/Detail).
- **Detail Page** (`/rooms/sample-collection/[id]`): Room session management, stage workflow (COLLECT → RECEIVE), sample actions.
- **Sample Actions**: Collect (ambil sample), Receive (terima sample), Reject (tolak sample dengan alasan), Reschedule (jadwalkan ulang per sample).
- **Bulk Collect**: "Ambil Semua" untuk mengambil semua pending sample sekaligus.
- **Stage Actions**: Mulai Pemeriksaan, Kembalikan ke Waiting, Selesaikan (saat semua sample final).
- **Pick Patient Modal**: Daftar pasien waiting dengan filter tanggal, grouping per pasien, warna badge per sample type.
- **Detail Modal**: Tampilkan semua sample pasien dengan jenis sample, status, tanggal exam, diambil oleh, diterima oleh.
- **Exclude Called**: Pasien dengan stage CALLED/IN_PROGRESS tidak ditampilkan di modal pick.

Acceptance Criteria:

- Self-assign ke room LAB/LAB-MCU redirect ke Sample Collection.
- Pick patient memanggil stage endpoint sebelum navigate ke detail.
- Reject bisa untuk status PENDING, COLLECTED, RECEIVED.
- Reschedule per sample (tidak semua sample ikut).

### Sample Reception

Sample reception adalah halaman untuk petugas lab menerima sample yang sudah diambil.

Requirement:

- Menampilkan daftar sample yang perlu diterima.
- Filter berdasarkan status, tanggal exam, dan pencarian.
- Aksi: Take (ambil sample), Release (lepas sample), Receive (konfirmasi terima).
- Detail sample: jenis sample, barcode, tabung, diambil oleh, waktu.

### Exam Results

Exam results adalah halaman untuk melihat hasil pemeriksaan examination.

Requirement:

- Menampilkan daftar exam results dengan filter department, status, result type.
- Detail exam result (drawer/modal) dengan grading per item (NORMAL, ABNORMAL_INC, ABNORMAL_DEC).
- Assignment external doctor untuk hasil yang memerlukan review dokter luar.
- Pagination dan search.

### External Doctor (BMAD)

External doctor adalah flow untuk dokter luar yang melakukan review hasil pemeriksaan.

Requirement:

- Role `dokter-external` dengan redirect login ke `/rooms/exam-results`.
- Sidebar untuk dokter external hanya menampilkan Hasil Exam Lab dan Settings.
- **Assign External Doctor**: Assign dokter luar ke exam item tertentu.
- **Cancel External**: Membatalkan assignment dokter luar.
- **External Result**: Upload hasil review PDF oleh dokter luar.
- Status lifecycle: ASSIGNED → FILLED / CANCELLED.

Acceptance Criteria:

- Hanya user dengan role `dokter-external` yang bisa mengakses exam results untuk assignment mereka.
- Dokter external hanya melihat exam yang di-assign ke mereka.
- Upload PDF berhasil dan tersimpan di `TrxExamResult.attachmentUrl`.

### Master Group

Master group digunakan untuk menyusun hierarchy group dan subgroup laboratorium per department.

Requirement:

- Menampilkan tree atau hierarchy group.
- Membuat root group dan subgroup.
- Mengubah group.
- Menghapus group.
- Mencegah parent group yang tidak valid terhadap hierarchy yang sedang diedit.

### Service Types

Service type mendefinisikan jenis layanan, misalnya Laboratorium, Konsultasi Dokter, MCU, Vaccine, Antigen, PCR, Vitamin Injection, Pharmacy, dan Dental.

Requirement:

- Membuat service type.
- Mengubah service type.
- Menghapus service type.
- Service type dapat dipilih pada registrasi.

### Service Packages

Service package, terutama paket MCU, mengelompokkan beberapa item pemeriksaan.

Requirement:

- Membuat package.
- Mengubah package.
- Menghapus package.
- Menambahkan item ke package.
- Menghapus item dari package.
- Menentukan urutan item package.
- Menandai package aktif atau nonaktif.
- Package MCU dapat dipilih saat registrasi appointment MCU.

## 7.5 Front Office

### Modul

- Temporary Registration.
- Patient Appointment.
- Create Registration.
- Registration detail dan status.

### Temporary Registration

Temporary registration adalah permintaan registrasi yang perlu ditinjau sebelum menjadi appointment definitif.

Requirement:

- Menampilkan daftar temporary registration.
- Melihat detail temporary registration.
- Approve temporary registration.
- Pending temporary registration.
- Reject temporary registration dengan alasan.
- Menghapus temporary registration bila diperlukan.

Acceptance Criteria:

- Approve mengubah status dan membuat/memicu data registration sesuai payload backend.
- Reject menyimpan alasan rejection.
- Status terbaru terlihat pada daftar dan detail.

### Patient Appointment / Registration

Registration digunakan untuk membuat appointment atau pendaftaran pemeriksaan.

Requirement:

- User memilih branch.
- User mencari dan memilih pasien existing.
- User dapat membuat pasien baru saat registrasi.
- User memilih customer atau company.
- User memilih service type.
- User memilih payment type: Personal, Insurance, Bill to Company.
- User memilih priority: Normal, VIP, Emergency.
- User memilih exam date dan schedule date.
- Jika service type adalah MCU, user wajib memilih package MCU.
- User dapat melihat item yang termasuk dalam package MCU.
- User dapat menambahkan additional item di luar package MCU bila backend mendukung.
- User dapat submit registration.
- User dapat melihat detail registration.
- User dapat mengubah status registration, termasuk check-in dan cancel.

Acceptance Criteria:

- Tombol submit disabled sampai field wajib terisi.
- Registrasi pasien baru membuat patient terlebih dahulu lalu registration.
- Registrasi MCU membuat exam berdasarkan package yang dipilih.
- Sistem menampilkan feedback sukses atau error setelah submit.

## 7.6 HRIS

### Modul

- HRIS Dashboard.
- Employees.
- Attendance Dashboard.
- Attendance Analytics.
- Attendance Report / Tracking.
- Shift Configuration.
- Shift Schedule.
- National Holidays.
- Leave Management.

### HRIS Dashboard

Requirement:

- Menampilkan ringkasan employee dan attendance.
- Menampilkan chart attendance.
- Menampilkan status employee.
- Menampilkan recent activity.

### Employees

Requirement:

- Menampilkan daftar employee.
- Membuat employee.
- Mengubah employee.
- Memfilter employee.
- Menampilkan status employee.

### Attendance Dashboard dan Tracking

Requirement:

- Menampilkan summary attendance.
- Menampilkan daily logs.
- Memfilter attendance berdasarkan periode, employee, branch, atau status bila tersedia.
- Upload data attendance.
- Upload shift bila tersedia.
- Manual entry attendance.
- Mengubah nilai attendance tertentu melalui modal.
- Export attendance report.
- Print attendance report.

Acceptance Criteria:

- Upload attendance menerima file dan menampilkan hasil sukses/gagal.
- Filter mengubah data report yang ditampilkan.
- Print page dapat menampilkan report tanpa elemen navigasi utama.

### Attendance Analytics

Requirement:

- Menampilkan statistik keterlambatan, absensi, atau anomali attendance.
- Menampilkan monthly trend chart.
- Menampilkan tabel anomaly.
- Menampilkan alasan late arrival.
- Menampilkan detail anomaly per employee.

### Shift Configuration

Requirement:

- Membuat shift.
- Mengubah detail shift.
- Mengelola template shift bulanan.
- Assign employee ke shift.
- Melihat assigned employee.
- Menampilkan summary shift.

### Shift Schedule

Requirement:

- Menampilkan kalender shift.
- Memfilter jadwal shift.
- Assign shift ke employee.
- Generate schedule.
- Generate monthly schedule.
- Swap shift.
- Menampilkan coverage shift.

### National Holidays

Requirement:

- Menampilkan daftar hari libur nasional.
- Membuat hari libur.
- Mengubah detail hari libur.
- Menghapus hari libur.
- Hari libur dapat memengaruhi attendance atau leave calculation pada backend.

### Leave Management

Requirement:

- Menampilkan daftar leave request.
- Membuat leave request.
- Upload attachment leave.
- Menampilkan leave balance dan policy.
- Menampilkan detail leave request.
- Menampilkan employee profile, request info, reason, conflict, attendance history, dan admin notes.
- Approve leave request.
- Reject leave request dengan alasan.
- Bulk approve bila tersedia.
- Menampilkan employees on leave.
- Manual attendance modal bila diperlukan.

Acceptance Criteria:

- Leave request baru masuk ke daftar dengan status pending.
- Approve dan reject mengubah status secara konsisten.
- Detail leave menampilkan informasi yang cukup untuk keputusan approval.

## 7.7 Settings

### Modul

- Profile atau general settings (dengan employee tabs bila ter-link).
- Members.
- Notifications.
- Permissions (matrix role x document type x actions).
- Roles.
- Security (change password).

### Permission System

Permission system menggunakan format `{documentType}:{action}` (contoh: `patient:read`, `room:update`).

**Document Types** (`/settings/document-types`):

- Master data document types dari backend.
- Digunakan oleh `useRoutePermission` composable untuk matching route ke permission.
- Algoritma: generate candidate keys dari path segments → cocokkan dengan document type keys.

**Permission Actions** (`/settings/permission-actions`):

- Master actions: read, write, delete, create, update, dll.
- Auto-create action dari permission name saat permission dibuat.
- Sync endpoint untuk populate dari permission yang sudah ada.
- Bisa dikelola dari UI (CRUD) tanpa memutus matrix.

**Permission Matrix** (`/settings/permissions`):

- Tabel role × document type × actions.
- Toggle permission per cell.
- Add DocType modal untuk menambah document type baru.
- Manage Actions modal untuk CRUD action keys.
- Add Role Permission modal untuk menambah permission langsung ke role.
- Tab gating: Roles & Permission hanya tampil jika user punya `role:*` / `permission:*`.

**Sidebar Filtering** (`layouts/default.vue`):

- Sidebar difilter berdasarkan permissions user login.
- Matching route ke document type secara dinamis dari API.
- Restricted roles (`petugas-lab`, `petugas-radiologi`, `dokter`): hanya Dashboard, Examination, Settings.
- Role `dokter-external`: hanya Hasil Exam Lab dan Settings.

### Requirement

- Menampilkan daftar permission dalam matrix.
- Membuat permission baru (format: `docType:action`).
- Mengelola daftar action permission dari UI.
- Menampilkan daftar role dengan jumlah permission.
- Menambahkan, mengubah, dan menghapus role.
- Mengatur permission per role melalui matrix.
- Mengatur role per user.
- Menautkan jumlah permission pada role ke halaman permissions dengan role terpilih.
- Mengganti password user (endpoint `/auth/change-password`).
- Menampilkan pengaturan notifikasi dan member bila backend tersedia.
- Filter sidebar berdasarkan permissions user login.
- Dynamic route-to-docType matching via `useRoutePermission` composable.

### Acceptance Criteria

- Role dapat diberi atau dihapus permission.
- User dapat diberi role.
- Role list menampilkan aksi edit dan delete role.
- Klik jumlah permission pada role membuka matrix permission dengan role tersebut sudah terpilih.
- Action permission bisa dikelola dari halaman permissions tanpa memutus matrix yang sudah ada.
- Change password memvalidasi input dan menampilkan status sukses/gagal.
- Sidebar hanya menampilkan menu yang sesuai dengan permission user.
- User tanpa permission `permission:*` tidak melihat tab Permissions di Settings.

## 8. User Flow Utama

### 8.1 Login

1. User membuka `/login`.
2. User mengisi email dan password.
3. User memilih Remember me bila ingin session tersimpan lebih lama.
4. Sistem memanggil `/auth/login`.
5. Sistem menyimpan token.
6. User diarahkan ke dashboard.

### 8.2 Membuat Appointment MCU

1. Front Office membuka halaman create registration.
2. User memilih branch.
3. User mencari pasien existing atau membuat pasien baru.
4. User memilih customer/company.
5. User memilih service type MCU.
6. User memilih payment type, priority, exam date, dan schedule date.
7. User memilih package MCU.
8. Sistem menampilkan daftar item dan inputan dalam package.
9. User menambahkan additional item bila perlu dan bila backend mendukung.
10. User submit registration.
11. Sistem membuat patient bila pasien baru, membuat registration, lalu membuat MCU exam.
12. Sistem menampilkan notifikasi sukses dan mengarahkan ke daftar/detail registration.

### 8.3 Mengelola Item MCU

1. Medical Admin membuka Medical > Items > List Items.
2. User membuat atau memilih item.
3. User mengatur department, group, inputan, tipe input, opsi, satuan, rumus, dan nilai normal.
4. User menyimpan perubahan.
5. Item dapat digunakan di package MCU atau exam.

### 8.4 Membuat Questionnaire

1. Medical Admin membuka Questionnaire.
2. User membuat questionnaire.
3. User membuka builder.
4. User menambahkan section dan question.
5. User mengatur tipe pertanyaan, opsi, required, dan conditional logic.
6. Autosave menyimpan perubahan.
7. User membuka preview untuk validasi.

### 8.5 Mengelola Absensi

1. HR Admin membuka Attendance Report atau Tracking.
2. User memilih filter periode dan employee.
3. User upload attendance atau melakukan manual entry.
4. User mengubah nilai attendance bila ada koreksi.
5. User export atau print report.

### 8.6 Approval Cuti

1. Employee atau HR membuat leave request.
2. HR Admin membuka Leave Management.
3. HR Admin melihat detail request.
4. HR Admin mengecek balance, conflict, attachment, dan attendance history.
5. HR Admin approve atau reject.
6. Sistem memperbarui status request.

### 8.7 Sample Collection Flow (Petugas Lab)

1. Petugas lab login → redirect ke `/rooms/assignments`.
2. Petugas self-assign ke room LAB/LAB-MCU → redirect ke `/rooms/sample-collection`.
3. Petugas masuk room (enter session).
4. Petugas klik "Ambil Pasien" → modal daftar pasien waiting.
5. Petugas pilih pasien → sistem call stage → redirect ke detail sample collection.
6. Petugas klik "Mulai Pemeriksaan" → stage = IN_PROGRESS.
7. Per sample, petugas bisa:
   - **Ambil** (collect): sample status → COLLECTED.
   - **Tolak** (reject): sample status → REJECTED (dengan alasan).
   - **Reschedule**: sample status → RESCHEDULED (dengan tanggal baru).
8. Ketika semua sample final (COLLECTED/REJECTED/RESCHEDULED), petugas klik "Selesaikan".
9. Sistem redirect kembali ke daftar sample collection.

### 8.8 Room Queue Work Flow (Petugas/Medical)

1. Petugas login → redirect ke `/rooms/assignments`.
2. Petugas self-assign ke room → redirect ke `/rooms/queue` atau `/rooms/queue-work`.
3. Dari queue, petugas panggil pasien → redirect ke `/rooms/queue-work/[id]`.
4. Petugas masuk room (enter session).
5. Petugas klik "Mulai Pemeriksaan" → stage = IN_PROGRESS.
6. Per item pemeriksaan:
   - Petugas mulai item → status = IN_PROGRESS.
   - Input hasil (number/selected/string/calculated).
   - Sistem auto-evaluasi normal range.
   - Petugas selesaikan item → status = DONE.
7. Jika ada sample: collect/receive langsung dari halaman kerja.
8. Ketika semua item final, petugas klik "Selesaikan Room".
9. Jika ada deferred items → redirect ke exam-results.
10. Jika tidak → redirect ke queue.

### 8.9 External Doctor Review Flow

1. Dokter external login → redirect ke `/rooms/exam-results`.
2. Dokter melihat daftar exam yang di-assign ke mereka.
3. Dokter membuka detail exam result.
4. Dokter review hasil pemeriksaan.
5. Dokter upload PDF hasil review.
6. Status berubah ke FILLED.

## 9. Data dan Entitas Utama

Entitas berikut diidentifikasi dari frontend dan endpoint API:

- Auth user: email, password, token.
- Branch: id, branchId, nameBranch, addressBranch.
- Customer: id, codeCostumer, customerName, address, contact.
- Patient: id, PatientId, firstName, middleName, lastName, gender, idType, idNumber, phone, email, dob, address, histories.
- Department: id, code, name, type enum `office` / `medical`.
- Group: id, departmentId, name, code, parentId, sortOrder, items, children.
- User: id, profile fields, role.
- Role: id, name, permissions.
- Permission: id, key/name, description.
- Service Type: id, name, code, active status.
- Service Package: id, name, isActive, paketItems.
- MCU Item: id, code, name, department, group, inputans.
- Item Input: id, label, inputType, uom, sortOrder, allowBlank, opsi, formula, nilaiNormalNum, nilaiNormalSel.
- Sample Type: id, name, active status.
- Questionnaire: id, title, sections, questions, options, logic.
- Room: id, name, status, assignment, roomType, staffCapacity, stageLinks.
- Room Type: id, code, name, serviceType, tierOrder, stages.
- Room Type Stage: id, code, name, stageOrder, slotLimit, isActive.
- Registration: id/id_reg, patient, branch, customer, serviceType, paymentType, priorityRegist, examDate, scheduleDateExam, status.
- Temporary Registration: id, patient/request data, status, rejection reason.
- Room Assignment: id, assignedDate, roomId, roomTypeId, assignmentSource (PIC/SELF), notes, room, roomType.
- User Room Access: userId, roomId (whitelist akses room).
- User Room Session: userId, roomId, roomTypeId, startedAt, endedAt, exitReason (single active room per user).
- Queue Entry: id, queueCode, queueNumber, type, checkinAt, registration, sampleCollections.
- Queue Room Item: id, roomTypeId, tierOrder, status, stageItems, examItems.
- Queue Stage Item: id, stageId, stageOrder, status, roomId, stage.
- Queue Exam Item: id, status, notes, operationalStatus, blockedReason, sampleImpact, trxExamItem.
- Sample Collection: id, status (PENDING/COLLECTED/REJECTED/RESCHEDULED/RECEIVED), sampleType, tubeCount, barcode, collectedBy, receivedBy, collectedAt, receivedAt, rejectReason, rescheduledAt, queueEntryId.
- TrxExam: id, status, results.
- TrxExamResult: id, grading (NORMAL/ABNORMAL_INC/ABNORMAL_DEC), externalStatus (ASSIGNED/FILLED/CANCELLED), assignedExternalUserId, attachmentUrl.
- TrxExamGroupResult: id, auto-comment.
- Employee: id, employee profile fields, userId (unique, relasi 1:0..1 ke User), status.
- Attendance: employee, date, check-in, check-out, status, anomaly, shift.
- Shift: id, name, time range, assignment, monthly template.
- National Holiday: id, date, name, description.
- Leave Request: id, employee, type, date range, reason, attachment, status, approval notes.
- Document Type: id, key, label, sortOrder, isActive.
- Permission Action: id, key, label, sortOrder, isActive.
- Audit Log: entity, entityId, diff changes, userId, timestamp.

## 10. API dan Integrasi

Frontend menggunakan Axios plugin dengan konfigurasi:

- `NUXT_PUBLIC_API_BASE`: base URL backend API.
- `NUXT_PUBLIC_API_KEY`: API key opsional yang dikirim sebagai `api-key-kyo`.
- Bearer token dari `localStorage` atau `sessionStorage`.

Backend aktif melayani API pada port `8000` di bawah prefix `/api`.

Endpoint yang teridentifikasi antara lain:

- `/auth/login`
- `/auth/register`
- `/auth/change-password`
- `/users/auth`
- `/users/auth/employee`
- `/users/profile`
- `/branch`
- `/public/register`
- `/appointmentType`
- `/customer`
- `/contact`
- `/patient`
- `/medical/departments`
- `/medical/departments/:id`
- `/medical/groups`
- `/medical/group/:departmentId`
- `/medical/exams/sample-types`
- `/medical/rooms`
- `/medical/rooms/rooms`
- `/medical/rooms/rooms/:id`
- `/medical/rooms/room-types`
- `/medical/rooms/sessions/me`
- `/medical/rooms/sessions/me/enter`
- `/medical/rooms/sessions/me/exit`
- `/room-assignments`
- `/room-assignments/me`
- `/room-assignments/self`
- `/room-assignments/batch`
- `/room-assignments/:id/transfer`
- `/room-assignments/:id/active`
- `/room-assignments/room/:roomId`
- `/room-assignments/room-type/:roomTypeId`
- `/room-assignments/sync-room-access/:userId`
- `/medical/queue/room/:roomTypeId`
- `/medical/exams/queue/room-item/:id`
- `/medical/exams/queue/room-item/:id/exam-items`
- `/medical/exams/queue/stage/:id/start`
- `/medical/exams/queue/stage/:id/done`
- `/medical/exams/queue/stage/:id/return`
- `/medical/exams/queue/stage/:id/call`
- `/medical/exams/queue/exam-item/:id/start`
- `/medical/exams/queue/exam-item/:id/done`
- `/medical/exams/queue/exam-item/:id/skip`
- `/medical/exams/queue/exam-item/:id/reschedule`
- `/medical/exams/queue/exam-item/:id/retest`
- `/medical/exams/queue/exam-item/:id/refuse`
- `/medical/exams/queue/samples`
- `/medical/exams/queue/samples/collection-history`
- `/medical/exams/queue/samples/:id/collect`
- `/medical/exams/queue/samples/:id/receive`
- `/medical/exams/queue/samples/:id/reject`
- `/medical/exams/queue/samples/:id/reschedule`
- `/medical/exams/queue/samples/receive`
- `/medical/exams/queue/samples/receive/:id`
- `/medical/exams/queue/:id`
- `/medical/exams/queue/:id/samples`
- `/medical/service-types`
- `/mcu/items`
- `/mcu/pakets`
- `/mcu/exams`
- `/mcu/exams/results`
- `/mcu/exams/:id/results`
- `/mcu/exams/:id/assign-external`
- `/mcu/exams/:id/cancel-external`
- `/mcu/exams/:id/external-result`
- `/paket-item`
- `/questionnaire`
- `/questionnaire/:id`
- `/questionnaire/builder`
- `/registration`
- `/registration/:id/checkin`
- `/registration/:id/uncheck`
- `/registration/number/:id_reg`
- `/registration-temp`
- `/medical/exams/queue/checkin`
- `/settings/permissions`
- `/settings/document-types`
- `/settings/roles`
- `/settings/roles/:id`
- `/settings/roles/:id/permissions`
- `/settings/permission-actions`
- `/settings/permission-actions/sync`
- `/audit/:entity/:entityId`
- `/users`
- `/users/:id`
- `/hris/employees`
- `/hris/employees/:id/user`
- `/hris/employees/:id/link-user`
- `/hris/employees/users/unlinked`
- `/hris/employee-education`
- `/hris/employee-personal`
- `/hris/employee-emergency-contact`
- `/hris/employee-children`
- `/hris/employee-positions`
- `/hris/employee-documents`
- `/hris/employee-health`
- `/hris/employee-leave-balance`
- `/hris/attendance`
- `/hris/attendance/manual`
- `/hris/attendance/tracking`
- `/hris/attendance/upload`
- `/hris/shift`
- `/hris/shift/templates`
- `/hris/shift/month-templates`
- `/hris/shift/assignments`
- `/hris/shift/schedules/generate`
- `/hris/shift/schedules/generate-monthly`
- `/hris/shift/swap`
- `/hris/shift/view`
- `/hris/national-holidays`
- `/hris/leave`
- `/hris/leave/request`
- `/hris/leave/requests`
- `/api/mails`
- `/api/notifications`
- `/api/members`
- `/api/customers`

## 10.1 Backend Alignment Notes

PRD ini diselaraskan dengan dokumen backend di `C:\laragon\www\express_dash\docs\bmad`.

Poin backend yang menjadi acuan:

- `Department` adalah owner domain utama.
- `RoomType` dan `Room` berada di bawah department.
- `Item` adalah master operasional dan menyimpan `resultTiming` di level item, bukan inputan.
- `Department.type` memakai enum `office` dan `medical`.
- Queue dibagi menjadi queue pusat dan queue room/department.
- Access control memakai kombinasi role, permission, department, room assignment, whitelist room, dan operasional hari itu.
- Satu user hanya boleh aktif di satu room pada satu waktu.
- Kapasitas petugas room harus dihormati terpisah dari kapasitas pasien.
- Visibility operasional diputuskan dari assignment room, bukan dari item master.
- Flow sample dan item final state tetap dicatat terpisah.

Implikasi ke PRD frontend:

- halaman settings permission harus menjadi pusat pengelolaan permission role.
- document type permission harus berasal dari master backend, bukan hanya dari permission yang sudah ada.
- halaman roles tetap compact untuk daftar role, add role, edit role, dan delete role.
- role count harus bisa membuka permissions page dengan role yang relevan.
- UI item, queue, dan registration harus tetap mengikuti backend contract yang sudah terdokumentasi di BMAD.

## 11. Permission Matrix Awal

Matrix ini perlu divalidasi dengan backend permission aktual.

| Modul | Admin Sistem | Front Office | Medical Admin | HR Admin | Manager | Petugas Lab | Dokter | Dokter External |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Read | Read | Read | Read | Read | Read | Read | No access |
| Branches | CRUD | Read | Read | Read | Read | No access | No access | No access |
| Customers | CRUD | CRUD | Read | Read | Read | No access | No access | No access |
| Patients | CRUD | CRUD | Read | Read | Read | No access | No access | No access |
| Users | CRUD | No access | No access | Read | Read | No access | No access | No access |
| Roles/Permissions | CRUD | No access | No access | No access | Read | No access | No access | No access |
| MCU Items | CRUD | Read | CRUD | No access | Read | No access | No access | No access |
| Sample Types | CRUD | Read | CRUD | No access | Read | No access | No access | No access |
| Questionnaire | CRUD | Read | CRUD | No access | Read | No access | No access | No access |
| Rooms | CRUD | Read | CRUD | No access | Read | No access | No access | No access |
| Room Assignments | CRUD | Read | CRUD | No access | Read | Self-assign | Self-assign | No access |
| Room Queue | CRUD | Read | CRUD | No access | Read | Read/Work | Read/Work | No access |
| Sample Collection | CRUD | Read | CRUD | No access | Read | Read/Work | No access | No access |
| Sample Reception | CRUD | Read | CRUD | No access | Read | Read/Work | No access | No access |
| Exam Results | CRUD | Read | Read | No access | Read | Read | Read | Read (assigned only) |
| Services | CRUD | Read | CRUD | No access | Read | No access | No access | No access |
| Registration | CRUD | CRUD | Read | No access | Read | No access | No access | No access |
| Temporary Registration | CRUD | CRUD | Read | No access | Read | No access | No access | No access |
| Employees | CRUD | No access | No access | CRUD | Read | No access | No access | No access |
| Attendance | CRUD | No access | No access | CRUD | Read | No access | No access | No access |
| Shift | CRUD | No access | No access | CRUD | Read | No access | No access | No access |
| National Holidays | CRUD | Read | Read | CRUD | Read | No access | No access | No access |
| Leave Management | CRUD | No access | No access | CRUD | Read | No access | No access | No access |

## 12. Non-Functional Requirements

### Performance

- Daftar data besar harus mendukung pagination atau server-side filtering.
- Search pasien dan item harus debounce minimal 300 ms.
- Halaman dashboard harus tetap responsif pada data kosong atau data besar.

### Security

- Token tidak boleh dikirim ke domain selain API base yang dikonfigurasi.
- Halaman private wajib menggunakan middleware auth.
- Endpoint sensitif seperti role, permission, user, dan change password wajib divalidasi di backend.
- Error response tidak boleh membocorkan detail internal sistem.

### Reliability

- Form submit harus mencegah double submit.
- Upload file harus menampilkan progress atau state loading.
- Jika request gagal, user harus mendapat pesan error.
- Perubahan status penting harus memiliki konfirmasi atau feedback jelas.

### Usability

- Navigasi sidebar harus membuka parent menu sesuai route aktif.
- Form wajib menandai field required.
- Tabel harus punya empty state.
- Modal harus bisa ditutup dengan aksi eksplisit.
- Data tanggal harus konsisten mengikuti timezone operasional.

### Maintainability

- Komponen reusable dipertahankan untuk modal, table, filter, dan form.
- Integrasi API tetap melalui `useApi`.
- TypeScript type digunakan untuk payload dan response penting.
- Endpoint dan payload yang sering dipakai perlu dipusatkan jika mulai berulang.

## 13. Success Metrics

- Waktu pembuatan appointment pasien MCU turun minimal 30 persen dibanding proses manual.
- Minimal 95 persen registrasi harian dapat dibuat tanpa intervensi admin teknis.
- Data pasien duplikat berkurang melalui search existing patient sebelum create.
- HR Admin dapat menghasilkan attendance report harian tanpa olah data manual.
- Semua halaman private terlindungi auth middleware.
- Error rate API untuk workflow utama di bawah 2 persen setelah stabilisasi.

## 14. Prioritas Rilis

### Phase 1 - Core Operations ✅ SELESAI

- Authentication (login, token, middleware).
- Dashboard utama (stats, chart, quick action).
- Master Data: branches, customers, patients, departments, users.
- Medical: MCU items, sample types, service types, service packages.
- Front Office: registration dan patient appointment.
- Settings dasar: roles dan permissions.
- Questionnaire builder dan preview.
- Room management (rooms, room types).

### Phase 2 - Medical Workflow ✅ SELESAI

- Room assignments (PIC mode, self-assign, room access).
- Room queue work (stage management, per-item actions).
- Sample collection flow (collect, receive, reject, reschedule).
- Sample reception.
- Exam results (detail viewer, grading).
- External doctor flow (BMAD).
- Permission system (document types, actions, sidebar filtering).
- Audit trail composable.

### Phase 3 - HRIS ✅ SELESAI

- Employees.
- Attendance tracking, upload, correction, print/export.
- Attendance analytics (anomaly detection, monthly trend).
- Shift configuration dan schedule.
- National holidays.
- Leave management approval (dengan bulk approve).

### Phase 4 - Hardening dan Reporting 🔄 IN PROGRESS

- Permission enforcement per route dan action.
- Audit log (composable sudah ada, perlu UI page).
- Dashboard manager (advanced).
- Advanced report export.
- Error monitoring dan observability.
- Reimbursement dan recruitment (placeholder, perlu implementasi).
- Real-time notifications (vs polling).
- Mobile responsiveness audit.
- Cleanup mock data dan dead code.

## 15. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Payload frontend dan kontrak backend belum terdokumentasi | Bug integrasi dan regresi | Buat OpenAPI atau API contract per endpoint |
| Role/permission belum enforced di frontend route/action | User bisa melihat menu yang tidak relevan | Tambahkan permission guard dan menu filtering |
| Additional item MCU terlihat masih bergantung dukungan backend | Data tambahan bisa tidak tersimpan permanen | Finalisasi endpoint exam item tambahan |
| README masih bawaan template | Onboarding developer lambat | Perbarui README project setelah PRD disetujui |
| Banyak logic domain berada di page besar | Sulit dirawat | Ekstrak composable/service per domain |
| Format encoding komentar terlihat rusak di beberapa file | Readability rendah | Normalisasi encoding file ke UTF-8 |

## 16. Open Questions

1. Apakah nama resmi produk adalah "Medical Examination Management System" atau ada nama internal lain?
2. Apakah aplikasi dipakai satu perusahaan saja atau multi-branch dengan pembatasan data per branch?
3. Apakah role dan permission sudah tersedia lengkap dari backend?
4. Apakah patient appointment dan registration adalah istilah yang sama atau workflow berbeda?
5. Bagaimana status lifecycle registration yang resmi? Contoh: Draft, Pending, Confirmed, Checkin, In Progress, Completed, Cancelled.
6. Apakah additional item MCU harus tersimpan pada exam individual tanpa mengubah master package?
7. Apakah questionnaire akan dipakai untuk pasien, employee, atau internal medical checklist?
8. Apakah attendance mengambil data dari mesin absensi, upload manual, atau integrasi API pihak ketiga?
9. Apakah leave request dibuat oleh employee langsung atau hanya HR Admin?
10. Apakah perlu audit log untuk perubahan data medis dan HR?

## 17. Lampiran Observasi Teknis

Teknologi yang digunakan:

- Nuxt 4 dengan `ssr: false`.
- Vue 3.
- Nuxt UI.
- Tailwind CSS 4.
- Axios untuk API client.
- Zod untuk validasi form tertentu.
- Chart.js, vue-chartjs, Unovis untuk chart.
- SortableJS, vuedraggable untuk questionnaire builder.
- MySQL client tersedia di dependency, meskipun server API lokal yang terlihat masih terbatas.

Script project:

- `pnpm dev`: menjalankan development server.
- `pnpm build`: build production.
- `pnpm preview`: preview production build.
- `pnpm lint`: lint.
- `pnpm typecheck`: typecheck Nuxt.

Catatan implementasi:

- Frontend menggunakan `app/plugins/api.ts` sebagai sumber tunggal Axios instance.
- Auth token dikelola oleh `app/composables/useAuth.ts`.
- Route protection dikelola oleh `app/middleware/auth.ts` dan `app/middleware/guest.ts`.
- Navigasi utama didefinisikan di `app/layouts/default.vue`.
- Environment yang diperlukan minimal `NUXT_PUBLIC_API_BASE`, dan opsional `NUXT_PUBLIC_API_KEY`.

## 12. Permission System (Implemented)

### 12.1 Permission Actions (Backend)

- Model `MstPermissionAction` dengan kolom `id`, `key` (unique), `label`, `sortOrder`, `isActive`.
- API `GET/POST/PUT/DELETE /settings/permission-actions`.
- Auto-create action saat permission dibuat via `ensureActionFromPermissionName`.
- Sync endpoint `POST /settings/permission-actions/sync` untuk populate dari permission yang sudah ada.

### 12.2 Permission Matrix (Frontend)

- Halaman `/settings/permissions` menampilkan matrix role × document type × actions.
- Actions di-fetch dari API `/settings/permission-actions` (bukan localStorage).
- Modal "Add DocType" untuk menambah document type baru.
- Modal "Manage Actions" untuk CRUD action keys.
- Modal "Add Role Permission" untuk menambah permission langsung ke role.
- Tab Roles & Permission di Settings hanya tampil jika user punya `role:*` / `permission:*`.

### 12.3 Sidebar Filtering

- Sidebar difilter berdasarkan permissions user login via `useRoutePermission` composable.
- Matching route ke document type secara dinamis dari API `/settings/document-types`.
- Algoritma: generate candidate keys dari path segments lalu cocokkan dengan document type keys.
- Untuk role `petugas-lab`, `petugas-radiologi`, `dokter`: hanya tampilkan Dashboard, Examination, Settings.

### 12.4 Login Redirect

- Backend login response menyertakan `roles` array.
- Role `petugas-lab`, `petugas-radiologi`, `dokter` → redirect ke `/rooms/assignments`.
- Role lainnya → redirect ke `/`.

### 12.5 TeamsMenu

- Menampilkan nama role user (bukan "PIC") menggunakan `useCurrentUser().roles`.

## 13. Known Issues & Technical Debt

### 13.1 Stale Files — ✅ RESOLVED
- ~~`app/pages/login copy.vue`~~ — dihapus
- ~~`app/pages/login_bckup.vue`~~ — dihapus
- ~~`app/components/hris/attendance/schedule/AssignShiftModal copy.vue`~~ — dihapus
- ~~`app/components/hris/attendance/schedule/ShiftCalendar copy.vue`~~ — dihapus

### 13.2 Dead Code
- ~~`app/composables/useMenu.js`~~ — dihapus
- `app/composables/useApi.ts` — ada commented-out code lama
- `app/components/common/` dan `app/components/form/` — direktori kosong

### 13.3 Template Bugs — ✅ RESOLVED
- ~~`ShiftCalendar.vue`~~ — kelebihan `</div>` (telah diperbaiki)
- ~~`employee_id: 3` hardcoded~~ — diganti dengan `currentUser.value?.id` dari `useCurrentUser()`

### 13.4 Typecheck
- Error pre-existing di `.nuxt/components.d.ts` (auto-generated, tidak terkait kode)
- Error type di beberapa HRIS attendance components (pre-existing)

### 13.5 Backend
- `/users/auth` route hanya middleware `auth` (tidak perlu permission khusus) — sudah benar
- `/settings/document-types` GET route butuh `permission:read` — menghambat sidebar filter untuk user tanpa permission ini

### 13.6 Mock Data
- `hris/leaves/index.vue` masih ada hardcoded `employeesOnLeave` mock data
- `server/api/` (notifications, mails, members, customers) masih mock data dari Nuxt UI template

### 13.7 Missing Backend Endpoints
- `POST /hris/attendance/manual` — ManualEntryModal 404
- `/hris/reimbursement` dan `/hris/recruitment` — placeholder FE, belum ada BE
- Room session by room (`/medical/rooms/sessions/room/:roomId`) — belum ada di BE router

### 13.8 Flow Gaps
- `resultTiming` (inline/deferred) — BMAD rule ada, FE belum ada UI pemisahan yang lengkap
- `examType` discriminator (MCU vs RAWAT_JALAN) — belum dibedakan di FE
- `exam_code` edition-versioned — normal value per edisi belum
- Grading + auto-comment — BE ada, FE perlu verifikasi render
