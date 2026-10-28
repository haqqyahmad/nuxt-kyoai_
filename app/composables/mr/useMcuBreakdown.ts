// app/composables/mr/useMcuBreakdown.ts
// Logika bersama untuk card "MCU Breakdown" (dipakai FO registration-patient & MR Review Exam tab).

export type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export type McuExamItem = {
  id: string
  source: 'paket' | 'additional' | string
  sortOrder?: number
  workStatus?: string | null
  roomExamItems?: Array<{
    id: string
    status: string
    startAt?: string | null
    doneAt?: string | null
    updatedAt?: string | null
    rescheduleVisitDate?: string | null
    cancelledAt?: string | null
    cancelReason?: string | null
    cancelledByName?: string | null
  }>
  item: {
    id: string
    code?: string
    name: string
    department?: { id: string, name: string } | null
    group?: { id: string, name: string } | null
  }
}

export type McuSampleCollection = {
  id: string
  status: string
  createdAt?: string | null
  collectedAt?: string | null
  receivedAt?: string | null
  rejectReason?: string | null
  sampleType?: { id: string, code?: string | null, name?: string | null } | null
  items?: Array<{ itemId: string }>
}

export type McuBreakdownItem = {
  id: string
  name: string
  status: string
  done: boolean
  sampleCollections: McuSampleCollection[]
  updatedAt: string | null
  startAt: string | null
  doneAt: string | null
  cancelReason: string | null
  cancelledAt: string | null
  cancelledByName: string | null
}

export type McuBreakdownCategory = {
  label: string
  icon: string
  items: McuBreakdownItem[]
  completed: number
  total: number
  pending: number
  rejectedSampleCount: number
  refusedCount: number
  completedItems: McuBreakdownItem[]
  pendingItems: McuBreakdownItem[]
  cancelledItems: McuBreakdownItem[]
  completedGroups: McuPendingGroup[]
  sampleGroups: McuSampleGroup[]
  pendingGroups: McuPendingGroup[]
  updatedAt: string | null
  status: string
}

export type McuSampleGroup = {
  key: string
  name: string
  status: string
  collectedAt: string | null
  receivedAt: string | null
  rejectReason: string | null
  itemCount: number
  needsAttention: boolean
  earlierAttentionCount: number
  items: McuBreakdownItem[]
}

export type McuPendingGroup = {
  key: string
  label: string
  needsAttention: boolean
  items: McuBreakdownItem[]
}

const DEPT_ICON: Record<string, string> = {
  Laboratorium: 'i-lucide-flask-conical',
  Radiologi: 'i-lucide-scan',
  Nurse: 'i-lucide-heart-pulse',
  default: 'i-lucide-stethoscope'
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getSampleCollectionsForItem(
  sampleCollections: McuSampleCollection[],
  itemId: string
): McuSampleCollection[] {
  return sampleCollections.filter(collection =>
    collection.items?.some(item => item.itemId === itemId)
  )
}

export function getExamItemStatus(
  ei: McuExamItem,
  sampleCollections: McuSampleCollection[]
): string {
  if (ei.workStatus === 'CANCELLED') return 'CANCELLED'
  const samples = getSampleCollectionsForItem(sampleCollections, ei.item.id)
  if (samples.length > 0) {
    const roomStatuses = ei.roomExamItems?.map(item => item.status) ?? []
    if (roomStatuses.includes('REFUSED')) return 'REFUSED'
    if (ei.workStatus === 'DONE') return 'DONE'
    if (samples.every(s => s.status === 'RECEIVED')) return 'DONE'
    if (roomStatuses.includes('RESCHEDULED')) return 'RESCHEDULED'
    if (samples.some(s => s.status === 'RESCHEDULED')) return 'RESCHEDULED'
    if (samples.some(s => s.status === 'REJECTED')) return 'REJECTED'
    return samples.some(s => s.status === 'COLLECTED') ? 'WAITING_SAMPLE_RECEIVE' : 'WAITING_SAMPLE_COLLECT'
  }

  const statuses = ei.roomExamItems?.map(item => item.status) ?? []
  if (statuses.includes('DONE')) return 'DONE'
  if (statuses.includes('IN_PROGRESS')) return 'IN_PROGRESS'
  if (statuses.includes('CALLED')) return 'CALLED'
  if (statuses.includes('RETEXT')) return 'RETEXT'
  if (statuses.includes('REFUSED')) return 'REFUSED'
  if (statuses.includes('RESCHEDULED')) return 'RESCHEDULED'
  if (statuses.includes('SKIPPED')) return 'SKIPPED'
  if (ei.workStatus === 'RETEXT') return 'RETEXT'
  return statuses[0] ?? 'PENDING'
}

export function getExamItemStatusLabel(status: string): string {
  if (status === 'DONE') return 'Done'
  if (status === 'IN_PROGRESS') return 'In Progress'
  if (status === 'CALLED') return 'Called'
  if (status === 'SKIPPED') return 'Skipped'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'RESCHEDULED') return 'Reschedule'
  if (status === 'REFUSED') return 'Rejected'
  if (status === 'RETEXT') return 'Retest'
  if (status === 'WAITING_SAMPLE' || status === 'WAITING_SAMPLE_COLLECT') return 'Awaiting collection'
  if (status === 'WAITING_SAMPLE_RECEIVE') return 'Awaiting reception'
  if (status === 'REJECTED') return 'Sample Rejected'
  return 'Waiting'
}

