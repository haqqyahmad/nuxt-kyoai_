<script setup lang="ts">
import { handleError } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

type UsagePackage = {
  id: string
  code: string
  name: string
}

type UsageItem = {
  itemId: string
  code: string
  name: string
  isActive: boolean
  packages: UsagePackage[]
}

const props = defineProps<{
  row: { questionnaire_id: string, questionnaire_name?: string } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const loading = ref(false)
const items = ref<UsageItem[]>([])

watch(
  () => props.row,
  async (row) => {
    if (!row) return
    loading.value = true
    items.value = []
    try {
      const res = await api.get(`/questionnaire/${row.questionnaire_id}/usage`)
      const data = res.data?.data ?? res.data
      items.value = Array.isArray(data) ? data : []
    } catch (err) {
      handleError(toast, err)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

function onOpenUpdate(value: boolean) {
  if (!value) emit('close')
}
</script>

<template>
  <UModal
    :open="!!props.row"
    :title="`Where used — ${props.row?.questionnaire_name ?? ''}`"
    @update:open="onOpenUpdate"
  >
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
      </div>

      <p v-else-if="!items.length" class="py-6 text-center text-sm text-muted">
        Not linked to any exam item.
      </p>

      <ul v-else class="space-y-3">
        <li
          v-for="item in items"
          :key="item.itemId"
          class="rounded-lg border border-default p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ item.code }} — {{ item.name }}
              </p>
            </div>
            <UBadge
              :color="item.isActive ? 'success' : 'neutral'"
              variant="soft"
              size="sm"
              :label="item.isActive ? 'Active' : 'Inactive'"
            />
          </div>

          <div
            v-if="item.packages?.length"
            class="mt-2 flex flex-wrap items-center gap-1.5"
          >
            <UBadge
              v-for="pkg in item.packages"
              :key="pkg.id"
              color="primary"
              variant="soft"
              size="sm"
              :label="pkg.code ? `${pkg.code} — ${pkg.name}` : pkg.name"
            />
          </div>
          <p v-else class="mt-2 text-xs text-muted">
            No packages.
          </p>
        </li>
      </ul>
    </template>
  </UModal>
</template>
