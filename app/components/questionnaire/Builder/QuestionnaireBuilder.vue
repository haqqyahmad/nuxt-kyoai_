<!-- app/components/questionnaire/Builder/QuestionnaireBuilder.vue -->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import draggable from 'vuedraggable'

import { useQuestionDnD } from '~/composables/questionnaire/useQuestionDnD'

import SectionCard from './SectionCard.vue'

import type { Section } from '~/types/questionnaire'

const questionnaireTitle = ref('Judul Questionnaire')
const questionnaireDescription = ref('')

const emit = defineEmits<{
  (e: 'update:sections', value: Section[]): void

  (e: 'add-question', sectionId: string): void

  (e: 'add-section'): void

  (e: 'preview'): void
}>()

const { sections } = defineProps<{
  sections: Section[]
}>()

const { sectionDragOptions } = useQuestionDnD()

const sectionsModel = ref<Section[]>([...sections])

watch(
  () => sections,
  (value) => {
    sectionsModel.value = [...value]
  },
  { deep: true }
)

function handleSectionDragEnd() {
  emit('update:sections', [...sectionsModel.value])
}

function updateQuestions(sectionId: string, questions: Section['questions']) {
  const updated = sectionsModel.value.map((section) => {
    if (section.id !== sectionId) {
      return section
    }

    section.questions = questions

    return section
  })

  sectionsModel.value = updated
}

/**
 * EDIT MODE
 */
// const isEditing = ref(false)

// function startEditing() {
//   isEditing.value = true
// }

// function cancelEditing() {
//   isEditing.value = false
// }

// function saveChanges() {
//   console.log('SAVE DATA', sectionsModel.value)

//   isEditing.value = false
// }

// TITLE EDIT
const isTitleEditing = ref(false)
const isDescriptionEditing = ref(false)

const titleInput = ref()
const descriptionInput = ref()

function enableTitleEdit() {
  isTitleEditing.value = true

  nextTick(() => {
    titleInput.value?.inputRef?.focus?.()
  })
}

function saveTitle() {
  isTitleEditing.value = false

  /**
   * AUTO SAVE API
   */
  console.log('AUTO SAVE TITLE:', questionnaireTitle.value)
}

function enableDescriptionEdit() {
  isDescriptionEditing.value = true

  nextTick(() => {
    descriptionInput.value?.textareaRef?.focus?.()
  })
}

function saveDescription() {
  isDescriptionEditing.value = false
}

/**
 * AUTO SAVE
 */
watch(questionnaireTitle, (value) => {
  console.log('AUTO SAVE:', value)
})
</script>

