<script setup lang="ts">
const selectedYear = ref('Tahun 2024')

const yearOptions = ['Tahun 2024', 'Tahun 2023']

const items = [
  { month: 'Jan', value: 92, height: '60%' },
  { month: 'Feb', value: 94, height: '75%' },
  { month: 'Mar', value: 93, height: '65%' },
  { month: 'Apr', value: 98, height: '85%' },
  { month: 'Mei', value: 99.2, height: '95%' },
  { month: 'Jun', value: 96, height: '80%' }
]
</script>

<template>
  <UCard class="h-[400px]">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-highlighted text-lg font-semibold">
          Tren Kehadiran Bulanan
        </h3>

        <USelect
          v-model="selectedYear"
          :items="yearOptions"
          class="w-36"
        />
      </div>
    </template>

    <div class="flex h-[280px] items-end gap-2 pb-8">
      <div
        v-for="item in items"
        :key="item.month"
        class="group relative flex-1 rounded-t-lg bg-primary/10 transition hover:bg-primary/20"
        :style="{ height: item.height }"
      >
        <div
          class="bg-inverted text-inverted absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded px-2 py-1 text-xs group-hover:block"
        >
          {{ item.value }}%
        </div>

        <span
          class="text-muted absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs"
        >
          {{ item.month }}
        </span>
      </div>
    </div>
  </UCard>
</template>
