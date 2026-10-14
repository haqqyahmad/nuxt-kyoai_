<script setup lang="ts">
import { computed } from 'vue'

type LabPanelItem = {
  id: string
  name?: string | null
  code?: string | null
  resultStatus?: string | null
  departmentResultStatus?: string | null
  itemApproved?: boolean | null
  isExternalResult?: boolean | null
  externalStatus?: string | null
  openRevision?: boolean | null
  roomTypeName?: string | null
}

const props = defineProps<{
  queueCode?: string | null
  items: LabPanelItem[]
  activeItemId?: string | null
}>()

const emit = defineEmits<{
  select: [itemId: string]
}>()

function itemStatus(item: LabPanelItem): string {
  const itemStatus = item.resultStatus ?? 'NOT_READY'
  if (item.isExternalResult && itemStatus !== 'SUBMITTED') {
    if (item.externalStatus === 'PROCESSING') return 'EXTERNAL_PROCESSING'
    if (item.externalStatus === 'ASSIGNED') {
      return item.openRevision ? 'EXTERNAL_RETURNED' : 'EXTERNAL_ASSIGNED'
    }
  }
  if (itemStatus !== 'SUBMITTED') return itemStatus
  if (item.itemApproved) return 'DEPARTMENT_APPROVED'
  if (item.departmentResultStatus === 'RETURNED_TO_DEPARTMENT') return 'DEPARTMENT_RETURNED'
  return item.departmentResultStatus || 'SUBMITTED'
}

function statusLabel(status: string): string {
  if (status === 'DEPARTMENT_REVIEW') return 'Pending Approval'
  if (status === 'DEPARTMENT_APPROVED') return 'Approved'
  if (status === 'SUBMITTED_TO_DOCTOR') return 'Approved · Sent to Doctor'
  if (status === 'RETURNED_TO_DEPARTMENT') return 'Returned'
  if (status === 'DEPARTMENT_RETURNED') return 'Dept Returned'
  if (status === 'EXTERNAL_ASSIGNED') return 'Waiting External Doctor'
  if (status === 'EXTERNAL_PROCESSING') return 'External Doctor Working'
  if (status === 'EXTERNAL_RETURNED') return 'Returned to External Doctor'
  if (status === 'SUBMITTED') return 'Pending Approval'
  if (status === 'PARTIAL') return 'Partially Submitted'
  if (status === 'READY') return 'Ready'
  if (status === 'NOT_READY') return 'Not Ready'
  if (status === 'RETURNED') return 'Returned'
  if (status === 'DRAFT') return 'Draft'
  return status || '-'
}

function statusColor(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'DEPARTMENT_APPROVED' || status === 'SUBMITTED_TO_DOCTOR') return 'success'
  if (status === 'DEPARTMENT_REVIEW' || status === 'SUBMITTED' || status === 'PARTIAL') return 'warning'
  if (status === 'DEPARTMENT_RETURNED') return 'warning'
  if (status === 'EXTERNAL_PROCESSING') return 'warning'
  if (status === 'EXTERNAL_RETURNED') return 'error'
  if (status === 'EXTERNAL_ASSIGNED') return 'neutral'
  if (status === 'RETURNED_TO_DEPARTMENT' || status === 'RETURNED') return 'error'
  return 'neutral'
}

const submittedCount = computed(() => props.items.filter(item => item.resultStatus === 'SUBMITTED').length)
const progress = computed(() => props.items.length
  ? Math.round((submittedCount.value / props.items.length) * 100)
  : 0)
</script>

<template>
  <UCard class="overflow-hidden border border-default/80 shadow-sm">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-base font-semibold">
            Hasil Lab
            <span v-if="queueCode" class="font-mono text-sm text-muted">{{ queueCode }}</span>
          </h3>
          <p class="mt-0.5 text-xs text-muted">
            {{ submittedCount }}/{{ items.length }} submitted
          </p>
        </div>
        <div class="h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:w-48">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${progress}%` }" />
        </div>
      </div>
    </template>

    <div class="flex max-h-96 flex-col gap-1.5 overflow-y-auto p-3">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition"
        :class="item.id === activeItemId
          ? 'border-primary/60 bg-primary/5'
          : 'border-default/60 bg-default hover:bg-muted/40'"
        @click="emit('select', item.id)"
      >
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium text-highlighted">
            {{ item.name || '-' }}
          </span>
          <span class="block text-xs text-muted">
            {{ item.code || '-' }}{{ item.roomTypeName ? ` · ${item.roomTypeName}` : '' }}
          </span>
        </span>
        <UBadge
          :label="statusLabel(itemStatus(item))"
          :color="statusColor(itemStatus(item))"
          variant="subtle"
        />
      </button>
    </div>
  </UCard>
</template>
