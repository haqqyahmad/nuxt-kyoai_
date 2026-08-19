// app/composables/mcu/useMcuReportPrint.ts
// Print laporan hasil MCU memakai template HTML (Jinja-like) dari BE.
// Pola sama dengan QuestionnairePrintTemplateModal: template + context → render → print window.
// Data & pagination (resultPages, gradeRows, physical) diagregasi oleh BE.

import { renderQuestionnaireTemplate } from '~/composables/questionnaire/useQuestionnairePrint'

export type McuPrintPayload = {
  printTemplate: string
  patient: {
    name: string
    patientId: string
    gender: string
    age: string | number
    dob: string
    company: string
    address: string
    position: string
    package: string
  }
  editions: Array<{
    id: string
    examCode: string
    examDate: string
    package: string
  }>
  physical: Array<{
    label: string
    value: string
  }>
  physicalEmpty: boolean
  resultPages: Array<{
    groups: Array<{
      groupName: string
      comment: string
      items: Array<{
        inputanLabel: string
        std: string
        now: string
        previous: string
        last: string
        nowClass: string
        prevClass: string
        lastClass: string
        uom: string
      }>
    }>
  }>
  gradeRowsLeft: Array<{
    groupName: string
    now: string
    previous: string
    last: string
  }>
  gradeRowsRight: Array<{
    groupName: string
    now: string
    previous: string
    last: string
  }>
  gradePageNo: number
  finalPageNo: number
  submission: {
    status: string
    finalGrade: string
    fitnessLevel: string
    finalComment: string
    internalNote: string
    doctorName: string
  }
  attachments: Array<{
    id: string
    examId: string
    examItemId: string
    itemName: string
    originalName: string
    mimeType: string
    downloadUrl: string
  }>
}

export type PhysicalPrintRow = {
  label: string
  subLabels: string[]
  subValues: string[]
  showSub: boolean
}

// ────────────────────────────────────────────────────────────
// PHYSICAL EXAMINATION — grouping di frontend.
// Backend mengirim jawaban raw {label, value}. Section tanpa
// jawaban di-skip; nilai tidak pernah dikarang.
// ────────────────────────────────────────────────────────────
type PhysicalFinding = { key: string, label: string, text?: boolean, detail?: boolean }
type PhysicalSectionDef = { name: string, subs: Array<{ label: string, keys: PhysicalFinding[] }> }

