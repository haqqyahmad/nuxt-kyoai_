// app/composables/questionnaire/useQuestionnairePrint.ts
// Context builder questionnaire. Renderer template dipisah di app/utils/jinjaTemplate.ts.
// Data context dikumpulkan dari baris hasil questionnaire + detail jawaban.

import { renderTemplate } from '~/utils/jinjaTemplate'

export type PrintAnswer = {
  questionId: string
  questionText: string
  questionType?: string
  sectionId?: string | null
  sectionTitle?: string | null
  answerText?: string | null
  optionId?: string | null
  optionText?: string | null
  answered?: boolean
}

export type PrintSection = {
  id: string
  title: string
  questions: PrintAnswer[]
}

export type QuestionnairePrintContext = Record<string, unknown> & {
  documentTitle: string
  patientName: string
  patientGender: string
  patientDob: string
  patientAge: string
  patientMaritalStatus: string
  patientPhone: string
  patientAddress: string
  patientPosition: string
  patientCode: string
  registrationRef: string
  companyName: string
  branchName: string
  logoUrl: string
  image: string
  branchCity: string
  signatureCity: string
  signatureDate: string
  signatureLine: string
  examDate: string
  answers: PrintAnswer[]
  sections: PrintSection[]
  answeredCount: number
  totalCount: number
  now: string
}

export function renderQuestionnaireTemplate(tpl: string, ctx: Record<string, unknown>): string {
  return renderTemplate(tpl, ctx)
}

