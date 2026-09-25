// app/composables/mr/useMrPrintHtml.ts
// Bangun HTML cetak "Hasil Medical Check Up" (gaya hasil_cetak_mcu.html) dari data MR FO.
// Dipakai MrMcuDetail.vue: render → buka window baru → print (auto-flow, multi-halaman).

import type { DoctorResultResponse, DoctorResultDepartment, DoctorResultItem } from '~/types/doctor-result'
import type { MedicalReportDetail } from '~/types/medical-report'
import { extractBranchCity } from '~/composables/questionnaire/useQuestionnairePrint'

type CompanyHistory = {
  company?: string | null
  position?: string | null
} | null

export type MrPrintPayload = {
  medicalReport: MedicalReportDetail
  doctorResult: DoctorResultResponse | null
  companyHistory: CompanyHistory
  doctorName: string | null
  branchName: string | null
  logoUrl: string
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return esc(value)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function ageText(dob?: string | null): string {
  if (!dob) return '-'
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return '-'
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return `${age} Tahun`
}

function genderText(g?: string | null): string {
  if (g === 'MALE') return 'Laki-laki'
  if (g === 'FEMALE') return 'Perempuan'
  return '-'
}

function normalRange(item: DoctorResultItem): string {
  if (item.normalMin == null && item.normalMax == null) return '-'
  if (item.normalMin != null && item.normalMax != null) return `${item.normalMin} – ${item.normalMax}`
  if (item.normalMin != null) return `≥ ${item.normalMin}`
  return `≤ ${item.normalMax}`
}

function resultText(item: DoctorResultItem): string {
  const value = item.displayValue ?? item.resultValue ?? '-'
  return item.uom ? `${value} ${item.uom}` : String(value)
}

function flagLabel(flag?: string | null): string {
  const f = String(flag || 'normal').toLowerCase()
  if (f === 'normal') return 'Normal'
  if (f === 'increase') return 'Tinggi'
  if (f === 'decrease') return 'Rendah'
  return 'Abnormal'
}

function flagClass(flag?: string | null): string {
  return String(flag || 'normal').toLowerCase() === 'normal' ? '' : 'status-alert'
}

function extractCity(branchName?: string | null): string {
  return extractBranchCity(branchName)
}

export function buildMrPrintHtml(payload: MrPrintPayload): string {
  const { medicalReport: mr, doctorResult: dr, companyHistory, doctorName, branchName, logoUrl } = payload

  const patientName = dr?.patient?.name || mr?.patient?.name || '-'
  const patientCode = dr?.patient?.patientId || mr?.patient?.PatientId || '-'
  const gender = genderText(dr?.patient?.gender || mr?.patient?.gender)
  const dob = mr?.patient?.dob || null
  const age = dr?.patient?.age != null && dr?.patient?.age !== ''
    ? `${dr?.patient?.age} Tahun`
    : ageText(dob)
  const examDate = dr?.patient?.examDate || mr?.examDate || null
  const regNumber = mr?.queueCode || '-'
  const company = companyHistory?.company || dr?.patient?.company || mr?.companyName || '-'
  const position = companyHistory?.position || '-'
  const packageName = dr?.patient?.package || '-'

  const fitness = mr?.meta?.fitnessLevel || dr?.submission?.fitnessLevel || '-'
  const finalComment = mr?.meta?.finalComment || dr?.submission?.finalComment || '-'
  const internalNote = mr?.meta?.internalNote || ''

  const departments: DoctorResultDepartment[] = dr?.departments ?? []
  const byCode = (re: RegExp) => departments.filter(d => re.test(d.departmentCode))
  const nurseItems = byCode(/NURSE/i).flatMap(d => d.groups.flatMap(g => g.items))
  const physicalItems = byCode(/^DOK/i).flatMap(d => d.groups.flatMap(g => g.items))
  const labItems = byCode(/LAB/i).flatMap(d => d.groups.flatMap(g => [{ group: g.groupName, items: g.items }]))
  const supportDepts = departments.filter(d => !/NURSE|^DOK|LAB/i.test(d.departmentCode))

  const vitalsHtml = nurseItems.length
    ? nurseItems.map(item => `
      <div class="vital-box">
        <div class="vital-label">${esc(item.inputanLabel)}</div>
        <div class="vital-value">${esc(resultText(item))}</div>
      </div>`).join('')
    : '<p class="muted">Tidak ada data.</p>'

  const physicalRows = physicalItems.length
    ? physicalItems.map(item => `
      <tr>
        <td>${esc(item.inputanLabel)}</td>
        <td><span class="status-badge ${flagClass(item.flag)}">${esc(resultText(item))}</span></td>
        <td>${esc(item.comment || flagLabel(item.flag))}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" class="muted">Tidak ada data.</td></tr>'

  const labRows = labItems.length
    ? labItems.map(group => group.items.map(item => `
      <tr>
        <td>${esc(group.group ? `${group.group} · ` : '')}${esc(item.inputanLabel)}</td>
        <td>${esc(item.displayValue ?? item.resultValue ?? '-')}</td>
        <td>${esc(item.uom || '-')}</td>
        <td>${esc(normalRange(item))}</td>
        <td><span class="status-badge ${flagClass(item.flag)}">${esc(flagLabel(item.flag))}</span></td>
      </tr>`).join('')).join('')
    : '<tr><td colspan="5" class="muted">Tidak ada data.</td></tr>'

  const supportRows = supportDepts.length
    ? supportDepts.flatMap(d => d.groups.map(group => group.items.map(item => `
      <tr>
        <td>${esc(item.inputanLabel)}</td>
        <td>${esc(resultText(item))}</td>
        <td>${esc(d.departmentName)} — ${esc(group.groupName)}</td>
      </tr>`).join('')).join('')).join('')
    : '<tr><td colspan="3" class="muted">Tidak ada data.</td></tr>'

  const city = extractCity(branchName)

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Hasil Medical Check Up - ${esc(patientName)}</title>
<style>
  @page {
    size: A4;
    margin: 14mm 16mm;
    @bottom-right { content: "Halaman " counter(page) " dari " counter(pages); font-size: 8.5pt; color: #64748b; }
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #263746;
    font-size: 10pt;
    line-height: 1.5;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 12px;
    padding: 18mm 18mm 12mm;
    background: #fff;
    border: 1px solid rgba(0,0,0,.12);
    box-shadow: 0 4px 12px rgba(0,0,0,.05);
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #173b5c; padding-bottom: 12px; margin-bottom: 16px; }
  .brand-group { display: flex; align-items: center; gap: 12px; }
  .brand-logo { width: 48px; height: 48px; object-fit: contain; }
  .brand-text h1 { margin: 0; font-size: 16pt; color: #173b5c; }
  .brand-text p { margin: 0; font-size: 9pt; color: #5c7285; }
  .doc-title { text-align: right; }
  .doc-title h2 { margin: 0; font-size: 14pt; color: #173b5c; letter-spacing: 1px; }
  .doc-title p { margin: 2px 0 0; font-size: 9.5pt; color: #718096; }
  .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f4f7fa; border: 1px solid #dce5ed; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
  .info-row { display: flex; font-size: 10pt; margin-bottom: 4px; }
  .info-label { width: 110px; color: #64748b; font-weight: 600; }
  .info-value { flex: 1; font-weight: 700; color: #1e293b; }
  .result-banner { background: #eaf8f1; border: 1px solid #c8eadb; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 20px; }
  .result-banner h3 { margin: 0 0 4px; color: #16845b; font-size: 16pt; text-transform: uppercase; }
  .result-banner p { margin: 0; color: #176c4d; font-size: 10.5pt; }
  .section-title { font-size: 11.5pt; color: #173b5c; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 16px 0 10px; font-weight: bold; break-after: avoid; page-break-after: avoid; }
  .mr-section { break-before: page; page-break-before: always; }
  .mr-section:first-of-type { break-before: auto; page-break-before: auto; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 9.5pt; vertical-align: top; }
  th { background: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 8.5pt; letter-spacing: .5px; }
  .status-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 8.5pt; font-weight: bold; background: #eaf8f1; color: #16845b; }
  .status-alert { background: #fef2f2; color: #b91c1c; }
  .vitals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .vital-box { border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 4px; }
  .vital-label { font-size: 8.5pt; color: #64748b; margin-bottom: 2px; }
  .vital-value { font-size: 10.5pt; font-weight: bold; color: #0f172a; }
  .conclusion-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; }
  .signature-area { display: flex; justify-content: flex-end; margin-top: 24px; break-inside: avoid; page-break-inside: avoid; }
  .signature-box { text-align: center; width: 250px; }
  .signature-date { font-size: 9.5pt; color: #475569; margin-bottom: 12px; }
  .signature-line { font-family: 'Times New Roman', serif; font-size: 16pt; font-style: italic; color: #173b5c; margin: 16px 0; border-bottom: 1px solid #cbd5e1; display: inline-block; padding: 0 24px; }
  .signature-name { font-weight: bold; font-size: 10pt; color: #1e293b; margin: 0; }
  .signature-role { font-size: 9pt; color: #64748b; margin: 0; }
  .muted { color: #94a3b8; font-style: italic; }
  .page-footer { display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 18px; }
  .print-frame { width: 100%; border-collapse: collapse; margin: 0; }
  .print-frame > thead > tr > th,
  .print-frame > tfoot > tr > th,
  .print-frame > tbody > tr > td { border: 0; padding: 0; background: transparent; text-transform: none; letter-spacing: normal; }
  .print-frame > thead > tr > th { padding-bottom: 10px; }
  .print-frame > tbody > tr > td { vertical-align: top; }
  @media print {
    body { padding: 0; background: none; }
    .page { width: auto; min-height: auto; margin: 0; border: none; box-shadow: none; padding: 0; }
    *, *::before, *::after { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="page">
    <table class="print-frame">
      <thead>
        <tr><th>
          <div class="header">
            <div class="brand-group">
              <img class="brand-logo" src="${esc(logoUrl)}" alt="Logo">
              <div class="brand-text">
                <h1>Kyoai Medical Services</h1>
                <p>Klinik Utama &amp; Laboratorium Klinik</p>
              </div>
            </div>
            <div class="doc-title">
              <h2>HASIL MEDICAL CHECK UP</h2>
              <p>No. Registrasi: ${esc(regNumber)}</p>
            </div>
          </div>
        </th></tr>
      </thead>
      <tbody>
        <tr><td>

    <div class="patient-info">
      <div>
        <div class="info-row"><div class="info-label">Nama Pasien</div><div class="info-value">: ${esc(patientName)}</div></div>
        <div class="info-row"><div class="info-label">Jenis Kelamin</div><div class="info-value">: ${esc(gender)}</div></div>
        <div class="info-row"><div class="info-label">Tanggal Lahir</div><div class="info-value">: ${esc(formatDate(dob))} (${esc(age)})</div></div>
        <div class="info-row"><div class="info-label">Tanggal MCU</div><div class="info-value">: ${esc(formatDate(examDate))}</div></div>
      </div>
      <div>
        <div class="info-row"><div class="info-label">Perusahaan</div><div class="info-value">: ${esc(company)}</div></div>
        <div class="info-row"><div class="info-label">Jabatan</div><div class="info-value">: ${esc(position)}</div></div>
        <div class="info-row"><div class="info-label">Paket</div><div class="info-value">: ${esc(packageName)}</div></div>
        <div class="info-row"><div class="info-label">No. RM</div><div class="info-value">: ${esc(patientCode)}</div></div>
      </div>
    </div>

    <div class="result-banner">
      <h3>✓ ${esc(fitness)}</h3>
      <p>${esc(finalComment)}</p>
    </div>

    <section class="mr-section">
      <div class="section-title">1. Pemeriksaan Awal (Tanda Vital)</div>
      <div class="vitals-grid">${vitalsHtml}</div>
    </section>

    <section class="mr-section">
      <div class="section-title">2. Pemeriksaan Fisik</div>
      <table>
        <thead><tr><th style="width:35%">Pemeriksaan</th><th style="width:20%">Hasil</th><th style="width:45%">Keterangan</th></tr></thead>
        <tbody>${physicalRows}</tbody>
      </table>
    </section>

    <section class="mr-section">
      <div class="section-title">3. Pemeriksaan Laboratorium</div>
      <table>
        <thead><tr><th style="width:32%">Jenis Pemeriksaan</th><th style="width:18%">Hasil</th><th style="width:12%">Satuan</th><th style="width:23%">Nilai Rujukan</th><th style="width:15%">Status</th></tr></thead>
        <tbody>${labRows}</tbody>
      </table>
    </section>

    <section class="mr-section">
      <div class="section-title">4. Pemeriksaan Penunjang Medik</div>
      <table>
        <thead><tr><th style="width:35%">Jenis Pemeriksaan</th><th style="width:25%">Kesan / Hasil</th><th style="width:40%">Keterangan</th></tr></thead>
        <tbody>${supportRows}</tbody>
      </table>
    </section>

    <section class="mr-section">
      <div class="section-title">5. Kesimpulan &amp; Saran Dokter</div>
      <div class="conclusion-box">
        <p style="margin-top:0"><strong>Catatan:</strong><br>${esc(finalComment)}</p>
        ${internalNote ? `<p style="margin-bottom:0"><strong>Catatan Internal:</strong><br>${esc(internalNote)}</p>` : ''}
      </div>

      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-date">${esc(city)}${city ? ', ' : ''}${esc(formatDate(examDate))}</div>
          <div class="signature-line">${esc(doctorName || '-')}</div>
          <p class="signature-name">${esc(doctorName || '-')}</p>
          <p class="signature-role">Dokter Pemeriksa</p>
        </div>
      </div>
    </section>

        </td></tr>
      </tbody>
      <tfoot>
        <tr><th>
          <div class="page-footer">
            <span>No. Registrasi: ${esc(regNumber)} | Kyoai Medical Services</span>
            <span>${esc(patientName)}</span>
          </div>
        </th></tr>
      </tfoot>
    </table>
  </div>
</body>
</html>`
}
