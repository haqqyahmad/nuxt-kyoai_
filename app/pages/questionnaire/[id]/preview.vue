<!-- app/pages/questionnaire/[id]/preview.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useQuestionnaireStore } from '~/stores/questionnaire/questionnaire'

definePageMeta({ layout: 'blank' })

const api = useApi()
const route = useRoute()
const toast = useToast()

const questionnaireId = String(route.params.id)

const {
  sections,
  setSections
} = useQuestionnaireStore()

const title = ref('')
const description = ref('')
const loading = ref(true)

onMounted(async () => {
  loading.value = true

  try {
    const res = await api.get(`/questionnaire/${questionnaireId}`)
    const data = res.data.data

    title.value = data.questionnaire_name || ''
    description.value = data.description || ''
    setSections(data.sections ?? [])
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal memuat questionnaire',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div
    class="
      min-h-screen
      bg-elevated/30
      overflow-y-auto
    "
  >
    <QuestionnairePreviewForm
      :title="title"
      :description="description"
      :sections="sections"
    />
  </div>
</template>