export function getExamItemStatusColor(status: string): BadgeColor {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'SKIPPED') return 'neutral'
  if (status === 'CANCELLED') return 'neutral'
  if (status === 'REFUSED') return 'error'
  if (['RESCHEDULED', 'RETEXT'].includes(status)) return 'warning'
  if (status === 'REJECTED') return 'error'
  if (status === 'WAITING_SAMPLE' || status === 'WAITING_SAMPLE_COLLECT') return 'warning'
  if (status === 'WAITING_SAMPLE_RECEIVE') return 'info'
  return 'neutral'
}

export function getExamItemStatusIcon(status: string): string {
  if (status === 'DONE') return 'i-lucide-check-circle-2'
  if (status === 'IN_PROGRESS') return 'i-lucide-loader-circle'
  if (status === 'CALLED') return 'i-lucide-bell'
  if (status === 'REFUSED') return 'i-lucide-ban'
  if (status === 'RETEXT') return 'i-lucide-rotate-ccw'
  if (status === 'REJECTED') return 'i-lucide-ban'
  if (status === 'CANCELLED') return 'i-lucide-ban'
  if (status === 'WAITING_SAMPLE' || status === 'WAITING_SAMPLE_COLLECT' || status === 'WAITING_SAMPLE_RECEIVE') return 'i-lucide-test-tube'
  return 'i-lucide-clock'
}

export function getSampleStatusColor(status: string): BadgeColor {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'neutral'
}

export function getSampleStatusLabel(status: string): string {
  if (status === 'RECEIVED') return 'Received by Lab'
  if (status === 'COLLECTED') return 'Collected'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return 'Waiting for Collection'
}

export function getExamItemUpdatedAt(ei: McuExamItem): string | null {
  const times = (ei.roomExamItems ?? [])
    .map(item => item.updatedAt)
    .filter((value): value is string => Boolean(value))
  if (times.length === 0) return null
  return times.reduce((latest, value) => (value > latest ? value : latest))
}

export function getExamItemStartAt(ei: McuExamItem): string | null {
  const times = (ei.roomExamItems ?? [])
    .map(item => item.startAt)
    .filter((value): value is string => Boolean(value))
  if (times.length === 0) return null
  return times.reduce((earliest, value) => (value < earliest ? value : earliest))
}

export function getExamItemDoneAt(ei: McuExamItem): string | null {
  const times = (ei.roomExamItems ?? [])
    .map(item => item.doneAt)
    .filter((value): value is string => Boolean(value))
  if (times.length === 0) return null
  return times.reduce((latest, value) => (value > latest ? value : latest))
}

