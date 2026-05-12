<!-- app/components/questionnaire/Builder/SectionCard.vue -->
<script setup lang="ts">
import draggable from 'vuedraggable'
import DragHandle from '../Shared/DragHandle.vue'

import { ref, computed, watch } from 'vue'

import { useToast } from '#imports'

import BaseConfirmModal from '~/components/BaseConfirmModal.vue'

import { useQuestionnaireStore } from '~/stores/questionnaire/questionnaire'

import { useQuestionDnD } from '~/composables/questionnaire/useQuestionDnD'

import QuestionCard from './QuestionCard.vue'

import type { Question, Section } from '~/types/questionnaire'

const emit = defineEmits<{
  (e: 'update:questions', value: Section['questions']): void

  (e: 'add-question'): void
}>()

const hasUnsavedChanges = ref(false)

const { section, index } = defineProps<{
  section: Section
  index: number
}>()

const isCollapsed = ref(false)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

const { questionDragOptions } = useQuestionDnD()

const questionsModel = computed({
  get() {
    return section.questions
  },

  set(value) {
    emit('update:questions', [...value])
  }
})

const isEditing = ref(false)

function toggleEdit() {
  /**
   * save
   */
  if (isEditing.value) {
    toast.add({
      title: 'Section updated',
      description: 'Section saved successfully',
      color: 'success',
      icon: 'i-lucide-check'
    })

    hasUnsavedChanges.value = false
  }

  isEditing.value = !isEditing.value
}

const toast = useToast()

const { removeSection, duplicateSection } = useQuestionnaireStore()

const isDeleteModalOpen = ref(false)

function handleDeleteSection() {
  removeSection(section.id)

  toast.add({
    title: 'Section deleted',
    description: 'Section removed successfully',
    color: 'error',
    icon: 'i-lucide-trash'
  })
}

function handleDuplicateSection() {
  duplicateSection(section.id)

  toast.add({
    title: 'Section duplicated',
    description: 'Section copied successfully',
    color: 'success',
    icon: 'i-lucide-copy'
  })
}

watch(
  () => [section.sectionTitle, section.description],
  () => {
    hasUnsavedChanges.value = true
  }
)
</script>

<template>
  <UCard class="rounded-2xl transition-shadow duration-200 hover:shadow-sm">
    <div
      class="flex flex-col lg:flex-row lg:items-start justify-between gap-4 p-4 sm:p-5 border-b border-default"
    >
      <!-- LEFT -->
      <div class="flex items-start gap-4 flex-1 min-w-0">
        <DragHandle section />

        <div class="flex-1 space-y-3">
          <!-- EDIT MODE -->
          <template v-if="isEditing">
            <div class="flex flex-col gap-3 w-full">
              <UInput
                v-model="section.sectionTitle"
                size="lg"
                placeholder="Section title"
                class="w-full"
              />

              <UTextarea
                v-model="section.description"
                placeholder="Section description"
                :rows="3"
                class="w-full"
              />
            </div>
          </template>

          <!-- PREVIEW MODE -->
          <template v-else>
            <div class="flex flex-col gap-2 min-w-0 w-full">
              <!-- TOP -->
              <div class="flex items-start justify-between gap-3">
                <!-- TITLE -->
                <div class="min-w-0 flex-1">
                  <h3
                    class="text-base sm:text-lg font-semibold leading-tight break-words"
                  >
                    <span class="text-muted"> Section {{ index + 1 }} </span>

                    <span class="mx-1"> — </span>

                    <span>
                      {{ section.sectionTitle || "Untitled Section" }}
                    </span>
                  </h3>
                </div>

                <!-- UNSAVED -->
                <UBadge
                  v-if="hasUnsavedChanges"
                  color="warning"
                  variant="soft"
                  size="sm"
                  class="shrink-0"
                >
                  Unsaved
                </UBadge>
              </div>

              <!-- DESCRIPTION -->
              <p
                v-if="section.description"
                class="text-sm text-muted leading-relaxed break-words"
              >
                {{ section.description }}
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="flex flex-wrap items-center gap-1 sm:gap-2 shrink-0">
        <!-- PRIMARY -->
        <UButton icon="i-lucide-plus" size="sm" @click="emit('add-question')">
          Add Question
        </UButton>

        <!-- DIVIDER -->
        <div class="w-px h-6 bg-default" />

        <!-- EDIT -->
        <UTooltip :text="isEditing ? 'Save' : 'Edit'">
          <UButton
            :icon="isEditing ? 'i-lucide-check' : 'i-lucide-pencil'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="toggleEdit"
          />
        </UTooltip>

        <!-- DUPLICATE -->
        <UTooltip text="Duplicate">
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="handleDuplicateSection"
          />
        </UTooltip>

        <!-- COLLAPSE -->
        <UTooltip :text="isCollapsed ? 'Expand' : 'Collapse'">
          <UButton
            :icon="
              isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'
            "
            color="neutral"
            variant="ghost"
            size="sm"
            @click="toggleCollapse"
          />
        </UTooltip>

        <!-- DELETE -->
        <UTooltip text="Delete">
          <UButton
            icon="i-lucide-trash"
            color="error"
            variant="ghost"
            size="sm"
            @click="isDeleteModalOpen = true"
          />
        </UTooltip>
      </div>
    </div>

    <div v-show="!isCollapsed" class="p-4 overflow-hidden">
      <draggable
        v-model="questionsModel"
        item-key="id"
        tag="div"
        v-bind="questionDragOptions"
        :animation="0"
        @change="console.log(questionsModel)"
      >
        <template #item="{ element }: { element: Question }">
          <div class="mb-4">
            <QuestionCard
              :key="element.id"
              :section-id="section.id"
              :question="element"
              :questions="section.questions"
            />
          </div>
        </template>
      </draggable>
    </div>

    <BaseConfirmModal
      v-model:open="isDeleteModalOpen"
      title="Delete Section"
      description="Are you sure you want to delete this section?"
      variant="danger"
      @confirm="handleDeleteSection"
    />
  </UCard>
</template>
