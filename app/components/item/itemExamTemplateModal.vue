<script setup lang="ts">
import ItemExamTemplate  from '~/components/item/ItemExamTemplate.vue'
import ItemSampleManager from '~/components/item/itemSampleManager.vue'

const props = defineProps<{
  itemId:   string
  itemName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const open    = defineModel<boolean>('open', { default: false })
const activeTab = ref<'template' | 'sample'>('sample')

watch(open, (val) => {
  if (!val) emit('close')
})

const tabs = [
  { key: 'template', label: 'Template Exam',   icon: 'i-lucide-test-tube'          },
  { key: 'sample',   label: 'Sample',         icon: 'i-lucide-test-tube-diagonal' },
]
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-7xl h-[90vh]' }"
  >
    <template #content>
      <UCard
        class="h-full flex flex-col"
        :ui="{ body: 'p-0 flex-1 min-h-0 overflow-hidden' }"
      >
        <!-- HEADER -->
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <UIcon name="i-lucide-test-tube" class="size-5 text-primary" />
              </div>
              <div>
                <h2 class="text-base font-semibold leading-tight">Konfigurasi Item</h2>
                <p class="text-sm text-muted leading-tight mt-0.5">{{ props.itemName }}</p>
              </div>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="open = false" />
          </div>

          <!-- Tabs -->
          <div class="mt-4 flex gap-1 border-b border-default -mb-4">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-default cursor-pointer'"
              @click="activeTab = tab.key as typeof activeTab"
            >
              <UIcon :name="tab.icon" class="size-4" />
              {{ tab.label }}
            </button>
          </div>
        </template>

        <!-- BODY -->
        <div class="overflow-y-auto h-full px-6 py-4">

          <!-- Tab: Sample -->
          <ItemSampleManager
            v-if="activeTab === 'sample'"
            :item-id="props.itemId"
          />

          <!-- Tab: Template Exam -->
          <ItemExamTemplate
            v-else-if="activeTab === 'template'"
            :item-id="props.itemId"
          />

        </div>

        <!-- FOOTER -->
        <template #footer>
          <div class="flex justify-end">
            <UButton color="neutral" variant="soft" icon="i-lucide-check" @click="open = false">
              Tutup
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>