# System Flow — FE ↔ BE (Kyoai Medical Services)

Last updated: 2026-07-24

Dokumen ini mendeskripsikan alur (flow) end-to-end antara Frontend (Nuxt 4, `my-app`)
dan Backend (Express 5 + Prisma + MySQL + Redis/BullMQ, `express_dash`). Tujuannya
memberikan satu sumber kebenaran (single source of truth) tentang bagaimana setiap
fitur mengalir dari UI hingga database dan kembali.

---

## 1. Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Nuxt 4 SPA, ssr:false)                            │
│  - app/pages      → routing & screens                        │
│  - app/composables → business logic (useXxx)                 │
│  - app/components  → UI reusable                             │
│  - app/plugins/api.ts → Axios instance                       │
│      ├─ Request interceptor: inject Authorization: Bearer   │
│      └─ Response interceptor: 401 → removeToken + /login    │
└───────────────┬─────────────────────────────────────────────┘
                │  HTTPS  +  Header: Authorization, api-key-kyo
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (Express 5)                                         │
│  src/routers → controller → service → repository → Prisma    │
│  Middleware: ApiKey → Auth(JWT) → permit(RBAC) → Validate(Zod)│
│  Redis (cache) · BullMQ (queue: attendance, temp-reg expiry) │
└───────────────┬─────────────────────────────────────────────┘
                ▼
        MySQL (Prisma schema 2033 lines)
```

**Konvensi penting (konsisten FE & BE):**
- Format permission: `{documentType}:{action}` (contoh `user:read`, `room:update`).
- Naming route BE: `/api/<domain>`; FE memanggil via `useApi().get('/<domain>')`.
- Employee ↔ User: relasi 1:0..1 via `Employee.userId` (unique).

---

## 2. Authentication Flow

### 2.1 Login
```
[FE] login.vue
  → Zod validate (email, password min 8)
  → POST /api/auth/login  { email, password, remember }
        │
        ▼
[BE] auth.route.js → auth.controller.js → auth.service.js
  → userRepo.findByEmail()  (Redis cache user:email:* TTL 300s)
  → bcrypt.compare()
  → generateToken({ id, email }, remember?)
       • remember=false → JWT 1d
       • remember=true  → JWT 30d
  → getUserRoles(userId) → roles[]
  → RETURN { dataUser, token, roles }
        │
        ▼
[FE] setToken(token)  → localStorage (selalu, cegah logout tab ganda)
     clearNuxtData('current-user','permission-catalog','room-session-me')
     redirect:
       • role petugas-lab / petugas-radiologi / dokter → /rooms/assignments
       • lainnya → /
```

### 2.2 Authenticated Request
```
[FE] plugins/api.ts request interceptor
  → Authorization: Bearer <token>
  → api-key-kyo: <NUXT_PUBLIC_API_KEY>

[BE] index.js
  → ApiKeyMiddleware  (cek header api-key-kyo, kecuali /public/register)
  → auth.middleware.js → decode JWT → req.user
  → permit(...perms)   (RBAC, optional per route)
```

### 2.3 Logout / 401
```
[FE] plugins/api.ts response interceptor
  → status 401 → removeToken() + router.push('/login')

[FE] UserMenu.vue "Log out"
  → removeToken() + navigateTo('/login')

[FE] middleware/auth.ts → jika tidak ada token → /login
[FE] middleware/guest.ts → jika sudah login → /
```

---

## 3. Permission & Sidebar Flow

```
[FE] layouts/default.vue (mount)
  → useCurrentUser()  → GET /api/users/auth
        │  returns user.roles[].role.permissions[].permission.name
        ▼
  → useCurrentUser.permissions = Set<string>  (flat, dedupe)
  → useCurrentUser.roles       = string[]
  → useCurrentUser.isPic       = permissions.includes('room:update')
  → allowedSelfRoomIds / allowedSelfRooms / canSelfAssign

  → useRoutePermission()  → GET /api/settings/document-types
        │  returns [{ key, label }]  (e.g. 'mcu-item', 'room', 'patient')
        ▼
  → getDocTypeForRoute(path):
        candidate keys dari path:
          1. join-all        '/items/mcu' → 'items-mcu'
          2. last segment     → 'mcu'
          3. reverse-last-2    → 'mcu-items'
          4. each segment      → 'items','mcu'
        → match ke docType.key (exact lalu singular)
  → hasRouteAccess(path, permissions): ada permission 'docType:*'?

  → filterSidebarItems():
      1. restrictedRoles: petugas-lab/radiologi/dokter/nurse
         → hanya Dashboard, Examination, Settings
      2. permission-based: sembunyikan item yg tidak punya akses
      3. sembunyikan parent group jika tidak ada child visible
