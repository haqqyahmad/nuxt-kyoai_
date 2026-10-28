<script setup lang="ts">
type MstItem = {
  id: string
  name: string
  code: string
  department?: { id: string, name: string } | null
  group?: { id: string, name: string } | null
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
const expandedIds = ref<Set<string>>(new Set())

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
  expandedIds.value = new Set()
}

function isExpanded(id: string) {
  return expandedIds.value.has(id)
}

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
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

watch(open, (value) => {
  if (!value) return
  resetState()
  void fetchItems()
})

watch(search, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => fetchItems(value), 300)
})

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
  <UModal
    v-model:open="open"
    title="Add New Additional Exam"
    description="Select extra examination items outside the MCU package"
    :ui="{ content: 'sm:max-w-3xl w-full' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UFormField label="Search item">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search name or code"
              class="w-full"
              :loading="pending"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Department">
              <USelect
                v-model="selectedDepartmentId"
                :items="departmentOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Group">
              <USelect
                v-model="selectedGroupId"
                :items="groupOptions"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <div
          v-if="selected.length"
          class="rounded-lg border border-default bg-elevated/50 p-3"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-muted">
              {{ selected.length }} selected · {{ totalInputans }} input(s)
            </span>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              label="Clear all"
              @click="selected = []; fetchItems(search)"
            />
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="item in selected"
              :key="item.id"
              class="inline-flex items-center gap-1 rounded-full border border-default bg-background px-2.5 py-1 text-xs"
            >
              {{ item.name }}
              <button
                type="button"
                class="text-muted hover:text-highlighted"
                :aria-label="`Remove ${item.name}`"
                @click="removeSelected(item.id)"
              >
                <UIcon name="i-lucide-x" class="size-3" />
              </button>
            </span>
          </div>
        </div>

        <div class="max-h-[45vh] overflow-y-auto rounded-lg border border-default">
          <div v-if="pending && !filteredResults.length" class="px-4 py-8 text-center text-sm text-muted">
            Loading items...
          </div>
          <div v-else-if="!filteredResults.length" class="px-4 py-8 text-center text-sm text-muted">
            No item available
          </div>
          <div v-else class="divide-y divide-default">
            <div
              v-for="[groupName, items] in groupedResults"
              :key="groupName"
              class="px-4 py-3"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 text-left"
                @click="toggleExpanded(groupName)"
              >
                <span class="flex items-center gap-2 text-sm font-semibold text-highlighted">
                  <UIcon name="i-lucide-folder" class="text-primary" />
                  {{ groupName }}
                  <UBadge :label="String(items.length)" color="neutral" variant="subtle" size="xs" />
                </span>
                <UIcon
                  :name="isExpanded(groupName) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-4 text-muted"
                />
              </button>

              <div v-show="isExpanded(groupName)" class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <button
                  v-for="item in items"
                  :key="item.id"
                  type="button"
                  class="flex items-start justify-between gap-3 rounded-lg border border-default px-3 py-2 text-left hover:bg-elevated"
                  @click="selectItem(item)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium text-highlighted">
                      {{ item.name }}
                    </span>
                    <span class="block truncate text-[11px] text-muted">
                      {{ item.code }} · {{ item.department?.name ?? '-' }} · {{ item.inputans?.length ?? 0 }} input(s)
                    </span>
                  </span>
                  <UIcon name="i-lucide-plus-circle" class="mt-0.5 size-4 shrink-0 text-primary" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="text-xs text-muted">
          {{ selected.length }} item(s) selected
        </span>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="open = false"
          />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            label="Add to Exam"
            :loading="saving"
            :disabled="!selected.length || !examId"
            @click="submit"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
