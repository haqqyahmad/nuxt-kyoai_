<script setup lang="ts">
import { computed, ref } from 'vue'

type SelectorInputan = {
  id: string
  label: string
  uom?: string | null
}

type SelectorResult = {
  inputanId: string
  valueString?: string | null
  valueNumber?: number | null
  valueSelected?: string | null
  valueCalculated?: number | null
  flag?: 'normal' | 'abnormal' | string | null
  grading?: 'NORMAL' | 'ABNORMAL_INC' | 'ABNORMAL_DEC' | string | null
}

export type ReturnSelectedItem = {
  inputanId: string
  note: string
}

const props = defineProps<{
  inputans: SelectorInputan[]
  results: SelectorResult[]
  disabled?: boolean
}>()

type SelectorRow = {
  inputanId: string
  label: string
  value: string
  flag: string
  note: string
  checked: boolean
}

function formatRowValue(inputan: SelectorInputan): string {
  const result = props.results.find(r => r.inputanId === inputan.id)
  const raw = result?.valueNumber ?? result?.valueString ?? result?.valueSelected ?? result?.valueCalculated
  const value = raw == null ? '' : String(raw)
  if (!value) return '-'
  return inputan.uom ? `${value} ${inputan.uom}` : value
}

function isAbnormalRow(inputan: SelectorInputan): boolean {
  const result = props.results.find(r => r.inputanId === inputan.id)
  if (result?.flag === 'abnormal') return true
  const grading = String(result?.grading ?? '').toUpperCase()
  return grading === 'ABNORMAL_INC' || grading === 'ABNORMAL_DEC'
}

function resultFlag(inputan: SelectorInputan): string {
  const result = props.results.find(r => r.inputanId === inputan.id)
  const grading = result?.grading ? String(result.grading) : ''
  if (grading && grading.toUpperCase().startsWith('ABNORMAL')) return grading
  return result?.flag === 'abnormal' ? 'abnormal' : 'normal'
}

function buildRows(): SelectorRow[] {
  const rows = props.inputans.map(inputan => ({
    inputanId: inputan.id,
    label: inputan.label,
    value: formatRowValue(inputan),
    flag: resultFlag(inputan),
    note: '',
    checked: isAbnormalRow(inputan)
  }))
  rows.sort((a, b) => {
    const score = (r: SelectorRow) => r.checked ? 0 : 1
    return score(a) - score(b) || a.label.localeCompare(b.label)
  })
  return rows
}

const rows = ref<SelectorRow[]>(buildRows())
const search = ref('')

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(row =>
    [row.label, row.value, row.flag].filter(Boolean).join(' ').toLowerCase().includes(q))
})

function selectAllAbnormal() {
  for (const row of rows.value) {
    if (row.flag === 'abnormal' || row.flag.startsWith('ABNORMAL')) row.checked = true
  }
}

function getSelected(): ReturnSelectedItem[] {
  return rows.value
    .filter(row => row.checked)
    .map(row => ({ inputanId: row.inputanId, note: row.note.trim() }))
}

defineExpose({ getSelected })
</script>

<template>
  <div v-if="rows.length" class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search parameter..."
        size="sm"
        class="min-w-0 flex-1"
      />
      <UButton
        size="sm"
        color="neutral"
        variant="soft"
        :disabled="disabled"
        @click="selectAllAbnormal"
      >
        Select all abnormal
      </UButton>
    </div>

    <div class="max-h-[320px] space-y-2 overflow-auto pr-1">
      <div
        v-for="row in filteredRows"
        :key="row.inputanId"
        class="flex items-start gap-3 rounded-xl border border-default p-3 text-left"
        :class="row.checked ? 'bg-warning/5 border-warning/40' : 'bg-transparent'"
      >
        <UCheckbox v-model="row.checked" class="mt-1 shrink-0" />

        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted">
            {{ row.label }}
          </p>
          <p class="mt-0.5 text-xs text-muted">
            {{ row.value }}
            <span v-if="row.flag !== 'normal'"> · {{ row.flag }}</span>
          </p>
          <UTextarea
            v-model="row.note"
            :rows="1"
            :maxlength="500"
            placeholder="Note for this parameter (optional)..."
            class="mt-2 w-full"
          />
        </div>
      </div>

      <p v-if="!filteredRows.length" class="rounded-xl border border-dashed border-default p-4 text-center text-sm text-muted">
        No parameters match.
      </p>
    </div>
  </div>
</template>
