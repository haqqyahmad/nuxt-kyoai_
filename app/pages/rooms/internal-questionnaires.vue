<script setup lang="ts">
const api = useApi()
const toast = useToast()

type InternalAnswer = {
  questionId: string
  questionText?: string | null
  questionType?: string | null
  optionId?: string | null
  optionText?: string | null
  answerText?: string | null
  answered?: boolean
}

type RegistrationQuestionnaire = {
  questionnaire_id: string
  questionnaire_name: string
  scope?: string | null
  status?: 'Completed' | 'Pending' | string
  completionDate?: string | null
  answers?: InternalAnswer[]
}

type QstOption = { id: string, label: string, value?: string | null }
type QstQuestion = {
  id: string
  questionText?: string | null
  questionDescription?: string | null
  questionType?: string | null
  isRequired?: boolean
  options?: QstOption[]
}
type QstSection = {
  id: string
  sectionTitle?: string | null
  description?: string | null
  questions?: QstQuestion[]
}
type QuestionnaireDetail = {
  questionnaire_id: string
  questionnaire_name?: string | null
  description?: string | null
  sections?: QstSection[]
}

const idReg = ref('')
const searching = ref(false)
const registrationId = ref<number | null>(null)
const patientName = ref('')
const internalQuestionnaires = ref<RegistrationQuestionnaire[]>([])

const formOpen = ref(false)
const formLoading = ref(false)
const formSaving = ref(false)
const activeMeta = ref<RegistrationQuestionnaire | null>(null)
const activeQuestionnaire = ref<QuestionnaireDetail | null>(null)
const answers = reactive<Record<string, string>>({})
const multiAnswers = reactive<Record<string, string[]>>({})

const activeSections = computed(() => activeQuestionnaire.value?.sections ?? [])

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isSelected(questionId: string, optionId: string) {
  return answers[questionId] === optionId
}

function isChecked(questionId: string, optionId: string) {
  return (multiAnswers[questionId] ?? []).includes(optionId)
}

function selectOption(questionId: string, optionId: string) {
  answers[questionId] = optionId
}

function toggleOption(questionId: string, optionId: string) {
  const list = [...(multiAnswers[questionId] ?? [])]
  const index = list.indexOf(optionId)
  if (index >= 0) list.splice(index, 1)
  else list.push(optionId)
  multiAnswers[questionId] = list
}

function resetAnswers() {
  for (const key of Object.keys(answers)) answers[key] = ''
  for (const key of Object.keys(multiAnswers)) multiAnswers[key] = []
}

async function search() {
  const value = idReg.value.trim()
  if (!value) {
    toast.add({ title: 'Registration number is required', color: 'warning' })
    return
  }
  searching.value = true
  internalQuestionnaires.value = []
  registrationId.value = null
  patientName.value = ''
  try {
    const [listRes, regRes] = await Promise.all([
      api.get(`/registration/number/${encodeURIComponent(value)}/questionnaires`),
      api.get(`/registration/number/${encodeURIComponent(value)}`).catch(() => null)
    ])
    const list = (listRes.data?.data ?? []) as RegistrationQuestionnaire[]
    internalQuestionnaires.value = list.filter(q => q.scope === 'INTERNAL')
    if (regRes) {
      const reg = regRes.data?.data ?? regRes.data
      registrationId.value = reg?.id ?? null
      patientName.value = reg?.patient?.patientName ?? ''
    }
    if (!internalQuestionnaires.value.length) {
      toast.add({
        title: 'No internal questionnaires',
        description: 'This registration has no internal questionnaires.',
        color: 'neutral'
      })
    }
  } catch {
    toast.add({
      title: 'Failed to load',
      description: 'Registration not found or questionnaires could not be loaded.',
      color: 'error'
    })
  } finally {
    searching.value = false
  }
}

async function openForm(q: RegistrationQuestionnaire) {
  activeMeta.value = q
  activeQuestionnaire.value = null
  resetAnswers()
  formOpen.value = true
  formLoading.value = true
  try {
    const res = await api.get(`/questionnaire/${q.questionnaire_id}`)
    activeQuestionnaire.value = (res.data?.data ?? res.data ?? null) as QuestionnaireDetail | null
  } catch {
    toast.add({ title: 'Failed to load questionnaire', color: 'error' })
  } finally {
    formLoading.value = false
  }
}

