// app/composables/questionnaire/useQuestionnaireResultPrint.ts
// Print hasil questionnaire (template Frappe-like + fallback layout bawaan paper-document).
// Dipakai bersama oleh /front-office/questionnaire-results & detail registration-patient.

import type { PrintAnswer } from '~/composables/questionnaire/useQuestionnairePrint'
import {
  buildQuestionnairePrintContext,
  documentImageCss,
  extractBranchCity,
  extractTemplateLogo,
  extractTemplateStyles,
  normalizeTemplateLogo,
  pageSetupCss,
  printHeaderCss,
  printHeaderHtml,
  renderQuestionnaireTemplate,
  wrapDocumentImage
} from '~/composables/questionnaire/useQuestionnairePrint'

export type QuestionnairePrintRow = {
  questionnaire_name: string
  patientName: string
  patientGender?: string | null
  patientDob?: string | null
  patientAge?: number | null
  patientMaritalStatus?: string | null
  patientPhone?: string | null
  patientAddress?: string | null
  patientPosition?: string | null
  patientCode?: string | null
  registrationRef?: string | null
  companyName?: string | null
  branchName?: string | null
  examDate?: string | null
  questionnaire_image?: string | null
  print_template?: string | null
  answers?: Array<PrintAnswer & { answered?: boolean }>
}

export function questionnaireDocumentLogoUrl(): string {
  if (!import.meta.client) return '/logo.png'
  return new URL('/logo.png', window.location.origin).toString()
}

function fmtLongDate(value?: string | null): string {
  if (!value) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim())
  if (m) {
    const parsed = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    }
  }
  return value
}

function genderLabel(g?: string | null): string {
  if (!g) return '-'
  if (g === 'MALE') return 'Laki-laki'
  if (g === 'FEMALE') return 'Perempuan'
  return g
}

function maritalLabel(m?: string | null): string {
  if (!m) return '-'
  const map: Record<string, string> = {
    SINGLE: 'Belum Menikah',
    MARRIED: 'Menikah',
    DIVORCED: 'Cerai',
    WIDOWED: 'Janda/Duda'
  }
  return map[m] ?? m
}

const PRINT_CSS = `
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
  body { background-color: #f0f2f5; margin: 0; padding: 20px; }
  .document-page { background: white; width: 100%; max-width: 800px; margin: 0 auto; padding: 30px 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
  h1 { text-align: center; font-size: 15px; font-weight: bold; text-decoration: underline; margin-top: 0; margin-bottom: 25px; text-transform: uppercase; }
  .section-title { font-weight: bold; text-decoration: underline; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; }
  .section-subtitle { font-weight: bold; margin-top: 10px; margin-bottom: 6px; }
  .data-diri-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  .data-diri-table td { padding: 2px 0; vertical-align: top; }
  .data-diri-table td.label { width: 180px; }
  .data-diri-table td.colon { width: 15px; }
  .question-list { margin: 0; padding-left: 20px; }
  .question-item { margin-bottom: 6px; line-height: 1.3; }
  .answer { font-weight: bold; }
  .flex-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .signature-area { margin-top: 40px; text-align: right; padding-right: 40px; }
  .signature-space { height: 60px; }
  .sign-ttd { text-align: center; margin-right: -40px; }
  .sign-name { text-align: center; margin-right: -40px; }
  .consent-section { margin-top: 20px; line-height: 1.3; }
  .consent-signature { page-break-inside: avoid; break-inside: avoid; }
  .consent-list { margin: 5px 0 0 0; padding-left: 20px; }
  .consent-list li { margin-bottom: 5px; }
  .document-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 5px; border-top: 1px solid #d9dee7; color: #6b7280; font-size: 7.5pt; page-break-inside: avoid; }
  @media print {
    body { background-color: white; padding: 0; }
    .document-page { box-shadow: none; padding: 20px; width: 100%; max-width: 100%; }
    h1 { display: none; }
  }
  @media screen { h1 { display: none; } }
`

