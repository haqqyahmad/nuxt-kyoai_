<!-- app/components/questionnaire/Builder/QuestionCard.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { Question } from '~/types/questionnaire'

import { useQuestionnaireStore } from '~/stores/questionnaire/questionnaire'

import DragHandle from '../Shared/DragHandle.vue'

import RequiredBadge from '../Shared/RequiredBadge.vue'

import ConditionalLogic from './ConditionalLogic.vue'

import QuestionRenderer from './QuestionRenderer.vue'

import OptionEditor from './OptionEditor.vue'

const props = defineProps<{
  sectionId: string
  question: Question
  questions: Question[]
}>()

const { duplicateQuestion, removeQuestion, updateQuestion } = useQuestionnaireStore()

/**
 * =====================================================
 * QUESTION TYPES
 * =====================================================
 */
const questionTypes = [
  {
    label: 'Text',
    value: 'text'
  },
  {
    label: 'Number',
    value: 'number'
  },
  {
    label: 'Textarea',
    value: 'textarea'
  },
  {
    label: 'Radio',
    value: 'radio'
  },
  {
    label: 'Checkbox',
    value: 'checkbox'
  },
  {
    label: 'Select',
    value: 'select'
  },
  {
    label: 'Date',
    value: 'date'
  }
]

/**
 * =====================================================
 * EDIT MODE
 * =====================================================
 */
function toggleEdit() {
  updateQuestion(props.sectionId, props.question.id, {
    isEditing: !props.question.isEditing
  })
}

/**
 * =====================================================
 * EDITABLE MODELS
 * =====================================================
 */
const questionTextModel = computed({
  get: () => props.question.questionText,
  set: (value: string) => {
    updateQuestion(props.sectionId, props.question.id, {
      questionText: value
    })
  }
})

const questionDescriptionModel = computed({
  get: () => props.question.questionDescription ?? '',
  set: (value: string) => {
    updateQuestion(props.sectionId, props.question.id, {
      questionDescription: value
    })
  }
})

const questionTypeModel = computed({
  get: () => props.question.questionType,
  set: (value: Question['questionType']) => {
    updateQuestion(props.sectionId, props.question.id, {
      questionType: value
    })
  }
})

const isRequiredModel = computed({
  get: () => props.question.isRequired,
  set: (value: boolean) => {
    updateQuestion(props.sectionId, props.question.id, {
      isRequired: value
    })
  }
})

function addConditional() {
  updateQuestion(props.sectionId, props.question.id, {
    conditional: {
      parentQuestionId: '',
      showIfOptionIds: []
    }
  })
}

/**
 * =====================================================
 * DELETE
 * =====================================================
 */

const isDeleteModalOpen = ref(false)

function handleDelete() {
  removeQuestion(props.sectionId, props.question.id)
}

/**
 * =====================================================
 * RESET INVALID DATA
 * =====================================================
 */
watch(
  () => props.question.questionType,

  (type) => {
    /**
     * reset options
     */
    if (!['radio', 'checkbox', 'select'].includes(type)) {
      updateQuestion(props.sectionId, props.question.id, {
        options: [],
        conditional: undefined
      })
    }
  }
)
</script>