const PHYSICAL_SECTIONS: PhysicalSectionDef[] = [
  {
    name: 'EYES',
    subs: [
      { label: '1. Right', keys: [
        { key: 'right-anemic', label: 'Anemic' },
        { key: 'right-icteric', label: 'Icteric' },
        { key: 'right-pterigium', label: 'Pterigium' },
        { key: 'right-strabismus', label: 'Strabismus' },
        { key: 'right-others', label: 'Others', detail: true }
      ] },
      { label: '2. Left', keys: [
        { key: 'left-anemic', label: 'Anemic' },
        { key: 'left-icteric', label: 'Icteric' },
        { key: 'left-pterigium', label: 'Pterigium' },
        { key: 'left-strabismus', label: 'Strabismus' },
        { key: 'left-others', label: 'Others', detail: true }
      ] }
    ]
  },
  {
    name: 'EAR',
    subs: [
      { label: '1. Right', keys: [
        { key: 'right-cerumen', label: 'Cerumen' },
        { key: 'right-cerumen-prop', label: 'Cerumen prop' },
        { key: 'right-tympanic', label: 'Tympanic membrane intact' },
        { key: 'right-others', label: 'Others', detail: true }
      ] },
      { label: '2. Left', keys: [
        { key: 'left-cerumen', label: 'Cerumen' },
        { key: 'left-cerumen-prop', label: 'Cerumen prop' },
        { key: 'left-tympanic', label: 'Tympanic membrane intact' },
        { key: 'left-others', label: 'Others', detail: true }
      ] }
    ]
  },
  {
    name: 'NOSE',
    subs: [
      { label: '1. Right', keys: [
        { key: 'right-deviated', label: 'Septum deviated' },
        { key: 'right-enlarged', label: 'Conchae enlarged' },
        { key: 'right-hyperemic', label: 'Hyperemic' },
        { key: 'right-polyp', label: 'Polyp' },
        { key: 'right-others', label: 'Others', detail: true }
      ] },
      { label: '2. Left', keys: [
        { key: 'left-deviated', label: 'Septum deviated' },
        { key: 'left-enlarged', label: 'Conchae enlarged' },
        { key: 'left-hyperemic', label: 'Hyperemic' },
        { key: 'left-polyp', label: 'Polyp' },
        { key: 'left-others', label: 'Others', detail: true }
      ] }
    ]
  },
  {
    name: 'THROAT',
    subs: [
      { label: '1. Pharynx', keys: [{ key: 'hyperemic-pharynx', label: 'Hyperemic pharynx' }] },
      { label: '2. Tonsil', keys: [{ key: 'enlarged-tonsil', label: 'Enlarged tonsil', detail: true }] }
    ]
  },
  { name: 'NECK', subs: [{ label: '', keys: [
    { key: 'enlarged-thyroid', label: 'Enlarged thyroid', detail: true },
    { key: 'enlarged-lymph-node', label: 'Enlarged lymph node', detail: true },
    { key: 'others', label: 'Others', detail: true }
  ] }] },
  { name: 'CARDIAC', subs: [{ label: '', keys: [
    { key: 'regular-heart-sound', label: 'Regular heart sound' },
    { key: 'murmur', label: 'Murmur' },
    { key: 'gallop', label: 'Gallop' },
    { key: 'others', label: 'Others', detail: true }
  ] }] },
  {
    name: 'BREAST',
    subs: [
      { label: '1. Right', keys: [
        { key: 'right-enlarged-glands', label: 'Enlarged breast glands' },
        { key: 'right-lumps', label: 'Lumps' },
        { key: 'right-others', label: 'Others', detail: true }
      ] },
      { label: '2. Left', keys: [
        { key: 'left-enlarged-glands', label: 'Enlarged breast glands' },
        { key: 'left-lumps', label: 'Lumps' },
        { key: 'left-others', label: 'Others', detail: true }
      ] }
    ]
  },
  { name: 'RESPIRATORY SYSTEM', subs: [{ label: '', keys: [
    { key: 'ronkhi', label: 'Ronkhi' },
    { key: 'wheezing', label: 'Wheezing' },
    { key: 'others', label: 'Others', detail: true }
  ] }] },
  {
    name: 'ABDOMEN',
    subs: [
      { label: '1. Liver', keys: [{ key: 'hepatomegaly', label: 'Hepatomegaly' }] },
      { label: '2. Spleen', keys: [{ key: 'splenomegaly', label: 'Splenomegaly' }] },
      { label: '3. Kidney', keys: [] }
    ]
  },
  { name: 'SPINE', subs: [{ label: '', keys: [{ key: 'details', label: 'Details', text: true }] }] },
  { name: 'GENITOURINARY', subs: [{ label: '', keys: [
    { key: 'hernia', label: 'Hernia', detail: true },
    { key: 'hemorrhoid', label: 'Hemorrhoid' },
    { key: 'inguinal-nodes', label: 'Inguinal nodes' },
    { key: 'others', label: 'Others', detail: true }
  ] }] },
  { name: 'NEUROLOGICAL SYSTEM', subs: [{ label: '', keys: [
    { key: 'motoric', label: 'Motoric system abnormality', detail: true },
    { key: 'sensory', label: 'Sensory system abnormality', detail: true },
    { key: 'reflexes', label: 'Reflexes abnormality', detail: true },
    { key: 'others', label: 'Others', detail: true }
  ] }] },
  { name: 'SKIN', subs: [{ label: '', keys: [
    { key: 'psoriasis', label: 'Psoriasis' },
    { key: 'tattoo', label: 'Tattoo', detail: true },
    { key: 'skin-tag', label: 'Skin tag' },
    { key: 'others', label: 'Others', detail: true }
  ] }] }
]

const PHYSICAL_ANAMNESIS: Array<{ keywords: string[], label: string }> = [
  { keywords: ['CHIEF COMPLAINT'], label: 'Chief Complaint' },
  { keywords: ['LIFE STYLE'], label: 'Life style' },
  { keywords: ['PAST MEDICAL'], label: 'Past medical history' },
  { keywords: ['FAMILY MEDICAL'], label: 'Family medical history' }
]

const PHYSICAL_VITAL: Array<{ keywords: string[], label: string }> = [
  { keywords: ['PULSE'], label: '1. Pulse Rate' },
  { keywords: ['BREATHING', 'RESPIRATORY RATE'], label: '2. Breathing' },
  { keywords: ['BLOOD PRESSURE'], label: '3. Blood pressure' },
  { keywords: ['TEMPERATURE'], label: '4. Temperature' }
]