```

**Mapping route → document type** (FE `useRoutePermission` ↔ BE `MstDocumentType`):

| Route | DocType key |
|---|---|
| `/branches` | branch |
| `/customer` | customer |
| `/departments` | department |
| `/patients` | patient |
| `/users` | user |
| `/items/mcu` | mcu-item |
| `/items/groups` | item-group |
| `/items/sample-types` | sample-type |
| `/questionnaire` | questionnaire |
| `/rooms` | room |
| `/rooms/types` | room-type |
| `/rooms/assignments` | room-assignment |
| `/services` | service |
| `/front-office/registration-temp` | temp-registration |
| `/front-office/registration-patient` | registration-patient |
| `/hris` / `/hris/employees` | hris / employee |
| `/settings` | setting |

**Settings tab gating** (`settings.vue`):
- Profile / Security / Notifications → selalu visible
- Roles tab → butuh `role:*`
- Permissions tab → butuh `permission:*`

---

## 4. MCU End-to-End Flow (Registration → Queue → Exam → Result)

```
[FE] /front-office/registration-patient
  → POST /api/registration  { patientId, branchId, serviceType, packageItems... }
        │
        ▼
[BE] registration.route.js
  →buat Registration + (auto) QueueEntry (check-in ticket)
  → GET /api/registration/number/:id_reg  → include queue {queueCode, queueNumber}
        │
        ▼
[FE] detail registrasi → Card Queue Number (permanent, dari API)

[FE] /rooms/queue  → GET /api/medical/exams (pool per room-type)
  → staff panggil (call) → start → done / skip / reschedule
  → stage transitions: RoomQueueItem → StageQueueItem

[FE] /rooms/queue-work/[id]
  → GET /api/mcu/exams/:id  → TrxExam + TrxExamItem[]
  → input hasil per item:
       • number  → MstNilaiNormalNumber
       • selected→ MstNilaiNormalSelected
       • calculated → MstInputanFormula
  → POST /api/mcu/exams/:id/results (batch save)
       │
       ▼
[BE] grading:
  • TrxExamResult.grading = NORMAL / ABNORMAL_INC / ABNORMAL_DEC
  • TrxExamGroupResult   → auto-comment
  • External: TrxExamResult.externalStatus (jika User.isExternal / MstRoomType.externalResult)
```

**Tier gating (BMAD):** tier selanjutnya baru ter-unlock setelah tier sebelumnya
status `DONE`. FE sudah implementasi; BE `stageLinks` sudah di-fix (regenerate Prisma).

---

## 4b. Sample Flow (Collection → Reception)

```
[FE] /rooms/sample-collection
  → GET /api/medical/exams/queue/samples/collection-history  (history list)
  → SampleCollectionPickModal → GET /api/medical/exams/queue/samples?status=PENDING

[FE] /rooms/sample-collection/[id]
  → GET /api/medical/exams/queue/:id  (queue entry detail)
  → GET /api/medical/exams/queue/samples?queueEntryId=...  (sample list)
  → Stage transitions:
       PATCH /api/medical/exams/queue/stage/:id/start
       PATCH /api/medical/exams/queue/stage/:id/return
  → Sample actions:
       PATCH /api/medical/exams/queue/samples/:id/collect  (body: { tubeCount })
       PATCH /api/medical/exams/queue/samples/:id/receive
       PATCH /api/medical/exams/queue/samples/:id/reject   (body: { rejectReason })
       PATCH /api/medical/exams/queue/samples/:id/reschedule