function buildAnswersPayload() {
  const payload: Array<{ questionId: string, optionId?: string, optionIds?: string[], answerText?: string }> = []
  for (const section of activeSections.value) {
    for (const question of section.questions ?? []) {
      if (question.questionType === 'checkbox') {
        const list = multiAnswers[question.id] ?? []
        if (list.length) payload.push({ questionId: question.id, optionIds: [...list] })
      } else if (question.questionType === 'radio' || question.questionType === 'select') {
        const value = answers[question.id]
        if (value) payload.push({ questionId: question.id, optionId: value })
      } else {
        const value = answers[question.id]
        if (value) payload.push({ questionId: question.id, answerText: value })
      }
    }
  }
  return payload
}

async function resolveRegistrationId() {
  if (registrationId.value != null) return registrationId.value
  const value = idReg.value.trim()
  if (!value) return null
  try {
    const res = await api.get(`/registration/number/${encodeURIComponent(value)}`)
    const reg = res.data?.data ?? res.data
    registrationId.value = reg?.id ?? null
    return registrationId.value
  } catch {
    return null
  }
}

async function submit() {
  const meta = activeMeta.value
  if (!meta || formSaving.value) return
  const payload = buildAnswersPayload()
  if (!payload.length) {
    toast.add({ title: 'No answers', description: 'Please answer at least one question.', color: 'warning' })
    return
  }
  const regId = await resolveRegistrationId()
  if (regId == null) {
    toast.add({
      title: 'Registration not resolved',
      description: 'Numeric registration id could not be found for this registration number.',
      color: 'error'
    })
    return
  }
  formSaving.value = true
  try {
    await api.post(`/questionnaire/${meta.questionnaire_id}/submit`, {
      registrationId: regId,
      answers: payload
    })
    toast.add({ title: 'Saved', description: 'Internal questionnaire answers saved.', color: 'success' })
    formOpen.value = false
    await search()
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Questionnaire answers could not be saved.'
    toast.add({ title: 'Failed to save', description: message, color: 'error' })
  } finally {
    formSaving.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="internal-questionnaires">
    <template #header>
      <UDashboardNavbar title="Internal Questionnaires" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-5 py-6 px-4">
        <UCard>
          <template #header>
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                Find Registration
              </h2>
              <p class="mt-1 text-sm text-muted">
                Search a registration by registration number to view and fill internal questionnaires.
              </p>
            </div>
          </template>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <UInput
              v-model="idReg"
              icon="i-lucide-search"
              placeholder="Registration number (e.g. REG-2026...)"
              class="w-full"
              @keyup.enter="search"
            />
            <UButton
              color="primary"
              icon="i-lucide-search"
              :loading="searching"
              @click="search"
            >
              Search
            </UButton>
          </div>

          <div v-if="registrationId != null || patientName" class="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span v-if="patientName" class="font-semibold text-highlighted">{{ patientName }}</span>
            <span v-if="registrationId != null" class="text-muted">Registration ID: {{ registrationId }}</span>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-base font-semibold text-highlighted">
                <UIcon name="i-lucide-clipboard-list" class="text-primary" />
                Internal Questionnaires
              </h2>
              <UBadge :label="`${internalQuestionnaires.length} item`" color="neutral" variant="subtle" />
            </div>
          </template>

          <div v-if="searching" class="flex items-center justify-center py-10">
            <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
          </div>

          <div v-else-if="!internalQuestionnaires.length" class="py-10 text-center">
            <p class="text-sm text-muted">
              No internal questionnaires to show. Search a registration number above.
            </p>
          </div>

          <div v-else class="divide-y divide-default">
            <div
              v-for="q in internalQuestionnaires"
              :key="q.questionnaire_id"
              class="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-highlighted">{{ q.questionnaire_name }}</span>
                  <UBadge
                    label="Internal"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  />
                </div>
                <p class="mt-1 text-xs text-muted">
                  <template v-if="q.status === 'Completed'">
                    Completed · {{ formatDateTime(q.completionDate) }}
                  </template>
                  <template v-else>
                    Pending
                  </template>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :label="q.status === 'Completed' ? 'Completed' : 'Pending'"
                  :color="q.status === 'Completed' ? 'success' : 'neutral'"
                  variant="subtle"
                />
                <UButton
                  v-if="q.status !== 'Completed'"
                  color="primary"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-pencil"
                  @click="openForm(q)"
                >
                  Fill
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <UModal
        v-model:open="formOpen"
        :title="activeMeta?.questionnaire_name || 'Internal Questionnaire'"
        :ui="{ content: 'sm:max-w-3xl' }"
      >
        <template #body>
          <div v-if="formLoading" class="flex items-center justify-center py-10">
            <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
          </div>

          <div v-else-if="activeSections.length" class="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
            <div
              v-for="(section, si) in activeSections"
              :key="section.id"
              class="space-y-4"
            >
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">
                  Section {{ si + 1 }}
                </p>
                <h3 class="text-base font-semibold text-highlighted">
                  {{ section.sectionTitle || 'Untitled Section' }}
                </h3>
              </div>

              <div
                v-for="question in (section.questions ?? [])"
                :key="question.id"
                class="rounded-xl border border-default p-4"
              >
                <p class="text-sm font-semibold text-highlighted">
                  {{ question.questionText || 'Untitled Question' }}
                  <span v-if="question.isRequired" class="text-error">*</span>
                </p>
                <p
                  v-if="question.questionDescription"
                  class="mt-1 whitespace-pre-line text-xs text-muted"
                >
                  {{ question.questionDescription }}
                </p>

                <input
                  v-if="question.questionType === 'text'"
                  v-model="answers[question.id]"
                  type="text"
                  class="mt-3 w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                  placeholder="Your answer"
                >
                <input
                  v-else-if="question.questionType === 'number'"
                  v-model="answers[question.id]"
                  type="number"
                  class="mt-3 w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                  placeholder="Enter number"
                >
                <input
                  v-else-if="question.questionType === 'date'"
                  v-model="answers[question.id]"
                  type="date"
                  class="mt-3 w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                >
                <textarea
                  v-else-if="question.questionType === 'textarea'"
                  v-model="answers[question.id]"
                  rows="3"
                  class="mt-3 w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                  placeholder="Your answer"
                />
                <select
                  v-else-if="question.questionType === 'select'"
                  v-model="answers[question.id]"
                  class="mt-3 w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                >
                  <option value="">
                    Choose option
                  </option>
                  <option
                    v-for="opt in (question.options ?? [])"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <div
                  v-else-if="question.questionType === 'radio'"
                  class="mt-3 flex flex-wrap gap-2"
                >
                  <button
                    v-for="opt in (question.options ?? [])"
                    :key="opt.id"
                    type="button"
                    class="rounded-lg border px-4 py-1.5 text-sm font-medium transition"
                    :class="isSelected(question.id, opt.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-default text-highlighted hover:bg-muted/30'"
                    @click="selectOption(question.id, opt.id)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <div
                  v-else-if="question.questionType === 'checkbox'"
                  class="mt-3 flex flex-wrap gap-2"
                >
                  <button
                    v-for="opt in (question.options ?? [])"
                    :key="opt.id"
                    type="button"
                    class="rounded-lg border px-4 py-1.5 text-sm font-medium transition"
                    :class="isChecked(question.id, opt.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-default text-highlighted hover:bg-muted/30'"
                    @click="toggleOption(question.id, opt.id)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="py-10 text-center">
            <p class="text-sm text-muted">
              Questionnaire has no sections or could not be loaded.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              :disabled="formSaving"
              @click="formOpen = false"
            />
            <UButton
              color="primary"
              icon="i-lucide-save"
              label="Save Answers"
              :loading="formSaving"
              :disabled="formLoading || !activeSections.length"
              @click="submit"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
