<!-- app/pages/questionnaire/[id]/builder.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { watchDebounced } from '@vueuse/core'

import { useToast } from '#imports'

import { useQuestionnaireStore }
  from '~/stores/questionnaire/questionnaire'
import { useQuestionnaireAutosave }
  from '~/composables/questionnaire/useQuestionnaireAutosave'

const toast = useToast()
const api = useApi()
const route = useRoute()

const questionnaireId = String(route.params.id)

const {
  sections,
  setSections,
  addSection,
  addQuestion
} = useQuestionnaireStore()

useQuestionnaireAutosave(questionnaireId)

/**
 * FORM META
 */
const questionnaireTitle = ref(
  'Untitled Questionnaire'
)

const questionnaireDescription = ref(
  'Form description'
)

const questionnairePortalKey = ref('')

/**
 * Autosave header (nama + deskripsi) → PUT /questionnaire/:id
 */
let loaded = false

watchDebounced(
  [questionnaireTitle, questionnaireDescription, questionnairePortalKey],
  async () => {
    if (!loaded) return

    try {
      await api.put(`/questionnaire/${questionnaireId}`, {
        questionnaire_name: questionnaireTitle.value,
        description: questionnaireDescription.value,
        portalKey: questionnairePortalKey.value || null,
      })
    } catch {
      // abaikan — gagal update header tidak memblokir builder
    }
  },
  { debounce: 1500, maxWait: 5000 }
)

/**
 * PREVIEW
 */
const isPreviewOpen = ref(false)

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

/**
 * LOAD BY ID
 */
const loading = ref(false)

onMounted(async () => {
  loading.value = true

  try {
    const res = await api.get(`/questionnaire/${questionnaireId}`)
    const data = res.data.data

    questionnaireTitle.value = data.questionnaire_name
      || 'Untitled Questionnaire'

    questionnaireDescription.value = data.description
      || 'Form description'

    questionnairePortalKey.value = data.portalKey || ''

    setSections(data.sections ?? [])
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal memuat questionnaire',
      color: 'error'
    })
  } finally {
    loading.value = false
    loaded = true
  }
})

/**
 * SAVE
 */
const saving = ref(false)

/**
 * Drag & drop (section/question) — sinkronkan urutan ke store,
 * lalu autosave (PUT /:id/sections) mem-persist sortOrder.
 */
function onUpdateSections(nextSections: typeof sections.value) {
  setSections(nextSections)
}

async function saveQuestionnaire() {
  saving.value = true

  try {
    await api.put(
      `/questionnaire/${questionnaireId}/sections`,
      { sections: sections.value }
    )

    toast.add({
      title: 'Tersimpan',
      description: 'Questionnaire berhasil disimpan',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menyimpan questionnaire',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- BUILDER -->
  <QuestionnaireBuilder
    :sections="sections"
    :title="questionnaireTitle"
    :description="questionnaireDescription"
    :portalKey="questionnairePortalKey"
    :saving="saving"
    @update:sections="onUpdateSections"
    @update:title="questionnaireTitle = $event"
    @update:description="
      questionnaireDescription = $event
    "
    @update:portalKey="questionnairePortalKey = $event"
    @add-section="handleAddSection"
    @add-question="addQuestion"
    @preview="isPreviewOpen = true"
    @save="saveQuestionnaire"
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

        <QuestionnairePreviewForm
          :title="questionnaireTitle"
          :description="questionnaireDescription"
          :sections="sections"
        />
      </div>
    </template>
  </UModal>
</template>
