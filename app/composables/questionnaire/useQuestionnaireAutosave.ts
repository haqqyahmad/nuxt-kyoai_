// app/composables/questionnaire/useQuestionnaireAutosave.ts
import { watchDebounced } from '@vueuse/core'
import { useQuestionnaireStore } from '~/stores/questionnaire/questionnaire'

export function useQuestionnaireAutosave() {
  const api = useApi()

  const {
    sections
  } = useQuestionnaireStore()

  watchDebounced(
    sections,
    async () => {
      await api.put(
        '/questionnaire/builder',
        {
          sections: sections.value
        }
      )
    },
    {
      deep: true,
      debounce: 1500,
      maxWait: 5000
    }
  )
}
