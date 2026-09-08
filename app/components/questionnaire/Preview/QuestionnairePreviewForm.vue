<!-- app/components/questionnaire/Preview/QuestionnairePreviewForm.vue -->
<!-- Form view siap-filling — dipakai di modal preview builder & halaman /preview -->
<script setup lang="ts">
import { ref } from 'vue'

import type {
  Question,
  Section
} from '~/types/questionnaire'

defineProps<{
  title?: string
  description?: string
  sections: Section[]
}>()

// jawaban bervariasi per tipe pertanyaan (string | string[] | number)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const answers = ref<Record<string, any>>({})

function shouldShowQuestion(question: Question) {
  if (!question.conditional) {
    return true
  }

  // Support both old format (showIfOptionId) and new format (showIfOptionIds)
  const allShowIfOptionIds = [
    ...(question.conditional.showIfOptionIds || []),
    ...(question.conditional.showIfOptionId ? [question.conditional.showIfOptionId] : [])
  ]

  if (allShowIfOptionIds.length === 0) {
    return true
  }

  const answer = answers.value[question.conditional.parentQuestionId]

  if (Array.isArray(answer)) {
    return answer.some((val: string) => allShowIfOptionIds.includes(val))
  }

  return allShowIfOptionIds.includes(answer)
}
</script>

<template>
  <!-- HEADER -->
  <div class="max-w-3xl mx-auto pt-6 px-4 sm:px-6">
    <div
      class="
        bg-background
        rounded-3xl
        overflow-hidden
        border border-default
        shadow-sm
      "
    >
      <!-- TOP ACCENT -->
      <div class="h-3 bg-primary" />

      <div class="p-6 sm:p-8 space-y-4">
        <div class="space-y-2">
          <h1
            class="
              text-2xl sm:text-4xl
              font-bold
              break-words
            "
          >
            {{ title }}
          </h1>

          <p
            v-if="description"
            class="
              text-sm sm:text-base
              text-muted
              whitespace-pre-line
            "
          >
            {{ description }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- BODY -->
  <div
    class="
      max-w-3xl
      mx-auto
      px-4 sm:px-6
      py-6
      space-y-6
    "
  >
    <!-- SECTION -->
    <div
      v-for="(section, index) in sections"
      :key="section.id"
      class="
        bg-background
        border border-default
        rounded-3xl
        overflow-hidden
        shadow-sm
      "
    >
      <!-- SECTION HEADER -->
      <div
        class="
          border-b border-default
          p-6
          space-y-3
        "
      >
        <div
          class="
            flex items-center
            gap-2
            flex-wrap
          "
        >
          <UBadge
            color="primary"
            variant="soft"
          >
            Section {{ index + 1 }}
          </UBadge>
        </div>

        <div class="space-y-2">
          <h2
            class="
              text-xl
              font-semibold
              break-words
            "
          >
            {{
              section.sectionTitle
                || 'Untitled Section'
            }}
          </h2>

          <p
            v-if="section.description"
            class="
              text-sm
              text-muted
              whitespace-pre-line
            "
          >
            {{ section.description }}
          </p>
        </div>
      </div>

      <!-- QUESTIONS -->
      <div class="p-6 space-y-8">
        <template
          v-for="question in section.questions"
          :key="question.id"
        >
          <div
            v-if="shouldShowQuestion(question)"
            class="space-y-4"
          >
            <!-- QUESTION TITLE -->
            <div class="space-y-2">
              <div
                class="
                  flex items-start
                  gap-2
                  flex-wrap
                "
              >
                <h3
                  class="
                    font-medium
                    text-base
                    break-words
                  "
                >
                  {{
                    question.questionText
                      || 'Untitled Question'
                  }}
                </h3>

                <span
                  v-if="question.isRequired"
                  class="text-error"
                >
                  *
                </span>

                <UBadge
                  v-if="question.conditional"
                  color="warning"
                  variant="soft"
                  size="sm"
                >
                  Conditional
                </UBadge>
              </div>

              <p
                v-if="
                  question.questionDescription
                "
                class="
                  text-sm
                  text-muted
                  whitespace-pre-line
                "
              >
                {{
                  question.questionDescription
                }}
              </p>
            </div>

            <!-- INPUT RENDER -->
            <UInput
              v-if="question.questionType === 'text'"
              v-model="answers[question.id]"
              placeholder="Your answer"
            />

            <UInput
              v-else-if="
                question.questionType
                  === 'number'
              "
              v-model="answers[question.id]"
              type="number"
              placeholder="Enter number"
            />

            <UTextarea
              v-else-if="
                question.questionType
                  === 'textarea'
              "
              v-model="answers[question.id]"
              :rows="4"
              autoresize
              placeholder="Your answer"
            />

            <UInput
              v-else-if="
                question.questionType
                  === 'date'
              "
              v-model="answers[question.id]"
              type="date"
            />

            <USelect
              v-else-if="question.questionType === 'select'"
              v-model="answers[question.id]"
              :items="
                question.options.map(option => ({
                  label: option.label,
                  value: option.id
                }))
              "
              placeholder="Choose option"
            />

            <URadioGroup
              v-else-if="question.questionType === 'radio'"
              v-model="answers[question.id]"
              :items="
                question.options.map(option => ({
                  label: option.label,
                  value: option.id
                }))
              "
            />

            <UCheckboxGroup
              v-else-if="question.questionType === 'checkbox'"
              v-model="answers[question.id]"
              :items="
                question.options.map(option => ({
                  label: option.label,
                  value: option.id
                }))
              "
            />
          </div>
        </template>
      </div>
    </div>

    <!-- SUBMIT -->
    <div
      class="
        flex justify-end
        pb-10
      "
    >
      <UButton
        size="lg"
        color="primary"
        icon="i-lucide-send"
        class="rounded-xl px-6"
      >
        Submit Form
      </UButton>
    </div>
  </div>
</template>
