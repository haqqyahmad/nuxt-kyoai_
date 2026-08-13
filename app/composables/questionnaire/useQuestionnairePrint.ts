// app/composables/questionnaire/useQuestionnairePrint.ts
// Renderer template print ala Jinja/Frappe: {{ var }}, {% for %}, {% if %}.
// Data context dikumpulkan dari baris hasil questionnaire + detail jawaban.

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

type PrintNode
  = | { kind: 'text', value: string }
    | { kind: 'expr', expr: string }
    | { kind: 'for', varName: string, listExpr: string, body: PrintNode[] }
    | { kind: 'if', cond: string, body: PrintNode[], elseBody: PrintNode[] | null }

type Token = { type: 'text', value: string } | { type: 'tag', value: string, raw: boolean }

const TOKEN_RE = /\{\{([\s\S]*?)\}\}|\{%([\s\S]*?)%\}/g

function tokenize(tpl: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(tpl))) {
    if (m.index > last) tokens.push({ type: 'text', value: tpl.slice(last, m.index) })
    if (m[1] !== undefined) tokens.push({ type: 'tag', value: m[1].trim(), raw: false })
    else tokens.push({ type: 'tag', value: (m[2] ?? '').trim(), raw: true })
    last = m.index + m[0].length
  }
  if (last < tpl.length) tokens.push({ type: 'text', value: tpl.slice(last) })
  return tokens
}

function parseNodes(tokens: Token[], start: number, stopTags: string[]): { nodes: PrintNode[], next: number } {
  const nodes: PrintNode[] = []
  let i = start
  while (i < tokens.length) {
    const t = tokens[i] as Token
    if (t.type === 'text') {
      nodes.push({ kind: 'text', value: t.value })
      i++
      continue
    }
    if (!t.raw) {
      nodes.push({ kind: 'expr', expr: t.value })
      i++
      continue
    }
    const tag = t.value.trim()
    if (stopTags.includes(tag)) return { nodes, next: i + 1 }

    const forMatch = /^for\s+(\w+)\s+in\s+(.+)$/.exec(tag)
    if (forMatch) {
      const parsed = parseNodes(tokens, i + 1, ['endfor'])
      nodes.push({ kind: 'for', varName: (forMatch[1] as string), listExpr: (forMatch[2] as string).trim(), body: parsed.nodes })
      i = parsed.next
      continue
    }

    const ifMatch = /^if\s+(.+)$/.exec(tag)
    if (ifMatch) {
      const thenParsed = parseNodes(tokens, i + 1, ['else', 'endif'])
      let elseBody: PrintNode[] | null = null
      let next = thenParsed.next
      const stopToken = tokens[next - 1]
      if (stopToken && stopToken.type === 'tag' && stopToken.raw && stopToken.value.trim() === 'else') {
        const elseParsed = parseNodes(tokens, next, ['endif'])
        elseBody = elseParsed.nodes
        next = elseParsed.next
      }
      nodes.push({ kind: 'if', cond: (ifMatch[1] as string).trim(), body: thenParsed.nodes, elseBody })
      i = next
      continue
    }

    nodes.push({ kind: 'text', value: `{% ${tag} %}` })
    i++
  }
  return { nodes, next: i }
}

function getPath(ctx: unknown, path: string): unknown {
  let value: unknown = ctx
  for (const part of path.split('.')) {
    if (value == null) return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

function evalExpr(expr: string, ctx: Record<string, unknown>): unknown {
  const trimmed = expr.trim()
  if (!trimmed) return undefined

  const parts = trimmed.split('|')
  const base = (parts[0] ?? '').trim()
  const filters = parts.slice(1).map(f => f.trim()).filter(Boolean)

  let value: unknown
  if (/^'.*'$/.test(base) || /^".*"$/.test(base)) {
    value = base.slice(1, -1)
  } else if (/^-?\d+(\.\d+)?$/.test(base)) {
    value = Number(base)
  } else if (base === 'true' || base === 'false') {
    value = base === 'true'
  } else if (base === 'null' || base === 'undefined' || base === '') {
    value = null
  } else {
    value = getPath(ctx, base)
  }

  for (const f of filters) {
    const fName = (f.split('(')[0] ?? '').trim()
    const argMatch = /^.*?\((.*)\)$/.exec(f)
    const arg = argMatch ? evalExpr((argMatch[1] as string) ?? '', ctx) : undefined
    value = applyFilter(value, fName, arg)
  }
  return value
}

function applyFilter(value: unknown, name: string, arg: unknown): unknown {
  const s = value == null ? '' : String(value)
  switch (name) {
    case 'upper': return s.toUpperCase()
    case 'lower': return s.toLowerCase()
    case 'capitalize': return s ? (s[0] as string).toUpperCase() + s.slice(1) : s
    case 'trim': return s.trim()
    case 'default':
      return value == null || s === '' ? (arg ?? '') : value
    case 'safe': return value
    default: return value
  }
}

function isTruthy(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

function renderNodes(nodes: PrintNode[], ctx: Record<string, unknown>): string {
  let out = ''
  for (const node of nodes) {
    if (node.kind === 'text') {
      out += node.value
    } else if (node.kind === 'expr') {
      const v = evalExpr(node.expr, ctx)
      out += v == null ? '' : String(v)
    } else if (node.kind === 'for') {
      const list = evalExpr(node.listExpr, ctx)
      if (Array.isArray(list)) {
        list.forEach((item, idx) => {
          const scoped = { ...ctx, [node.varName]: item, loop: { index: idx + 1, index0: idx } }
          out += renderNodes(node.body, scoped)
        })
      }
    } else if (node.kind === 'if') {
      const cond = evalExpr(node.cond, ctx)
      if (isTruthy(cond)) {
        out += renderNodes(node.body, ctx)
      } else if (node.elseBody) {
        out += renderNodes(node.elseBody, ctx)
      }
    }
  }
  return out
}

export function renderQuestionnaireTemplate(tpl: string, ctx: Record<string, unknown>): string {
  const tokens = tokenize(tpl)
  const { nodes } = parseNodes(tokens, 0, [])
  return renderNodes(nodes, ctx)
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
      position: fixed;
      top: 55mm;
      right: 15mm;
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
    .document-page.with-side-image { padding-right: 62mm; }
    @media screen {
      .document-side-image { position: static; margin: 0 auto 16px; width: min(260px, 80%); }
      .document-page.with-side-image { padding-right: 0; }
    }
    @media print {
      .document-side-image { position: fixed; }
      .document-page.with-side-image { padding-right: 62mm; }
    }
  `
}

export function wrapDocumentImage(contentHtml: string, imageUrl?: string | null): string {
  if (!imageUrl) return contentHtml
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `
    <div class="document-side-image"><img src="${esc(imageUrl)}" alt="Gambar dokumen" /></div>
    <div class="document-page with-side-image">${contentHtml}</div>
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
  const rendered = renderQuestionnaireTemplate(body, ctx)
  const pageCss = pageSetupCss(ctx.patientName, ctx.patientCode)
  const sideImageCss = ctx.image ? documentImageCss() : ''
  const content = wrapDocumentImage(rendered, ctx.image)
  return `
    <html lang="id">
      <head>
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
