<!-- app/pages/questionnaire/[id]/builder.vue -->
<script setup lang="ts">
import { useQuestionnaireAutosave } from '~/composables/questionnaire/useQuestionnaireAutosave'
import { useQuestionnaireStore } from '~/stores/questionnaire/questionnaire'
import { useToast } from '#imports'

const toast = useToast()

const {
  sections,
  addSection,
  addQuestion
} = useQuestionnaireStore()

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

  <UModal v-model:open="isPreviewOpen">
    <template #content>
      <div class="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h2 class="text-2xl font-bold">
            Questionnaire Preview
          </h2>

          <p class="text-sm text-muted">
            Preview mode like Google Forms
          </p>
        </div>

        <div
          v-for="(section, index) in sections"
          :key="section.id"
          class="
          border border-default
          rounded-2xl
          p-6
          space-y-5
        "
        >
          <div>
            <h3 class="font-semibold text-lg">
              Section {{ index + 1 }}
            </h3>

            <p class="text-muted">
              {{ section.sectionTitle }}
            </p>

            <p
              v-if="section.description"
              class="text-sm text-muted mt-1"
            >
              {{ section.description }}
            </p>
          </div>

          <div
            v-for="question in section.questions"
            :key="question.id"
            class="space-y-3"
          >
            <div class="space-y-1">
              <label class="font-medium text-sm">
                {{ question.question }}
              </label>

              <p
                v-if="question.description"
                class="text-xs text-muted"
              >
                {{ question.description }}
              </p>
            </div>

            <!-- TEXT -->
            <UInput
              v-if="question.type === 'text'"
              placeholder="Your answer"
            />

            <!-- TEXTAREA -->
            <UTextarea
              v-else-if="question.type === 'textarea'"
              placeholder="Your answer"
              :rows="4"
            />

            <!-- SELECT -->
            <USelect
              v-else-if="question.type === 'select'"
              :items="question.option || []"
              placeholder="Choose option"
            />

            <!-- RADIO -->
            <URadioGroup
              v-else-if="question.type === 'radio'"
              :items="question.option || []"
            />

            <!-- CHECKBOX -->
            <UCheckboxGroup
              v-else-if="question.type === 'checkbox'"
              :items="question.option || []"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
