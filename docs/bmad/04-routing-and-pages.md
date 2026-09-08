# BMAD FE — Routing & Pages

## Routing

File-based routing Nuxt 4 di `app/pages/`.

### Layouts (`app/layouts/`)
| Layout | Deskripsi |
|---|---|
| `default.vue` | Shell utama dashboard dengan sidebar, TeamsMenu, UserMenu, NotificationsSlideover |
| `auth.vue` | Halaman login (bare) |
| `blank.vue` | Halaman kosong (preview, print) |

### Cara memilih layout
Via `definePageMeta`:
- `layout: 'auth'` → login
- `layout: 'blank'` → questionnaire preview
- `layout: false` → dental print, attendance tracking print

### Middleware di page
- `middleware: 'auth'` → index, rooms/assignments, hris/*
- `middleware: 'guest'` → login
- `title` only → mr-review, department-approval, result-workflow, dental/[id]

## Inventori Page

### Top-level
- `index.vue` — Dashboard
- `login.vue`
- `inbox.vue`
- `settings.vue` — redirect/shell settings
- `services.vue`, `customers.vue` (legacy)

### Master Data
- `branches/index` — cabang
- `customer/{index,[id]}` — customer
- `departments/{index,medical/index}` — departemen (medis & non)
- `patients/{index,[id]}` — pasien
- `users/{index,[id]}` — user

### Medical / Items
- `items/groups.vue`
- `items/mcu/{index,[id]}` — master item MCU (termasuk meal config)
- `items/sample-types/index`
- `medical/master-grading.vue`

### Questionnaire
- `questionnaire/index`
- `questionnaire/[id]/builder.vue`
- `questionnaire/[id]/preview.vue`

### Rooms / Operational
- `rooms/index`
- `rooms/queue.vue` — daftar antrean + modal ambil pasien
- `rooms/assignments.vue` — assign room
- `rooms/types/index`
- `rooms/queue-work/[id]` — pekerjaan room (ECG/treadmill, physical, dll)
- `rooms/sample-collection/{index,[id]}`
- `rooms/sample-reception/index`
- `rooms/dental/{[id],print/[id]}`

### Results
- `result/exam-results/{index,[id]}` + `components/` (DetailDrawer, HistoryTimeline, DentalResultPanel, PhysicalResultPanel)
- `result/exam-status/{index,[id]}`
- `result/mr-review/{index,[id]}`
- `result/doctor-result/{index,[id]}`
- `result/department-approval.vue`

### Front Office
- `front-office/registration-temp/{index,[id]}`
- `front-office/registration-patient/{create,index,[id]}`
- `front-office/questionnaire-results.vue`
- `registration/create.vue` (legacy)

### HRIS
- `hris/index`
- `hris/employees/index`
- `hris/leaves/{index,create,[id]}`
- `hris/attendance/*` (index, tracking, analytics, shift-configuration, shift-schedule)
- `hris/national-holidays/index`
- `hris/reimbursement/index`
- `hris/recruitment/index`

### Services
- `services/packages/{index,create,[id]}`
- `services/types/{index,create,[id]}`

### Settings
- `settings/index`
- `settings/{members,notifications,permissions,roles,security,result-workflow}.vue`

## Page-Scoped Components

`app/pages/result/exam-results/components/` berisi komponen khusus halaman:
- `DetailDrawer.vue`
- `HistoryTimeline.vue`
- `DentalResultPanel.vue`
- `PhysicalResultPanel.vue`

## Catatan

- Sebagian besar halaman belum memasang middleware auth secara eksplisit.
- `customers.vue` & `registration/create.vue` dianggap legacy/duplikat dari versi `customer/` & `front-office/registration-patient/create.vue`.
