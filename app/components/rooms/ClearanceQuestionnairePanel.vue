<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type QstOption = { id: string, label: string, value?: string | null, sortOrder?: number }
type QstQuestion = { id: string, questionText: string, questionType?: string, isRequired?: boolean, sortOrder?: number, options?: QstOption[] }
type QstSection = { id: string, sectionTitle?: string, sectionCode?: string | null, sortOrder?: number, questions?: QstQuestion[] }
type Questionnaire = { id: string, questionnaire_code?: string | null, questionnaire_name?: string | null, sections?: QstSection[] }
type Answer = { questionId: string, optionId?: string | null, optionIds?: string[] | null, answerText?: string | null }

type ClearanceContext = {
  questionnaireId: string | null
  questionnaire: Questionnaire | null
  answers: Answer[]
  completed: boolean
  registrationId: number | null
}

const props = withDefaults(defineProps<{
  examId: string
  examItemId: string
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{ submitted: [] }>()
const api = useApi()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const context = ref<ClearanceContext | null>(null)
const selections = ref<Record<string, string>>({})

const questionnaire = computed(() => context.value?.questionnaire ?? null)
const questions = computed<QstQuestion[]>(() =>
  (questionnaire.value?.sections ?? []).flatMap(s => s.questions ?? [])
)
const requiredQuestions = computed(() => questions.value.filter(q => q.isRequired !== false))
const hasQuestionnaire = computed(() => Boolean(context.value?.questionnaireId && questionnaire.value))
const allAnswered = computed(() => {
  const reqs = requiredQuestions.value
  if (!reqs.length) return false
  return reqs.every(q => Boolean(selections.value[q.id]))
})
const isComplete = computed(() => Boolean(context.value?.completed))

function seed() {
  const map: Record<string, string> = {}
  for (const a of context.value?.answers ?? []) {
    if (a.questionId && a.optionId) map[a.questionId] = a.optionId
  }
  selections.value = map
}

async function load() {
  if (!props.examId || !props.examItemId) {
    context.value = null
    return
  }
  loading.value = true
  try {
    const res = await api.get(
      `/mcu/exams/${props.examId}/items/${props.examItemId}/clearance-questionnaire`
    )
    context.value = (res.data?.data ?? res.data ?? null) as ClearanceContext | null
  } catch {
    context.value = null
  } finally {
    loading.value = false
  }
}

watch(() => [props.examId, props.examItemId], load, { immediate: true })
watch(() => context.value, seed, { immediate: true, deep: true })

async function save() {
  if (!props.examId || !props.examItemId) {
    toast.add({ title: 'Cannot save', description: 'Exam data is not available.', color: 'warning' })
    return
  }
  if (!allAnswered.value) {
    toast.add({ title: 'Incomplete', description: 'All required questions must be answered.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const answers = questions.value
      .map(q => ({ questionId: q.id, optionId: selections.value[q.id] ?? null }))
      .filter(a => a.optionId)
    await api.post(
      `/mcu/exams/${props.examId}/items/${props.examItemId}/clearance-questionnaire`,
      { answers }
    )
    toast.add({ title: 'Saved', description: 'Questionnaire answers saved.', color: 'success' })
    emit('submitted')
    await load()
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Questionnaire answers could not be saved.'
    toast.add({ title: 'Failed to save', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard v-if="loading" class="border border-primary/20 shadow-sm">
    <div class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-xl text-muted" />
    </div>
  </UCard>

  <UCard v-else-if="hasQuestionnaire" class="border border-primary/20 shadow-sm">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-primary">
            Clearance Questionnaire
          </p>
          <h3 class="mt-1 text-base font-semibold text-highlighted">
            {{ questionnaire?.questionnaire_name || 'Screening' }}
          </h3>
        </div>
        <UBadge
          :label="isComplete ? 'Completed' : `${Object.keys(selections).length}/${requiredQuestions.length} answered`"
          :color="isComplete ? 'success' : 'warning'"
          variant="subtle"
        />
      </div>
    </template>

    <div class="space-y-3">
      <div
        v-for="(q, i) in questions"
        :key="q.id"
        class="rounded-xl border border-default p-4"
      >
        <p class="text-sm font-semibold text-highlighted">
          {{ i + 1 }}. {{ q.questionText }}
          <span v-if="q.isRequired" class="text-error">*</span>
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="opt in (q.options ?? [])"
            :key="opt.id"
            type="button"
            :disabled="disabled"
            class="rounded-lg border px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
            :class="selections[q.id] === opt.id
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-default text-highlighted hover:bg-muted/30'"
            @click="selections[q.id] = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
        <UBadge
          :label="isComplete ? 'Completed' : (allAnswered ? 'All answered' : 'All required questions must be answered')"
          :color="isComplete || allAnswered ? 'success' : 'warning'"
          variant="soft"
        />
        <UButton
          color="primary"
          icon="i-lucide-save"
          :loading="saving"
          :disabled="disabled || !allAnswered"
          @click="save"
        >
          Save Answers
        </UButton>
      </div>
    </div>
  </UCard>
</template>
