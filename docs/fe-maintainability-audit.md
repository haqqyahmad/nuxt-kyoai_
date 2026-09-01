# FE Code Maintainability Audit

Last updated: 2026-07-25

Dokumen ini berisi hasil analisis maintainability kode Frontend (Nuxt 4, `my-app`).

---

## 1. Statistik Proyek

| Metrik | Jumlah |
|--------|--------|
| Total files | 274 |
| Total lines of code | 62,639 |
| Vue files | 223 |
| TypeScript files | 50 |
| Files > 500 lines | 33 |
| Files > 1000 lines | 10 |

### Module Breakdown

| Module | Files |
|--------|-------|
| `app/components/` | 155 |
| `app/pages/` | 65 |
| `app/composables/` | 19 |
| `app/constants/` | 12 |
| `app/types/` | 5 |
| `app/utils/` | 5 |
| `app/plugins/` | 2 |
| `app/middleware/` | 2 |
| `app/stores/` | 1 |

---

## 2. Masalah Maintainability

### 🔴 HIGH — File Terlalu Besar

| File | Lines | Masalah |
|------|-------|---------|
| `pages/front-office/registration-patient/create.vue` | 2,676 | 70 functions, 188 reactive declarations |
| `pages/rooms/queue-work/[id].vue` | 2,233 | 15+ types, complex exam logic |
| `pages/rooms/exam-results/components/DetailDrawer.vue` | 1,722 | Modal dengan banyak fitur |
| `pages/rooms/queue.vue` | 1,628 | Queue management kompleks |
| `pages/settings/permissions.vue` | 1,181 | Permission matrix + modals |
| `pages/rooms/sample-collection/[id].vue` | 1,099 | Sample collection workflow |
| `pages/services/packages/create.vue` | 1,225 | Package create form |
| `pages/rooms/assignments.vue` | 1,207 | Room assignment management |
| `pages/services/types/create.vue` | 1,097 | Service type create form |
| `pages/front-office/registration-temp/index.vue` | 1,029 | Temp registration list |

**Total: 5 file terbesar = 7,805 lines (12.5% dari total LOC)**

### 🔴 HIGH — Duplikasi Type Definitions

| Type | Duplikasi Di | Jumlah File |
|------|-------------|-------------|
| `SampleUser` | `SampleReceptionPanel.vue`, `sample-collection/[id].vue`, `SampleCollectionHistoryTable.vue`, `sample-collection/index.vue`, `queue.vue` | 5 |
| `Role` | `roles.vue`, `permissions.vue`, `UserRoleModal.vue`, `PermissionCleanupModal.vue`, `MenuPreviewModal.vue`, `RolePermissionsModal.vue` | 6 |
| `RolePermission` | `roles.vue`, `permissions.vue`, `UserRoleModal.vue`, `RolePermissionsModal.vue` | 4 |
| `Permission` | `UserRoleModal.vue`, `RolePermissionsModal.vue`, `roles.vue`, `permissions.vue` | 4 |
| `RoomAssignment` | `queue.vue`, `queue-work/[id].vue`, `sample-collection/[id].vue` | 3 |
| `RoomQueueItem` | `queue.vue`, `sample-collection/[id].vue` | 2 |
| `SampleCollectionRow` | `sample-collection/[id].vue`, `sample-collection/index.vue` | 2 |
| `InputanOpsi` | `create.vue`, `packages/[id].vue`, `packages/create.vue`, `types/create.vue` | 4 |
| `NilaiNormalNumber` | `create.vue`, `packages/[id].vue`, `packages/create.vue`, `types/create.vue` | 4 |
| `NilaiNormalSelected` | `create.vue`, `packages/[id].vue`, `packages/create.vue`, `types/create.vue` | 4 |
| `MstItem` | `create.vue`, `types/create.vue`, `packages/create.vue` | 3 |
| `MstItemGroup` | `create.vue`, `types/create.vue`, `packages/create.vue` | 3 |
| `MstDepartment` | `create.vue`, `types/create.vue`, `packages/create.vue` | 3 |
| `AttendanceRow` | `tracking/print.vue`, `tracking/index.vue`, `DailyLogsTable.vue` | 3 |
| `NationalHoliday` | `national-holidays/index.vue`, `tracking/index.vue`, `HolidaySummaryCard.vue`, `HolidayList.vue`, `HolidayDetailForm.vue` | 5 |

**Total: 100+ inline type definitions, 15+ types duplikat 3-6x**

### 🟡 MEDIUM — Duplikasi Logic

| Pattern | Duplikasi Di | Jumlah File |
|---------|-------------|-------------|
| Delete handler (`handleDeleteById`) | 12 index pages | 12 |
| Table state (`columnFilters`, `currentPage`) | 15+ pages | 15+ |
| Data extraction (`xxx.value?.data ?? []`) | 5 files | 5 |

### 🟡 MEDIUM — Console Error di Production

| Kategori | Jumlah |
|----------|--------|
| `console.error(...)` di catch blocks | 47 |
| Active `console.error` | 2 |
| **Total** | 51 across 29 files |

### 🟢 LOW — Dead Code

| Item | Jumlah |
|------|--------|
| Empty directories | 5 (`common/`, `form/`, `items/lab/`, `medical/`, `templates/lab/`) |
| Duplicate directories | `customer/` vs `customers/` |
| Inline Zod schemas | 14 schemas defined inline |
| Promise chain pattern (`.then()`) | 24 instances |

---

