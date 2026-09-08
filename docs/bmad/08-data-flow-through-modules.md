# BMAD FE — Data Flow Through Modules

Alur data umum dari frontend ke backend, per modul utama.

## Alur Umum

```
Page → useAsyncData/composable → $api (Axios) → Backend
                                          ← response JSON
Component render → aksi user → composable → $api → refresh
```

## 1. Front Office — Registrasi

### Dari Portal (temp)
```
registration-temp/{index}
  → GET /registration-temp (list)
  → approve → POST /registration-temp/{id}/approve
       (payload: examDate, scheduleDateExam, priorityRegist, patientId,
                  patientType, companyId, position)
  → user melihat detail → refresh list
```

### Manual (create)
```
registration-patient/create
  → pilih pasien (existing) atau buat baru
  → isi Data Registrasi (companyId, position, paymentType, priority)
  → POST /registration
       body: { patientId, branchId, companyId, position, serviceType,
               paymentType, priorityRegist, examDate, scheduleDateExam }
```

## 2. Rooms — Queue-Work

### Ambil pasien
```
rooms/queue
  → modal waiting → klik "Ambil Pasien"
  → PATCH /medical/exams/queue/stage/{stageId}/call
  → navigate /rooms/queue-work/{roomQueueItemId}
```

### Selesaikan item
```
queue-work/[id]
  → isi hasil (physical/dental/doctor) via panel
  → POST /mcu/exams/{examId}/doctor-exams/{examItemId}
  → POST /mcu/exams/{examId}/doctor-exams/{examItemId}/submit
  → PATCH /medical/exams/queue/exam-item/{itemId}/done
  → stage done → PATCH /medical/exams/queue/stage/{stageId}/done
```

### ECG / Treadmill clearance
```
EcgResultPanel load:
  → GET /mcu/exams/{examId}/ecg   (hasEcg, ecg, treadmill)

submitClearance:
  → POST /mcu/exams/{examId}/ecg/clearance
       body: { decision: APPROVE|REJECT, reason? }
```

## 3. Results — Approval

### Doctor result grading
```
result/doctor-result/[id]
  → useDoctorResult
  → GET /mcu/exams/{examId}/results
  → submit grade → POST /mcu/exams/{examId}/results (optimistic + rollback)
```

### Medical report
```
result/mr-review/[id]
  → GET /medical-reports
  → verify → POST /medical-reports/{id}/verify
  → return → POST /medical-reports/{id}/return
  → release → POST /medical-reports/{id}/release
```

## 4. Questionnaire

### Builder
```
questionnaire/[id]/builder
  → useQuestionnaire
  → GET /questionnaire/{id}
  → save sections → PUT /questionnaire/{id}/sections
```

### Pengisian (Portal / standalone)
```
Portal /questionnaire?registrationId=X
  → GET /api/questionnaire/{id} (proxy → BE)
  → submit → POST /api/questionnaire/answers
       body: { questionnaireId, registrationId, answers: [...] }
```

### Hasil
```
front-office/questionnaire-results
  → GET /questionnaire/results
```

## 5. Meal Time

```
queue-work/[id] (MealStatusBadge)
  → GET /medical/exams/{examId}/meal
  → countdown dari mealStartedAt + mealDurationMinutes
  → polling saat IN_PROGRESS
```

## 6. Autentikasi & Sesi

```
login submit → POST /auth/login
  → setToken(res.data.data.token)  (localStorage)
  → redirect berdasar roles

akses halaman → useCurrentUser
  → GET /users/auth (auto via useAsyncData)
  → expose roles, permissions, room access
```

## Catatan Transversal

- **Format response**: backend pakai `{ success, message, data }`, `api.get` membaca `res.data?.data`.
- **Error handling**: `catch` + toast via `useToast`.
- **Refresh**: setelah aksi sukses, panggil `refresh()` (dari `useAsyncData`) atau `loadPage(true)`.
- **Cache invalidation**: `clearNuxtData` saat token berubah / assign diri.
