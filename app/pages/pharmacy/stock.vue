<script setup lang="ts">
import type { ApiError, Medicine, StockMovement, StockRequest, StockRow, Warehouse } from '~/types/outpatient'
import { STOCK_REQUEST_STATUS_COLOR, formatDateTime } from '~/constants/outpatient'

const api = useApi()
const toast = useToast()

const activeTab = ref('stock')

const { data: warehouses } = await useAsyncData('stock-warehouses', async () => {
  const res = await api.get('/outpatient/warehouses', { params: { activeOnly: 'true' } })
  return res.data.data as Warehouse[]
})
const warehouseOptions = computed(() => (warehouses.value ?? []).map(w => ({ value: w.id, label: `${w.code} — ${w.name}` })))

const { data: medicines } = await useAsyncData('stock-medicines', async () => {
  const res = await api.get('/outpatient/medicines', { params: { activeOnly: 'true' } })
  return res.data.data as Medicine[]
})
const medicineOptions = computed(() => (medicines.value ?? []).map(m => ({ value: m.id, label: `${m.name}${m.strength ? ` ${m.strength}` : ''}` })))

const selectedWarehouse = ref('')
const search = ref('')

const { data: stockRows, refresh: refreshStock, pending: stockPending } = await useAsyncData(
  'stock-rows',
  async () => {
    const res = await api.get('/outpatient/stock', {
      params: { warehouseId: selectedWarehouse.value || undefined, search: search.value || undefined }
    })
    return res.data.data as StockRow[]
  }
)

const { data: requests, refresh: refreshRequests } = await useAsyncData('stock-requests', async () => {
  const res = await api.get('/outpatient/stock/requests')
  return res.data.data as StockRequest[]
})
const requestRows = computed(() => requests.value ?? [])

const { data: movements, refresh: refreshMovements } = await useAsyncData('stock-movements', async () => {
  const res = await api.get('/outpatient/stock/movements', {
    params: { warehouseId: selectedWarehouse.value || undefined, limit: 100 }
  })
  return res.data.data as StockMovement[]
})
const movementRows = computed(() => movements.value ?? [])

function medicineName(medicineId: string) {
  return (medicines.value ?? []).find(m => m.id === medicineId)?.name || medicineId
}

watch([selectedWarehouse, search], () => {
  refreshStock()
  refreshMovements()
})

const { permissions } = await useCurrentUser()
const canApprove = computed(() => (permissions.value ?? []).includes('stock:approve') || (permissions.value ?? []).includes('*:*'))

/* ── Request form ── */
const isRequestOpen = ref(false)
const requestType = ref<'ADJUST_ADD' | 'ADJUST_REDUCE' | 'TRANSFER'>('ADJUST_ADD')
const reqForm = reactive<{ warehouseId: string, fromWarehouseId: string, toWarehouseId: string, reason: string }>({ warehouseId: '', fromWarehouseId: '', toWarehouseId: '', reason: '' })
const reqItem = reactive<{ medicineId: string, uom: string, quantity: number }>({ medicineId: '', uom: '', quantity: 1 })
const savingRequest = ref(false)

function uomOptions(medicineId: string) {
  const med = (medicines.value ?? []).find(m => m.id === medicineId)
  if (!med) return []
  return (med.units?.length ? med.units : [{ uom: med.baseUnit }]).map(u => ({ value: u.uom, label: u.uom }))
}

function openRequest(type: 'ADJUST_ADD' | 'ADJUST_REDUCE' | 'TRANSFER') {
  requestType.value = type
  Object.assign(reqForm, { warehouseId: selectedWarehouse.value, fromWarehouseId: selectedWarehouse.value, toWarehouseId: '', reason: '' })
  Object.assign(reqItem, { medicineId: '', uom: '', quantity: 1 })
  isRequestOpen.value = true
}

