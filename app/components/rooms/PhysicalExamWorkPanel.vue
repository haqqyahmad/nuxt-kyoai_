<script setup lang="ts">
import PhysicalExamPanel from '~/components/rooms/PhysicalExamPanel.vue'

type RoomExamItem = {
  id: string
  status: string
  trxExamItem?: {
    id: string
    examId?: string | null
    resultStatus?: string | null
    exam?: { id: string } | null
    item?: { name?: string | null, code?: string | null, department?: { name?: string | null } | null } | null
  } | null
}

type LegacyRow = { id: string, label: string, value: string, uom?: string | null, flag?: 'normal' | 'abnormal' | null }

const props = withDefaults(defineProps<{
  item: RoomExamItem
  canStart: boolean
  canDone: boolean
  canManageActions: boolean
  startLoading: boolean
  doneLoading: boolean
  legacyResults?: LegacyRow[]
}>(), { legacyResults: () => [] })

const emit = defineEmits<{ start: [], done: [], refuse: [], reschedule: [], retest: [], refreshed: [], back: [] }>()
const isFinal = computed(() => ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT'].includes(props.item.status))
const canStartItem = computed(() => props.canStart && props.item.status === 'PENDING')
const canDoneItem = computed(() => props.canDone && props.item.status === 'IN_PROGRESS')
const examId = computed(() => props.item.trxExamItem?.exam?.id ?? props.item.trxExamItem?.examId ?? '')
const examItemId = computed(() => props.item.trxExamItem?.id ?? '')
const disabled = computed(() => props.item.status !== 'IN_PROGRESS')
</script>

<template>
  <UCard class="overflow-hidden border-2 border-primary/30 shadow-md">
    <template #header>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow">
            <UIcon name="i-lucide-stethoscope" class="size-6" />
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">
              Doctor Examination
            </p>
            <h3 class="mt-0.5 text-lg font-bold text-highlighted">
              {{ item.trxExamItem?.item?.name || 'Physical Examination' }}
            </h3>
            <p class="text-xs text-muted">
              {{ item.trxExamItem?.item?.code || 'PHYSICAL_EXAMINATION' }}<template v-if="item.trxExamItem?.item?.department?.name">
                · {{ item.trxExamItem.item.department.name }}
              </template>
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-arrow-left"
            @click="emit('back')"
          >
            Back
          </UButton>
          <UBadge :label="isFinal ? 'Completed' : item.status === 'IN_PROGRESS' ? 'In Progress' : 'Waiting'" :color="item.status === 'DONE' ? 'success' : item.status === 'IN_PROGRESS' ? 'warning' : 'neutral'" variant="subtle" />
          <UButton
            v-if="canStartItem"
            color="primary"
            icon="i-lucide-play"
            :loading="startLoading"
            @click="emit('start')"
          >
            Start Item
          </UButton>
          <UButton
            v-if="canDoneItem"
            color="success"
            icon="i-lucide-check"
            :loading="doneLoading"
            :disabled="!canDone"
            @click="emit('done')"
          >
            Complete Item
          </UButton>
          <UButton
            v-if="canManageActions && !isFinal"
            color="warning"
            variant="soft"
            icon="i-lucide-calendar-clock"
            @click="emit('reschedule')"
          >
            Reschedule
          </UButton>
          <UButton
            v-if="canManageActions && !isFinal"
            color="primary"
            variant="soft"
            icon="i-lucide-refresh-cw"
            @click="emit('retest')"
          >
            Retest
          </UButton>
          <UButton
            v-if="canManageActions && !isFinal"
            color="error"
            variant="soft"
            icon="i-lucide-ban"
            @click="emit('refuse')"
          >
            Patient Refused
          </UButton>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="item.status === 'PENDING' && !canStartItem"
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Waiting for EXAM stage"
        description="Physical examination can be started once the active stage moves to EXAM."
      />

      <PhysicalExamPanel
        v-if="examId && examItemId"
        :exam-id="examId"
        :exam-item-id="examItemId"
        :disabled="disabled"
        :legacy-results="legacyResults"
        @saved="emit('refreshed')"
        @submitted="emit('refreshed')"
      />

      <UAlert
        v-if="!examId || !examItemId"
        color="neutral"
        variant="soft"
        icon="i-lucide-shield-alert"
        description="Exam data for this item is not yet available."
      />
    </div>
  </UCard>
</template>