export function getExamItemCancelInfo(ei: McuExamItem): { reason: string | null, cancelledAt: string | null, cancelledByName: string | null } {
  const roomItems = ei.roomExamItems ?? []
  const cancelledRoomItem = roomItems.find(item => Boolean(item.cancelReason) || Boolean(item.cancelledAt) || Boolean(item.cancelledByName))
  const reason = cancelledRoomItem?.cancelReason ?? null
  const cancelledByName = cancelledRoomItem?.cancelledByName ?? null
  const times = roomItems
    .map(item => item.cancelledAt)
    .filter((value): value is string => Boolean(value))
  const cancelledAt = times.length
    ? times.reduce((latest, value) => (value > latest ? value : latest))
    : null
  return { reason, cancelledAt, cancelledByName }
}

export function getRescheduleVisitDate(examItems: McuExamItem[], examItemId: string): string {
  const ei = examItems.find(e => e.id === examItemId)
  const re = ei?.roomExamItems?.find(r => r.status === 'RESCHEDULED' && r.rescheduleVisitDate)
  return re?.rescheduleVisitDate?.slice(0, 10) ?? ''
}

function isAttentionSampleStatus(status: string): boolean {
  return status === 'REJECTED' || status === 'RESCHEDULED'
}
function isAttentionItemStatus(status: string): boolean {
  return ['REFUSED', 'RESCHEDULED', 'RETEXT', 'REJECTED'].includes(status)
}

export function buildSampleGroups(label: string, items: McuBreakdownItem[]): McuSampleGroup[] {
  const byType = new Map<string, { name: string, samples: McuSampleCollection[], items: McuBreakdownItem[] }>()
  for (const item of items) {
    for (const sample of item.sampleCollections) {
      const key = sample.sampleType?.id ?? 'unknown'
      const name = sample.sampleType?.name || sample.sampleType?.code || 'Sample'
      if (!byType.has(key)) byType.set(key, { name, samples: [], items: [] })
      const slot = byType.get(key)!
      slot.samples.push(sample)
      if (!slot.items.some(i => i.id === item.id)) slot.items.push(item)
    }
  }
  const out: McuSampleGroup[] = []
  for (const [key, slot] of byType) {
    const recency = (sample: McuSampleCollection) => {
      const value = sample.createdAt ?? sample.collectedAt ?? sample.receivedAt
      const time = value ? new Date(value).getTime() : NaN
      return Number.isNaN(time) ? -1 : time
    }
    const ordered = slot.samples
      .map((sample, index) => ({ sample, index }))
      .sort((a, b) => {
        const diff = recency(a.sample) - recency(b.sample)
        return diff !== 0 ? diff : a.index - b.index
      })
      .map(entry => entry.sample)

    const latest = ordered[ordered.length - 1]
    const status = latest?.status ?? 'PENDING'
    const earlierAttentionCount = ordered
      .slice(0, -1)
      .filter(sample => isAttentionSampleStatus(sample.status))
      .length

    const collected = slot.samples.map(s => s.collectedAt).filter((v): v is string => Boolean(v))
    const received = slot.samples.map(s => s.receivedAt).filter((v): v is string => Boolean(v))
    out.push({
      key: `${label}::${key}`,
      name: slot.name,
      status,
      collectedAt: collected.length ? collected.reduce((a, b) => (a < b ? a : b)) : null,
      receivedAt: received.length ? received.reduce((a, b) => (a > b ? a : b)) : null,
      rejectReason: latest?.rejectReason ?? null,
      itemCount: slot.items.length,
      needsAttention: isAttentionSampleStatus(status) || slot.items.some(i => isAttentionItemStatus(i.status)),
      earlierAttentionCount,
      items: slot.items
    })
  }
  return out
}