function legacyPrintHtml(row: QuestionnairePrintRow): string {
  const answers = (row.answers ?? []).filter(a => a.answered === true)
  const questionsHtml = answers.length
    ? answers.map(a => `
        <li class="question-item">
          <div class="flex-row">
            <span>${a.questionText}</span>
            <span class="answer">${a.answerText != null && a.answerText !== '' ? a.answerText : (a.optionText || a.optionId || '-')}</span>
          </div>
        </li>
      `).join('')
    : ''

  const docContent = `
              <div class="document-page">
                <div class="section-title">DATA DIRI</div>
          <table class="data-diri-table">
            <tr><td class="label">Nama Lengkap</td><td class="colon">:</td><td>${row.patientName} &nbsp;&nbsp;&nbsp; ( ${genderLabel(row.patientGender)} )</td></tr>
            <tr><td class="label">Tgl, Bln, Tahun Lahir</td><td class="colon">:</td><td>${row.patientDob ? fmtLongDate(row.patientDob) : '-'} &nbsp;&nbsp;&nbsp; ( Umur : ${row.patientAge != null ? `${row.patientAge} Tahun` : '-'} )</td></tr>
            <tr><td class="label">Perusahaan</td><td class="colon">:</td><td>${row.companyName || '-'}</td></tr>
            <tr><td class="label">Status Pernikahan</td><td class="colon">:</td><td>${maritalLabel(row.patientMaritalStatus)}</td></tr>
            <tr><td class="label">Alamat Rumah</td><td class="colon">:</td><td>${row.patientAddress || '-'}</td></tr>
            <tr><td class="label">Telepon</td><td class="colon">:</td><td>${row.patientPhone || '-'}</td></tr>
            <tr><td class="label">Posisi Pekerjaan</td><td class="colon">:</td><td>${row.patientPosition || '-'}</td></tr>
            <tr><td class="label">No. RM / Registrasi</td><td class="colon">:</td><td>${row.patientCode || '-'} / ${row.registrationRef}</td></tr>
          </table>

          ${questionsHtml
            ? `<div class="section-title">ISILAH PERTANYAAN DIBAWAH DENGAN SEBENARNYA</div>
          <ol class="question-list">
            ${questionsHtml}
          </ol>

          <div class="consent-signature">
            <div class="consent-section">
              <strong>Isian diatas telah saya isi dengan sadar dan benar</strong><br>
              <strong>Dengan menandatangani surat untuk melakukan MCU ini, saya memberikan izin kepada:</strong>
              <ol class="consent-list">
                <li><strong>Pemeriksa kesehatan tersebut diatas untuk melakukan pemeriksaan kesehatan dengan komponen yang telah ditentukan dan mengolah hasil pemeriksaan kesehatan tersebut</strong></li>
                <li><strong>Memberikan hasil pemeriksaan tersebut kepada bagian HRD / Dokter perusahaan tempat saya bekerja atau akan bekerja, untuk disimpan dan dikelola pada fasilitas perusahaan (Jika MCU difasilitasi oleh perusahaan)</strong></li>
              </ol>
            </div>

            <div class="signature-area">
              <div class="sign-city">${extractBranchCity(row.branchName).toUpperCase()}${row.branchName ? ', ' : ''}${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div class="signature-space"></div>
              <div class="sign-ttd">( ttd )</div>
              <div class="sign-name">${row.patientName}</div>
            </div>
          </div>

          <div class="document-footer">
            <div>${row.patientName} &nbsp;|&nbsp; ${row.patientCode || '-'}</div>
          </div>`
            : '<div>Belum ada jawaban tersimpan.</div>'}
              </div>`

  const sideImageCss = row.questionnaire_image ? documentImageCss() : ''
  return `
    <html lang="id">
      <head>
        <title>${row.questionnaire_name} - ${row.patientName}</title>
        <style>${PRINT_CSS}${printHeaderCss()}${sideImageCss}${pageSetupCss(row.patientName, row.patientCode || '-')}</style>
      </head>
      <body>
        <table class="printwrap">
          <thead>
            <tr><th>${printHeaderHtml({ documentTitle: row.questionnaire_name, patientName: row.patientName, patientCode: row.patientCode || '-', logoUrl: questionnaireDocumentLogoUrl() })}</th></tr>
          </thead>
          <tbody>
            <tr><td>
              ${wrapDocumentImage(docContent, row.questionnaire_image)}
            </td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `
}

function templatePrintHtml(row: QuestionnairePrintRow, tpl: string): string {
  const ctx = buildQuestionnairePrintContext({
    documentTitle: row.questionnaire_name,
    patientName: row.patientName,
    patientGender: row.patientGender,
    patientDob: row.patientDob,
    patientAge: row.patientAge,
    patientMaritalStatus: row.patientMaritalStatus,
    patientPhone: row.patientPhone,
    patientAddress: row.patientAddress,
    patientPosition: row.patientPosition,
    patientCode: row.patientCode,
    registrationRef: row.registrationRef,
    companyName: row.companyName,
    branchName: row.branchName,
    examDate: row.examDate,
    image: row.questionnaire_image,
    answers: (row.answers ?? []).map(a => ({
      questionId: a.questionId,
      questionText: a.questionText,
      questionType: a.questionType,
      sectionTitle: a.sectionTitle,
      optionId: a.optionId,
      optionText: a.optionText,
      answerText: a.answerText,
      answered: a.answered
    }))
  })
  const { styles, body } = extractTemplateStyles(tpl)
  const logoUrl = extractTemplateLogo(tpl) || questionnaireDocumentLogoUrl()
  ctx.logoUrl = logoUrl
  const rendered = renderQuestionnaireTemplate(normalizeTemplateLogo(body, logoUrl), ctx as Record<string, unknown>)
  const headerCtx = {
    documentTitle: ctx.documentTitle,
    patientName: ctx.patientName,
    patientCode: ctx.patientCode,
    logoUrl: ctx.logoUrl
  }
  const pageCss = pageSetupCss(ctx.patientName, ctx.patientCode)
  const sideImageCss = ctx.image ? documentImageCss() : ''
  const content = wrapDocumentImage(`<div class="document-page">
                ${rendered}
              </div>`, ctx.image)
  return `
    <html lang="id">
      <head>
        <title>${ctx.documentTitle} - ${ctx.patientName}</title>
        <style>${PRINT_CSS}</style>
        ${styles}
        <style>${printHeaderCss()}</style>
        <style>${sideImageCss}</style>
        <style>${pageCss}</style>
      </head>
      <body>
        <table class="printwrap">
          <thead>
            <tr><th>${printHeaderHtml(headerCtx)}</th></tr>
          </thead>
          <tbody>
            <tr><td>
              ${content}
            </td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `
}

export function buildQuestionnaireResultHtml(row: QuestionnairePrintRow): string {
  const tpl = row.print_template?.trim()
  return tpl ? templatePrintHtml(row, tpl) : legacyPrintHtml(row)
}

export function printQuestionnaireResult(row: QuestionnairePrintRow): boolean {
  if (!import.meta.client) return false
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  printWindow.document.write(buildQuestionnaireResultHtml(row))
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
  return true
}
