<script setup lang="ts">
import type { ApiError, PriceTier } from '~/types/outpatient'
import { PRICE_TIER_TYPE_OPTIONS } from '~/constants/outpatient'

const api = useApi()
const toast = useToast()

const { data, refresh, pending } = await useAsyncData('price-tiers', async () => {
  const res = await api.get('/outpatient/price-tiers')
  return res.data.data as PriceTier[]
})
const rows = computed(() => data.value ?? [])

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive<{
  code: string
  label: string
  type: string
  percent: number
  customerCode: string
  country: string
  sortOrder: number
  isActive: boolean
}>({ code: '', label: '', type: 'DEFAULT', percent: 0, customerCode: '', country: '', sortOrder: 0, isActive: true })

function openCreate() {
  editingId.value = null
  Object.assign(form, { code: '', label: '', type: 'DEFAULT', percent: 0, customerCode: '', country: '', sortOrder: 0, isActive: true })
  isModalOpen.value = true
}

function openEdit(t: PriceTier) {
  editingId.value = t.id
  Object.assign(form, {
    code: t.code,
    label: t.label,
    type: t.type,
    percent: Number(t.percent),
    customerCode: t.customerCode ?? '',
    country: t.country ?? '',
    sortOrder: t.sortOrder,
    isActive: t.isActive
  })
  isModalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      ...form,
      percent: Number(form.percent) || 0,
      customerCode: form.customerCode || null,
      country: form.country || null
    }
    if (editingId.value) await api.put(`/outpatient/price-tiers/${editingId.value}`, payload)
    else await api.post('/outpatient/price-tiers', payload)
    toast.add({ title: 'Berhasil', description: 'Price tier tersimpan', color: 'success' })
    isModalOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(t: PriceTier) {
  if (!window.confirm(`Hapus tier ${t.label}?`)) return
  try {
    await api.delete(`/outpatient/price-tiers/${t.id}`)
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="price-tiers">
    <template #header>
      <UDashboardNavbar title="Price Tier Pasien">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton label="Tambah Tier" icon="i-lucide-plus" @click="openCreate" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="rounded-lg border border-default p-3 text-sm text-muted">
        Harga akhir = HPP × (1 + markup obat) × (1 + persen tier). Resolusi berurutan:
        <b>Customer</b> (kode customer) → <b>Asuransi</b> (BillToCompany/Insurance) →
        <b>Kewarganegaraan</b> (selain Indonesia) → <b>Default</b>.
      </div>

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated/50 text-left">
            <tr>
              <th class="px-3 py-2">
                Kode
              </th>
              <th class="px-3 py-2">
                Label
              </th>
              <th class="px-3 py-2">
                Tipe
              </th>
              <th class="px-3 py-2">
                Persen
              </th>
              <th class="px-3 py-2">
                Customer / Negara
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
            <tr v-for="t in rows" :key="t.id" class="border-t border-default">
              <td class="px-3 py-2 font-medium">
                {{ t.code }}
              </td>
              <td class="px-3 py-2">
                {{ t.label }}
              </td>
              <td class="px-3 py-2">
                {{ t.type }}
              </td>
              <td class="px-3 py-2">
                {{ t.percent }}%
              </td>
              <td class="px-3 py-2">
                {{ t.customerCode || t.country || '-' }}
              </td>
              <td class="px-3 py-2">
                <UBadge :label="t.isActive ? 'Aktif' : 'Nonaktif'" :color="t.isActive ? 'success' : 'neutral'" variant="subtle" />
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-2">
                  <UButton
                    label="Edit"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    @click="openEdit(t)"
                  />
                  <UButton
                    label="Hapus"
                    size="xs"
                    color="error"
                    variant="subtle"
                    @click="remove(t)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!pending && !rows.length">
              <td colspan="7" class="px-3 py-8 text-center text-muted">
                Belum ada tier.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <UModal v-model:open="isModalOpen" :title="editingId ? 'Edit Price Tier' : 'Tambah Price Tier'">
        <template #body>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Kode" required>
              <UInput v-model="form.code" />
            </UFormField>
            <UFormField label="Label" required>
              <UInput v-model="form.label" />
            </UFormField>
            <UFormField label="Tipe">
              <USelect v-model="form.type" :items="PRICE_TIER_TYPE_OPTIONS" class="w-full" />
            </UFormField>
            <UFormField label="Persen (%)">
              <UInput v-model="form.percent" type="number" step="0.01" />
            </UFormField>
            <UFormField v-if="form.type === 'CUSTOMER'" label="Kode Customer">
              <UInput v-model="form.customerCode" placeholder="mis. A0001" />
            </UFormField>
            <UFormField v-if="form.type === 'NATIONALITY'" label="Negara (opsional)">
              <UInput v-model="form.country" placeholder="kosong = semua luar negeri" />
            </UFormField>
            <UFormField label="Urutan">
              <UInput v-model="form.sortOrder" type="number" />
            </UFormField>
            <div class="col-span-2">
              <UCheckbox v-model="form.isActive" label="Aktif" />
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Batal"
              color="neutral"
              variant="subtle"
              @click="isModalOpen = false"
            />
            <UButton label="Simpan" :loading="saving" @click="save" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
