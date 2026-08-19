<script setup lang="ts">
import { html } from '@codemirror/lang-html'
import { EditorView } from '@codemirror/view'
import { Codemirror } from 'vue-codemirror'

const props = withDefaults(defineProps<{
  theme?: 'light' | 'dark'
}>(), {
  theme: 'light'
})

const model = defineModel<string>({ default: '' })

// Reuse instance html agar tidak re-parse saat ganti tema
const htmlLang = html()

const editorTheme = computed(() => EditorView.theme({
  '&': {
    flex: '1 1 auto',
    minHeight: '0',
    color: props.theme === 'dark' ? '#e5e7eb' : '#1f2937',
    backgroundColor: props.theme === 'dark' ? '#111827' : '#ffffff'
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-gutters': {
    color: props.theme === 'dark' ? '#9ca3af' : '#6b7280',
    backgroundColor: props.theme === 'dark' ? '#1f2937' : '#f9fafb'
  }
}, { dark: props.theme === 'dark' }))

const extensions = computed(() => [htmlLang, EditorView.lineWrapping, editorTheme.value])
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <Codemirror
      v-model="model"
      :extensions="extensions"
      :indent-with-tab="true"
      :tab-size="2"
      placeholder="<html>... template print ...</html>"
    />
  </div>
</template>

<style scoped>
:deep(.cm-editor) {
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  font-size: 0.75rem;
}

:deep(.cm-content) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
