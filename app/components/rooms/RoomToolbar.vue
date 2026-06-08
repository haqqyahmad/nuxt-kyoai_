<!-- app/components/rooms/RoomToolbar.vue -->
<script setup lang="ts">
import { roomTypeOptions } from '~/constants/rooms'

const search = defineModel<string>('search', {
  default: ''
})

const type = defineModel<string>('type', {
  default: 'ALL'
})

const state = defineModel<string>('state', {
  default: 'ALL'
})

const roomStateOptions = [
  {
    label: 'Semua status',
    value: 'ALL'
  },
  {
    label: 'Tersedia',
    value: 'AVAILABLE'
  },
  {
    label: 'Digunakan',
    value: 'OCCUPIED'
  },
  {
    label: 'Tidak Aktif',
    value: 'INACTIVE'
  }
]

const typeOptions = computed(() => [
  {
    label: 'Semua tipe',
    value: 'ALL'
  },
  ...roomTypeOptions
])
</script>

<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Cari ruangan..."
      class="w-full lg:max-w-sm"
    />

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
      <USelect
        v-model="type"
        :items="typeOptions"
        placeholder="Semua tipe"
        class="w-full lg:w-44"
      />

      <USelect
        v-model="state"
        :items="roomStateOptions"
        placeholder="Semua status"
        class="w-full lg:w-44"
      />
    </div>
  </div>
</template>
