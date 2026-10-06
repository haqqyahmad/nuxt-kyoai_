// Dental Examination — types contract dengan BE `/mcu/exams/:id/dental`
// Grading multi-select: daftar induk/anak + label + komentar HANYA berasal
// dari master BE (`gradeOptions`/`gradeConfig`). FE tidak menyimpan daftar
// kode grade. Meta (parent/rank) dirakit runtime dari `gradeConfig`.

export type DentalFinding = {
  toothNumber: string
  conditions: string[]
  note?: string
}

// Kode grade (induk/umum) — bentuk bebas, sumbernya master.
export type DentalGrade = string

// Kode apa pun (induk + anak), mis. 'C', 'C1'. Unknown dipertahankan (anti-loss).
export type DentalGradeCode = string

export type DentalGradeGroup = {
  parent: string
  label: string
  comment: string
  children: { code: string, label: string, comment: string }[]
}

export type DentalGradeConfig = Record<string, { label: string, comment: string, parent?: string | null }>

export type DentalGradeMeta = {
  parentByCode: Record<string, string>
  rankByCode: Record<string, number>
}

export type DentalPatient = {
  examId: string
  examCode: string
  queueCode: string
  patientId: string | null
  patientName: string
  gender: string | null
  dob: string | null
  age: number | null
  examDate: string
  companyId: string | null
}

export type DentalExamData = DentalPatient & {
  hasData: boolean
  item?: {
    id: string
    code: string
    name: string
    resultTiming: string | null
    workStatus: string
    resultStatus: string
  }
  canEdit?: boolean
  canSubmit?: boolean
  canApproveDepartment?: boolean
  doctorName?: string | null
  doctorSip?: string | null
  submittedByName?: string | null
  extraOral: string[]
  extraOralNote: string | null
  intraOral: string[]
  intraOralNote: string | null
  otherDental: string[]
  otherNote: string | null
  // Suggested grade DIHAPUS total: kolom lama dibaca null, tidak ditampilkan.
  suggestedGrade: DentalGrade | null
  suggestedLabel: string | null
  gradeReason: string | null
  // Kontrak array + legacy string tunggal (legacy dibaca sebagai 1 elemen).
  finalGrades?: string[]
  finalGrade: DentalGradeCode | null
  doctorComment: string | null
  commentsManual?: boolean
  status: string
  submittedAt: string | null
  findings: DentalFinding[]
  gradeConfig?: DentalGradeConfig
  gradeOptions?: DentalGradeGroup[]
}

export const EXTRA_ORAL_OPTIONS = ['Normal', 'Edema/Tumor', 'Lesion', 'Palsy'] as const

export const INTRA_ORAL_OPTIONS = [
  'Normal',
  'Lesion',
  'Ulcer',
  'Gingivitis',
  'Swelling',
  'Bleeding'
] as const

export const DENTAL_CONDITIONS = [
  'Abrasion',
  'Abscess',
  'Bridge',
  'Broken Crown',
  'Broken Filling',
  'Caries',
  'Crown',
  'Exfoliation',
  'Filling',
  'Fistula',
  'Fracture',
  'Gingival Recession',
  'Impaction',
  'Loose Crown',
  'Loose Filling',
  'Missing',
  'Persistent',
  'Radix',
  'Tooth Mobility',
  'Veneer'
] as const

export const OTHER_DENTAL_OPTIONS = [
  'Calculus',
  'Denture',
  'Fixed Retainer',
  'Stain',
  'Supernumerary Teeth'
] as const

// ── Meta grade (parent + rank) dirakit runtime dari gradeConfig master ──
// Ranking = urutan kode di config (BE mengirim terurut sortOrder: induk lalu anak).
export function buildGradeMeta(config: DentalGradeConfig = {}): DentalGradeMeta {
  const parentByCode: Record<string, string> = {}
  const rankByCode: Record<string, number> = {}
  Object.keys(config).forEach((code, i) => {
    rankByCode[code] = i
    const parent = config[code]?.parent
    if (parent) parentByCode[code] = parent
  })
  return { parentByCode, rankByCode }
}

