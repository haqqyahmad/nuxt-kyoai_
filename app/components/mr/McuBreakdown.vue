<script setup lang="ts">
import {
  buildMcuCategories,
  getExamItemStatusColor,
  getExamItemStatusIcon,
  getExamItemStatusLabel,
  getRescheduleVisitDate,
  getSampleStatusColor,
  getSampleStatusLabel
} from '~/composables/mr/useMcuBreakdown'
import type { McuBreakdownCategory, McuExamItem, McuSampleCollection } from '~/composables/mr/useMcuBreakdown'

const props = defineProps<{
  examItems: McuExamItem[]
  sampleCollections: McuSampleCollection[]
}>()

const mcuCategories = computed(() =>
  buildMcuCategories(props.examItems, props.sampleCollections)
)

function formatDateTime(value?: string | null) {
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

function rescheduleDate(id: string) {
  return getRescheduleVisitDate(props.examItems, id)
}

function categoryBadgeLabel(cat: McuBreakdownCategory): string {
  if (cat.status === 'REJECTED') {
    return cat.rejectedSampleCount > 1 ? `${cat.rejectedSampleCount} Samples Rejected` : 'Sample Rejected'
  }
  if (cat.status === 'REFUSED') {
    return cat.refusedCount > 1 ? `${cat.refusedCount} Rejected` : 'Rejected'
  }
  return getExamItemStatusLabel(cat.status)
}

function categoryBadgeIcon(cat: McuBreakdownCategory): string {
  if (cat.status === 'DONE') return 'i-lucide-check-circle-2'
  if (cat.status === 'REJECTED' || cat.status === 'REFUSED') return 'i-lucide-ban'
  if (cat.status === 'RESCHEDULED' || cat.status === 'RETEXT') return 'i-lucide-rotate-ccw'
  return 'i-lucide-clock'
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-default bg-background shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default px-5 py-4">
      <h3 class="flex items-center gap-2 font-semibold">
        <UIcon name="i-lucide-activity" class="text-primary" />
        MCU Breakdown
      </h3>
      <UBadge
        :label="`${mcuCategories.length} department`"
        color="neutral"
        variant="subtle"
        size="sm"
      />
    </div>

    <div class="divide-y divide-default">
      <section v-for="cat in mcuCategories" :key="cat.label" class="px-5 py-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <UIcon :name="cat.icon" class="text-primary" />
              <h4 class="text-sm font-semibold text-highlighted">
                {{ cat.label }}
              </h4>
              <UBadge
                :label="categoryBadgeLabel(cat)"
                :color="getExamItemStatusColor(cat.status)"
                variant="soft"
                size="xs"
                :icon="categoryBadgeIcon(cat)"
              />
              {{ cat.updatedAt ? formatDateTime(cat.updatedAt) : '' }}
            </div>
            <p class="mt-1 text-xs text-muted">
              {{ cat.completed }} of {{ cat.total }} items completed
            </p>
          </div>

          <div class="w-full lg:max-w-xs">
            <div class="mb-1 flex items-center justify-between text-xs text-muted">
              <span>Progress</span>
              <span class="font-medium text-highlighted">{{ cat.completed }}/{{ cat.total }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full rounded-full bg-primary"
                :style="{
                  width: `${cat.total ? Math.round((cat.completed / cat.total) * 100) : 0}%`
                }"
              />
            </div>
          </div>
        </div>

        <div
          v-if="cat.items.some((item) => item.sampleCollections.length)"
          class="mt-4 rounded-lg border border-info/30 bg-info/5 p-3"
        >
          <div class="mb-3 flex items-center gap-2">
            <UIcon name="i-lucide-test-tube-diagonal" class="text-info" />
            <p class="text-xs font-semibold uppercase text-muted">
              Sample Status
            </p>
          </div>
          <div class="space-y-3">
            <template v-for="item in cat.items" :key="`sample-${item.id}`">
              <div
                v-for="sample in item.sampleCollections"
                :key="sample.id"
                class="grid gap-2 rounded-lg border border-default bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-highlighted">
                    {{ item.name }} ·
                    {{ sample.sampleType?.name || sample.sampleType?.code || 'Sample' }}
                  </p>
                  <p v-if="sample.rejectReason" class="mt-0.5 text-xs text-error">
                    {{ sample.rejectReason }}
                  </p>
                </div>
                <div class="text-xs text-muted">
                  <span class="block font-medium text-highlighted">Collect</span>
                  {{ formatDateTime(sample.collectedAt || undefined) }}
                </div>
                <div class="text-xs text-muted">
                  <span class="block font-medium text-highlighted">Received</span>
                  {{ formatDateTime(sample.receivedAt || undefined) }}
                </div>
                <UBadge
                  class="sm:col-start-1"
                  :label="
                    item.status === 'REFUSED'
                      ? 'Rejected'
                      : item.status === 'RESCHEDULED'
                        ? 'Reschedule'
                        : getSampleStatusLabel(sample.status)
                  "
                  :color="
                    item.status === 'REFUSED'
                      ? 'error'
                      : item.status === 'RESCHEDULED'
                        ? 'warning'
                        : getSampleStatusColor(sample.status)
                  "
                  variant="soft"
                  size="xs"
                />
              </div>
            </template>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div class="rounded-lg border border-default bg-elevated/40 p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-xs font-semibold uppercase text-muted">
                Not Completed
              </p>
              <UBadge
                :label="`${cat.pendingItems.length} item`"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </div>
            <div v-if="cat.pendingItems.length" class="flex flex-wrap gap-2">
              <div
                v-for="item in cat.pendingItems"
                :key="item.id"
                class="flex max-w-full flex-col gap-1 whitespace-normal rounded-xl border px-3 py-2"
                :class="
                  getExamItemStatusColor(item.status) === 'error'
                    ? 'border-error/40 bg-error/10'
                    : getExamItemStatusColor(item.status) === 'warning'
                      ? 'border-warning/40 bg-warning/10'
                      : 'border-default bg-elevated/60'
                "
              >
                <span class="flex items-center gap-1.5 text-sm font-semibold text-highlighted">
                  <UIcon :name="getExamItemStatusIcon(item.status)" class="size-4 shrink-0" />
                  {{ item.name }}
                </span>
                <span
                  v-if="['RESCHEDULED', 'REFUSED', 'RETEXT', 'REJECTED'].includes(item.status)"
                  class="flex items-center gap-1.5 text-[11px] font-semibold"
                  :class="
                    getExamItemStatusColor(item.status) === 'error' ? 'text-error' : 'text-warning'
                  "
                >
                  <UIcon :name="getExamItemStatusIcon(item.status)" class="size-3.5 shrink-0" />
                  {{ getExamItemStatusLabel(item.status) }} — FO Attention Required.{{
                    item.status === 'RESCHEDULED' && rescheduleDate(item.id)
                      ? ` (${rescheduleDate(item.id)})`
                      : ''
                  }}
                </span>
                <span class="flex items-center gap-1 text-[11px] font-medium text-muted">
                  <UIcon name="i-lucide-play" class="size-3" />
                  Start {{ formatDateTime(item.startAt || undefined) }}
                  <span class="mx-1 text-muted">·</span>
                  <UIcon name="i-lucide-check" class="size-3" />
                  Done
                  {{ item.done ? formatDateTime(item.doneAt || undefined) : 'Not yet' }}
                </span>
              </div>
            </div>
            <p v-else class="text-sm text-muted">
              No pending items.
            </p>
          </div>

          <div class="rounded-lg border border-default bg-background p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-xs font-semibold uppercase text-muted">
                Completed
              </p>
              <UBadge
                :label="`${cat.completedItems.length} item`"
                color="success"
                variant="subtle"
                size="xs"
              />
            </div>
            <div v-if="cat.completedItems.length" class="flex flex-wrap gap-2">
              <div
                v-for="item in cat.completedItems"
                :key="item.id"
                class="flex max-w-full flex-col gap-1 whitespace-normal rounded-xl border border-success/30 bg-success/10 px-3 py-2"
              >
                <span class="flex items-center gap-1.5 text-sm font-semibold text-highlighted">
                  <UIcon name="i-lucide-check-circle-2" class="size-4 shrink-0 text-success" />
                  {{ item.name }}
                </span>
                <span class="flex items-center gap-1 text-[11px] font-medium text-muted">
                  <UIcon name="i-lucide-play" class="size-3" />
                  Start {{ formatDateTime(item.startAt || undefined) }}
                  <span class="mx-1 text-muted">·</span>
                  <UIcon name="i-lucide-check" class="size-3" />
                  Done {{ formatDateTime(item.doneAt || undefined) }}
                </span>
              </div>
            </div>
            <p v-else class="text-sm text-muted">
              No completed items yet.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
