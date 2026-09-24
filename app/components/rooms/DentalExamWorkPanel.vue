<script setup lang="ts">
import DentalExamPanel from '~/components/DentalExamPanel.vue'

type RoomExamItem = {
  id: string
  status: string
  trxExamItem?: {
    id: string
    templateSnapshotAt?: string | null
    resultStatus?: string | null
    exam?: {
      id: string
      status: string
    } | null
    item?: {
      code?: string | null
      name?: string | null
      department?: {
        code?: string | null
        name?: string | null
      } | null
    } | null
  } | null
}

const props = defineProps<{
  item: RoomExamItem
  canStart: boolean
  canDone: boolean
  canManageActions: boolean
  startLoading: boolean
  doneLoading: boolean
}>()

const emit = defineEmits<{
  start: []
  done: []
  refuse: []
  reschedule: []
  retest: []
  refreshed: []
  back: []
}>()

const isFinal = computed(() =>
  ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT'].includes(props.item.status)
)

const canStartItem = computed(() => props.canStart && props.item.status === 'PENDING')
const canDoneItem = computed(() => props.canDone && props.item.status === 'IN_PROGRESS')
const examId = computed(() => props.item.trxExamItem?.exam?.id ?? '')

// "Selesaikan Item" hanya muncul setelah pengguna menyimpan draft dental.
const draftSaved = ref(false)
function onDentalSaved() {
  draftSaved.value = true
  emit('refreshed')
}
</script>

<template>
  <UCard class="dental-work-panel overflow-hidden border-2 border-teal-500/40 shadow-md">
    <template #header>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow">
            <UIcon name="i-lucide-stethoscope" class="size-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-teal-600">
                Dental Only
              </p>
              <UBadge color="primary" variant="solid" label="Dental Exam" />
            </div>
            <h3 class="mt-0.5 text-lg font-bold text-highlighted">
              {{ item.trxExamItem?.item?.name || 'Dental Examination' }}
            </h3>
            <p class="text-xs text-muted">
              {{ item.trxExamItem?.item?.code || 'DENTAL_EXAM' }}
              <template v-if="item.trxExamItem?.item?.department?.name">
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
          <UBadge
            :label="isFinal ? 'Completed' : item.status === 'IN_PROGRESS' ? 'In Progress' : 'Waiting'"
            :color="item.status === 'DONE' ? 'success' : item.status === 'IN_PROGRESS' ? 'warning' : 'neutral'"
            variant="subtle"
          />

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
            v-if="canDoneItem && draftSaved"
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
        description="The dental item can be started once the active stage moves to EXAM and the 'Start Item' button is available."
      />

      <div class="rounded-xl border border-teal-500/30 bg-teal-50/60 p-3 text-sm text-teal-700 dark:bg-teal-500/5 dark:text-teal-300">
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-sparkles" class="mt-0.5 size-4 shrink-0" />
          <p>
            The dental examination form follows the Dental department template. In this room, save as a draft,
            then complete the item and room. Final submission of dental results is done from the Result menu after the item is completed.
          </p>
        </div>
      </div>

      <DentalExamPanel
        v-if="examId"
        :exam-id="examId"
        :disabled="item.status !== 'IN_PROGRESS'"
        :show-submit="false"
        @saved="onDentalSaved"
      />

      <UAlert
        v-else
        color="neutral"
        variant="soft"
        icon="i-lucide-shield-alert"
        description="Dental exam ID not found for this item."
      />
    </div>
  </UCard>
</template>
