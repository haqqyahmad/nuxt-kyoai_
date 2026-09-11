// app/utils/code39.ts
// Encoder barcode Code 39 (tanpa dependency) -> menghasilkan string SVG.
// Charset: 0-9, A-Z, space, - . $ / + %  (start/stop '*')

const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw',
  'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn',
  'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn',
  'F': 'nnwnwwnnn',
  'G': 'nnnnnwwnw',
  'H': 'wnnnnwwnn',
  'I': 'nnwnnwwnn',
  'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww',
  'L': 'nnwnnnnww',
  'M': 'wnwnnnnwn',
  'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn',
  'P': 'nnwnwnnwn',
  'Q': 'nnnnnnwww',
  'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn',
  'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw',
  'V': 'nwwnnnnnw',
  'W': 'wwwnnnnnn',
  'X': 'nwnnwnnnw',
  'Y': 'wwnnwnnnn',
  'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn'
}

export function sanitizeCode39(value?: string | null): string {
  return String(value ?? '')
    .toUpperCase()
    .split('')
    .filter(ch => ch !== '*' && Boolean(CODE39_PATTERNS[ch]))
    .join('')
}

export type Code39Options = {
  narrow?: number
  wide?: number
  height?: number
  margin?: number
  showText?: boolean
}

export function code39Svg(value?: string | null, options: Code39Options = {}): string {
  const narrow = options.narrow ?? 2
  const wide = options.wide ?? narrow * 3
  const height = options.height ?? 60
  const margin = options.margin ?? 8
  const showText = options.showText ?? true
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const payload = sanitizeCode39(value)
  const raw = `*${payload}*`

  let x = margin
  const rects: string[] = []
  for (const ch of raw) {
    const pattern = CODE39_PATTERNS[ch]
    if (!pattern) continue
    for (let i = 0; i < pattern.length; i++) {
      const w = pattern[i] === 'w' ? wide : narrow
      if (i % 2 === 0) {
        rects.push(`<rect x="${x}" y="${margin}" width="${w}" height="${height}"/>`)
      }
      x += w
    }
    x += narrow
  }

  const width = x + margin
  const textHeight = showText ? 18 : 0
  const totalHeight = height + margin * 2 + textHeight
  const text = showText
    ? `<text x="${width / 2}" y="${height + margin + 14}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#111111">${esc(raw)}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" role="img" aria-label="barcode ${esc(raw)}"><rect width="${width}" height="${totalHeight}" fill="#ffffff"/><g fill="#000000">${rects.join('')}</g>${text}</svg>`
}