<template>
  <div class="border border-default rounded-xl p-4 bg-default space-y-4">
    <div class="flex items-start gap-4">
      <!-- DRAG -->
      <DragHandle />

      <!-- CONTENT -->
      <div class="flex-1 space-y-4">
        <!-- ================================================= -->
        <!-- EDIT MODE -->
        <!-- ================================================= -->

        <template v-if="question.isEditing">
          <div class="space-y-5">
            <!-- QUESTION -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-highlighted">
                Question Title
              </label>

              <UInput
                v-model="questionTextModel"
                placeholder="Enter question title"
                size="lg"
                class="w-full"
              />
            </div>

            <!-- DESCRIPTION -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-highlighted">
                Description
              </label>

              <UTextarea
                v-model="questionDescriptionModel"
                placeholder="Optional description"
                :rows="3"
                autoresize
                class="w-full"
              />
            </div>

            <!-- TYPE + REQUIRED -->
            <div
              class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start"
            >
              <!-- TYPE -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-highlighted">
                  Question Type
                </label>

                <USelect
                  v-model="questionTypeModel"
                  :items="questionTypes"
                  value-key="value"
                  option-attribute="label"
                  class="w-full"
                />
              </div>

              <!-- REQUIRED -->
              <div
                class="flex items-center justify-between gap-4 border border-default rounded-xl px-4 py-3 min-w-[240px] bg-elevated/40"
              >
                <div class="space-y-0.5">
                  <p class="text-sm font-medium">
                    Required
                  </p>

                  <p class="text-xs text-muted">
                    Must be answered
                  </p>
                </div>

                <USwitch v-model="isRequiredModel" />
              </div>
            </div>

            <!-- CONDITIONAL -->
            <div class="space-y-4">
              <UButton
                v-if="!question.conditional"
                icon="i-lucide-git-branch"
                variant="soft"
                color="neutral"
                size="sm"
                @click="addConditional"
              >
                Add Conditional Logic
              </UButton>

              <div
                v-else
                class="border border-default rounded-xl p-4 bg-elevated/30"
              >
                <ConditionalLogic
                  :section-id="sectionId"
                  :question="question"
                  :questions="questions"
                />
              </div>
            </div>

            <!-- EMPTY OPTIONS -->
            <UAlert
              v-if="
                ['radio', 'checkbox', 'select'].includes(
                  question.questionType
                ) && !question.options.length
              "
              color="warning"
              variant="soft"
              title="No options yet"
              description="Please add at least one option"
            />

            <!-- OPTIONS -->
            <div
              v-if="
                ['radio', 'checkbox', 'select'].includes(question.questionType)
              "
              class="border border-default rounded-xl p-4 bg-elevated/20"
            >
              <div class="mb-4">
                <h4 class="font-medium">
                  Options
                </h4>

                <p class="text-sm text-muted">
                  Manage selectable choices
                </p>
              </div>

              <OptionEditor :section-id="sectionId" :question="question" />
            </div>
          </div>
        </template>

        <!-- ================================================= -->
        <!-- PREVIEW MODE -->
        <!-- ================================================= -->

        <template v-else>
          <!-- TITLE -->
          <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base font-semibold">
                {{ question.questionText }}
              </h3>

              <RequiredBadge v-if="question.isRequired" />

              <UBadge
                v-if="question.conditional"
                color="warning"
                variant="soft"
              >
                Conditional
              </UBadge>
            </div>

            <!-- DESCRIPTION -->
            <p v-if="question.questionDescription" class="text-sm text-muted">
              {{ question.questionDescription }}
            </p>
          </div>

          <!-- QUESTION PREVIEW -->
          <QuestionRenderer :question="question" />
        </template>
      </div>

      <!-- ACTIONS -->
      <div class="flex flex-col gap-2">
        <!-- EDIT -->
        <UTooltip :text="question.isEditing ? 'Save' : 'Edit'">
          <UButton
            :icon="question.isEditing ? 'i-lucide-check' : 'i-lucide-pencil'"
            color="neutral"
            variant="ghost"
            @click="toggleEdit"
          />
        </UTooltip>

        <!-- DUPLICATE -->
        <UTooltip text="Duplicate">
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            @click="duplicateQuestion(sectionId, question.id)"
          />
        </UTooltip>

        <!-- DELETE -->
        <UTooltip text="Delete">
          <UButton
            icon="i-lucide-trash"
            color="error"
            variant="ghost"
            @click="isDeleteModalOpen = true"
          />
        </UTooltip>
      </div>
      <BaseConfirmModal
        v-model:open="isDeleteModalOpen"
        title="Delete Question"
        description="Are you sure you want to delete this question?"
        variant="danger"
        @confirm="handleDelete"
      />
    </div>
  </div>
</template>
