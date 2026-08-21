// app/utils/jinjaTemplate.ts
// Renderer template ala Jinja/Frappe yang dipakai bersama oleh print
// Questionnaire dan print MCU: {{ var }}, {% for %}, {% if %}, filter `| x(...)`,
// operator `in` / `not in`.

export type PrintNode
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
    if (value == null || ['__proto__', 'prototype', 'constructor'].includes(part)) return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

function evalExpr(expr: string, ctx: Record<string, unknown>): unknown {
  const trimmed = expr.trim()
  if (!trimmed) return undefined

  // Boolean ops (flat): not X, X or Y, X and Y, X in [A, B], X not in [A, B]
  const notInMatch = /^(.+?)\s+not\s+in\s+(.+)$/i.exec(trimmed)
  if (notInMatch) {
    const value = evalExpr((notInMatch[1] as string), ctx)
    const collection = evalExpr((notInMatch[2] as string), ctx)
    return Array.isArray(collection) ? !collection.some(item => item === value) : true
  }
  const inMatch = /^(.+?)\s+in\s+(.+)$/i.exec(trimmed)
  if (inMatch) {
    const value = evalExpr((inMatch[1] as string), ctx)
    const collection = evalExpr((inMatch[2] as string), ctx)
    return Array.isArray(collection) && collection.some(item => item === value)
  }
  const notMatch = /^not\s+(.+)$/i.exec(trimmed)
  if (notMatch) return !isTruthy(evalExpr((notMatch[1] as string), ctx))
  const orParts = trimmed.split(/\s+or\s+/i)
  if (orParts.length > 1) return orParts.some(p => isTruthy(evalExpr(p, ctx)))
  const andParts = trimmed.split(/\s+and\s+/i)
  if (andParts.length > 1) return andParts.every(p => isTruthy(evalExpr(p, ctx)))

  const parts = trimmed.split('|')
  const base = (parts[0] ?? '').trim()
  const filters = parts.slice(1).map(f => f.trim()).filter(Boolean)

  let value: unknown
  if (/^\[.*\]$/.test(trimmed)) {
    const body = trimmed.slice(1, -1)
    return body.split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => (/^'.*'$/.test(part) || /^".*"$/.test(part) ? part.slice(1, -1) : part))
  } else if (/^'.*'$/.test(base) || /^".*"$/.test(base)) {
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
  const hiddenGroups = () => Array.isArray(arg) ? arg.map(item => String(item).toLowerCase()) : []
  const visibleGroups = (groups: unknown[]) => {
    const hidden = hiddenGroups()
    return groups.filter(item => !hidden.includes(String((item as Record<string, unknown>)?.groupName ?? '').toLowerCase()))
  }

  if (name === 'without_group' && Array.isArray(value)) return visibleGroups(value)
  if (name === 'without_page_group' && Array.isArray(value)) {
    return value
      .map((item) => {
        const page = item as Record<string, unknown>
        return { ...page, groups: visibleGroups(Array.isArray(page.groups) ? page.groups : []) }
      })
      .filter(page => page.groups.length > 0)
  }

  const s = value == null ? '' : String(value)
  switch (name) {
    case 'upper': return s.toUpperCase()
    case 'lower': return s.toLowerCase()
    case 'capitalize': return s ? (s[0] as string).toUpperCase() + s.slice(1) : s
    case 'trim': return s.trim()
    case 'default': return value == null || s === '' ? (arg ?? '') : value
    default: return value
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
      out += escapeHtml(v)
    } else if (node.kind === 'for') {
      const list = evalExpr(node.listExpr, ctx)
      if (Array.isArray(list)) {
        list.forEach((item, idx) => {
          const scoped = { ...ctx, [node.varName]: item, loop: { index: idx + 1, index0: idx, last: idx === list.length - 1, length: list.length } }
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

export function renderTemplate(tpl: string, ctx: Record<string, unknown>): string {
  const tokens = tokenize(tpl)
  const { nodes } = parseNodes(tokens, 0, [])
  return renderNodes(nodes, ctx)
}
