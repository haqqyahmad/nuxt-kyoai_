// Util normalisasi nomor telepon Indonesia.
//
// - `phoneKey`: kunci kanonis untuk PERBANDINGAN ("0812…" == "+62 812…").
// - `normalizePhone`: format SIMPAN (+62…).
// - `isSamePhone`: bandingkan dua nomor tanpa peduli format/spasi/dash.

export function phoneDigits(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '')
}

export function phoneKey(value?: string | null): string {
  let digits = phoneDigits(value)
  if (digits.startsWith('62') && digits.length > 8) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

export function isSamePhone(a?: string | null, b?: string | null): boolean {
  const ka = phoneKey(a)
  const kb = phoneKey(b)
  return ka !== '' && ka === kb
}

export function normalizePhone(value?: string | null): string {
  if (value === null || value === undefined) return value as unknown as string
  const raw = String(value).trim()
  if (!raw) return raw
  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw
  if (digits.startsWith('62') && digits.length >= 9) return `+${digits}`
  if (digits.startsWith('0') && digits.length >= 9) return `+62${digits.slice(1)}`
  return raw
}