export function buildPhysicalRows(raw: Array<{ label: string, value: string }>): PhysicalPrintRow[] {
  const upper = raw.map(entry => ({ label: String(entry.label).toUpperCase(), value: String(entry.value ?? '') }))
  const rows: PhysicalPrintRow[] = []
  const isYes = (value: string | undefined) => value?.trim().toUpperCase() === 'YES'

  // Anamnesis
  for (const def of PHYSICAL_ANAMNESIS) {
    const entry = upper.find(candidate => def.keywords.some(keyword => candidate.label.includes(keyword)))
    if (entry) rows.push({ label: def.label, subLabels: [''], subValues: [entry.value], showSub: false })
  }

  // Vital sign
  const vitalSubs: Array<{ label: string, value: string }> = []
  for (const def of PHYSICAL_VITAL) {
    const entry = upper.find(candidate => def.keywords.some(keyword => candidate.label.includes(keyword)))
    if (entry) vitalSubs.push({ label: def.label, value: entry.value })
  }
  if (vitalSubs.length) {
    rows.push({ label: 'Vital sign', subLabels: vitalSubs.map(sub => sub.label), subValues: vitalSubs.map(sub => sub.value), showSub: true })
  }

  // Section fisik (EYES…SKIN)
  for (const section of PHYSICAL_SECTIONS) {
    const prefix = `${section.name} · `
    const entries = upper.filter(entry => entry.label.startsWith(prefix))
    if (!entries.length) continue
    const valueByKey = new Map(entries.map((entry) => {
      const key = entry.label.slice(prefix.length).trim().toLowerCase()
      return [key, entry.value]
    }))
    const normal = isYes(valueByKey.get('no-abnormality'))
    const hasAnswer = normal || isYes(valueByKey.get('abnormality-found'))
      || section.subs.some(sub => sub.keys.some(finding => isYes(valueByKey.get(finding.key)) || (finding.text && !!valueByKey.get(finding.key)?.trim())))
    if (!hasAnswer) continue

    const subLabels: string[] = []
    const subValues: string[] = []
    for (const sub of section.subs) {
      subLabels.push(sub.label)
      if (normal) {
        subValues.push('No abnormality')
        continue
      }
      const findings: string[] = []
      for (const finding of sub.keys) {
        if (finding.text) {
          const text = valueByKey.get(finding.key)?.trim()
          if (text) findings.push(`${finding.label}${text && text.toUpperCase() !== finding.label.toUpperCase() ? `: ${text}` : ''}`)
          continue
        }
        if (isYes(valueByKey.get(finding.key))) {
          const detail = valueByKey.get(`${finding.key}-detail`)?.trim()
          findings.push(detail ? `${finding.label}: ${detail}` : finding.label)
        }
      }
      subValues.push(findings.join('; '))
    }
    rows.push({
      label: section.name,
      subLabels,
      subValues,
      showSub: subLabels.some(Boolean)
    })
  }

  return rows
}

export function useMcuReportPrint() {
  const api = useApi()
  const toast = useToast()

  const loading = ref(false)

  async function loadPrintData(examId: string): Promise<McuPrintPayload | null> {
    loading.value = true
    try {
      const res = await api.get(`/mcu/exams/${examId}/print`)
      return (res.data?.data ?? res.data) as McuPrintPayload
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } }, message?: string })
        ?.response?.data?.message || (err as { message?: string })?.message || 'Gagal memuat data print MCU'
      toast.add({ title: 'Error', description: msg, color: 'error' })
      return null
    } finally {
      loading.value = false
    }
  }

  // CSP ketat untuk print window: blok script, connect, frame, object.
  const printCsp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; script-src 'none'; frame-src 'none'; object-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'">`

  function renderMcuReportHtml(payload: McuPrintPayload): string {
    const template = payload.printTemplate?.trim()
    if (!template) {
      return '<html><head>' + printCsp + '</head><body><p style="font-family:Arial,sans-serif;padding:20px;">Template print belum tersedia. Hubungi admin.</p></body></html>'
    }
    let html = renderQuestionnaireTemplate(template, { ...payload, physical: buildPhysicalRows(payload.physical ?? []) })
    // Inject CSP ke <head> bila ada, sisipkan setelah <head> / sebelum <head>.
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => `${m}${printCsp}`)
    else html = html.replace(/<html[^>]*>/i, m => `${m}${printCsp}`)
    return html
  }

  async function printMcuReport(examId: string): Promise<boolean> {
    const payload = await loadPrintData(examId)
    if (!payload) return false

    const printWindow = window.open('', '_blank')
    if (!printWindow) return false

    printWindow.document.write(renderMcuReportHtml(payload))
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
    }
    return true
  }

  return { loading, loadPrintData, renderMcuReportHtml, printMcuReport }
}
