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
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// ── Dental chart helpers ─────────────────────────────────────────────
const permanentUpper = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']
const permanentLower = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']
const primaryUpper = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65']
const primaryLower = ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75']

function splitHalf(arr: string[]): [string[], string[]] {
  const mid = arr.length / 2
  return [arr.slice(0, mid), arr.slice(mid)]
}

function findingConditions(tooth: string): string[] {
  return data.value?.findings?.find(f => f.toothNumber === tooth)?.conditions ?? []
}

function hasFinding(tooth: string): boolean {
  return data.value?.findings?.some(f => f.toothNumber === tooth && f.conditions.length > 0) ?? false
}

// Grade config
const gradeConfig: Record<string, { label: string, comment: string }> = {
  A: { label: 'Good', comment: 'Maintain good oral hygiene and routine dental examination.' },
  B: { label: 'Fair', comment: 'Dental cleaning and routine dental care are recommended.' },
  C: { label: 'Needs Treatment', comment: 'Dental treatment is required. Please consult a dentist.' },
  D: { label: 'Urgent Treatment', comment: 'Immediate dental evaluation and treatment are recommended.' }
}
</script>

<template>
  <div class="print-page">
    <!-- Loading -->
    <div v-if="loading" class="flex min-h-screen items-center justify-center">
      <p>Memuat laporan...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-screen items-center justify-center">
      <p class="text-red-600">
        {{ error }}
      </p>
    </div>

    <!-- Content -->
    <template v-else-if="data">
      <!-- ═══════ HEADER ═══════ -->
      <header class="print-header">
        <div class="header-left">
          <h1>Laporan Pemeriksaan Gigi</h1>
          <p class="subtitle">
            {{ data.item?.name ?? 'Pemeriksaan Gigi' }} · Departemen Dental
          </p>
        </div>
        <div class="header-right">
          <div class="label">
            Exam Code
          </div>
          <div class="value mono">
            {{ data.examCode }}
          </div>
          <div class="label mt">
            Queue No.
          </div>
          <div class="value">
            {{ data.queueCode }}
          </div>
        </div>
      </header>

      <!-- ═══════ PATIENT INFO ═══════ -->
      <section class="section">
        <h2>Data Pasien</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Nama</span>
            <span class="value">{{ data.patientName }}</span>
          </div>
          <div class="info-item">
            <span class="label">Pasien ID</span>
            <span class="value">{{ data.patientId ?? '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Umur</span>
            <span class="value">{{ data.age != null ? `${data.age} th` : '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Tanggal</span>
            <span class="value">{{ formatDate(data.examDate) }}</span>
          </div>
        </div>
      </section>

      <!-- ═══════ ORAL EXAMINATION ═══════ -->
      <section class="section">
        <h2>Oral Examination</h2>
        <div class="two-col">
          <div class="card">
            <h3>Extra Oral</h3>
            <div class="chips">
              <span v-for="v in data.extraOral" :key="v" class="chip">{{ v }}</span>
              <span v-if="!data.extraOral.length" class="empty">-</span>
            </div>
            <p v-if="data.extraOralNote" class="note">
              {{ data.extraOralNote }}
            </p>
          </div>
          <div class="card">
            <h3>Intra Oral</h3>
            <div class="chips">
              <span v-for="v in data.intraOral" :key="v" class="chip">{{ v }}</span>
              <span v-if="!data.intraOral.length" class="empty">-</span>
            </div>
            <p v-if="data.intraOralNote" class="note">
              {{ data.intraOralNote }}
            </p>
          </div>
        </div>
      </section>

      <!-- ═══════ DENTAL CHART ═══════ -->
      <section class="section">
        <h2>Dental Chart</h2>

        <!-- PERMANENT TEETH (32 Teeth) -->
        <div class="chart-group">
          <h3 class="chart-group-title">
            Permanent Teeth (32 Teeth)
          </h3>

          <!-- Upper -->
          <div class="chart-row">
            <div class="chart-half">
              <button
                v-for="tooth in splitHalf(permanentUpper)[0]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
            <div class="chart-divider" />
            <div class="chart-half">
              <button
                v-for="tooth in splitHalf(permanentUpper)[1]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
          </div>

          <!-- Lower -->
          <div class="chart-row">
            <div class="chart-half">
              <button
                v-for="tooth in splitHalf(permanentLower)[0]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
            <div class="chart-divider" />
            <div class="chart-half">
              <button
                v-for="tooth in splitHalf(permanentLower)[1]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- PRIMARY TEETH (20 Teeth) -->
        <div class="chart-group">
          <h3 class="chart-group-title">
            Primary Teeth (20 Teeth)
          </h3>

          <!-- Upper -->
          <div class="chart-row">
            <div class="chart-half chart-half-5">
              <button
                v-for="tooth in splitHalf(primaryUpper)[0]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
            <div class="chart-divider" />
            <div class="chart-half chart-half-5">
              <button
                v-for="tooth in splitHalf(primaryUpper)[1]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
          </div>

          <!-- Lower -->
          <div class="chart-row">
            <div class="chart-half chart-half-5">
              <button
                v-for="tooth in splitHalf(primaryLower)[0]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
            <div class="chart-divider" />
            <div class="chart-half chart-half-5">
              <button
                v-for="tooth in splitHalf(primaryLower)[1]"
                :key="tooth"
                class="tooth-btn"
                :class="{ active: hasFinding(tooth) }"
                :title="findingConditions(tooth).join(', ')"
              >
                <span class="tooth-shape" />
                <span class="tooth-num">{{ tooth }}</span>
                <span v-if="hasFinding(tooth)" class="badge">{{ findingConditions(tooth).length }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════ DENTAL FINDINGS ═══════ -->
      <section class="section">
        <h2>Dental Findings</h2>
        <div v-if="!data.findings?.length" class="empty-box">
          Tidak ada temuan dental.
        </div>
        <div v-else class="findings-grid">
          <div
            v-for="finding in data.findings"
            :key="finding.toothNumber"
            class="finding-card"
          >
            <div class="finding-tooth">
              {{ finding.toothNumber }}
            </div>
            <div class="finding-conditions">
              <span v-for="c in finding.conditions" :key="c" class="chip chip-sm">{{ c }}</span>
            </div>
            <p v-if="finding.note" class="note">
              {{ finding.note }}
            </p>
          </div>
        </div>
      </section>

      <!-- ═══════ OTHER DENTAL ═══════ -->
      <section class="section">
        <h2>Other Dental / General Findings</h2>
        <div class="chips">
          <span v-for="v in data.otherDental" :key="v" class="chip">{{ v }}</span>
          <span v-if="!data.otherDental.length" class="empty">-</span>
        </div>
        <p v-if="data.otherNote" class="note">
          {{ data.otherNote }}
        </p>
      </section>

      <!-- ═══════ GRADE & COMMENT ═══════ -->
      <section class="section">
        <h2>Grade & Comment</h2>
        <div class="two-col">
          <div class="card">
            <div class="label">
              Suggested Grade
            </div>
            <div class="grade-big">
              {{ data.suggestedGrade ?? '-' }}
            </div>
            <span v-if="data.suggestedLabel" class="chip">{{ data.suggestedLabel }}</span>
            <p v-if="data.gradeReason" class="note">
              {{ data.gradeReason }}
            </p>
          </div>
          <div class="card">
            <div class="label">
              Final Grade
            </div>
            <div class="grade-big final">
              {{ data.finalGrade ?? '-' }}
            </div>
            <span v-if="data.finalGrade && gradeConfig[data.finalGrade]" class="chip">{{ gradeConfig[data.finalGrade].label }}</span>
          </div>
        </div>
        <div class="comment-box">
          <div class="label">
            Doctor Comment
          </div>
          <p>{{ data.doctorComment || gradeConfig[data.finalGrade ?? '']?.comment || '-' }}</p>
        </div>
      </section>

      <!-- ═══════ SIGNATURE ═══════ -->
      <footer class="print-footer">
        <span>Dicetak: {{ new Date().toLocaleString('id-ID') }}</span>
        <div class="signature">
          <span class="signature-line">Dokter Gigi,</span>
          <span class="signature-line">( ______________________ )</span>
        </div>
      </footer>
    </template>

    <!-- Print button (hidden when printing) -->
    <button
      v-if="!loading && data"
      class="print-btn"
      onclick="window.print()"
    >
      Print / Cetak
    </button>
  </div>
</template>

<style>
/* ═══════ BASE ═══════ */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #f5f5f5; }

.print-page {
  max-width: 210mm;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  min-height: 100vh;
}

/* ═══════ HEADER ═══════ */
.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid #1a1a2e;
  margin-bottom: 20px;
}
.print-header h1 { font-size: 18px; font-weight: 700; }
.subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
.header-right { text-align: right; font-size: 13px; }

/* ═══════ SECTION ═══════ */
.section { margin-bottom: 18px; }
.section h2 {
  font-size: 14px;
  font-weight: 700;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 6px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #334155;
}
.section h3 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #475569;
}

/* ═══════ LABELS & VALUES ═══════ */
.label { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; font-weight: 600; }
.value { font-size: 14px; font-weight: 600; }
.mono { font-family: 'Courier New', monospace; }
.mt { margin-top: 8px; }

/* ═══════ INFO GRID ═══════ */
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ═══════ TWO COL ═══════ */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ═══════ CARD ═══════ */
.card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

/* ═══════ CHIPS ═══════ */
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}
.chip-sm { font-size: 11px; padding: 3px 8px; }
.empty { color: #94a3b8; font-size: 13px; }
.note { color: #64748b; font-size: 12px; margin-top: 6px; }

/* ═══════ DENTAL CHART ═══════ */
.chart-group { margin-bottom: 16px; }
.chart-group-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #1a1a2e;
}
.chart-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 6px;
}
.chart-half {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  flex: 1;
}
.chart-half-5 {
  grid-template-columns: repeat(5, 1fr);
}
.chart-divider {
  width: 1px;
  background: #cbd5e1;
  margin: 0 6px;
  align-self: stretch;
}

/* ═══════ TOOTH BUTTON ═══════ */
.tooth-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: default;
}
.tooth-btn.active {
  background: #eff6ff;
  border-color: #2563eb;
}
.tooth-shape {
  width: 14px;
  height: 16px;
  border: 1.5px solid #94a3b8;
  border-radius: 40% 40% 50% 50%;
}
.tooth-num { font-size: 11px; font-weight: 700; }
.badge {
  position: absolute;
  right: -4px;
  top: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

/* ═══════ FINDINGS ═══════ */
.findings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.finding-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
}
.finding-tooth { font-size: 18px; font-weight: 800; }
.finding-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.empty-box {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

/* ═══════ GRADE ═══════ */
.grade-big { font-size: 32px; font-weight: 800; margin-top: 4px; }
.grade-big.final { color: #2563eb; }
.comment-box {
  border-left: 3px solid #2563eb;
  background: #f8fafc;
  border-radius: 0 6px 6px 0;
  padding: 12px;
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.6;
}

/* ═══════ FOOTER / SIGNATURE ═══════ */
.print-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 32px;
  padding-top: 16px;
  font-size: 12px;
  color: #64748b;
}
.signature { text-align: right; }
.signature-line { display: block; }
.signature-line:first-child { margin-bottom: 32px; }

/* ═══════ PRINT BUTTON ═══════ */
.print-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 50;
}

/* ═══════ PRINT ═══════ */
@media print {
  body { background: #fff !important; }
  .print-page { padding: 0; margin: 0; max-width: none; }
  .print-btn { display: none !important; }
  .tooth-btn { min-height: 32px; }
  .section { break-inside: avoid; }
  .chart-group { break-inside: avoid; }
}
</style>
