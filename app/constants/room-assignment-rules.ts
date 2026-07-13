export const PIC_PERMISSION = 'room:update'

export const SELF_ASSIGNABLE_ROOM_TYPE_CODES_BY_ROLE: Record<string, string[]> = {
  'petugas-lab': ['LAB'],
  'petugas-radiologi': ['RAD'],
  'dokter': ['DOK'],
  'nurse': ['LAB', 'RAD', 'DOK', 'VIS'],
  'perawat': ['LAB', 'RAD', 'DOK', 'VIS'],
  'petugas': ['LAB', 'RAD', 'DOK', 'VIS']
}

export function collectSelfAssignableRoomTypeCodes(roleNames: string[]) {
  const allowed = new Set<string>()

  for (const roleName of roleNames) {
    const codes = SELF_ASSIGNABLE_ROOM_TYPE_CODES_BY_ROLE[roleName.toLowerCase()] || []
    for (const code of codes) {
      allowed.add(code)
    }
  }

  return [...allowed]
}