[FE] /rooms/sample-reception
  → SampleReceptionPanel
  → GET /api/medical/exams/queue/samples/receive  (paginated, filterable)
  → Sample actions:
       PATCH /api/medical/exams/queue/samples/:id/take
       GET  /api/medical/exams/queue/samples/receive/:id  (detail)
       PATCH /api/medical/exams/queue/samples/:id/release
       PATCH /api/medical/exams/queue/samples/:id/receive  (confirm)
```

---

## 4c. Exam Results Flow

```
[FE] /rooms/exam-results
  → GET /api/mcu/exams/results  (list with pagination + filters: department, status, resultType, dokterExternal)

[FE] /rooms/exam-results/[id]
  → GET /api/mcu/exams/results?examItemId=...&page=...&limit=...
  → DetailDrawer (modal):
       - Tampilkan grading per item (NORMAL/ABNORMAL_INC/ABNORMAL_DEC)
       - Dokter external: assign/external-result via external-doctor-flow.md
```

---

## 5. Room Assignment & Session Flow

```
[FE] /rooms/assignments
  → GET /api/room-assignments
  → mode PIC (has 'room:update'):
       • single assign / batch assign (per date)
  → mode Self (staff):
       • self-assign ke room dengan roomType di whitelist role
         (collectSelfAssignableRoomTypeCodes)
       • BE auto-create UserRoomAccess dari role mapping
        │
        ▼
[BE] room-assignment.route.js
  → UserRoomAssignment (@@unique [userId, assignedDate])
  → UserRoomAccess    (@@unique [userId, roomId])  → whitelist

[FE] /rooms (operational)
  → useRoomSession.enter(roomId)  → POST /api/medical/rooms/sessions/me
       • single active room per user (UserRoomSession)
       • staff capacity enforcement
  → useRoomSession.exit()          → end session
```

---

## 6. HRIS Flow

```
[FE] /hris (dashboard)
  → SummaryCard, EmployeeStatusTable, AttendanceChart, RecentActivity

Employees:
  /hris/employees → GET /api/hris/employees
  AddModal/EditModal → Employee ↔ User link (Tab User)
       • BE: Employee.userId unique (1:0..1)

Attendance:
  /hris/attendance → GET /api/hris/attendance (raw + daily summary)
  ManualEntryModal → POST /api/hris/attendance/manual
  UploadAttendanceModal → import AttendanceRaw
  BullMQ worker (attendance.queue.js / attendance.worker.js)
       → proses AttendanceRaw → AttendanceDailySummary
       → DirtyAttendance flagged

Shift:
  shift-configuration → /api/hris/shift/templates, /month-templates
  shift-schedule      → /api/hris/shift/assignments, /schedules/generate

Leaves:
  /hris/leaves → GET /api/hris/leave (+ balance)
  create → POST /api/hris/leave/request
  detail → approval actions, conflict detection, attendance history
  BE: LeaveRequest → LeaveAuditLog + LeaveBalanceLedger

National Holidays:
  /hris/national-holidays → CRUD /api/hris/national-holidays

Reimbursement / Recruitment:
  ⚠️ Placeholder di FE ("Halaman ini masih dalam pengembangan"), belum ada BE endpoint.
```

---

## 6b. Inbox & Mail Flow

```
[FE] /inbox
  → GET /api/mails  (server mock — 20 hardcoded emails)
  → components: InboxList, InboxMail
  → Keyboard shortcut: g-i (dari useDashboard)
```

---

## 6c. Services Flow

```
[FE] /services → redirects to /services/types

/service/types:
  → GET /api/medical/service-types  (enum values — ServiceType is Prisma enum, read-only)
  → DELETE /api/medical/service-types/:id

/service/types/create:
  → GET /api/medical/departments, GET /api/mcu/items
  → POST /api/mcu/pakets  (create package with itemIds)

/service/packages:
  → GET /api/mcu/pakets
  → DELETE /api/mcu/pakets/:id

/service/packages/create:
  → GET /api/mcu/pakets/:id
  → POST/PUT /api/mcu/pakets  (create or update)

