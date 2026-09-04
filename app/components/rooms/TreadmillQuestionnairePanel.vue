<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type QstOption = { id: string, label: string, value?: string | null, sortOrder?: number }
type QstQuestion = { id: string, questionText: string, questionType?: string, isRequired?: boolean, sortOrder?: number, options?: QstOption[] }
type QstSection = { id: string, sectionTitle?: string, sectionCode?: string | null, sortOrder?: number, questions?: QstQuestion[] }
type Questionnaire = { id: string, questionnaire_code?: string | null, questionnaire_name?: string | null, sections?: QstSection[] }
type Answer = { questionId: string, optionId?: string | null, answerText?: string | null }

const props = withDefaults(defineProps<{
  examId: string
  questionnaireId?: string | null
  questionnaire?: Questionnaire | null
  answers?: Answer[]
  registrationId?: number | null
  disabled?: boolean
  completed?: boolean
}>(), { questionnaireId: null, questionnaire: null, answers: () => [], registrationId: null, disabled: false, completed: false })

const emit = defineEmits<{ submitted: [] }>()
const api = useApi()
const toast = useToast()

const selections = ref<Record<string, string>>({})
const saving = ref(false)

const questions = computed<QstQuestion[]>(() =>
  (props.questionnaire?.sections ?? []).flatMap(s => s.questions ?? [])
)
const requiredQuestions = computed(() => questions.value.filter(q => q.isRequired !== false))
const allAnswered = computed(() => {
  const reqs = requiredQuestions.value
  if (!reqs.length) return false
  return reqs.every(q => Boolean(selections.value[q.id]))
})
const isComplete = computed(() => Boolean(props.completed))

function seed() {
  const map: Record<string, string> = {}
  for (const a of props.answers ?? []) {
    if (a.questionId && a.optionId) map[a.questionId] = a.optionId
  }
  selections.value = map
}

watch(
  () => [props.answers, props.questionnaire],
  seed,
  { immediate: true, deep: true }
)

async function save() {
  if (!props.examId || !props.questionnaireId || props.registrationId == null) {
    toast.add({ title: 'Belum bisa disimpan', description: 'Data registration atau questionnaire belum tersedia.', color: 'warning' })
    return
  }
  if (!allAnswered.value) {
    toast.add({ title: 'Belum lengkap', description: 'Semua pertanyaan wajib dijawab.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const answers = questions.value
      .map(q => ({ questionId: q.id, optionId: selections.value[q.id] ?? null }))
      .filter(a => a.optionId)
    await api.post(`/mcu/exams/${props.examId}/ecg/treadmill-questionnaire`, { answers })
    toast.add({ title: 'Tersimpan', description: 'Jawaban Treadmill Questionnaire tersimpan.', color: 'success' })
    emit('submitted')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Jawaban tidak dapat disimpan.'
    toast.add({ title: 'Gagal simpan', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard class="border border-primary/20 shadow-sm">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-primary">
            Treadmill Questionnaire
          </p>
          <h3 class="mt-1 text-base font-semibold text-highlighted">
            {{ questionnaire?.questionnaire_name || 'Screening' }}
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <UBadge :label="isComplete ? 'Lengkap' : `${Object.keys(selections).length}/${requiredQuestions.length} terjawab`" :color="isComplete ? 'success' : 'warning'" variant="subtle" />
        </div>
      </div>
    </template>

    <div v-if="questions.length" class="space-y-3">
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
        <UBadge :label="allAnswered ? 'Semua terjawab' : 'Wajib jawab semua'" :color="allAnswered ? 'success' : 'warning'" variant="soft" />
        <UButton
          color="primary"
          icon="i-lucide-save"
          :loading="saving"
          :disabled="disabled || !allAnswered"
          @click="save"
        >
          Simpan Jawaban
        </UButton>
      </div>
    </div>

    <div v-else class="py-8 text-center text-sm text-muted">
      Questionnaire belum dikonfigurasi atau belum tersedia.
    </div>
  </UCard>
</template>
