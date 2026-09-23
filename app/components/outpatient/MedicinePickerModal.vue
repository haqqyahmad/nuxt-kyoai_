<script setup lang="ts">
import type { MedicineStockItem } from '~/types/outpatient'

const props = defineProps<{
  encounterId?: string
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ select: [item: MedicineStockItem] }>()

const api = useApi()
const pending = ref(false)
const warehouseName = ref('')
const medicines = ref<MedicineStockItem[]>([])
const search = ref('')

watch(open, async (value) => {
  if (value) await load()
})

async function load() {
  if (!props.encounterId) return
  pending.value = true
  try {
    const res = await api.get(`/outpatient/encounters/${props.encounterId}/medicine-stock`)
    medicines.value = res.data.data?.data ?? []
    warehouseName.value = res.data.data?.warehouse?.name ?? ''
  } catch {
    medicines.value = []
  } finally {
    pending.value = false
  }
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return medicines.value
  return medicines.value.filter(
    m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
  )
})

function defaultUnit(item: MedicineStockItem) {
  const dispense = item.units?.find(u => u.isDispense)
  const base = item.units?.find(u => u.isBase)
  return dispense?.uom || base?.uom || item.baseUnit
}

function pick(item: MedicineStockItem) {
  emit('select', item)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Pilih Obat"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari obat..."
            class="min-w-[200px] flex-1"
          />
          <span v-if="warehouseName" class="text-xs text-muted">
            Gudang: <b>{{ warehouseName }}</b>
          </span>
        </div>

        <div class="overflow-x-auto rounded-sm border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50 text-left">
              <tr>
                <th class="px-3 py-2">
                  Obat
                </th>
                <th class="px-3 py-2">
                  Satuan Default
                </th>
                <th class="px-3 py-2 text-right">
                  Stok
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in filtered"
                :key="m.id"
                class="cursor-pointer border-t border-default hover:bg-elevated/50"
                @click="pick(m)"
              >
                <td class="px-3 py-2">
                  <div class="text-base font-semibold">
                    {{ m.name }} <span v-if="m.strength" class="text-muted">{{ m.strength }}</span>
                  </div>
                  <div class="text-xs text-muted">
                    {{ m.code }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  {{ defaultUnit(m) }}
                </td>
                <td class="px-3 py-2 text-right font-medium">
                  {{ m.stock }} {{ m.baseUnit }}
                </td>
              </tr>
              <tr v-if="pending">
                <td colspan="3" class="px-3 py-6 text-center text-muted">
                  Memuat...
                </td>
              </tr>
              <tr v-else-if="!filtered.length">
                <td colspan="3" class="px-3 py-6 text-center text-muted">
                  Tidak ada obat.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-xs text-muted">
          Klik baris obat untuk memilih.
        </p>
      </div>
    </template>
  </UModal>
</template>
