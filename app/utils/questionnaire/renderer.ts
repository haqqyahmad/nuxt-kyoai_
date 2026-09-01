// app/utils/questionnaire/renderer.ts
import TextRenderer
  from '~/components/questionnaire/Builder/renderers/TextRenderer.vue'

import NumberRenderer
  from '~/components/questionnaire/Builder/renderers/NumberRenderer.vue'

import TextareaRenderer
  from '~/components/questionnaire/Builder/renderers/TextareaRenderer.vue'

import RadioRenderer
  from '~/components/questionnaire/Builder/renderers/RadioRenderer.vue'

import CheckboxRenderer
  from '~/components/questionnaire/Builder/renderers/CheckboxRenderer.vue'

import SelectRenderer
  from '~/components/questionnaire/Builder/renderers/SelectRenderer.vue'

import DateRenderer
  from '~/components/questionnaire/Builder/renderers/DateRenderer.vue'

export const questionRenderer = {
  text: TextRenderer,
  number: NumberRenderer,
  textarea: TextareaRenderer,
  radio: RadioRenderer,
  checkbox: CheckboxRenderer,
  select: SelectRenderer,
  date: DateRenderer
}