function fmtLongDate(value?: string | null): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (m) {
    const parsed = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
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

function answerValue(a: PrintAnswer): string {
  if (a.answerText != null && a.answerText !== '') return a.answerText
  if (a.optionText) return a.optionText
  if (a.optionId) return a.optionId
  return '-'
}

const KNOWN_CITIES = [
  'Jakarta', 'Cikarang', 'Karawang', 'Bekasi', 'Bogor', 'Depok', 'Tangerang',
  'Bandung', 'Semarang', 'Yogyakarta', 'Surabaya', 'Sidoarjo', 'Gresik',
  'Malang', 'Denpasar', 'Bali', 'Medan', 'Batam', 'Pekanbaru', 'Palembang',
  'Lampung', 'Makassar', 'Manado', 'Balikpapan', 'Samarinda', 'Solo'
]

export function extractBranchCity(branchName?: string | null): string {
  const raw = (branchName || '').trim()
  if (!raw) return ''
  for (const city of KNOWN_CITIES) {
    const re = new RegExp(`(^|[^A-Za-z])${city}([^A-Za-z]|$)`, 'i')
    if (re.test(raw)) return city
  }
  const segments = raw.split(' - ')
  const last = segments[segments.length - 1]?.trim() || ''
  const first = segments[0]?.trim() || ''
  return segments.length > 1 ? last : first
}

export function buildQuestionnairePrintContext(opts: {
  documentTitle?: string
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
  answers: PrintAnswer[]
  questionnaireName?: string
  logoUrl?: string | null
  image?: string | null
}): QuestionnairePrintContext {
  const answers = opts.answers.filter(a => a.answered === true)
  const total = opts.answers.length
  const branchCity = extractBranchCity(opts.branchName)
  const signatureDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const sections: PrintSection[] = []
  for (const a of answers) {
    const title = a.sectionTitle || 'Umum'
    const sec = sections.find(s => s.title === title)
    const item = { ...a, answerValue: answerValue(a) }
    if (sec) {
      sec.questions.push(item)
    } else {
      sections.push({ id: a.sectionId || '', title, questions: [item] })
    }
  }

  return {
    documentTitle: opts.documentTitle || opts.questionnaireName || 'KUESIONER MEDICAL CHECK - UP',
    patientName: opts.patientName || '-',
    patientGender: genderLabel(opts.patientGender),
    patientDob: fmtLongDate(opts.patientDob),
    patientAge: opts.patientAge != null ? `${opts.patientAge} Tahun` : '-',
    patientMaritalStatus: maritalLabel(opts.patientMaritalStatus),
    patientPhone: opts.patientPhone || '-',
    patientAddress: opts.patientAddress || '-',
    patientPosition: opts.patientPosition || '-',
    patientCode: opts.patientCode || '-',
    registrationRef: opts.registrationRef || '-',
    companyName: opts.companyName || '-',
    branchName: opts.branchName || '-',
    logoUrl: opts.logoUrl || '',
    image: opts.image || '',
    branchCity,
    signatureCity: branchCity ? branchCity.toUpperCase() : '',
    signatureDate,
    signatureLine: branchCity
      ? `${branchCity.toUpperCase()}, ${signatureDate}`
      : signatureDate,
    examDate: fmtLongDate(opts.examDate),
    answers,
    sections,
    answeredCount: answers.length,
    totalCount: total,
    now: signatureDate
  }
}

export function extractTemplateStyles(tpl: string): { styles: string, body: string } {
  let styles = ''
  const body = tpl.replace(/<style[\s\S]*?<\/style>/gi, (m) => {
    styles += m
    return ''
  })
  return { styles, body }
}

export function extractTemplateLogo(tpl: string): string {
  const m = tpl.match(/src=["'](data:image[^"']*)["']/) || tpl.match(/<img\s+(data:image[^>\s"']+)/)
  return m ? (m[1] ?? '') : ''
}

export function normalizeTemplateLogo(tpl: string, logoUrl: string): string {
  if (!logoUrl) return tpl
  let out = tpl
  out = out.replace(/(<\w+[^>]*?)\s+src=["']?\{\{\s*logoUrl\s*\}\}["']?/g, `$1 src="${logoUrl}"`)
  out = out.replace(/(<\w+[^>]*?)\s+src=["']?data:image[^"'\s>]*["']?/g, `$1 src="${logoUrl}"`)
  out = out.replace(/(<\w+[^>]*?)\s+\{\{\s*logoUrl\s*\}\}(?=\s|>)/g, `$1 src="${logoUrl}"`)
  out = out.replace(/(<\w+[^>]*?)\s+(data:image[^"'\s>]+)(?=\s|>)/g, `$1 src="${logoUrl}"`)
  return out
}

export function pageSetupCss(
  patientName: string,
  patientCode: string
): string {
  const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const left = `${patientName || '-'} | ${patientCode || '-'}`
  return `
    @page {
      size: A4;
      margin: 18mm 15mm 14mm;
      @bottom-left { content: "${esc(left)}"; font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #6b7280; }
      @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #6b7280; }
    }
    @media print { .document-header, .header-placeholder, .document-footer { display: none !important; } }
    @media screen { .document-header, .header-placeholder, .document-footer { display: none !important; } }
  `
}

export function printHeaderCss(): string {
  return `
    table.printwrap { width: 100%; max-width: 840px; margin: 0 auto; border-collapse: collapse; }
    table.printwrap > thead > tr > th { padding: 0; border: 0; }
    table.printwrap > tbody > tr > td { padding: 0; border: 0; vertical-align: top; }
    @media print { table.printwrap { max-width: none; margin: 0; } }
    .print-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: calc(2mm + var(--hdr-top, 0mm)) 0 4mm 0;
      border-bottom: 2px solid #24364f;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-head .ph-logo { flex: 0 0 auto; padding-left: var(--hdr-left, 5mm); }
    .print-head .ph-logo img { width: var(--hdr-width, 96px); max-height: 36mm; height: auto; object-fit: contain; }
    .print-head .ph-logo-text { color: #6b7280; font-size: 9pt; padding-left: var(--hdr-left, 5mm); }
    .print-head .ph-title { flex: 1; text-align: center; }
    .print-head .ph-title-line { font-size: 16pt; font-weight: 700; color: #24364f; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.3px; }
    .print-head .ph-sub { margin-top: 3px; color: #6b7280; font-size: 8.5pt; }
    .print-head .ph-code { text-align: right; font-size: 8pt; color: #6b7280; padding-right: 10mm; white-space: nowrap; }
    .print-head .ph-code strong { display: block; margin-top: 2px; color: #111827; font-size: 9pt; }
    .print-head-gap { height: var(--hdr-gap, 6mm); }
  `
}

export function printHeaderHtml(ctx: Pick<QuestionnairePrintContext, 'documentTitle' | 'patientName' | 'patientCode' | 'logoUrl'>): string {
  const logo = ctx.logoUrl
    ? `<span class="ph-logo"><img src="${ctx.logoUrl}" alt="Gambar dokumen" /></span>`
    : `<span class="ph-logo-text">LOGO</span>`
  const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '&lt;')
  return `
    <div class="print-head">
      ${logo}
      <div class="ph-title">
        <div class="ph-title-line">${esc(ctx.documentTitle)}</div>
        <div class="ph-sub">Medical Check Up / Health Questionnaire</div>
      </div>
      <div class="ph-code">No. RM<strong>${esc(ctx.patientCode || '-')}</strong></div>
    </div>
    <div class="print-head-gap"></div>
  `
}

export function documentImageCss(): string {
  return `
    .document-side-image {
      position: absolute;
      top: 55mm;
      right: 0;
      width: 44mm;
      z-index: 50;
    }
    .document-side-image img {
      width: 100%;
      height: auto;
      object-fit: contain;
      border: 1px solid #d9dee7;
      padding: 4px;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }
    .document-page.with-side-image { position: relative; padding-right: 62mm; }
    @media screen {
      .document-side-image { position: static; margin: 0 auto 16px; width: min(260px, 80%); }
      .document-page.with-side-image { padding-right: 0; }
    }
    @media print {
      .document-page.with-side-image { padding-right: 62mm; }
      .document-page.with-side-image .consent-section,
      .document-page.with-side-image .signature-wrapper,
      .document-page.with-side-image > .signature-area,
      .document-page.with-side-image .consent-signature,
      .document-page.with-side-image .document-footer {
        margin-right: -62mm;
      }
    }
  `
}

export function wrapDocumentImage(contentHtml: string, imageUrl?: string | null): string {
  if (!imageUrl) return contentHtml
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `
    <div class="document-page with-side-image">
      <div class="document-side-image"><img src="${esc(imageUrl)}" alt="Gambar dokumen" /></div>
      ${contentHtml}
    </div>
  `
}

export function printQuestionnaireHtml(
  ctx: QuestionnairePrintContext,
  template: string,
  css?: string
): string {
  const defaultCss = `
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
    body { background-color: #f0f2f5; margin: 0; padding: 20px; }
    .document-page { background: white; width: 100%; max-width: 800px; margin: 0 auto; padding: 30px 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
    @media print { body { background-color: white; padding: 0; } .document-page { box-shadow: none; padding: 0; width: 100%; max-width: 100%; } }
  `
  const { styles, body } = extractTemplateStyles(template)
  const logoUrl = extractTemplateLogo(template)
  if (!ctx.logoUrl && logoUrl) ctx.logoUrl = logoUrl
  const rendered = renderQuestionnaireTemplate(normalizeTemplateLogo(body, ctx.logoUrl || ''), ctx)
  const pageCss = pageSetupCss(ctx.patientName, ctx.patientCode)
  const sideImageCss = ctx.image ? documentImageCss() : ''
  const content = wrapDocumentImage(rendered, ctx.image)
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; script-src 'none'; frame-src 'none'; object-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'">`
  return `
    <html lang="id">
      <head>
        ${csp}
        <title>${ctx.documentTitle} - ${ctx.patientName}</title>
        <style>${css ?? defaultCss}</style>
        <style>${printHeaderCss()}</style>
        ${styles}
        <style>${sideImageCss}</style>
        <style>${pageCss}</style>
      </head>
      <body>
        <table class="printwrap">
          <thead>
            <tr><th>${printHeaderHtml(ctx)}</th></tr>
          </thead>
          <tbody>
            <tr><td>${content}</td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `
}