## 3. Yang Sudah Bagus

| Aspek | Status |
|-------|--------|
| Permission system | ✅ Solid — dynamic route-to-docType matching |
| Composable pattern | ✅ Konsisten — useXxx pattern |
| Component auto-import | ✅ Berfungsi |
| TypeScript usage | ✅ Ada (tapi banyak inline types) |
| Error handling (toast) | ✅ Konsisten |
| Menu system | ✅ Shared constants + preview modal |
| Documentation | ✅ Lengkap (PRD, system-flow, AGENTS.md) |

---

## 4. Rekomendasi Prioritas

### Priority 1 — Extract Shared Types (1-2 hari)

Buat `app/types/` lebih lengkap:

```
types/
├── index.d.ts (existing)
├── room.ts (existing)
├── room-assignment.ts (existing)
├── questionnaire.ts (existing)
├── hris-leave.ts (existing)
├── sample.ts (BARU) — SampleUser, SampleCollectionRow
├── role.ts (BARU) — Role, RolePermission, Permission
├── registration.ts (BARU) — InputanOpsi, MstItem, MstDepartment
├── attendance.ts (BARU) — AttendanceRow, NationalHoliday
└── common.ts (BARU) — shared types
```

### Priority 2 — Create Shared Composables (2-3 hari)

```
composables/
├── useTablePage.ts — columnFilters, currentPage, searchQuery, etc.
├── useDeleteEntity.ts — handleDeleteById pattern
└── useDataExtraction.ts — data extraction pattern
```

### Priority 3 — Break Down Mega Components (5-7 hari)

| File | Rencana |
|------|---------|
| `create.vue` (2,676 lines) | Split ke: `PatientForm`, `PackageSelector`, `ItemSelector`, `RegistrationSummary` |
| `queue-work/[id].vue` (2,233 lines) | Split ke: `StageManager`, `ExamItemCard`, `ResultForm`, `SampleManager` |
| `permissions.vue` (1,181 lines) | Split ke: `PermissionMatrix`, `ActionManager`, `DocTypeManager` |

### Priority 4 — Cleanup (1 hari)

- Hapus 5 empty directories
- Merge `customer/` + `customers/`
- Hapus console.error (ganti error reporting)

---

## 5. Estimasi Total Effort

| Prioritas | Effort | Impact |
|-----------|--------|--------|
| Priority 1 (Shared Types) | 1-2 hari | 🟢 Kecil |
| Priority 2 (Shared Composables) | 2-3 hari | 🟡 Sedang |
| Priority 3 (Break Down) | 5-7 hari | 🔴 Besar |
| Priority 4 (Cleanup) | 1 hari | 🟢 Kecil |
| **TOTAL** | **9-13 hari** | — |

---

## 6. Skor Maintainability

| Aspek | Skor |
|-------|------|
| Code organization | 7/10 |
| Type safety | 5/10 (banyak inline types) |
| Code duplication | 4/10 (15+ types duplikat, 12 delete handlers) |
| Component size | 5/10 (33 files >500 lines) |
| Error handling | 6/10 (toast bagus, tapi console.error) |
| Documentation | 8/10 (PRD, system-flow, AGENTS.md lengkap) |
| **Overall** | **6/10** |

---

## 7. File yang Dianalisis

### Large Files (>500 lines)

| File | Lines |
|------|-------|
| `pages/front-office/registration-patient/create.vue` | 2,676 |
| `pages/rooms/queue-work/[id].vue` | 2,233 |
| `pages/rooms/exam-results/components/DetailDrawer.vue` | 1,722 |
| `pages/rooms/queue.vue` | 1,628 |
| `pages/services/packages/create.vue` | 1,225 |
| `pages/rooms/assignments.vue` | 1,207 |
| `pages/settings/permissions.vue` | 1,181 |
| `pages/rooms/sample-collection/[id].vue` | 1,099 |
| `pages/services/types/create.vue` | 1,097 |
| `pages/front-office/registration-temp/index.vue` | 1,029 |
| `pages/front-office/registration-patient/[id].vue` | 997 |
| `pages/services/types/[id].vue` | 985 |
| `pages/patients/[id].vue` | 932 |
| `components/item/ItemExamTemplate.vue` | 887 |
| `pages/registration/create.vue` | 859 |
| `components/hris/attendance/schedule/AssignShiftModal.vue` | 761 |
| `pages/rooms/exam-results/index.vue` | 714 |
| `pages/hris/attendance/tracking/print.vue` | 683 |
| `pages/customer/[id].vue` | 674 |
| `components/hris/employees/EditModal.vue` | 651 |
| `pages/rooms/types/index.vue` | 649 |
| `components/hris/attendance/configuration/CreateShiftModal.vue` | 629 |
| `components/item/ItemsAddModal.vue` | 628 |
| `pages/front-office/registration-patient/index.vue` | 625 |
| `layouts/default.vue` | 616 |
| `pages/items/mcu/index.vue` | 603 |
| `components/hris/leaves/RequestTable.vue` | 595 |
| `pages/items/mcu/[id].vue` | 582 |
| `pages/front-office/registration-temp/[id].vue` | 582 |
| `components/rooms/SampleReceptionPanel.vue` | 570 |
| `components/hris/attendance/configuration/ShiftDetailForm.vue` | 563 |
| `components/hris/attendance/schedule/ShiftCalendar.vue` | 538 |
| `components/hris/attendance/configuration/MonthlyShiftDetailForm.vue` | 530 |