export function buildPendingGroups(label: string, pendingItems: McuBreakdownItem[], scope = 'pending'): McuPendingGroup[] {
  const byType = new Map<string, { label: string, items: McuBreakdownItem[] }>()
  for (const item of pendingItems) {
    if (!item.sampleCollections.length) {
      if (!byType.has('no-sample')) byType.set('no-sample', { label: 'Examination', items: [] })
      byType.get('no-sample')!.items.push(item)
      continue
    }
    const seen = new Set<string>()
    for (const sample of item.sampleCollections) {
      const key = sample.sampleType?.id ?? 'unknown'
      if (seen.has(key)) continue
      seen.add(key)
      const name = sample.sampleType?.name || sample.sampleType?.code || 'Sample'
      if (!byType.has(key)) byType.set(key, { label: name, items: [] })
      byType.get(key)!.items.push(item)
    }
  }
  const out: McuPendingGroup[] = []
  for (const [key, slot] of byType) {
    out.push({
      key: `${label}::${scope}::${key}`,
      label: slot.label,
      needsAttention: slot.items.some(i => isAttentionItemStatus(i.status)),
      items: slot.items
    })
  }
  return out
}

export function buildMcuCategories(
  examItems: McuExamItem[],
  sampleCollections: McuSampleCollection[]
): McuBreakdownCategory[] {
  const paketItems = examItems.filter(ei => ei.source === 'paket')
  const grouped = new Map<string, { label: string, icon: string, items: McuBreakdownItem[] }>()

  for (const ei of paketItems) {
    const deptName: string = ei.item.department?.name ?? 'Others'
    if (!grouped.has(deptName)) {
      grouped.set(deptName, {
        label: deptName,
        icon: DEPT_ICON[deptName] ?? 'i-lucide-stethoscope',
        items: []
      })
    }
    const status = getExamItemStatus(ei, sampleCollections)
    const cancelInfo = getExamItemCancelInfo(ei)
    grouped.get(deptName)?.items.push({
      id: ei.id,
      name: ei.item.name,
      status,
      done: status === 'DONE',
      sampleCollections: getSampleCollectionsForItem(sampleCollections, ei.item.id),
      updatedAt: getExamItemUpdatedAt(ei),
      startAt: getExamItemStartAt(ei),
      doneAt: getExamItemDoneAt(ei),
      cancelReason: cancelInfo.reason,
      cancelledAt: cancelInfo.cancelledAt,
      cancelledByName: cancelInfo.cancelledByName
    })
  }

  return [...grouped.values()].map((category) => {
    const cancelledItems = category.items.filter(item => item.status === 'CANCELLED')
    const activeItems = category.items.filter(item => item.status !== 'CANCELLED')
    const completedItems = activeItems.filter(item => item.done)
    const pendingItems = activeItems.filter(item => !item.done)
    const completed = completedItems.length
    const total = activeItems.length
    const rejectedSampleIds = new Set<string>()
    for (const item of activeItems) {
      for (const sample of item.sampleCollections) {
        if (sample.status === 'REJECTED') rejectedSampleIds.add(sample.id)
      }
    }
    const rejectedSampleCount = rejectedSampleIds.size
    const refusedCount = activeItems.filter(item => item.status === 'REFUSED').length
    const updatedAt = category.items.reduce<string | null>(
      (latest, item) =>
        item.updatedAt && (!latest || item.updatedAt > latest) ? item.updatedAt : latest,
      null
    )
    return {
      ...category,
      completed,
      total,
      pending: pendingItems.length,
      rejectedSampleCount,
      refusedCount,
      completedItems,
      pendingItems,
      cancelledItems,
      completedGroups: buildPendingGroups(category.label, completedItems, 'completed'),
      sampleGroups: buildSampleGroups(category.label, activeItems),
      pendingGroups: buildPendingGroups(category.label, pendingItems, 'pending'),
      updatedAt,
      status:
        cancelledItems.length > 0 && activeItems.length === 0
          ? 'CANCELLED'
          : total > 0 && completed === total
            ? 'DONE'
            : category.items.some(item => item.status === 'RETEXT')
              ? 'RETEXT'
              : category.items.some(item => item.status === 'RESCHEDULED')
                ? 'RESCHEDULED'
                : rejectedSampleCount > 0
                  ? 'REJECTED'
                  : refusedCount > 0
                    ? 'REFUSED'
                    : 'PENDING'
    }
  })
}