/service/types/[id] (service detail / registration lookup):
  → GET /api/registration/number/:id
  → GET /api/mcu/pakets
  → PATCH /api/registration/:id/cancel
  → PATCH /api/registration/:id_reg/status  (body: { status: 'Checkin' })
```

---

## 6d. Audit Trail Flow

```
[FE] useAudit composable (used in detail pages)
  → GET /api/audit/:entity/:entityId  (diff-based audit log)
  → Exports: loading, entries, fetchAudit, resetAudit
  → BE endpoint confirmed present; FE wiring via composable
```

---

## 7. Settings & Master Data Flow

```
Document Types:
  GET/POST/PUT/DELETE /api/settings/document-types
  → FE useRoutePermission mengambil list ini untuk sidebar matching

Permission Actions:
  GET/POST/PUT/DELETE /api/settings/permission-actions
  → MstPermissionAction (master actions: read/write/delete/...)
  → auto-create action dari permission name saat permission dibuat (BE)

Roles & Permissions:
  /settings/roles       → CRUD /api/settings/roles
  /settings/permissions → matrix Role × DocType × Action
       • Add DocType modal → POST /api/settings/document-types
       • Manage Actions modal → link role↔permission
  → BE RolePermission pivot [roleId, permissionId]

Profile (self):
  GET /api/users/auth            → current user + permissions
  GET /api/users/auth/employee   → employee data (jika ter-link)
  PUT /api/users/profile         → self-update
  GET /api/hris/employee-leave-balance?employee_id= → leave balance card

Security:
  PUT /api/auth/change-password  → ganti password (verified present di BE)
```

---

## 8. Caching & Queue (BE Internal)

```
Redis cache:
  • user:email:{email}        TTL 300s  (login lookup)
  • permissions / user lists  (version-based invalidation)

BullMQ:
  • attendance.queue.js + attendance.worker.js
       → proses AttendanceRaw secara async
  • jobs/expire-temp.job.js
       → expire RegistrationTemp (PENDING → EXPIRED) via scheduler
