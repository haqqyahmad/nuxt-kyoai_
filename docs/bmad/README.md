# BMAD — Frontend (my-app)

Dokumen ini adalah **BMAD (Business Model & Architecture Document)** untuk sisi **Frontend** dari sistem ERP Kesehatan Kyoai Medical Services.

Referensi utama arsitektur & domain: **BMAD Backend** di `../BE/db_express/docs/bmad/`. Dokumen FE ini memetakan bagaimana frontend mengonsumsi domain backend, bukan mengulang desain domain backend.

## Tujuan

- Menjadi baseline arsitektur frontend untuk diskusi & onboarding.
- Menjelaskan pola komponen, state, HTTP, routing, dan access-control.
- Menyelaraskan terminologi & alur dengan BMAD BE.

## Daftar Dokumen

| Dokumen | Deskripsi |
|---|---|
| [`00-current-state.md`](./00-current-state.md) | Kondisi aktual codebase frontend saat ini |
| [`01-architecture-target.md`](./01-architecture-target.md) | Target arsitektur & layering frontend |
| [`02-state-and-composables.md`](./02-state-and-composables.md) | Pola state management & composable |
| [`03-http-and-auth.md`](./03-http-and-auth.md) | Layer HTTP, API key, JWT, auth middleware |
| [`04-routing-and-pages.md`](./04-routing-and-pages.md) | Routing, layouts, page inventory |
| [`05-access-control-and-sidebar.md`](./05-access-control-and-sidebar.md) | Permission, route-permission, menu/sidebar filter |
| [`06-ui-component-patterns.md`](./06-ui-component-patterns.md) | Pola komponen UI reusable & konvensi |
| [`07-domain-modules.md`](./07-domain-modules.md) | Modul domain frontend (front-office, rooms, result, questionnaire, hris, settings) |
| [`08-data-flow-through-modules.md`](./08-data-flow-through-modules.md) | Alur data dari halaman → composable → API → backend |

## Konvensi Naming

- File markdown diberi prefix nomor (`00-`, `01-`, ...) agar urutan baca konsisten, mengikuti pola BMAD BE.
- Setiap dokumen menyebut path file & line number untuk traceability.
