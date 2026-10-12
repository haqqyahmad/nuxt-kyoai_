<script setup lang="ts">
import { ref } from 'vue'
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

const deptOpen = ref<Record<string, boolean>>({})
const groupOpen = ref<Record<string, boolean>>({})
function isDeptOpen(key: string): boolean {
  return deptOpen.value[key] ?? false
}
function toggleDept(key: string) {
  deptOpen.value = { ...deptOpen.value, [key]: !isDeptOpen(key) }
}
function isGroupOpen(key: string, attention: boolean): boolean {
  return groupOpen.value[key] ?? attention
}
function toggleGroup(key: string, attention: boolean) {
  groupOpen.value = { ...groupOpen.value, [key]: !isGroupOpen(key, attention) }
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
              <UButton
                :icon="isDeptOpen(cat.label) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                :aria-label="isDeptOpen(cat.label) ? 'Collapse' : 'Expand'"
                @click="toggleDept(cat.label)"
              />
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

        <div v-show="isDeptOpen(cat.label)">
          <div
            v-if="cat.sampleGroups.length"
            class="mt-4 rounded-lg border border-info/30 bg-info/5 p-3"
          >
            <div class="mb-3 flex items-center gap-2">
              <UIcon name="i-lucide-test-tube-diagonal" class="text-info" />
              <p class="text-xs font-semibold uppercase text-muted">
                Sample Status
              </p>
            </div>
            <div class="space-y-3">
              <template v-for="group in cat.sampleGroups" :key="group.key">
                <div
                  class="overflow-hidden rounded-lg border bg-background"
                  :class="group.needsAttention ? 'border-error/40' : 'border-default'"
                >
                  <button
                    class="flex w-full items-center justify-between gap-2 p-3 text-left"
                    @click="toggleGroup(group.key, group.needsAttention)"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-highlighted">
                        {{ group.name }}
                        <UBadge
                          :label="`${group.itemCount} item`"
                          color="neutral"
                          variant="subtle"
                          size="xs"
                          class="ml-1"
                        />
                      </p>
                      <p class="mt-0.5 text-xs text-muted">
                        Collect {{ formatDateTime(group.collectedAt || undefined) }} · Received {{ formatDateTime(group.receivedAt || undefined) }}
                      </p>
                      <p v-if="group.rejectReason" class="mt-0.5 text-xs text-error">
                        {{ group.rejectReason }}
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <UBadge
                        :label="getSampleStatusLabel(group.status)"
                        :color="getSampleStatusColor(group.status)"
                        variant="soft"
                        size="xs"
                      />
                      <UIcon :name="isGroupOpen(group.key, group.needsAttention) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="text-muted" />
                    </div>
                  </button>
                  <div v-show="isGroupOpen(group.key, group.needsAttention)" class="space-y-2 border-t border-default p-3">
                    <div
                      v-for="item in group.items"
                      :key="item.id"
                      class="flex items-center justify-between gap-2 rounded-lg border border-default bg-elevated/40 px-3 py-2"
                    >
                      <span class="text-sm font-medium text-highlighted">{{ item.name }}</span>
                      <UBadge
                        :label="getExamItemStatusLabel(item.status)"
                        :color="getExamItemStatusColor(item.status)"
                        :icon="getExamItemStatusIcon(item.status)"
                        variant="soft"
                        size="xs"
                      />
                    </div>
                  </div>
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
              <div v-if="cat.pendingGroups.length" class="space-y-2">
                <template v-for="group in cat.pendingGroups" :key="group.key">
                  <div
                    class="overflow-hidden rounded-lg border"
                    :class="group.needsAttention ? 'border-warning/40 bg-warning/5' : 'border-default'"
                  >
                    <button
                      class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      @click="toggleGroup(group.key, group.needsAttention)"
                    >
                      <span class="text-xs font-semibold text-highlighted">
                        {{ group.label }}
                        <UBadge
                          :label="`${group.items.length} item`"
                          color="neutral"
                          variant="subtle"
                          size="xs"
                          class="ml-1"
                        />
                      </span>
                      <UIcon :name="isGroupOpen(group.key, group.needsAttention) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="text-muted" />
                    </button>
                    <div v-show="isGroupOpen(group.key, group.needsAttention)" class="border-t border-default p-2">
                      <div class="flex flex-wrap gap-2">
                        <div
                          v-for="item in group.items"
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
                    </div>
                  </div>
                </template>
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
              <div v-if="cat.completedGroups.length" class="space-y-2">
                <template v-for="group in cat.completedGroups" :key="group.key">
                  <div class="overflow-hidden rounded-lg border border-default">
                    <button
                      class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      @click="toggleGroup(group.key, group.needsAttention)"
                    >
                      <span class="text-xs font-semibold text-highlighted">
                        {{ group.label }}
                        <UBadge
                          :label="`${group.items.length} item`"
                          color="success"
                          variant="subtle"
                          size="xs"
                          class="ml-1"
                        />
                      </span>
                      <UIcon :name="isGroupOpen(group.key, group.needsAttention) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="text-muted" />
                    </button>
                    <div v-show="isGroupOpen(group.key, group.needsAttention)" class="border-t border-default p-2">
                      <div class="flex flex-wrap gap-2">
                        <div
                          v-for="item in group.items"
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
                    </div>
                  </div>
                </template>
              </div>
              <p v-else class="text-sm text-muted">
                No completed items yet.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
