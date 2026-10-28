<script setup lang="ts">
type MstItem = {
  id: string
  name: string
  code: string
  department?: { id: string, name: string } | null
  group?: { id: string, name: string, code?: string | null } | null
  inputans?: Array<{ id: string }>
}

const props = defineProps<{
  examId?: string | null
  excludeItemIds?: string[]
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const toast = useToast()

const ALL_VALUE = 'ALL'
const SYSTEM_ITEM_CODES = ['DOK-TREADMILL-SCREENING']

const search = ref('')
const pending = ref(false)
const saving = ref(false)
const results = ref<MstItem[]>([])
const selected = ref<MstItem[]>([])
const selectedDepartmentId = ref(ALL_VALUE)
const selectedGroupId = ref(ALL_VALUE)
const searchInput = ref<HTMLInputElement | null>(null)

let debounce: ReturnType<typeof setTimeout> | undefined
let requestId = 0

const departmentOptions = computed(() => {
  const map = new Map<string, string>()
  for (const item of results.value) {
    if (item.department?.id && item.department?.name) {
      map.set(item.department.id, item.department.name)
    }
  }
  return [
    { label: 'All Departments', value: ALL_VALUE },
    ...Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ label, value }))
  ]
})

const groupOptions = computed(() => {
  const map = new Map<string, string>()
  for (const item of results.value) {
    if (item.group?.id && item.group?.name) {
      map.set(item.group.id, item.group.name)
    }
  }
  return [
    { label: 'All Item Groups', value: ALL_VALUE },
    ...Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ label, value }))
  ]
})

const filteredResults = computed(() =>
  results.value.filter(item =>
    (selectedDepartmentId.value === ALL_VALUE
      || item.department?.id === selectedDepartmentId.value)
    && (selectedGroupId.value === ALL_VALUE
      || item.group?.id === selectedGroupId.value)
    && !selected.value.some(chosen => chosen.id === item.id)
  )
)

