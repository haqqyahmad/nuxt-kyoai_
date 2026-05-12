<!-- app/components/questionnaire/Builder/QuestionRenderer.vue -->
<script setup lang="ts">
import type {
  Question
} from '~/types/questionnaire'

import { computed }
  from 'vue'

import { questionRenderer }
  from '~/utils/questionnaire/renderer'

const props = defineProps<{
  question: Question
}>()

const currentRenderer = computed(() => {
  return questionRenderer[
    props.question.questionType
  ] || questionRenderer.text
})
</script>

<template>
  <component
    :is="currentRenderer"
    :question="question"
  />
</template>
