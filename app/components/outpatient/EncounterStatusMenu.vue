<script setup lang="ts">
import { ENCOUNTER_STATUS_COLOR, ENCOUNTER_STATUS_LABEL } from '~/constants/outpatient'

type Action = 'open' | 'return' | 'complete' | 'reopen'
type MenuItem = { label: string, icon: string, onSelect: () => void }

const props = defineProps<{
  status: string
  loading?: boolean
}>()

const emit = defineEmits<{
  action: [value: Action]
}>()

const items = computed<MenuItem[][]>(() => {
  const list: MenuItem[] = [
    { label: 'Buka Detail', icon: 'i-lucide-folder-open', onSelect: () => emit('action', 'open') }
  ]
  if (props.status === 'IN_CONSULTATION') {
    list.push({ label: 'Kembalikan', icon: 'i-lucide-undo-2', onSelect: () => emit('action', 'return') })
    list.push({ label: 'Selesai', icon: 'i-lucide-check', onSelect: () => emit('action', 'complete') })
  }
  if (props.status === 'DONE') {
    list.push({ label: 'Buka Kembali', icon: 'i-lucide-undo-2', onSelect: () => emit('action', 'reopen') })
  }
  return [list]
})
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'start' }">
    <UButton
      :label="ENCOUNTER_STATUS_LABEL[status] || status"
      :color="(ENCOUNTER_STATUS_COLOR[status] as any) || 'neutral'"
      variant="subtle"
      size="xs"
      trailing-icon="i-lucide-chevron-down"
      :loading="loading"
    />
  </UDropdownMenu>
</template>
