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
}

export type McuBreakdownCategory = {
  label: string
  icon: string
  items: McuBreakdownItem[]
  completed: number
  total: number
  pending: number
  rejectedCount: number
  refusedCount: number
  completedItems: McuBreakdownItem[]
  pendingItems: McuBreakdownItem[]
  updatedAt: string | null
  status: string
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
  const samples = getSampleCollectionsForItem(sampleCollections, ei.item.id)
  if (samples.length > 0) {
    const roomStatuses = ei.roomExamItems?.map(item => item.status) ?? []
    if (roomStatuses.includes('REFUSED')) return 'REFUSED'
    if (ei.workStatus === 'DONE') return 'DONE'
    if (samples.every(s => s.status === 'RECEIVED')) return 'DONE'
    if (roomStatuses.includes('RESCHEDULED')) return 'RESCHEDULED'
    if (samples.some(s => s.status === 'RESCHEDULED')) return 'RESCHEDULED'
    if (samples.some(s => s.status === 'REJECTED')) return 'REJECTED'
    return 'WAITING_SAMPLE'
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
  if (status === 'RESCHEDULED') return 'Reschedule'
  if (status === 'REFUSED') return 'Rejected'
  if (status === 'RETEXT') return 'Retest'
  if (status === 'WAITING_SAMPLE') return 'Waiting Sample'
  if (status === 'REJECTED') return 'Sample Rejected'
  return 'Waiting'
}

export function getExamItemStatusColor(status: string): BadgeColor {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (['SKIPPED', 'RESCHEDULED'].includes(status)) return 'neutral'
  if (status === 'REFUSED') return 'error'
  if (status === 'RETEXT') return 'warning'
  if (status === 'REJECTED') return 'error'
  if (status === 'WAITING_SAMPLE') return 'warning'
  return 'neutral'
}

export function getExamItemStatusIcon(status: string): string {
  if (status === 'DONE') return 'i-lucide-check-circle-2'
  if (status === 'IN_PROGRESS') return 'i-lucide-loader-circle'
  if (status === 'CALLED') return 'i-lucide-bell'
  if (status === 'REFUSED') return 'i-lucide-ban'
  if (status === 'RETEXT') return 'i-lucide-rotate-ccw'
  if (status === 'REJECTED') return 'i-lucide-ban'
  if (status === 'WAITING_SAMPLE') return 'i-lucide-test-tube'
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

export function getRescheduleVisitDate(examItems: McuExamItem[], examItemId: string): string {
  const ei = examItems.find(e => e.id === examItemId)
  const re = ei?.roomExamItems?.find(r => r.status === 'RESCHEDULED' && r.rescheduleVisitDate)
  return re?.rescheduleVisitDate?.slice(0, 10) ?? ''
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
    grouped.get(deptName)?.items.push({
      id: ei.id,
      name: ei.item.name,
      status,
      done: status === 'DONE',
      sampleCollections: getSampleCollectionsForItem(sampleCollections, ei.item.id),
      updatedAt: getExamItemUpdatedAt(ei),
      startAt: getExamItemStartAt(ei),
      doneAt: getExamItemDoneAt(ei)
    })
  }

  return [...grouped.values()].map((category) => {
    const completedItems = category.items.filter(item => item.done)
    const pendingItems = category.items.filter(item => !item.done)
    const completed = completedItems.length
    const total = category.items.length
    const rejectedCount = category.items.filter(item => item.status === 'REJECTED').length
    const refusedCount = category.items.filter(item => item.status === 'REFUSED').length
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
      rejectedCount,
      refusedCount,
      completedItems,
      pendingItems,
      updatedAt,
      status:
        total > 0 && completed === total
          ? 'DONE'
          : category.items.some(item => item.status === 'RETEXT')
            ? 'RETEXT'
            : category.items.some(item => item.status === 'RESCHEDULED')
              ? 'RESCHEDULED'
              : rejectedCount > 0
                ? 'REJECTED'
                : refusedCount > 0
                  ? 'REFUSED'
                  : 'PENDING'
    }
  })
}
