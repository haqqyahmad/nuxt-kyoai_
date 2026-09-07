<script setup lang="ts">
import TreadmillQuestionnairePanel from '~/components/rooms/TreadmillQuestionnairePanel.vue'
import EcgResultPanel from '~/components/rooms/EcgResultPanel.vue'

type RoomExamItem = {
  id: string
  status: string
  trxExamItem?: {
    id: string
    examId?: string | null
    exam?: { id: string } | null
    item?: { name?: string | null, code?: string | null, department?: { name?: string | null } | null } | null
  } | null
}

type EcgOverview = {
  treadmill?: {
    questionnaireId?: string | null
    questionnaire?: unknown
    questionnaireAnswers?: Array<{ questionId: string, optionId?: string | null, answerText?: string | null }>
    questionnaireCompleted?: boolean
    registrationId?: number | null
  } | null
}

const props = withDefaults(defineProps<{
  item: RoomExamItem
  canStart: boolean
  canDone: boolean
  canManageActions: boolean
  startLoading: boolean
  doneLoading: boolean
}>(), {})

const emit = defineEmits<{ start: [], done: [], refuse: [], reschedule: [], retest: [], refreshed: [], back: [] }>()
const api = useApi()
const isFinal = computed(() => ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT'].includes(props.item.status))
const canStartItem = computed(() => props.canStart && props.item.status === 'PENDING')
const canDoneItem = computed(() => props.canDone && props.item.status === 'IN_PROGRESS')
const examId = computed(() => props.item.trxExamItem?.exam?.id ?? props.item.trxExamItem?.examId ?? '')
const disabled = computed(() => props.item.status !== 'IN_PROGRESS')

const overview = ref<EcgOverview | null>(null)
const overviewLoading = ref(false)

async function loadOverview() {
  if (!examId.value) return
  overviewLoading.value = true
  try {
    const res = await api.get(`/mcu/exams/${examId.value}/ecg`)
    overview.value = res.data?.data ?? res.data ?? null
  } catch {
    overview.value = null
  } finally {
    overviewLoading.value = false
  }
}
watch(() => examId.value, loadOverview, { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <TreadmillQuestionnairePanel
      :exam-id="examId"
      :questionnaire-id="overview?.treadmill?.questionnaireId ?? null"
      :questionnaire="(overview?.treadmill?.questionnaire as any) ?? null"
      :answers="overview?.treadmill?.questionnaireAnswers ?? []"
      :registration-id="overview?.treadmill?.registrationId ?? null"
      :completed="Boolean(overview?.treadmill?.questionnaireCompleted)"
      :disabled="disabled || overviewLoading"
      @submitted="loadOverview"
    />

    <EcgResultPanel
      :exam-id="examId"
      :physical-exam-all-normal="Boolean(overview?.treadmill?.questionnaireCompleted)"
    />

    <div class="flex flex-wrap justify-end gap-2">
      <UButton
        v-if="canStartItem"
        color="primary"
        :loading="startLoading"
        @click="emit('start')"
      >
        Mulai Pemeriksaan
      </UButton>
      <UButton
        v-if="canDoneItem"
        color="success"
        :loading="doneLoading"
        @click="emit('done')"
      >
        Selesaikan Item
      </UButton>
      <UButton v-if="props.canManageActions && !isFinal" variant="soft" @click="emit('refuse')">
        Pasien Menolak
      </UButton>
    </div>
  </div>
</template>
