<!-- app/components/rooms/RoomStats.vue -->
<script setup lang="ts">
const props = defineProps<{
  total: number
  active: number
  inactive: number
}>()

const stats = computed(() => [
  {
    label: 'Total Ruangan',
    value: props.total,
    icon: 'i-lucide-door-open',
    color: 'text-highlighted'
  },
  {
    label: 'Aktif',
    value: props.active,
    icon: 'i-lucide-check-circle',
    color: 'text-success'
  },
  {
    label: 'Tidak Aktif',
    value: props.inactive,
    icon: 'i-lucide-ban',
    color: 'text-muted'
  }
])
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <UCard
      v-for="item in stats"
      :key="item.label"
      variant="subtle"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm text-muted">
            {{ item.label }}
          </p>

          <p
            class="mt-1 text-2xl font-semibold"
            :class="item.color"
          >
            {{ item.value }}
          </p>
        </div>

        <div class="flex size-10 items-center justify-center rounded-xl bg-muted">
          <UIcon
            :name="item.icon"
            class="size-5"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
