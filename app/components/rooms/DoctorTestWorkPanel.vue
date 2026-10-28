<script setup lang="ts">
import DoctorTestPanel from './DoctorTestPanel.vue'

type RoomExamItem = { id: string, status: string, trxExamItem?: { id: string, exam?: { id: string } | null } | null }
const props = withDefaults(defineProps<{ item: RoomExamItem, canStart: boolean, canDone: boolean, startLoading: boolean, doneLoading: boolean, canManageActions: boolean, canCancel?: boolean, cancelLoading?: boolean, canUncancel?: boolean, uncancelLoading?: boolean }>(), {})
const emit = defineEmits<{ start: [], done: [], cancel: [], uncancel: [], refuse: [], reschedule: [], retest: [], refreshed: [] }>()
const isFinal = computed(() => ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT', 'CANCELLED'].includes(props.item.status))
const examId = computed(() => props.item.trxExamItem?.exam?.id ?? '')
const examItemId = computed(() => props.item.trxExamItem?.id ?? '')
</script>

<template>
  <div class="space-y-4">
    <DoctorTestPanel
      :exam-id="examId"
      :exam-item-id="examItemId"
      :disabled="item.status !== 'IN_PROGRESS'"
      @saved="emit('refreshed')"
      @submitted="emit('refreshed')"
    />
    <div class="flex flex-wrap justify-end gap-2">
      <UButton
        v-if="props.canStart && item.status === 'PENDING'"
        color="primary"
        :loading="startLoading"
        @click="emit('start')"
      >
        Start Examination
      </UButton>
      <UButton
        v-if="canCancel"
        color="error"
        variant="soft"
        icon="i-lucide-ban"
        :loading="cancelLoading"
        @click="emit('cancel')"
      >
        Cancel Item
      </UButton>
      <UButton
        v-if="canUncancel"
        color="success"
        variant="soft"
        icon="i-lucide-rotate-ccw"
        :loading="uncancelLoading"
        @click="emit('uncancel')"
      >
        Un Cancel Item
      </UButton>
      <UButton
        v-if="props.canDone && item.status === 'IN_PROGRESS'"
        color="success"
        :loading="doneLoading"
        @click="emit('done')"
      >
        Complete Item
      </UButton>
      <UButton v-if="props.canManageActions && !isFinal" variant="soft" @click="emit('refuse')">
        Patient Refused
      </UButton>
    </div>
  </div>
</template>
