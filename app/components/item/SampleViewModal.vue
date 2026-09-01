<!-- app/components/item/SampleViewModal.vue -->
<script setup lang="ts">
type SampleType = {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const open = defineModel<boolean>('open', {
  default: false
})

defineProps<{
  sample: SampleType | null
}>()

function formatDate(value?: string) {
  if (!value) return '-'

  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">
                Detail Sample
              </h2>
              <p class="text-sm text-muted">
                Informasi detail sample
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
          </div>
        </template>

        <div v-if="sample" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p class="text-sm text-muted">
                Code
              </p>
              <p class="font-medium">
                {{ sample.code }}
              </p>
            </div>

            <div>
              <p class="text-sm text-muted">
                Name
              </p>
              <p class="font-medium">
                {{ sample.name }}
              </p>
            </div>

            <div>
              <p class="text-sm text-muted">
                Status
              </p>
              <UBadge
                :label="sample.isActive ? 'Active' : 'Inactive'"
                :color="sample.isActive ? 'success' : 'neutral'"
                variant="subtle"
              />
            </div>

            <div>
              <p class="text-sm text-muted">
                Created At
              </p>
              <p class="font-medium">
                {{ formatDate(sample.createdAt) }}
              </p>
            </div>
          </div>

          <div>
            <p class="text-sm text-muted">
              Description
            </p>
            <p class="font-medium whitespace-pre-line">
              {{ sample.description || '-' }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton
              color="neutral"
              variant="soft"
              @click="open = false"
            >
              Close
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
