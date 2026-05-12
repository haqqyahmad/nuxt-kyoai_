<!-- app/pages/questionnaire/[id]/builder.vue -->
<script setup lang="ts">
import { useQuestionnaireAutosave } from '~/composables/questionnaire/useQuestionnaireAutosave'
import { useQuestionnaireStore } from '~/stores/questionnaire/questionnaire'
import { useToast } from '#imports'

const toast = useToast()

const { sections, addSection, addQuestion } = useQuestionnaireStore()

// useQuestionnaireAutosave()

const isPreviewOpen = ref(false)

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
  <QuestionnaireBuilder
    :sections="sections"
    @add-section="handleAddSection"
    @add-question="addQuestion"
    @preview="isPreviewOpen = true"
  />

  <UModal
    v-model:open="isPreviewOpen"
    :ui="{
      content: 'max-w-4xl'
    }"
  >
    <template #content>
      <div class="max-h-[90vh] overflow-y-auto bg-elevated/30">
        <!-- HEADER -->
        <div
          class="bg-background border-b border-default sticky top-0 z-20 backdrop-blur"
        >
          <div class="h-3 bg-primary" />

          <div class="p-6 space-y-3">
            <h1 class="text-3xl font-bold">
              {{ questionnaireTitle }}
            </h1>

            <p
              v-if="questionnaireDescription"
              class="text-muted whitespace-pre-line"
            >
              {{ questionnaireDescription }}
            </p>
          </div>
        </div>

        <!-- BODY -->
        <div class="p-4 sm:p-6 space-y-6">
          <div
            v-for="(section, index) in sections"
            :key="section.id"
            class="bg-background border border-default rounded-3xl shadow-sm overflow-hidden"
          >
            <!-- SECTION HEADER -->
            <div class="border-b border-default p-6">
              <div class="space-y-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs uppercase tracking-wide text-muted">
                    Section {{ index + 1 }}
                  </span>
                </div>

                <h2 class="text-xl font-semibold">
                  {{ section.sectionTitle }}
                </h2>

                <p
                  v-if="section.description"
                  class="text-sm text-muted whitespace-pre-line"
                >
                  {{ section.description }}
                </p>
              </div>
            </div>

            <!-- QUESTIONS -->
            <div class="p-6 space-y-8">
              <div
                v-for="question in section.questions"
                :key="question.id"
                class="space-y-4"
              >
                <!-- TITLE -->
                <div class="space-y-1">
                  <div class="flex items-start gap-2 flex-wrap">
                    <h3 class="font-medium text-base">
                      {{ question.questionText }}
                    </h3>

                    <span v-if="question.isRequired" class="text-error">
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
                    v-if="question.questionDescription"
                    class="text-sm text-muted whitespace-pre-line"
                  >
                    {{ question.questionDescription }}
                  </p>
                </div>

                <!-- TEXT -->
                <UInput
                  v-if="question.questionType === 'text'"
                  placeholder="Your answer"
                />

                <!-- NUMBER -->
                <UInput
                  v-else-if="question.questionType === 'number'"
                  type="number"
                  placeholder="Enter number"
                />

                <!-- TEXTAREA -->
                <UTextarea
                  v-else-if="question.questionType === 'textarea'"
                  :rows="4"
                  placeholder="Your answer"
                />

                <!-- DATE -->
                <UInput
                  v-else-if="question.questionType === 'date'"
                  type="date"
                />

                <!-- SELECT -->
                <USelect
                  v-else-if="question.questionType === 'select'"
                  :items="
                    question.options.map((option) => ({
                      label: option.label,
                      value: option.value
                    }))
                  "
                  placeholder="Choose option"
                />

                <!-- RADIO -->
                <URadioGroup
                  v-else-if="question.questionType === 'radio'"
                  :items="
                    question.options.map((option) => ({
                      label: option.label,
                      value: option.value
                    }))
                  "
                />

                <!-- CHECKBOX -->
                <UCheckboxGroup
                  v-else-if="question.questionType === 'checkbox'"
                  :items="
                    question.options.map((option) => ({
                      label: option.label,
                      value: option.value
                    }))
                  "
                />
              </div>
            </div>
          </div>

          <!-- SUBMIT -->
          <div class="flex justify-end">
            <UButton size="lg" color="primary" icon="i-lucide-send">
              Submit Form
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