const groupedResults = computed(() => {
  const groups = new Map<string, MstItem[]>()
  for (const item of filteredResults.value) {
    const name = item.group?.name ?? 'No Group'
    const list = groups.get(name) ?? []
    list.push(item)
    groups.set(name, list)
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const totalInputans = computed(() =>
  selected.value.reduce((sum, item) => sum + (item.inputans?.length ?? 0), 0)
)

function resetState() {
  search.value = ''
  results.value = []
  selected.value = []
  selectedDepartmentId.value = ALL_VALUE
  selectedGroupId.value = ALL_VALUE
}

async function fetchItems(value = '') {
  const currentId = ++requestId
  pending.value = true

  try {
    const excludeIds = [
      ...(props.excludeItemIds ?? []),
      ...selected.value.map(item => item.id)
    ].filter(Boolean)

    const params: Record<string, unknown> = { search: value.trim(), limit: 100 }
    if (excludeIds.length) params.excludeItemIds = excludeIds.join(',')

    const res = await api.get('/mcu/items', { params })
    const payload = res.data?.data
    const items: MstItem[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : []

    if (currentId === requestId) {
      results.value = items.filter(item => item?.id && !SYSTEM_ITEM_CODES.includes(item.code))
    }
  } catch {
    if (currentId === requestId) results.value = []
  } finally {
    if (currentId === requestId) pending.value = false
  }
}

watch(open, async (value) => {
  if (!value) return
  resetState()
  await nextTick()
  searchInput.value?.focus()
  void fetchItems()
})

watch(search, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => fetchItems(value), 300)
})

function handleKeydown(event: KeyboardEvent) {
  if (!open.value || event.key !== 'Escape') return
  event.stopPropagation()
  open.value = false
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

function selectItem(item: MstItem) {
  if (!selected.value.some(chosen => chosen.id === item.id)) {
    selected.value = [...selected.value, item]
  }
}

function removeSelected(id: string) {
  selected.value = selected.value.filter(item => item.id !== id)
  void fetchItems(search.value)
}

async function submit() {
  if (!props.examId || selected.value.length === 0 || saving.value) return

  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/items`, {
      items: selected.value.map(item => ({ itemId: item.id }))
    })

    toast.add({
      title: 'Additional exam added',
      description: `${selected.value.length} item(s) added to the exam.`,
      color: 'success'
    })
    emit('saved')
    open.value = false
  } catch (err: unknown) {
    const msg
      = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to add additional exam items'
    toast.add({ title: 'Failed', description: msg, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[999] flex items-center justify-center p-4"
        style="
          backdrop-filter: blur(10px) saturate(160%);
          background: rgba(10, 10, 15, 0.55);
        "
      >
        <Transition name="modal-pop">
          <div
            v-if="open"
            class="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-black/10 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95"
            style="
              box-shadow:
                0 30px 80px rgba(0, 0, 0, 0.55),
                inset 0 1px 0 rgba(255, 255, 255, 0.04);
            "
          >
            <div
              class="border-b border-black/10 bg-black/[0.02] px-6 pt-5 pb-4 dark:border-white/10 dark:bg-white/[0.02]"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                    Add Examination Item
                  </h2>

                  <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Extra items outside the selected package
                  </p>
                </div>

                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-500 transition-all hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Close"
                  @click="open = false"
                >
                  <UIcon name="i-lucide-x" class="text-sm" />
                </button>
              </div>

              <div class="relative z-[1000] mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <USelect
                  v-model="selectedDepartmentId"
                  :items="departmentOptions"
                  placeholder="All Departments"
                  icon="i-lucide-building-2"
                  class="w-full"
                  :portal="true"
                  :content="{ side: 'bottom', sideOffset: 6 }"
                  :ui="{ content: 'z-[1001]' }"
                />

                <USelect
                  v-model="selectedGroupId"
                  :items="groupOptions"
                  placeholder="All Item Groups"
                  icon="i-lucide-folder"
                  class="w-full"
                  :portal="true"
                  :content="{ side: 'bottom', sideOffset: 6 }"
                  :ui="{ content: 'z-[1001]' }"
                />
              </div>

              <div class="relative mt-4">
                <UIcon
                  name="i-lucide-search"
                  class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
                />

                <input
                  ref="searchInput"
                  v-model="search"
                  type="text"
                  placeholder="Type item name or code..."
                  autofocus
                  class="h-11 w-full rounded-xl border border-black/10 bg-white pr-10 pl-10 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-neutral-800/90 dark:text-white dark:placeholder:text-neutral-500"
                >

                <UIcon
                  v-if="pending"
                  name="i-lucide-loader-circle"
                  class="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-neutral-500"
                />
              </div>

              <div v-if="selected.length" class="mt-4 flex flex-wrap gap-2">
                <div
                  v-for="item in selected"
                  :key="item.id"
                  class="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5"
                >
                  <span class="max-w-[160px] truncate text-[11px] font-medium text-primary">
                    {{ item.name }}
                  </span>

                  <button
                    type="button"
                    class="text-primary/70 transition-colors hover:text-red-400"
                    :aria-label="`Remove ${item.name}`"
                    @click="removeSelected(item.id)"
                  >
                    <UIcon name="i-lucide-x" class="text-[11px]" />
                  </button>
                </div>
              </div>
            </div>

            <div class="overflow-y-auto" style="max-height: min(65vh, 620px)">
              <div
                v-if="pending && !results.length"
                class="flex flex-col items-center justify-center py-16"
              >
                <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-primary" />

                <p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                  Loading examination items...
                </p>
              </div>

              <div
                v-else-if="!groupedResults.length"
                class="flex flex-col items-center justify-center px-6 py-16 text-center"
              >
                <div
                  class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-white/5"
                >
                  <UIcon name="i-lucide-search-x" class="text-3xl text-neutral-500" />
                </div>

                <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {{ search ? 'Not found' : 'No examination items' }}
                </p>

                <p class="mt-1 text-xs text-neutral-500">
                  Try another keyword or check the item master
                </p>
              </div>

              <div v-else class="space-y-4 p-4">
                <div
                  v-for="[groupName, items] in groupedResults"
                  :key="groupName"
                  class="overflow-hidden rounded-2xl border border-black/10 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div
                    class="sticky top-0 z-10 flex items-center gap-3 border-b border-black/10 bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95"
                  >
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary"
                    >
                      <UIcon name="i-lucide-folder" class="text-sm" />
                    </div>

                    <div class="min-w-0 flex-1">
                      <p
                        class="truncate text-xs font-semibold tracking-wider text-neutral-900 uppercase dark:text-white"
                      >
                        {{ groupName }}
                      </p>
                    </div>

                    <span
                      class="rounded-lg border border-black/10 bg-neutral-100 px-2 py-1 text-[10px] text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400"
                    >
                      {{ items.length }} item
                    </span>
                  </div>

                  <div class="divide-y divide-black/5 dark:divide-white/5">
                    <button
                      v-for="item in items"
                      :key="item.id"
                      type="button"
                      class="group flex w-full items-start gap-4 px-4 py-3 text-left transition-all hover:bg-primary/[0.08]"
                      @click="selectItem(item)"
                    >
                      <div
                        class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10"
                      >
                        <UIcon name="i-lucide-flask-conical" class="text-lg text-primary" />
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="truncate text-sm font-medium text-neutral-900 dark:text-white">
                            {{ item.name }}
                          </p>

                          <UBadge
                            v-if="item.group?.code"
                            :label="item.group.code"
                            size="xs"
                            color="neutral"
                            variant="subtle"
                          />
                        </div>

                        <div
                          class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400"
                        >
                          <span class="font-mono">
                            {{ item.code }}
                          </span>

                          <template v-if="item.department?.name">
                            <span>•</span>

                            <span>
                              {{ item.department.name }}
                            </span>
                          </template>

                          <span>•</span>

                          <span> {{ item.inputans?.length ?? 0 }} inputs </span>
                        </div>
                      </div>

                      <div
                        class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-110"
                      >
                        <UIcon name="i-lucide-plus" class="text-sm text-primary" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="flex items-center justify-between border-t border-black/10 bg-neutral-50 px-6 py-4 dark:border-white/10 dark:bg-white/[0.02]"
            >
              <p class="text-[11px] text-neutral-500">
                <template v-if="selected.length">
                  {{ selected.length }} item(s) selected · {{ totalInputans }} input(s)
                </template>

                <template v-else>
                  No items selected yet
                </template>
              </p>

              <div class="flex gap-2">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  label="Cancel"
                  class="rounded-xl"
                  @click="open = false"
                />

                <UButton
                  size="sm"
                  color="primary"
                  icon="i-lucide-plus"
                  label="Add to Exam"
                  class="rounded-xl"
                  :loading="saving"
                  :disabled="!selected.length || !examId"
                  @click="submit"
                />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-pop-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-pop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.modal-pop-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(6px);
}

.modal-pop-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(3px);
}
</style>
