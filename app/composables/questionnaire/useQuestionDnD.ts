// app/composables/questionnaire/useQuestionDnD.ts

export function useQuestionDnD() {
  const baseOptions = {
    animation: 180,

    easing: 'cubic-bezier(0.2, 0, 0, 1)',

    ghostClass: 'sortable-ghost',

    chosenClass: 'sortable-chosen',

    dragClass: 'sortable-drag',

    swapThreshold: 0.65,

    filter: 'input, textarea, button, select, .no-drag',

    preventOnFilter: false,

    scroll: true,

    scrollSensitivity: 120,

    scrollSpeed: 14,

    forceFallback: true,

    fallbackOnBody: true
  }

  const sectionDragOptions = {
    ...baseOptions,

    group: 'sections',

    handle: '.section-drag-handle'
  }

  const questionDragOptions = {
    ...baseOptions,

    group: 'questions',

    handle: '.drag-handle'
  }

  return {
    sectionDragOptions,
    questionDragOptions
  }
}
