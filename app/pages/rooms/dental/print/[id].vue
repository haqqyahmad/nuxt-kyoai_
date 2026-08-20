<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { DentalExamData } from '~/types/dental'

definePageMeta({ layout: false })

useSeoMeta({ title: 'Laporan Pemeriksaan Gigi' })

const route = useRoute()
const api = useApi()
const examId = String(route.params.id)
const data = ref<DentalExamData | null>(null)
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get(`/mcu/exams/${examId}/dental`)
    data.value = (res.data?.data ?? res.data ?? null) as DentalExamData | null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err?.response?.data?.message ?? 'Data dental gagal dimuat.'
  } finally {
    loading.value = false
    setTimeout(() => window.print(), 400)
  }
})

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDateShort(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Grade config
const gradeConfig: Record<string, { label: string, comment: string }> = {
  A: { label: 'Good', comment: 'Maintain good oral hygiene and routine dental examination.' },
  B: { label: 'Fair', comment: 'Dental cleaning and routine dental care are recommended.' },
  C: { label: 'Needs Treatment', comment: 'Dental treatment is required. Please consult a dentist.' },
  D: { label: 'Urgent Treatment', comment: 'Immediate dental evaluation and treatment are recommended.' }
}

const vital = computed(() => ({
  rm: data.value?.patientId ?? '-',
  name: data.value?.patientName ?? '-',
  gender: data.value?.gender ?? '-',
  dob: data.value?.dob ? new Date(data.value.dob).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
  age: data.value?.age != null ? `${data.value.age} th` : '-',
  examDate: formatDate(data.value?.examDate ?? null),
  queueNo: data.value?.queueCode ?? '-',
}))
</script>

<template>
  <div class="dental-print">
    <!-- Loading -->
    <div v-if="loading" class="flex min-h-screen items-center justify-center">
      <p>Memuat laporan...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-screen items-center justify-center">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else-if="data">
      <div class="page">
        <!-- ═══════ HEADER ═══════ -->
        <header class="header">
          <div class="brand">
            <img class="brand-logo" src="/logo.png" alt="Logo" />
            <div>
              <h1>DENTAL EXAMINATION REPORT</h1>
              <p>Medical Check-Up &bull; Dental Department</p>
            </div>
          </div>
          <div class="report-meta">
            <strong>Report No.</strong> {{ data.examCode }}<br>
            <strong>Exam Date</strong> {{ formatDateShort(data.examDate) }}<br>
            <strong>Type</strong> MCU
          </div>
        </header>

        <!-- ═══════ PATIENT INFO ═══════ -->
        <section class="section">
          <div class="section-title">Patient Information</div>
          <div class="info-grid">
            <div class="info-row"><div class="label">No. RM</div><div>:</div><div class="value">{{ vital.rm }}</div></div>
            <div class="info-row"><div class="label">Queue No.</div><div>:</div><div class="value">{{ vital.queueNo }}</div></div>
            <div class="info-row"><div class="label">Patient Name</div><div>:</div><div class="value">{{ vital.name }}</div></div>
            <div class="info-row"><div class="label">Gender</div><div>:</div><div class="value">{{ vital.gender }}</div></div>
            <div class="info-row"><div class="label">Date of Birth</div><div>:</div><div class="value">{{ vital.dob }} ({{ vital.age }})</div></div>
            <div class="info-row"><div class="label">Examination</div><div>:</div><div class="value">Dental MCU</div></div>
          </div>
        </section>

        <!-- ═══════ CLINICAL FINDINGS ═══════ -->
        <section class="section">
          <div class="section-title">Clinical Findings</div>
          <div class="clinical-grid">
            <div class="clinical-card">
              <h3>Extra Oral</h3>
              <p>
                <span v-if="data.extraOral.includes('Normal')" class="status">NORMAL</span>
                {{ data.extraOral.filter(v => v !== 'Normal').join(', ') || 'No significant abnormality detected.' }}
                <span v-if="data.extraOralNote">— {{ data.extraOralNote }}</span>
              </p>
            </div>
            <div class="clinical-card">
              <h3>Intra Oral</h3>
              <p>
                <span v-if="data.intraOral.includes('Normal')" class="status">NORMAL</span>
                {{ data.intraOral.filter(v => v !== 'Normal').join(', ') || 'No significant abnormality detected.' }}
                <span v-if="data.intraOralNote">— {{ data.intraOralNote }}</span>
              </p>
            </div>
          </div>
        </section>

        <!-- ═══════ ODONTOGRAM ═══════ -->
        <section class="section">
          <div class="section-title">Odontogram</div>
          <div class="odontogram">
            <div class="odontogram-head">
              <span>Patient Right</span>
              <strong>FDI World Dental Federation Numbering</strong>
              <span>Patient Left</span>
            </div>

            <img class="odontogram-img" src="/odontogram.png" alt="Odontogram FDI" />

            <div class="legend">
              <span>■ Temuan</span><span>FDI Numbering</span>
            </div>
          </div>
        </section>

        <!-- ═══════ DENTAL FINDINGS TABLE ═══════ -->
        <section class="section">
          <div class="section-title">Dental Findings</div>
          <table v-if="data.findings?.length">
            <thead>
              <tr><th style="width:70px;text-align:center;">Tooth</th><th>Finding / Comment</th></tr>
            </thead>
            <tbody>
              <tr v-for="finding in data.findings" :key="finding.toothNumber">
                <td class="tooth-col">{{ finding.toothNumber }}</td>
                <td>
                  <span v-for="c in finding.conditions" :key="c" class="chip chip-sm">{{ c }}</span>
                  <span v-if="finding.note" class="td-note">{{ finding.note }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="note-card">
            <p>No dental findings.</p>
          </div>
        </section>

        <!-- ═══════ OTHER + RECOMMENDATION ═══════ -->
        <section class="section">
          <div class="bottom-grid">
            <div class="note-card">
              <h3>Other Findings</h3>
              <ul>
                <li v-for="v in (data.otherDental?.length ? data.otherDental : ['-']) " :key="v">{{ v }}</li>
              </ul>
              <p v-if="data.otherNote">{{ data.otherNote }}</p>
            </div>
            <div class="note-card">
              <h3>Final Grade &amp; Recommendation</h3>
              <p><strong>{{ data.finalGrade ?? '-' }}</strong>
                <span v-if="data.finalGrade && gradeConfig[data.finalGrade]?.label" class="chip">{{ gradeConfig[data.finalGrade]?.label }}</span>
              </p>
              <p>{{ data.doctorComment || (data.finalGrade ? (gradeConfig[data.finalGrade]?.comment ?? '-') : '-') }}</p>
            </div>
          </div>
        </section>

        <!-- ═══════ FOOTER ═══════ -->
        <footer class="footer">
          <div class="foot-note">
            This report is part of the patient's Medical Check-Up record. Dental findings should be
            correlated with clinical examination and follow-up evaluation where required.
          </div>
          <div class="signature">
            <div>Jakarta, {{ formatDate(data.examDate) }}</div>
            <div class="space"></div>
            <div class="name">Dokter Gigi</div>
            <div>( ______________________ )</div>
          </div>
        </footer>
      </div>
    </template>

    <!-- Print button (hidden when printing) -->
    <button v-if="!loading && data" class="print-btn" onclick="window.print()">
      Print / Cetak
    </button>
  </div>
</template>

<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #eef1f4; font-family: Arial, Helvetica, sans-serif; color: #1f2937; }

.dental-print { min-height: 100vh; }
.page {
  width: 210mm; min-height: 297mm; margin: 18px auto; padding: 14mm 15mm 13mm;
  background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,.08);
}

/* ═══ HEADER ═══ */
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #163a5f; padding-bottom: 12px; margin-bottom: 16px; }
.brand { display: flex; gap: 12px; align-items: center; }
.brand-logo { width: 46px; height: 46px; border-radius: 10px; object-fit: contain; background: #fff; }
.brand h1 { margin: 0; font-size: 20px; letter-spacing: .2px; color: #163a5f; }
.brand p { margin: 4px 0 0; font-size: 10px; color: #6b7280; }
.report-meta { text-align: right; font-size: 10px; color: #6b7280; line-height: 1.55; }

/* ═══ SECTION ═══ */
.section { margin-top: 14px; }
.section-title { font-size: 11px; font-weight: 700; color: #163a5f; text-transform: uppercase; letter-spacing: .7px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.section-title::after { content: ""; height: 1px; background: #d8dee6; flex: 1; }

/* ═══ INFO ═══ */
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; border: 1px solid #dce2e8; border-radius: 10px; padding: 12px 14px; background: #fbfcfd; }
.info-row { display: grid; grid-template-columns: 90px 8px 1fr; gap: 4px; font-size: 10px; line-height: 1.45; }
.info-row .label { color: #6b7280; }
.info-row .value { font-weight: 600; color: #111827; }

/* ═══ CLINICAL ═══ */
.clinical-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.clinical-card { border: 1px solid #dce2e8; border-radius: 10px; padding: 10px 12px; min-height: 66px; }
.clinical-card h3 { margin: 0 0 7px; font-size: 10px; color: #163a5f; }
.clinical-card p { margin: 0; font-size: 10px; line-height: 1.5; }
.status { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; background: #edf7f1; color: #1f7a4c; margin-right: 4px; }

/* ═══ ODONTOGRAM ═══ */
.odontogram { border: 1px solid #dce2e8; border-radius: 12px; padding: 10px 12px 8px; background: #fff; overflow: hidden; }
.odontogram-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9px; color: #6b7280; }
.odontogram-img { width: 100%; max-height: 310px; object-fit: contain; display: block; margin: 0 auto; }
.legend { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 5px; font-size: 8px; color: #6b7280; }
.legend span { padding: 2px 6px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fafafa; }

/* ═══ TABLE ═══ */
table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
thead th { background: #163a5f; color: #fff; font-weight: 700; padding: 7px 8px; text-align: left; }
tbody td { border-bottom: 1px solid #e5e7eb; padding: 7px 8px; vertical-align: top; }
.tooth-col { width: 68px; text-align: center; font-weight: 700; color: #163a5f; }
.td-note { display: block; margin-top: 3px; font-style: italic; color: #475569; }

/* ═══ BOTTOM ═══ */
.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.note-card { border: 1px solid #dce2e8; border-radius: 10px; padding: 10px 12px; min-height: 92px; }
.note-card h3 { margin: 0 0 6px; color: #163a5f; font-size: 10px; }
.note-card ul { margin: 0; padding-left: 16px; font-size: 9.5px; line-height: 1.55; }
.note-card p { margin: 0; font-size: 9.5px; line-height: 1.55; }

/* ═══ CHIP ═══ */
.chip { display: inline-block; padding: 2px 6px; border-radius: 999px; font-size: 9px; font-weight: 600; background: #eff6ff; color: #1d4ed8; }
.chip-sm { font-size: 8px; margin-right: 3px; }

/* ═══ FOOTER ═══ */
.footer { margin-top: 18px; padding-top: 12px; border-top: 1px solid #dce2e8; display: flex; justify-content: space-between; align-items: flex-end; }
.foot-note { width: 58%; font-size: 8px; color: #9ca3af; line-height: 1.45; }
.signature { width: 36%; text-align: center; font-size: 9px; }
.signature .space { height: 42px; }
.signature .name { font-weight: 700; text-decoration: underline; margin-bottom: 3px; }

/* ═══ PRINT ═══ */
.print-btn { position: fixed; bottom: 24px; right: 24px; background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 50; }
@media print {
  body { background: #fff !important; }
  .page { margin: 0; width: auto; min-height: auto; box-shadow: none; padding: 0; }
  .print-btn { display: none !important; }
  .section { break-inside: avoid; }
  .chart-group { break-inside: avoid; }
}
</style>
