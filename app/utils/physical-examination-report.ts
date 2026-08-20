import type { PhysicalExamData, PhysicalReportRow, PhysicalSection } from '~/types/physical'

type FindingDef = [key: string, label: string, detailRequired?: boolean]
type SectionDef = { code: string, label: string, side?: 'RIGHT' | 'LEFT', findings: FindingDef[] }

const SECTIONS: SectionDef[] = [
  { code: 'EYES', label: 'Eyes', side: 'RIGHT', findings: [['right-anemic', 'Anemic'], ['right-icteric', 'Icteric'], ['right-pterigium', 'Pterigium'], ['right-strabismus', 'Strabismus'], ['right-others', 'Others', true]] },
  { code: 'EYES', label: 'Eyes', side: 'LEFT', findings: [['left-anemic', 'Anemic'], ['left-icteric', 'Icteric'], ['left-pterigium', 'Pterigium'], ['left-strabismus', 'Strabismus'], ['left-others', 'Others', true]] },
  { code: 'EAR', label: 'Ear', side: 'RIGHT', findings: [['right-cerumen', 'Cerumen'], ['right-cerumen-prop', 'Cerumen Prop'], ['right-tympanic', 'Tympanic membrane intact'], ['right-others', 'Others', true]] },
  { code: 'EAR', label: 'Ear', side: 'LEFT', findings: [['left-cerumen', 'Cerumen'], ['left-cerumen-prop', 'Cerumen Prop'], ['left-tympanic', 'Tympanic membrane intact'], ['left-others', 'Others', true]] },
  { code: 'NOSE', label: 'Nose', side: 'RIGHT', findings: [['right-deviated', 'Septum deviated'], ['right-enlarged', 'Conchae enlarged'], ['right-hyperemic', 'Hyperemic'], ['right-polyp', 'Polyp'], ['right-others', 'Others', true]] },
  { code: 'NOSE', label: 'Nose', side: 'LEFT', findings: [['left-deviated', 'Septum deviated'], ['left-enlarged', 'Conchae enlarged'], ['left-hyperemic', 'Hyperemic'], ['left-polyp', 'Polyp'], ['left-others', 'Others', true]] },
  { code: 'THROAT', label: 'Throat', findings: [['enlarged-tonsil', 'Enlarged tonsil', true], ['hyperemic-pharynx', 'Hyperemic pharynx'], ['others', 'Others', true]] },
  { code: 'NECK', label: 'Neck', findings: [['enlarged-thyroid', 'Enlarged thyroid', true], ['enlarged-lymph-node', 'Enlarged lymph node', true], ['others', 'Others', true]] },
  { code: 'CARDIAC', label: 'Cardiac', findings: [['regular-heart-sound', 'Regular heart sound'], ['murmur', 'Murmur', true], ['gallop', 'Gallop'], ['others', 'Others', true]] },
  { code: 'BREAST', label: 'Breast', side: 'RIGHT', findings: [['right-enlarged-glands', 'Enlarged breast glands'], ['right-lumps', 'Lumps', true], ['right-others', 'Others', true]] },
  { code: 'BREAST', label: 'Breast', side: 'LEFT', findings: [['left-enlarged-glands', 'Enlarged breast glands'], ['left-lumps', 'Lumps', true], ['left-others', 'Others', true]] },
  { code: 'RESPIRATORY SYSTEM', label: 'Respiratory System', findings: [['ronkhi', 'Ronkhi'], ['wheezing', 'Wheezing'], ['others', 'Others', true]] },
  { code: 'ABDOMEN', label: 'Abdomen', findings: [['tenderness', 'Tenderness', true], ['hepatomegaly', 'Hepatomegaly'], ['splenomegaly', 'Splenomegaly'], ['increased-bowel-sounds', 'Increased bowel sounds'], ['others', 'Others', true]] },
  { code: 'SPINE', label: 'Spine', findings: [['details', 'Details / keterangan', true]] },
  { code: 'GENITOURINARY', label: 'Genitourinary', findings: [['hernia', 'Hernia', true], ['hemorrhoid', 'Hemorrhoid'], ['inguinal-nodes', 'Inguinal nodes'], ['others', 'Others', true]] },
  { code: 'NEUROLOGICAL SYSTEM', label: 'Neurological System', findings: [['motoric', 'Motoric system abnormality', true], ['sensory', 'Sensory system abnormality', true], ['reflexes', 'Reflexes abnormality', true], ['others', 'Others', true]] },
  { code: 'SKIN', label: 'Skin', findings: [['psoriasis', 'Psoriasis'], ['tattoo', 'Tattoo', true], ['skin-tag', 'Skin tag'], ['others', 'Others', true]] }
]

export const PHYSICAL_SECTIONS: Array<Omit<PhysicalSection, 'normal'>> = SECTIONS.map(section => ({
  code: section.code,
  label: section.label,
  side: section.side ?? null,
  findings: section.findings.map(([key, label, required]) => ({
    key,
    label,
    value: false,
    detail: null,
    detail_required_when: required ? 'YES' : 'NO'
  }))
}))

export function createPhysicalExamData(): PhysicalExamData {
  return {
    sections: PHYSICAL_SECTIONS.map(section => ({
      ...section,
      normal: true,
      findings: section.findings.map(finding => ({ ...finding }))
    }))
  }
}

const REPORT_GROUP_MAP: Record<string, Record<string, string>> = {
  THROAT: { 'hyperemic-pharynx': 'Pharynx', 'enlarged-tonsil': 'Tonsil', 'others': 'Tonsil' },
  ABDOMEN: { 'tenderness': 'Liver', 'hepatomegaly': 'Liver', 'splenomegaly': 'Spleen', 'increased-bowel-sounds': 'Kidney', 'others': 'Kidney' },
  CARDIAC: { 'regular-heart-sound': 'Heart Sound', 'murmur': 'Heart Sound', 'gallop': 'Heart Sound', 'others': 'Heart Sound' }
}

export function formatPhysicalExamination(data: PhysicalExamData): PhysicalReportRow[] {
  const rows = data.sections.flatMap((section) => {
    const group = section.side ? `${section.label} · ${section.side === 'RIGHT' ? 'Right' : 'Left'}` : section.label
    const map = REPORT_GROUP_MAP[section.code]
    if (section.normal) {
      if (!map) return [{ group, label: group, value: 'No abnormality' }]
      return [...new Set(Object.values(map))].map(subgroup => ({ group, label: `${group} · ${subgroup}`, value: 'No abnormality' }))
    }
    const findings = section.findings.filter(finding => finding.value)
    if (!map) return findings.length
      ? [{
          group,
          label: group,
          value: findings.map((finding) => {
            const detail = finding.detail?.trim()
            return detail && finding.key.toLowerCase() === 'tattoo'
              ? `${finding.label}: ${detail}`
              : detail || finding.label
          }).join('; ')
        }]
      : [{ group, label: group, value: 'Incomplete' }]

    const grouped = new Map<string, string[]>()
    for (const finding of findings) {
      const subgroup = map[finding.key.toLowerCase()] ?? section.label
      const current = grouped.get(subgroup) ?? []
      current.push(finding.detail?.trim() ? `${finding.label}: ${finding.detail.trim()}` : finding.label)
      grouped.set(subgroup, current)
    }
    return [...grouped].map(([subgroup, values]) => ({ group: `${group} · ${subgroup}`, label: `${group} · ${subgroup}`, value: values.join('; ') }))
  })
  return rows
}
