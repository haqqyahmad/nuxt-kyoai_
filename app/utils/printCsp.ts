export function buildPrintCsp(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const imgSrc = origin ? `data: blob: ${origin}` : 'data: blob:'
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${imgSrc}; font-src data:; script-src 'none'; frame-src 'none'; object-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'">`
}
