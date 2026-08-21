<script setup lang="ts">
type JsonValue = unknown

const props = withDefaults(defineProps<{
  name: string
  value: JsonValue
  path?: string
  depth?: number
  query?: string
  defaultOpen?: boolean
}>(), { path: '', depth: 0, query: '', defaultOpen: false })

const emit = defineEmits<{ copy: [path: string, value: JsonValue] }>()
const open = ref(props.defaultOpen || props.depth < 1)
const isArray = computed(() => Array.isArray(props.value))
const isObject = computed(() => props.value !== null && typeof props.value === 'object')
const expandable = computed(() => isObject.value)
const entries = computed(() => isArray.value
  ? (props.value as JsonValue[]).map((value, index) => [String(index), value] as const)
  : Object.entries((props.value ?? {}) as Record<string, JsonValue>))
const type = computed(() => props.value === null ? 'null' : isArray.value ? 'array' : typeof props.value)
const summary = computed(() => isArray.value ? `Array(${entries.value.length})` : isObject.value ? `{ ${entries.value.length} keys }` : '')
const displayValue = computed(() => typeof props.value === 'string' ? `"${props.value}"` : String(props.value))
const matchesQuery = computed(() => {
  const q = props.query.trim().toLowerCase()
  if (!q) return true
  return props.path.toLowerCase().includes(q) || displayValue.value.toLowerCase().includes(q)
})
const visibleEntries = computed(() => {
  const q = props.query.trim().toLowerCase()
  if (!q) return entries.value
  return entries.value.filter(([key, value]) => `${props.path}.${key} ${JSON.stringify(value)}`.toLowerCase().includes(q))
})
function relayCopy(path: string, value: JsonValue) {
  emit('copy', path, value)
}

const valueClass = computed(() => ({
  string: 'text-emerald-600 dark:text-emerald-400',
  number: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-violet-600 dark:text-violet-400',
  null: 'text-rose-500 italic'
}[type.value] ?? 'text-muted'))
</script>

<template>
  <div v-if="matchesQuery || visibleEntries.length" class="font-mono text-xs leading-6">
    <div class="group flex min-w-0 items-start rounded px-1 hover:bg-elevated/60" :style="{ paddingLeft: `${depth * 16 + 4}px` }">
      <button
        v-if="expandable"
        type="button"
        class="mr-1 mt-1 shrink-0 text-muted"
        @click="open = !open"
      >
        <UIcon :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3.5" />
      </button>
      <span v-else class="mr-1 inline-block w-3.5" />
      <button
        type="button"
        class="min-w-0 flex-1 text-left"
        :class="expandable ? 'cursor-pointer' : 'cursor-text'"
        @click="expandable && (open = !open)"
      >
        <span class="text-sky-700 dark:text-sky-300">{{ name }}</span><span class="text-muted">: </span>
        <span v-if="expandable" class="text-muted">{{ summary }}</span>
        <span v-else :class="valueClass" class="break-all">{{ displayValue }}</span>
      </button>
      <UButton
        class="invisible shrink-0 group-hover:visible"
        icon="i-lucide-copy"
        size="xs"
        color="neutral"
        variant="ghost"
        @click.stop="emit('copy', path, value)"
      />
    </div>

    <template v-if="expandable && open">
      <JsonTreeNode
        v-for="([key, child]) in visibleEntries"
        :key="`${path}.${key}`"
        :name="isArray ? `[${key}]` : key"
        :value="child"
        :path="path ? `${path}.${key}` : key"
        :depth="depth + 1"
        :query="query"
        @copy="relayCopy"
      />
    </template>
  </div>
</template>
