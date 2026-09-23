<script setup lang="ts">
import type { ApiError, PharmacyEncounterDetail, Warehouse } from '~/types/outpatient'
import {
  ITEM_STATUS_COLOR,
  ITEM_STATUS_LABEL,
  PRESCRIPTION_STATUS_LABEL,
  formatDateTime
} from '~/constants/outpatient'

const route = useRoute()
const api = useApi()
const toast = useToast()
const router = useRouter()

const encounterId = String(route.params.id)
const busy = ref<string | null>(null)

const { data: detail, refresh, pending } = await useAsyncData(
  `pharmacy-encounter-${encounterId}`,
  async () => {
    const res = await api.get(`/outpatient/pharmacy/encounters/${encounterId}`)
    return res.data.data as PharmacyEncounterDetail
  }
)

const encounter = computed(() => detail.value?.encounter)
const orders = computed(() => detail.value?.orders ?? [])
const hasAdditional = computed(() => orders.value.some(o => o.isAdditional))

const { data: warehouses } = await useAsyncData('pharmacy-orders-warehouses', async () => {
  const res = await api.get('/outpatient/warehouses', { params: { activeOnly: 'true' } })
  return res.data.data as Warehouse[]
})
const warehouseOptions = computed(() =>
  (warehouses.value ?? []).map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }))
)