```

---

## 9. Gap & Catatan Alur (per 2026-07-20)

| Area | Status | Catatan |
|---|---|---|
| Auth & Session | ✅ | role redirect, 401, localStorage — lengkap |
| Permission & Sidebar | ✅ | dynamic matching — lengkap |
| Registration → Queue → Exam | ✅ | alur inti jalan |
| Sample Collection → Reception | ✅ | collect/receive/reject/reschedule flow |
| Exam Results | ✅ | list + detail + pagination + filters |
| Room Assignment & Session | ✅ | PIC + self-assign + single active room |
| HRIS (Employees/Attendance/Shift/Leave/Holiday) | ✅ | endpoint BE lengkap |
| Services (Types & Packages) | ✅ | service-types (enum read-only) + packages CRUD |
| Inbox | ✅ | Mock API (server/api/mails) |
| Audit Trail | ✅ | `useAudit` composable → `/api/audit/:entity/:entityId` |
| Questionnaire | ⚠️ | BE `/api/questionnaire` ada; autosave via `/questionnaire/builder`; pastikan FE wiring & shape |
| Service Types | ⚠️ | BE `/api/medical/service-types` ada; pastikan FE wiring |
| Change Password | ⚠️ | BE `/api/auth/change-password` ada; pastikan FE wiring |
| resultTiming (inline/deferred) | ❌ | BMAD rule ada, FE belum ada UI pemisahan |
| examType / exam_code discriminator | ❌ | MCU vs Rawat Jalan belum dibedakan di FE |
| External Doctor | ❌ | BE model ada (isExternal, externalStatus), FE belum ada UI |
| Grading & Auto-Comment | ⚠️ | BE ada; FE perlu verifikasi render |
| Reimbursement / Recruitment | ❌ | placeholder FE, belum ada BE |

---

## 10. Endpoint Map (FE Page → BE Route)

| FE Page | BE Endpoint | Method |
|---|---|---|
| `/login` | `/api/auth/login` | POST |
| `/settings` (profile) | `/api/users/auth`, `/api/users/auth/employee`, `/api/users/profile` | GET/PUT |
| `/settings/security` | `/api/auth/change-password` | PUT |
| `/settings/roles` | `/api/settings/roles` | CRUD |
| `/settings/permissions` | `/api/settings/permissions`, `/api/settings/document-types`, `/api/settings/permission-actions` | CRUD |
| `/inbox` | `/api/mails` | GET |
| `/branches` | `/api/branch` | CRUD |
| `/customer` | `/api/customer` | CRUD |
| `/customers` | `/api/customers` (mock) | GET |
| `/departments` | `/api/medical` (medicalDepartment) | CRUD |
| `/departments/medical` | `/api/medical/departments` | GET |
| `/patients` | `/api/patient` | CRUD |
| `/users` | `/api/users` | CRUD |
| `/items/mcu` | `/api/mcu/items`, `/api/mcu/pakets`, `/api/mcu/exams` | CRUD |
| `/items/groups` | `/api/mcu/items` (group hierarchy) | CRUD |
| `/items/sample-types` | `/api/medical/exams` (sample types) | CRUD |
| `/questionnaire` | `/api/questionnaire` | CRUD |
| `/questionnaire/:id/builder` | `/api/questionnaire/builder` | PUT (autosave) |
| Portal questionnaire (default) | `/api/questionnaire/public/default?companyId=&branchId=` | GET — per-company via tabel `CompanyQuestionnaire`, fallback `portalKey=MCU` |
| Portal questionnaire (by ID) | `/api/questionnaire/public/:id` | GET |
| Portal submit jawaban | `/api/questionnaire/public/:id/submit` | POST |
| `/rooms` | `/api/medical/rooms/rooms` | CRUD |
| `/rooms/types` | `/api/medical/rooms/room-types` | CRUD |
| `/rooms/assignments` | `/api/room-assignments` | CRUD |
| `/rooms/queue` | `/api/medical/exams` | GET |
| `/rooms/queue-work/[id]` | `/api/mcu/exams/:id`, `/api/mcu/exams/:id/results` | GET/POST |
| `/rooms/exam-results` | `/api/mcu/exams/results` | GET |
| `/rooms/exam-results/[id]` | `/api/mcu/exams/results` (params: examItemId) | GET |
| `/rooms/sample-reception` | `/api/medical/exams/queue/samples/receive` | GET |
| `/rooms/sample-collection` | `/api/medical/exams/queue/samples/collection-history` | GET |
| `/rooms/sample-collection/[id]` | `/api/medical/exams/queue/:id`, `/api/medical/exams/queue/samples` | GET |
| `/services` | Redirects to `/services/types` | — |
| `/services/types` | `/api/medical/service-types` | GET/DELETE |
| `/services/types/create` | `/api/mcu/pakets` | POST |
| `/services/types/[id]` | `/api/registration/number/:id`, `/api/mcu/pakets` | GET |
| `/services/packages` | `/api/mcu/pakets` | CRUD |
| `/services/packages/create` | `/api/mcu/pakets` | POST/PUT |
| `/front-office/registration-temp` | `/api/registration-temp` (admin), `/api/public/register/:branchCode` | CRUD/POST |
| `/front-office/registration-patient` | `/api/registration` | CRUD |
| `/front-office/registration-patient/create` | `/api/registration`, `/api/patient`, `/api/medical/departments` | POST/GET |
| `/registration/create` | `/api/registration` | POST |
| `/hris` | `/api/hris/employees`, `/api/hris/attendance` | GET |
| `/hris/employees` | `/api/hris/employees` | CRUD |
| `/hris/attendance` | `/api/hris/attendance` | GET |
| `/hris/attendance/tracking` | `/api/hris/attendance/tracking` | GET |
| `/hris/attendance/analytics` | `/api/hris/attendance` | GET |
| `/hris/attendance/shift-configuration` | `/api/hris/shift/templates`, `/api/hris/shift/month-templates` | CRUD |
| `/hris/attendance/shift-schedule` | `/api/hris/shift/assignments`, `/api/hris/shift/schedules/generate` | POST |
| `/hris/leaves` | `/api/hris/leave`, `/api/hris/employee-leave-balance` | CRUD/GET |
| `/hris/leaves/create` | `/api/hris/leave/request`, `/api/hris/employee-leave-balance` | POST/GET |
| `/hris/national-holidays` | `/api/hris/national-holidays` | CRUD |
| `/hris/reimbursement` | — | ⚠️ Placeholder |
| `/hris/recruitment` | — | ⚠️ Placeholder |
| Audit (via `useAudit`) | `/api/audit/:entity/:entityId` | GET |

---

*Dokumen ini dibuat untuk menyatukan pemahaman FE (`my-app`) dan BE
(`express_dash`) agar alur sistem tersedia sebagai referensi tunggal.*

## 11. Alur Dokter Eksternal (External Doctor)

Sub-alur MCU untuk dokter luar (BMAD) dijelaskan terpisah di
**`external-doctor-flow.md`** — mencakup model `User.isExternal`,
`TrxExamResult.externalStatus`, lifecycle ASSIGNED→FILLED/CANCELLED, dan
endpoint map FE ↔ BE (`/mcu/exams/:id/assign-external`, `cancel-external`,
`external-result`).

---

## 12. Permissions & Roles Manager (`/settings/permissions`)

Modul ini **sudah selaras penuh** antara FE (`settings/permissions.vue`) dan BE.

### Endpoint Map (FE ↔ BE)

| FE Call | BE Endpoint | Permit |
|---|---|---|
| `GET /settings/permissions` | `GET /api/settings/permissions` | `permission:read` |
| `POST /settings/permissions` `{name}` | `POST /api/settings/permissions` | `permission:create` + validate `module:action` |
| `GET /settings/document-types` | `GET /api/settings/document-types` | `permission:read` |
| `POST /settings/document-types` | `POST /api/settings/document-types` | `permission:create` |
| `PUT /settings/document-types/:id` | `PUT /api/settings/document-types/:id` | `permission:update` |
| `DELETE /settings/document-types/:id` | `DELETE /api/settings/document-types/:id` | `permission:delete` |
| `GET /settings/roles` | `GET /api/settings/roles` (include permissions) | `role:read` |
| `POST /settings/roles/:id/permissions` `{permissionIds}` | `POST /api/settings/roles/:id/permissions` | `role:update` |
| `GET /settings/permission-actions` | `GET /api/settings/permission-actions` | `permission:read` |
| `POST /settings/permission-actions` | `POST /api/settings/permission-actions` | `permission:create` |
| `PUT /settings/permission-actions/:id` | `PUT /api/settings/permission-actions/:id` | `permission:update` |
| `DELETE /settings/permission-actions/:id` | `DELETE /api/settings/permission-actions/:id` | `permission:delete` |
| `POST /settings/permission-actions/sync` | `POST /api/settings/permission-actions/sync` | `permission:create` |

### Catatan Kesesuaian
- **Shape `Role`**: BE `getRoles` mengembalikan `permissions: [{ permission: {...} }]`
  — cocok dengan tipe `RolePermission[]` di FE (`permissionId` dari pivot, `permission.id`).
- **Format permission name**: BE validasi regex `^[A-Za-z]...:[A-Za-z]...$`
  (contoh `user:create`); FE selalu membangun `docType:action` → valid.
- **Auto-create permission**: saat toggle action di matrix, FE `POST /settings/permissions`
  lalu `POST /settings/roles/:id/permissions` — sesuai alur BE.
- **Document Type**: dropdown matrix di FE diambil dari `/settings/document-types`,
  lalu di-merge dengan permission yang ada (empty docType tetap muncul).
- **Permission gating halaman**: tab Permissions di `settings.vue` hanya tampil jika
  user punya `permission:*` (cek `useCurrentUser.permissions`).

### Gap Minor
- FE tidak menampilkan tombol edit/delete **Document Type** (hanya Add) — BE sudah
  support `PUT/DELETE`, tapi UI belum menyediakan aksi tersebut.
- Tidak ada konfirmasi `BaseDeleteModal` untuk hapus action (langsung delete).