// Normalisasi array grade: trim, dedupe, anak→bawa induk, INDUK SINGLE-SELECT
// (hanya satu induk; A menang bila ada, selain itu induk paling berat),
// sort by rank. Unknown codes DIPERTAHANKAN (anti-loss) di akhir.
export function normalizeDentalGrades(
  input: string[] | string | null | undefined,
  meta?: DentalGradeMeta
): string[] {
  const parentByCode = meta?.parentByCode ?? {}
  const rankByCode = meta?.rankByCode ?? {}
  const list = Array.isArray(input) ? input : input == null ? [] : [input]
  const seen = new Set<string>()
  const clean: string[] = []
  for (const raw of list) {
    if (typeof raw !== 'string') continue
    const code = raw.trim()
    if (!code || seen.has(code)) continue
    seen.add(code)
    clean.push(code)
  }
  const known = clean.filter(c => c in rankByCode)
  const unknowns = clean.filter(c => !(c in rankByCode))

  const parentOf = (code: string) => parentByCode[code] ?? code
  const involved = [...new Set(known.map(parentOf))]

  let keepSet: Set<string>
  if (involved.length <= 1) {
    keepSet = new Set(involved)
  } else if (involved.includes('A')) {
    keepSet = new Set(['A'])
  } else {
    const rank = (c: string) => (c in rankByCode ? rankByCode[c]! : -1)
    const severest = involved.reduce((a, b) => (rank(b) > rank(a) ? b : a))
    keepSet = new Set([severest])
  }

  const result = known.filter(c => keepSet.has(parentOf(c)))
  for (const parent of keepSet) if (!result.includes(parent)) result.push(parent)

  const withResult = [...result, ...unknowns]
  const rank = (c: string) => rankByCode[c] ?? Number.MAX_SAFE_INTEGER
  return withResult.sort((a, b) => rank(a) - rank(b))
}

export function heaviestDentalGrade(
  grades: string[] | string | null | undefined,
  meta?: DentalGradeMeta
): string | null {
  const norm = normalizeDentalGrades(grades, meta)
  return norm.length ? norm[norm.length - 1]! : null
}

// Dedupe kalimat komentar agar summary/print tak mengulang kalimat yang sama.
export function dedupeSentences(text: string | null | undefined): string {
  if (!text) return ''
  const parts = String(text).split(/(?<=[.])\s+/).map(s => s.trim()).filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out.join(' ')
}

// Blok summary per induk terpilih: [{ parent, label, children, comment }] —
// komentar = komentar anak terpilih (fallback komentar induk), di-dedupe.
export function buildDentalGradeSummary(
  finalGrades: string[] | null | undefined,
  config: DentalGradeConfig,
  meta?: DentalGradeMeta
): { parent: string, label: string, children: { code: string, label: string }[], comment: string }[] {
  const m = meta ?? buildGradeMeta(config)
  const grades = normalizeDentalGrades(finalGrades ?? [], m)
  const parents = [...new Set(grades.map(g => m.parentByCode[g] ?? g))]
  return parents
    .filter(p => config[p] || grades.includes(p))
    .map((parent) => {
      const kids = grades
        .filter(g => m.parentByCode[g] === parent)
        .map(code => ({ code, label: config[code]?.label ?? code }))
      // Komentar blok = komentar induk sendiri + komentar anak terpilih
      // (bukan komentar induk yang sudah menelan komentar anak).
      const parts = [config[parent]?.comment, ...kids.map(k => config[k.code]?.comment)]
      const comment = dedupeSentences(parts.filter(Boolean).join(' '))
      return { parent, label: config[parent]?.label ?? parent, children: kids, comment }
    })
}

// FDI tooth chart
export const TOOTH_GROUPS = {
  permanentUpper: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'],
  permanentLower: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'],
  primaryUpper: ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'],
  primaryLower: ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75']
} as const satisfies Record<string, readonly string[]>

// Belah satu rahang jadi dua kuadran (kiri | kanan)
export function splitToothGroup(teeth: readonly string[]): [string[], string[]] {
  const mid = Math.floor(teeth.length / 2)
  return [teeth.slice(0, mid), teeth.slice(mid)]
}

// Susunan chart: PERMANENT TEETH (32) dan PRIMARY TEETH (20),
// tiap rahang dua baris, tiap baris dipisah garis tengah.
export const DENTAL_CHART_GROUPS: { label: string, rows: [string[], string[]][] }[] = [
  {
    label: 'Permanent Teeth (32 Teeth)',
    rows: [
      splitToothGroup(TOOTH_GROUPS.permanentUpper),
      splitToothGroup(TOOTH_GROUPS.permanentLower)
    ]
  },
  {
    label: 'Primary Teeth (20 Teeth)',
    rows: [
      splitToothGroup(TOOTH_GROUPS.primaryUpper),
      splitToothGroup(TOOTH_GROUPS.primaryLower)
    ]
  }
]