async function run(key: string, fn: () => Promise<unknown>, successMsg: string) {
  busy.value = key
  try {
    await fn()
    toast.add({ title: 'Berhasil', description: successMsg, color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    busy.value = null
  }
}

const process = (orderId: string) =>
  run(`proc-${orderId}`, () => api.patch(`/outpatient/pharmacy/prescriptions/${orderId}/process`), 'Order diproses')

const cancelProcess = (orderId: string) =>
  run(`cp-${orderId}`, () => api.patch(`/outpatient/pharmacy/prescriptions/${orderId}/cancel-process`), 'Cancel process berhasil')

const setItemStatus = (itemId: string, status: string) =>
  run(`item-${itemId}-${status}`, () => api.patch(`/outpatient/pharmacy/items/${itemId}/status`, { status }), 'Status item diubah')

function cancelItem(itemId: string) {
  const reason = window.prompt('Alasan pembatalan item?') ?? ''
  return run(`cancel-${itemId}`, () => api.patch(`/outpatient/pharmacy/items/${itemId}/cancel`, { reason }), 'Item dibatalkan, stok kembali')
}

const isWarehouseOpen = ref(false)
const warehouseItemId = ref<string | null>(null)
const overrideWarehouseId = ref('')

function openOverride(itemId: string, currentWarehouseId: string | null) {
  warehouseItemId.value = itemId
  overrideWarehouseId.value = currentWarehouseId ?? ''
  isWarehouseOpen.value = true
}

async function submitOverride() {
  if (!warehouseItemId.value || !overrideWarehouseId.value) return
  const itemId = warehouseItemId.value
  await run(
    `wh-${itemId}`,
    () => api.patch(`/outpatient/pharmacy/items/${itemId}/warehouse`, { warehouseId: overrideWarehouseId.value }),
    'Gudang item diubah, stok dipindahkan'
  )
  isWarehouseOpen.value = false
}
</script>

<template>
  <UDashboardPanel id="pharmacy-encounter-detail">
    <template #header>
      <UDashboardNavbar :title="encounter ? `Order Obat — ${encounter.queueCode}` : 'Order Obat'">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            @click="router.push('/pharmacy/orders')"
          />
        </template>
        <template #right>
          <UBadge
            v-if="hasAdditional"
            label="Ada Order Tambahan"
            color="warning"
            variant="subtle"
            icon="i-lucide-flag"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="detail" class="space-y-4">
        <UCard>
          <div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div class="text-muted">
                Kode Antrian
              </div>
              <div class="font-semibold text-highlighted">
                {{ encounter?.queueCode || '-' }}
              </div>
              <div class="font-mono text-[10px] text-muted">
                ID {{ encounter?.id }}
              </div>
            </div>
            <div>
              <div class="text-muted">
                Pasien
              </div>
              <div class="font-medium">
                {{ encounter?.patient?.fullName || '-' }}
              </div>
              <div class="text-xs text-muted">
                {{ encounter?.patient?.patientCode || '' }}
              </div>
            </div>
            <div>
              <div class="text-muted">
                No. Registrasi
              </div>
              <div class="font-medium">
                {{ encounter?.registration?.id_reg || '-' }}
              </div>
            </div>
            <div>
              <div class="text-muted">
                Layanan
              </div>
              <div class="font-medium">
                {{ encounter?.registration?.serviceType || '-' }}
              </div>
            </div>
            <div>
              <div class="text-muted">
                Prioritas
              </div>
              <div class="font-medium">
                {{ encounter?.priority || '-' }}
              </div>
            </div>
            <div>
              <div class="text-muted">
                Status Encounter
              </div>
              <div class="font-medium">
                {{ encounter?.status || '-' }}
              </div>
            </div>
            <div>
              <div class="text-muted">
                Jumlah Order
              </div>
              <div class="font-medium">
                {{ orders.length }}
              </div>
            </div>
          </div>
        </UCard>

        <div class="space-y-3">
          <UCard v-for="order in orders" :key="order.id">
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold">Order #{{ order.orderNo }}</span>
                  <UBadge
                    v-if="order.isAdditional"
                    label="Tambahan"
                    color="warning"
                    variant="subtle"
                    icon="i-lucide-flag"
                  />
                  <UBadge :label="PRESCRIPTION_STATUS_LABEL[order.status] || order.status" color="neutral" variant="subtle" />
                  <span class="text-xs text-muted">{{ formatDateTime(order.sentAt) }}</span>
                </div>
                <div class="flex gap-2">
                  <UButton
                    v-if="['SENT', 'PARTIAL'].includes(order.status)"
                    label="Proses"
                    icon="i-lucide-play"
                    size="xs"
                    :loading="busy === `proc-${order.id}`"
                    @click="process(order.id)"
                  />
                  <UButton
                    v-if="order.status === 'PARTIAL'"
                    label="Cancel Process"
                    icon="i-lucide-undo-2"
                    size="xs"
                    color="warning"
                    variant="subtle"
                    :loading="busy === `cp-${order.id}`"
                    @click="cancelProcess(order.id)"
                  />
                </div>
              </div>
            </template>

            <div class="overflow-x-auto rounded-lg border border-default">
              <table class="w-full text-sm">
                <thead class="bg-elevated/50 text-left">
                  <tr>
                    <th class="px-3 py-2">
                      Obat
                    </th>
                    <th class="px-3 py-2">
                      Qty
                    </th>
                    <th class="px-3 py-2">
                      Aturan Pakai
                    </th>
                    <th class="px-3 py-2">
                      Status
                    </th>
                    <th class="px-3 py-2 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in order.items" :key="item.id" class="border-t border-default">
                    <td class="px-3 py-2">
                      <div class="font-medium">
                        {{ item.kind === 'COMPOUND' ? item.compoundName : item.medicineName }}
                      </div>
                      <div v-if="item.kind === 'COMPOUND' && item.compoundComponents?.length" class="text-xs text-muted">
                        {{ item.compoundComponents.map(c => `${c.name} ${c.quantity}${c.uom ? ` ${c.uom}` : ''}`).join(', ') }}
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      {{ item.quantity }} {{ item.uom }}
                    </td>
                    <td class="px-3 py-2">
                      {{ item.dose }} {{ item.frequency }} · {{ item.instructions || '-' }}
                    </td>
                    <td class="px-3 py-2">
                      <UBadge :label="ITEM_STATUS_LABEL[item.status] || item.status" :color="ITEM_STATUS_COLOR[item.status] as any" variant="subtle" />
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex justify-end gap-1">
                        <UButton
                          v-if="item.status === 'PROCESSING'"
                          label="Siap"
                          size="xs"
                          color="primary"
                          variant="subtle"
                          :loading="busy === `item-${item.id}-READY`"
                          @click="setItemStatus(item.id, 'READY')"
                        />
                        <UButton
                          v-if="['READY', 'PROCESSING'].includes(item.status)"
                          label="Serahkan"
                          size="xs"
                          color="success"
                          :loading="busy === `item-${item.id}-DISPENSED`"
                          @click="setItemStatus(item.id, 'DISPENSED')"
                        />
                        <UButton
                          v-if="['ORDERED', 'PROCESSING'].includes(item.status)"
                          label="Gudang"
                          size="xs"
                          color="neutral"
                          variant="subtle"
                          :loading="busy === `wh-${item.id}`"
                          @click="openOverride(item.id, item.warehouseId ?? null)"
                        />
                        <UButton
                          v-if="item.status === 'ORDERED'"
                          label="Batal"
                          size="xs"
                          color="error"
                          variant="subtle"
                          :loading="busy === `cancel-${item.id}`"
                          @click="cancelItem(item.id)"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!order.items.length">
                    <td colspan="5" class="px-3 py-6 text-center text-muted">
                      Belum ada item.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>

          <div v-if="!orders.length" class="rounded-lg border border-default py-10 text-center text-muted">
            Belum ada order obat untuk kode antrian ini.
          </div>
        </div>
      </div>

      <div v-else-if="pending" class="py-10 text-center text-muted">
        Memuat order...
      </div>

      <UModal v-model:open="isWarehouseOpen" title="Pilih Gudang Asal Obat">
        <template #body>
          <div class="space-y-3">
            <div class="text-sm text-muted">
              Mengubah gudang akan memindahkan potongan stok item ini ke gudang yang dipilih.
            </div>
            <USelect
              v-model="overrideWarehouseId"
              :items="warehouseOptions"
              placeholder="Pilih gudang"
              class="w-full"
            />
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Batal"
              color="neutral"
              variant="subtle"
              @click="isWarehouseOpen = false"
            />
            <UButton label="Pindahkan" :loading="busy?.startsWith('wh-')" @click="submitOverride" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
