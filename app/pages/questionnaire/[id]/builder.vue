<!-- app/pages/questionnaire/[id]/builder.vue -->
<script setup lang="ts">
import { ref } from 'vue'

import { useToast } from '#imports'

import { useQuestionnaireStore }
  from '~/stores/questionnaire/questionnaire'

const toast = useToast()

const {
  sections,
  addSection,
  addQuestion
} = useQuestionnaireStore()

/**
 * FORM META
 */
const questionnaireTitle = ref(
  'Untitled Questionnaire'
)

const questionnaireDescription = ref(
  'Form description'
)

/**
 * PREVIEW
 */
const isPreviewOpen = ref(false)

/**
 * ANSWERS
 */
const answers = ref<Record<string, any>>({})

/**
 * CONDITIONAL LOGIC
 */
function shouldShowQuestion(question: any) {
  // tidak punya conditional => tampil
  if (!question.conditional) {
    return true
  }

  const parentQuestionId
    = question.conditional.parentQuestionId

  const showIfOptionId
    = question.conditional.showIfOptionId

  const answer = answers.value[parentQuestionId]

  // checkbox
  if (Array.isArray(answer)) {
    return answer.includes(showIfOptionId)
  }

  // radio/select
  return answer === showIfOptionId
}

/**
 * ADD SECTION
 */
function handleAddSection() {
  addSection()

  toast.add({
    title: 'Section added',
    description: 'New section created',
    color: 'success',
    icon: 'i-lucide-plus'
  })
}
</script>

<template>
  <!-- BUILDER -->
  <QuestionnaireBuilder
    :sections="sections"
    :title="questionnaireTitle"
    :description="questionnaireDescription"
    @update:title="questionnaireTitle = $event"
    @update:description="
      questionnaireDescription = $event
    "
    @add-section="handleAddSection"
    @add-question="addQuestion"
    @preview="isPreviewOpen = true"
  />

  <!-- ================================================= -->
  <!-- PREVIEW MODAL -->
  <!-- ================================================= -->

  <UModal
    v-model:open="isPreviewOpen"
    fullscreen
    :ui="{
      content: 'bg-elevated overflow-hidden'
    }"
  >
    <template #content>
      <div class="h-screen overflow-y-auto">
        <!-- CLOSE BUTTON -->
        <div class="fixed top-4 right-4 z-50">
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="soft"
            class="rounded-full shadow-lg"
            @click="isPreviewOpen = false"
          />
        </div>
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
                  {{ questionnaireTitle }}
                </h1>

                <p
                  v-if="questionnaireDescription"
                  class="
                    text-sm sm:text-base
                    text-muted
                    whitespace-pre-line
                  "
                >
                  {{ questionnaireDescription }}
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

                  <!-- ================================================= -->
                  <!-- INPUT RENDER -->
                  <!-- ================================================= -->

                  <!-- TEXT -->
                  <UInput
                    v-if="question.questionType === 'text'"
                    v-model="answers[question.id]"
                    placeholder="Your answer"
                  />

                  <!-- NUMBER -->
                  <UInput
                    v-else-if="
                      question.questionType
                        === 'number'
                    "
                    v-model="answers[question.id]"
                    type="number"
                    placeholder="Enter number"
                  />

                  <!-- TEXTAREA -->
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

                  <!-- DATE -->
                  <UInput
                    v-else-if="
                      question.questionType
                        === 'date'
                    "
                    type="date"
                  />

                  <!-- SELECT -->
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

                  <!-- RADIO -->
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

                  <!-- CHECKBOX -->
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
      </div>
    </template>
  </UModal>
</template>