<template>
  <UDashboardPanel
    id="questionnaire-builder"
    class="h-screen flex flex-col overflow-y-auto bg-elevated/30"
  >
    <!-- NAVBAR -->
    <UDashboardNavbar
      class="sticky top-0 z-50 bg-background/75 backdrop-blur-xl border-b border-default"
    >
      <!-- LEFT -->
      <template #leading>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/questionnaire"
          />

          <!-- APP ICON -->
          <div
            class="hidden sm:flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <UIcon name="i-lucide-clipboard-list" class="size-5" />
          </div>
        </div>
      </template>

      <!-- TITLE -->
      <template #title>
        <div class="min-w-0 flex flex-col">
          <h1 class="text-sm sm:text-base font-semibold truncate">
            {{ questionnaireTitle }}
          </h1>

          <p class="hidden sm:block text-xs text-muted truncate">
            Questionnaire Builder
          </p>
        </div>
      </template>

      <!-- RIGHT -->
      <template #trailing>
        <div class="flex items-center gap-2">
          <UBadge color="success" variant="soft" class="rounded-full px-3">
            Auto Saved
          </UBadge>
        </div>
      </template>
    </UDashboardNavbar>

    <!-- CONTENT -->
    <div class="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <!-- FORM HEADER -->
      <div
        class="bg-background border border-default rounded-3xl shadow-sm overflow-hidden"
      >
        <!-- TOP BAR -->
        <div class="h-3 bg-primary" />

        <div class="p-6 sm:p-8 space-y-5">
          <!-- TITLE -->
          <Transition
            mode="out-in"
            enter-active-class="transition-all duration-200"
            leave-active-class="transition-all duration-150"
            enter-from-class="opacity-0 -translate-y-1"
            leave-to-class="opacity-0 translate-y-1"
          >
            <UInput
              v-if="isTitleEditing"
              ref="titleInput"
              v-model="questionnaireTitle"
              autofocus
              variant="none"
              size="xl"
              placeholder="Untitled form"
              class="text-3xl font-bold border-0 border-b-2 border-primary rounded-none px-0 focus:ring-0"
              @blur="saveTitle"
              @keydown.enter="saveTitle"
            />

            <h1
              v-else
              class="text-2xl sm:text-3xl font-bold cursor-text hover:text-primary transition-colors break-words"
              @click="enableTitleEdit"
            >
              {{ questionnaireTitle }}
            </h1>
          </Transition>

          <!-- DESCRIPTION -->
          <Transition
            mode="out-in"
            enter-active-class="transition-all duration-200"
            leave-active-class="transition-all duration-150"
            enter-from-class="opacity-0 -translate-y-1"
            leave-to-class="opacity-0 translate-y-1"
          >
            <UTextarea
              v-if="isDescriptionEditing"
              ref="descriptionInput"
              v-model="questionnaireDescription"
              autoresize
              variant="none"
              :rows="2"
              placeholder="Form description"
              class="text-sm sm:text-base border-0 border-b border-default rounded-none px-0 focus:ring-0 text-muted"
              @blur="saveDescription"
            />

            <p
              v-else
              class="text-sm sm:text-base text-muted cursor-text hover:text-default transition-colors whitespace-pre-line"
              @click="enableDescriptionEdit"
            >
              {{ questionnaireDescription || "Click to add form description" }}
            </p>
          </Transition>
        </div>
      </div>

      <!-- EMPTY -->
      <div
        v-if="!sectionsModel.length"
        class="flex flex-col items-center justify-center border border-dashed border-default rounded-2xl p-10 text-center gap-4 bg-background"
      >
        <div class="space-y-1">
          <h3 class="font-semibold text-lg">
            No sections yet
          </h3>

          <p class="text-sm text-muted">
            Start building your questionnaire
          </p>
        </div>

        <UButton
          icon="i-lucide-plus"
          size="lg"
          variant="soft"
          @click="emit('add-section')"
        >
          Add First Section
        </UButton>
      </div>

      <!-- SECTION LIST -->
      <draggable
        v-else
        v-model="sectionsModel"
        item-key="id"
        tag="div"
        v-bind="sectionDragOptions"
        handle=".section-drag-handle"
        ghost-class="sortable-ghost"
        chosen-class="sortable-chosen"
        drag-class="sortable-drag"
        :animation="180"
        class="space-y-6"
        @end="handleSectionDragEnd"
      >
        <template #item="{ element, index }">
          <SectionCard
            :key="element.id"
            :section="element"
            :index="index"
            @update:questions="updateQuestions(element.id, $event)"
            @add-question="emit('add-question', element.id)"
          />
        </template>
      </draggable>

      <!-- ADD BUTTON -->
      <UButton
        v-if="sectionsModel.length"
        icon="i-lucide-plus"
        size="lg"
        block
        variant="soft"
        class="h-14 rounded-2xl"
        @click="emit('add-section')"
      >
        Add Section
      </UButton>
    </div>

    <!-- FLOATING ACTION BUTTONS -->
    <div
      class="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4"
    >
      <!-- PREVIEW -->
      <UTooltip text="Preview Form">
        <UButton
          icon="i-lucide-eye"
          color="info"
          variant="soft"
          class="rounded-full shadow-xl hover:scale-105 transition-all duration-200 w-10 h-10 p-0 flex items-center justify-center"
          :ui="{
            base: 'flex items-center justify-center',
            leadingIcon: 'size-6'
          }"
          @click="emit('preview')"
        />
      </UTooltip>

      <!-- ADD SECTION -->
      <UTooltip text="Add Section">
        <UButton
          icon="i-lucide-layers-plus"
          color="primary"
          class="rounded-full shadow-xl hover:scale-105 transition-all duration-200 w-10 h-10 p-0 flex items-center justify-center"
          :ui="{
            base: 'flex items-center justify-center',
            leadingIcon: 'size-6'
          }"
          @click="emit('add-section')"
        />
      </UTooltip>
    </div>
  </UDashboardPanel>
</template>
