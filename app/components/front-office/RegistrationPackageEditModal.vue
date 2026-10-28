<script setup lang="ts">
type PaketItem = {
  id: string
  sortOrder: number
  item: { id: string, name: string, code: string }
}

type Paket = {
  id: string
  name: string
  code?: string | null
  isActive?: boolean
  paketItems?: PaketItem[]
}

const props = defineProps<{
  registrationId?: number | null
  currentPaketId?: string | null
  statusRegistration?: string | null
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const pakets = ref<Paket[]>([])
const selectedPaketId = ref<string | undefined>(undefined)

const paketOptions = computed(() =>
  pakets.value.map(paket => ({
    label: paket.code ? `${paket.name} (${paket.code})` : paket.name,
    value: paket.id
  }))
)

const selectedPaket = computed(
  () => pakets.value.find(paket => paket.id === selectedPaketId.value) ?? null
)

const currentPaket = computed(
  () => pakets.value.find(paket => paket.id === props.currentPaketId) ?? null
)

const isChanged = computed(
  () => !!selectedPaketId.value && selectedPaketId.value !== props.currentPaketId
)

const selectedItems = computed(() => selectedPaket.value?.paketItems ?? [])

async function fetchPakets() {
  loading.value = true
  try {
    const res = await api.get('/mcu/pakets', { params: { limit: 500 } })
    const payload = res.data?.data
    const list: Paket[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : []
    pakets.value = list.filter(paket => paket?.id && paket.isActive !== false)
  } catch (err: unknown) {
    pakets.value = []
    const msg
      = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load MCU packages'
    toast.add({ title: 'Failed', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (!value) return
  selectedPaketId.value = props.currentPaketId ?? undefined
  void fetchPakets()
})

async function submit() {
  if (!props.registrationId || !selectedPaketId.value || saving.value) return

  saving.value = true
  try {
    await api.patch(`/registration/${props.registrationId}/package`, {
      paketId: selectedPaketId.value
    })

    toast.add({
      title: 'Package updated',
      description: 'MCU package replaced. Additional items are kept.',
      color: 'success'
    })
    emit('saved')
    open.value = false
  } catch (err: unknown) {
    const msg
      = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to replace package'
    toast.add({ title: 'Failed', description: msg, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Edit MCU Package"
    description="Replace the MCU package before patient check-in"
    :ui="{ content: 'sm:max-w-2xl w-full' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="MCU Package">
          <USelectMenu
            v-model="selectedPaketId"
            :items="paketOptions"
            value-key="value"
            search-input
            placeholder="Search / select package"
            icon="i-lucide-package"
            :loading="loading"
            class="w-full"
          />
        </UFormField>

        <div class="rounded-lg border border-default bg-elevated/50 p-4">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">
              Current package
            </span>
            <UBadge
              :label="currentPaket?.name ?? 'No package'"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>
          <p v-if="statusRegistration" class="mt-2 text-xs text-muted">
            Registration status: {{ statusRegistration }}
          </p>
        </div>

        <div v-if="selectedPaket" class="rounded-lg border border-default">
          <div class="flex items-center justify-between gap-2 border-b border-default px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ selectedPaket.name }}
              </p>
              <p class="text-xs text-muted">
                {{ selectedPaket.code || '-' }} · {{ selectedItems.length }} item(s)
              </p>
            </div>
            <UBadge
              :label="`${selectedItems.length} item`"
              color="primary"
              variant="subtle"
              size="sm"
            />
          </div>
          <div class="max-h-48 overflow-y-auto divide-y divide-default">
            <div
              v-for="paketItem in selectedItems"
              :key="paketItem.id"
              class="flex items-center gap-2 px-4 py-2 text-sm"
            >
              <UIcon name="i-lucide-activity" class="size-3.5 shrink-0 text-primary" />
              <span class="truncate">{{ paketItem.item.name }}</span>
            </div>
            <div v-if="!selectedItems.length" class="px-4 py-6 text-center text-sm text-muted">
              This package has no examination item
            </div>
          </div>
        </div>

        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Package items will be replaced"
          description="All package items are replaced with the selected package. Additional exam items outside the package are kept."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="open = false"
        />
        <UButton
          color="primary"
          icon="i-lucide-save"
          label="Save Package"
          :loading="saving"
          :disabled="!isChanged || !selectedPaket"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