async function submitRequest() {
  if (!reqItem.medicineId) {
    toast.add({ title: 'Pilih obat dulu', color: 'warning' })
    return
  }
  savingRequest.value = true
  try {
    const item = { medicineId: reqItem.medicineId, uom: reqItem.uom || null, quantity: Number(reqItem.quantity) || 0 }
    if (requestType.value === 'TRANSFER') {
      await api.post('/outpatient/stock/transfer', {
        fromWarehouseId: reqForm.fromWarehouseId,
        toWarehouseId: reqForm.toWarehouseId,
        reason: reqForm.reason,
        items: [item]
      })
    } else {
      await api.post('/outpatient/stock/adjust', {
        type: requestType.value,
        warehouseId: reqForm.warehouseId,
        reason: reqForm.reason,
        items: [item]
      })
    }
    toast.add({ title: 'Berhasil', description: 'Pengajuan dibuat, menunggu approval', color: 'success' })
    isRequestOpen.value = false
    await refreshRequests()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    savingRequest.value = false
  }
}

async function review(id: string, action: 'approve' | 'reject') {
  try {
    await api.patch(`/outpatient/stock/requests/${id}/${action}`, {})
    toast.add({ title: 'Berhasil', description: `Request di-${action}`, color: 'success' })
    await Promise.all([refreshRequests(), refreshStock()])
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="pharmacy-stock">
    <template #header>
      <UDashboardNavbar title="Stok Obat">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex gap-2">
            <UButton
              label="Tambah Stok"
              icon="i-lucide-plus"
              color="success"
              variant="subtle"
              @click="openRequest('ADJUST_ADD')"
            />
            <UButton
              label="Kurangi"
              icon="i-lucide-minus"
              color="error"
              variant="subtle"
              @click="openRequest('ADJUST_REDUCE')"
            />
            <UButton
              label="Transfer"
              icon="i-lucide-arrow-right-left"
              color="neutral"
              variant="outline"
              @click="openRequest('TRANSFER')"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTabs
        v-model="activeTab"
        :items="[
          { label: 'Saldo Stok', value: 'stock', icon: 'i-lucide-boxes' },
          { label: 'Approval Request', value: 'requests', icon: 'i-lucide-clipboard-check' },
          { label: 'Riwayat Pergerakan', value: 'movements', icon: 'i-lucide-history' }
        ]"
      />

      <template v-if="activeTab === 'stock'">
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="selectedWarehouse"
            :items="warehouseOptions"
            placeholder="Pilih gudang"
            class="w-72"
          />
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari obat..."
            class="max-w-sm"
          />
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            @click="refreshStock()"
          />
        </div>

        <div class="overflow-x-auto rounded-lg border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50 text-left">
              <tr>
                <th class="px-3 py-2">
                  Obat
                </th>
                <th class="px-3 py-2">
                  Satuan Dasar
                </th>
                <th class="px-3 py-2 text-right">
                  Stok
                </th>
                <th class="px-3 py-2 text-right">
                  Min
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in stockRows ?? []" :key="s.id" class="border-t border-default">
                <td class="px-3 py-2">
                  {{ s.medicine?.name || s.medicineId }}
                </td>
                <td class="px-3 py-2">
                  {{ s.medicine?.baseUnit }}
                </td>
                <td class="px-3 py-2 text-right font-medium">
                  {{ Number(s.quantity) }}
                </td>
                <td class="px-3 py-2 text-right">
                  {{ Number(s.minStock) }}
                </td>
              </tr>
              <tr v-if="!stockPending && !(stockRows ?? []).length">
                <td colspan="4" class="px-3 py-8 text-center text-muted">
                  Belum ada data stok. Pilih gudang / ajukan tambah stok.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'requests'">
        <div class="overflow-x-auto rounded-lg border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50 text-left">
              <tr>
                <th class="px-3 py-2">
                  Tanggal
                </th>
                <th class="px-3 py-2">
                  Tipe
                </th>
                <th class="px-3 py-2">
                  Gudang
                </th>
                <th class="px-3 py-2">
                  Items
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
              <tr v-for="r in requestRows" :key="r.id" class="border-t border-default">
                <td class="px-3 py-2">
                  {{ formatDateTime(r.requestedAt) }}
                </td>
                <td class="px-3 py-2">
                  {{ r.type }}
                </td>
                <td class="px-3 py-2 text-xs">
                  <div>From: {{ r.fromWarehouseId || '-' }}</div>
                  <div>To: {{ r.toWarehouseId || '-' }}</div>
                </td>
                <td class="px-3 py-2">
                  {{ r.items.length }} item
                </td>
                <td class="px-3 py-2">
                  <UBadge :label="r.status" :color="STOCK_REQUEST_STATUS_COLOR[r.status] as any" variant="subtle" />
                </td>
                <td class="px-3 py-2">
                  <div v-if="r.status === 'PENDING' && canApprove" class="flex justify-end gap-2">
                    <UButton
                      label="Setujui"
                      size="xs"
                      color="success"
                      @click="review(r.id, 'approve')"
                    />
                    <UButton
                      label="Tolak"
                      size="xs"
                      color="error"
                      variant="subtle"
                      @click="review(r.id, 'reject')"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="!requestRows.length">
                <td colspan="6" class="px-3 py-8 text-center text-muted">
                  Belum ada pengajuan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="selectedWarehouse"
            :items="warehouseOptions"
            placeholder="Pilih gudang (opsional)"
            class="w-72"
          />
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            @click="refreshMovements()"
          />
        </div>

        <div class="overflow-x-auto rounded-lg border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50 text-left">
              <tr>
                <th class="px-3 py-2">
                  Waktu
                </th>
                <th class="px-3 py-2">
                  Obat
                </th>
                <th class="px-3 py-2">
                  Tipe
                </th>
                <th class="px-3 py-2 text-right">
                  Qty
                </th>
                <th class="px-3 py-2 text-right">
                  Saldo
                </th>
                <th class="px-3 py-2">
                  Referensi
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movementRows" :key="m.id" class="border-t border-default">
                <td class="px-3 py-2">
                  {{ formatDateTime(m.createdAt) }}
                </td>
                <td class="px-3 py-2">
                  {{ medicineName(m.medicineId) }}
                </td>
                <td class="px-3 py-2">
                  {{ m.type }}
                </td>
                <td class="px-3 py-2 text-right">
                  {{ Number(m.quantity) }} {{ m.uom || '' }}
                </td>
                <td class="px-3 py-2 text-right">
                  {{ Number(m.beforeQty) }} → {{ Number(m.afterQty) }}
                </td>
                <td class="px-3 py-2 text-xs text-muted">
                  {{ m.refType || '-' }} {{ m.reason ? `· ${m.reason}` : '' }}
                </td>
              </tr>
              <tr v-if="!movementRows.length">
                <td colspan="6" class="px-3 py-8 text-center text-muted">
                  Belum ada pergerakan stok.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <UModal v-model:open="isRequestOpen" :title="requestType === 'TRANSFER' ? 'Transfer Stok' : requestType === 'ADJUST_ADD' ? 'Tambah Stok' : 'Kurangi Stok'">
        <template #body>
          <div class="space-y-3">
            <template v-if="requestType === 'TRANSFER'">
              <UFormField label="Dari Gudang">
                <USelect v-model="reqForm.fromWarehouseId" :items="warehouseOptions" class="w-full" />
              </UFormField>
              <UFormField label="Ke Gudang">
                <USelect v-model="reqForm.toWarehouseId" :items="warehouseOptions" class="w-full" />
              </UFormField>
            </template>
            <UFormField v-else label="Gudang">
              <USelect v-model="reqForm.warehouseId" :items="warehouseOptions" class="w-full" />
            </UFormField>

            <UFormField label="Obat">
              <USelect v-model="reqItem.medicineId" :items="medicineOptions" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Satuan">
                <USelect v-model="reqItem.uom" :items="uomOptions(reqItem.medicineId)" class="w-full" />
              </UFormField>
              <UFormField label="Jumlah">
                <UInput v-model="reqItem.quantity" type="number" />
              </UFormField>
            </div>
            <UFormField label="Alasan">
              <UInput v-model="reqForm.reason" />
            </UFormField>
            <div class="text-xs text-muted">
              Stok baru berubah setelah disetujui admin.
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Batal"
              color="neutral"
              variant="subtle"
              @click="isRequestOpen = false"
            />
            <UButton label="Ajukan" :loading="savingRequest" @click="submitRequest" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
