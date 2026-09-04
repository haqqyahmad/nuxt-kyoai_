# BMAD FE — UI Component Patterns

## Auto-Import

`components: true` di `nuxt.config.ts` → semua komponen di `app/components/` auto-import. Tidak perlu `import` manual.

## Konvensi

| Aspek | Aturan |
|---|---|
| Naming | `PascalCase.vue` per komponen; folder per domain |
| Props | `defineProps` dengan type, sering `withDefaults` |
| Events | `defineEmits` (kebab-case alias / camel) |
| State | `ref`, `computed`, `watch` dari Vue |
| TypeScript | `type` (bukan `interface`) untuk props/state |
| Komentar | Tidak boleh menambah komentar kecuali diminta |

## Base Components (Reusable)

| Komponen | Fungsi |
|---|---|
| `BaseDeleteModal` | konfirmasi hapus |
| `BaseFormModal` | modal form |
| `BaseConfirmModal` | konfirmasi aksi |
| `BaseFullscreenModal` | modal fullscreen |
| `AppLoadingScreen` | loading awal |
| `BackToTop` | tombol kembali ke atas |
| `NotificationsSlideover` | slideover notifikasi |
| `UserMenu` / `TeamsMenu` | menu user/team di header |
| `MealStatusBadge` | badge status meal (countdown) |

## Tabel — UTable (reka-nova)

Komponen di `app/components/ui/table/`:
- `Table.vue`, `TableBody.vue`, `TableCaption.vue`, `TableCell.vue`, `TableEmpty.vue`, `TableFooter.vue`, `TableHead.vue`, `TableHeader.vue`, `TableRow.vue`
- `exports.ts`, `utils.ts`

Dipakai dengan TanStack Table (`@tanstack/vue-table`).

## Pola Form

- `UForm` + `UFormField` + `UInput` (dari @nuxt/ui)
- Validasi Zod (`import * as z from 'zod'`)
- `@submit.prevent`

Contoh pola field di `login.vue`:
```ts
const schema = z.object({ email: z.string().email(), password: z.string().min(8) })
```

## Pola Modal

Umum: `UModal` > `UCard` > form/aksi, dengan slot `#header`, `#body`, `#footer`.

## Pola Panel Pemeriksaan (Room)

Renderer per item via `resolveRenderer` (`app/constants/exam-renderers.ts`):
- `GenericExamPanel` — fallback
- `PhysicalExamWorkPanel` + `PhysicalExamPanel` — physical examination
- `DentalExamWorkPanel` / `DentalExamPanel` — dental
- `DoctorTestWorkPanel` / `DoctorTestPanel` — doctor test (visual field, romberg, dll)
- `EcgResultPanel` — ECG + clearance treadmill
- `ErpExternalResultPanel` — hasil eksternal (PDF/assign/upload)

Panel dipilih lewat `rendererFor(item)` → `resolveRenderer(master, snapshot)`.

## Pola QR/Print & Report

- `useQuestionnairePrint` — renderer template Jinja-like + print HTML
- `useMcuReportPrint` — print laporan MCU
- `QuestionnairePrintTemplateModal` — editor/previewe template
- Print window via `window.open` + `document.write`

## Pola Toast

`useToast()` (Nuxt UI):
```ts
toast.add({ title: 'Berhasil', description: '...', color: 'success' })
```

## Pola Status Badge

`UBadge` dengan mapping warna via helper (mis. `getStatusColor`, `getExamItemStatusColor`). Warna enum konsisten: `success`/`info`/`warning`/`error`/`neutral`.

## Catatan

- `components.json` diset ke style `reka-nova`, icon `lucide`.
- Banyak file besar masih punya lint error pre-existing (indent, unused vars) — jangan dijadikan acuan format baru.
