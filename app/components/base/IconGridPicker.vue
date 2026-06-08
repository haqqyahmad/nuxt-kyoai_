<script setup lang="ts">
const model = defineModel<string>({
  default: ''
})

const search = ref('')

const icons = [
  'i-lucide-heart-pulse',
  'i-lucide-stethoscope',
  'i-lucide-hospital',
  'i-lucide-clipboard-list',
  'i-lucide-syringe',
  'i-lucide-pill',
  'i-lucide-activity',
  'i-lucide-user-round',
  'i-lucide-users',
  'i-lucide-building-2',
  'i-lucide-briefcase-medical',
  'i-lucide-test-tube',
  'i-lucide-microscope',
  'i-lucide-ambulance',
  'i-lucide-cross',
  'i-lucide-shield-plus'
]

const filteredIcons = computed(() =>
  icons.filter(icon =>
    icon.toLowerCase().includes(search.value.toLowerCase())
  )
)

function selectIcon(icon: string) {
  model.value = icon
}
</script>

<template>
  <div class="space-y-3">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search icon..."
      class="w-full"
    />

    <div class="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-default p-3 sm:grid-cols-6 md:grid-cols-8">
      <button
        v-for="icon in filteredIcons"
        :key="icon"
        type="button"
        class="flex h-14 items-center justify-center rounded-lg border transition hover:bg-muted"
        :class="model === icon ? 'border-primary bg-primary/10 text-primary' : 'border-default'"
        :title="icon"
        @click="selectIcon(icon)"
      >
        <UIcon :name="icon" class="size-6" />
      </button>
    </div>

    <div
      v-if="model"
      class="flex items-center gap-2 rounded-lg border border-default p-3 text-sm"
    >
      <UIcon :name="model" class="size-5 text-primary" />
      <span class="font-medium">{{ model }}</span>
    </div>
  </div>
</template>
