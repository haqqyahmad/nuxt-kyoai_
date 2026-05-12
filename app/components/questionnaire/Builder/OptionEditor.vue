<script setup lang="ts">
import type { Question } from '~/types/questionnaire'

import {
  useQuestionnaireStore
} from '~/stores/questionnaire/questionnaire'

const props = defineProps<{
  sectionId: string
  question: Question
}>()

const {
  addOption,
  removeOption
} = useQuestionnaireStore()
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="option in question.options"
      :key="option.id"
      class="flex items-center gap-2"
    >
      <UInput
        v-model="option.label"
        class="flex-1"
        placeholder="Option label"
      />

      <UButton
        icon="i-lucide-trash"
        color="error"
        variant="ghost"
        @click="
          removeOption(
            sectionId,
            question.id,
            option.id
          )
        "
      />
    </div>

    <UButton
      icon="i-lucide-plus"
      variant="soft"
      @click="
        addOption(
          sectionId,
          question.id
        )
      "
    >
      Add Option
    </UButton>
  </div>
</template>
