<script setup lang="ts">
import type { MstItemOption } from '~/types/outpatient'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ select: [items: MstItemOption[]] }>()

const api = useApi()
const pending = ref(false)
const search = ref('')
const items = ref<MstItemOption[]>([])
const selected = ref<Set<string>>(new Set())

watch(open, async (value) => {
  if (!value) return
  selected.value = new Set()
  await load()
})

watch(search, () => {
  if (open.value) load()
})

async function load() {
  pending.value = true
  try {
    const res = await api.get('/mcu/items', {
      params: {
        search: search.value || undefined,
        limit: 100,
        departmentCodes: 'LAB,RAD,NURSE,DENTAL'
      }
    })
    items.value = (res.data.data ?? []) as MstItemOption[]
  } catch {
    items.value = []
  } finally {
    pending.value = false
  }
}

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function submit() {
  if (!selected.value.size) return
  emit('select', items.value.filter(item => selected.value.has(item.id)))
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Order Pemeriksaan"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-3">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari item pemeriksaan..."
          class="w-full"
        />

        <div class="max-h-[50vh] overflow-auto rounded-sm border border-default">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-elevated/90 text-left">
              <tr>
                <th class="w-8 px-3 py-2" />
                <th class="px-3 py-2">
                  Item
                </th>
                <th class="px-3 py-2">
                  Departemen
                </th>
                <th class="px-3 py-2">
                  Room
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in items"
                :key="item.id"
                class="cursor-pointer border-t border-default hover:bg-elevated/50"
                @click="toggle(item.id)"
              >
                <td class="px-3 py-2">
                  <UCheckbox
                    :model-value="selected.has(item.id)"
                    @click.stop
                    @update:model-value="toggle(item.id)"
                  />
                </td>
                <td class="px-3 py-2">
                  <div class="font-medium">
                    {{ item.name }}
                  </div>
                  <div class="text-xs text-muted">
                    {{ item.code }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  {{ item.department?.name || '-' }}
                </td>
                <td class="px-3 py-2">
                  {{ item.roomType?.name || '-' }}
                </td>
              </tr>
              <tr v-if="pending">
                <td colspan="4" class="px-3 py-6 text-center text-muted">
                  Memuat...
                </td>
              </tr>
              <tr v-else-if="!items.length">
                <td colspan="4" class="px-3 py-6 text-center text-muted">
                  Tidak ada item.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-xs text-muted">
          {{ selected.size }} item dipilih. Item dari master MCU (Lab, Radiologi, Dental, Nurse).
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Batal"
          @click="open = false"
        />
        <UButton
          color="primary"
          icon="i-lucide-plus"
          :label="`Tambahkan (${selected.size})`"
          :disabled="!selected.size"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
