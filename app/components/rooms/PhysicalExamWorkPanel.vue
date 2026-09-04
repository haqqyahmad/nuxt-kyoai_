<script setup lang="ts">
import PhysicalExamPanel from '~/components/rooms/PhysicalExamPanel.vue'
import TreadmillQuestionnairePanel from '~/components/rooms/TreadmillQuestionnairePanel.vue'
import EcgResultPanel from '~/components/rooms/EcgResultPanel.vue'

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

type QstOption = { id: string, label: string, value?: string | null, sortOrder?: number }
type QstQuestion = { id: string, questionText: string, questionType?: string, isRequired?: boolean, sortOrder?: number, options?: QstOption[] }
type QstSection = { id: string, sectionTitle?: string, sectionCode?: string | null, sortOrder?: number, questions?: QstQuestion[] }
type TreadmillQuestionnaire = { id: string, questionnaire_code?: string | null, questionnaire_name?: string | null, sections?: QstSection[] }
type QuestionnaireAnswer = { questionId: string, optionId?: string | null, answerText?: string | null }

type EcgOverview = {
  treadmill?: {
    questionnaireId?: string | null
    questionnaire?: TreadmillQuestionnaire | null
    questionnaireAnswers?: QuestionnaireAnswer[]
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
  legacyResults?: LegacyRow[]
}>(), { legacyResults: () => [] })

const emit = defineEmits<{ start: [], done: [], refuse: [], reschedule: [], retest: [], refreshed: [], back: [] }>()
const api = useApi()
const isFinal = computed(() => ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT'].includes(props.item.status))
const canStartItem = computed(() => props.canStart && props.item.status === 'PENDING')
const canDoneItem = computed(() => props.canDone && props.item.status === 'IN_PROGRESS')
const examId = computed(() => props.item.trxExamItem?.exam?.id ?? props.item.trxExamItem?.examId ?? '')
const examItemId = computed(() => props.item.trxExamItem?.id ?? '')
const disabled = computed(() => props.item.status !== 'IN_PROGRESS')

const overview = ref<EcgOverview | null>(null)
const overviewLoading = ref(false)
const activeTab = ref<'physical' | 'treadmill'>('physical')

const hasTreadmill = computed(() => Boolean(overview.value?.treadmill))
const questionnaireCompleted = computed(() => Boolean(overview.value?.treadmill?.questionnaireCompleted))
const revealTreadmill = computed(() => hasTreadmill.value && activeTab.value === 'treadmill')

// Gating approve treadmill: Physical DONE + (tanpa treadmill ATAU questionnaire lengkap).
const canApproveTreadmill = computed(() =>
  props.item.status === 'DONE' && (!hasTreadmill.value || questionnaireCompleted.value)
)

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
  <UCard class="overflow-hidden border-2 border-primary/30 shadow-md">
    <template #header>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow">
            <UIcon name="i-lucide-stethoscope" class="size-6" />
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">
              Pemeriksaan Dokter
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
            Kembali
          </UButton>
          <UBadge :label="isFinal ? 'Selesai' : item.status === 'IN_PROGRESS' ? 'Sedang dikerjakan' : 'Menunggu'" :color="item.status === 'DONE' ? 'success' : item.status === 'IN_PROGRESS' ? 'warning' : 'neutral'" variant="subtle" />
          <UButton
            v-if="canStartItem"
            color="primary"
            icon="i-lucide-play"
            :loading="startLoading"
            @click="emit('start')"
          >
            Mulai Item
          </UButton>
          <UButton
            v-if="canDoneItem"
            color="success"
            icon="i-lucide-check"
            :loading="doneLoading"
            :disabled="!canDone"
            @click="emit('done')"
          >
            Selesaikan Item
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
            Pasien Menolak
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
        title="Menunggu tahap EXAM"
        description="Pemeriksaan fisik dapat dimulai setelah stage aktif berpindah ke EXAM."
      />

      <UTabs
        v-if="hasTreadmill"
        v-model="activeTab"
        :items="[
          { label: 'Physical', value: 'physical' },
          { label: 'Treadmill Questionnaire', value: 'treadmill' }
        ]"
      />

      <PhysicalExamPanel
        v-if="examId && examItemId && (activeTab === 'physical' || !hasTreadmill)"
        :exam-id="examId"
        :exam-item-id="examItemId"
        :disabled="disabled"
        :legacy-results="legacyResults"
        @saved="emit('refreshed')"
        @submitted="emit('refreshed')"
      />

      <TreadmillQuestionnairePanel
        v-if="revealTreadmill"
        :exam-id="examId"
        :questionnaire-id="overview?.treadmill?.questionnaireId ?? null"
        :questionnaire="overview?.treadmill?.questionnaire ?? null"
        :answers="overview?.treadmill?.questionnaireAnswers ?? []"
        :registration-id="overview?.treadmill?.registrationId ?? null"
        :completed="Boolean(overview?.treadmill?.questionnaireCompleted)"
        :disabled="disabled || overviewLoading"
        @submitted="loadOverview"
      />

      <!-- Panel ECG + clearance treadmill → tampil dari awal di bawah panel Physical.
           Tombol APPROVE baru muncul setelah Physical DONE (dan questionnaire
           treadmill lengkap bila ada treadmill) — dikendalikan canApproveTreadmill. -->
      <EcgResultPanel
        v-if="examId"
        class="mt-4"
        :exam-id="examId"
        :physical-exam-all-normal="canApproveTreadmill"
      />

      <UAlert
        v-if="!examId || !examItemId"
        color="neutral"
        variant="soft"
        icon="i-lucide-shield-alert"
        description="Data exam untuk item ini belum tersedia."
      />
    </div>
  </UCard>
</template>
