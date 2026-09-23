<script setup lang="ts">
import type { ApiError, Medicine, MedicineUnit } from '~/types/outpatient'
import { MEDICINE_FORM_OPTIONS, formatRupiah } from '~/constants/outpatient'

const api = useApi()
const toast = useToast()
const { permissions } = await useCurrentUser()
const canSeePrice = computed(() => (permissions.value ?? []).includes('medicine:price:read') || (permissions.value ?? []).includes('*:*'))

const search = ref('')
const { data, refresh, pending } = await useAsyncData('pharmacy-medicines', async () => {
  const res = await api.get('/outpatient/medicines', { params: { search: search.value || undefined } })
  return res.data.data as Medicine[]
})
const rows = computed(() => data.value ?? [])
watchDebounced(search, () => refresh(), { debounce: 350 })

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)

const form = reactive<{
  code: string
  name: string
  form: string
  strength: string
  baseUnit: string
  category: string
  manufacturer: string
  hpp: number
  markupPercent: number
  isSellable: boolean
  isStocked: boolean
  isCompoundIngredient: boolean
  isActive: boolean
  notes: string
  units: MedicineUnit[]
}>({
  code: '',
  name: '',
  form: 'TABLET',
  strength: '',
  baseUnit: 'Tablet',
  category: '',
  manufacturer: '',
  hpp: 0,
  markupPercent: 10,
  isSellable: true,
  isStocked: true,
  isCompoundIngredient: true,
  isActive: true,
  notes: '',
  units: [] as MedicineUnit[]
})

function resetForm() {
  Object.assign(form, {
    code: '',
    name: '',
    form: 'TABLET',
    strength: '',
    baseUnit: 'Tablet',
    category: '',
    manufacturer: '',
    hpp: 0,
    markupPercent: 10,
    isSellable: true,
    isStocked: true,
    isCompoundIngredient: true,
    isActive: true,
    notes: '',
    units: [{ uom: 'Tablet', conversionFactor: 1, isBase: true, isPurchase: false, isDispense: true }]
  })
}

function openCreate() {
  editingId.value = null
  resetForm()
  isModalOpen.value = true
}

function openEdit(med: Medicine) {
  editingId.value = med.id
  Object.assign(form, {
    code: med.code,
    name: med.name,
    form: med.form,
    strength: med.strength ?? '',
    baseUnit: med.baseUnit,
    category: med.category ?? '',
    manufacturer: med.manufacturer ?? '',
    hpp: Number(med.hpp ?? 0),
    markupPercent: Number(med.markupPercent ?? 10),
    isSellable: med.isSellable,
    isStocked: med.isStocked,
    isCompoundIngredient: med.isCompoundIngredient,
    isActive: med.isActive,
    notes: med.notes ?? '',
    units: (med.units ?? []).map(u => ({ ...u }))
  })
  isModalOpen.value = true
}

function addUnit() {
  form.units.push({ uom: '', conversionFactor: 1, isBase: false, isPurchase: false, isDispense: true })
}
function removeUnit(i: number | string) {
  form.units.splice(Number(i), 1)
}

async function save() {
  saving.value = true
  try {
    const payload = {
      ...form,
      hpp: Number(form.hpp) || 0,
      markupPercent: Number(form.markupPercent) || 0,
      units: form.units.map((u, i) => ({
        uom: u.uom,
        conversionFactor: Number(u.conversionFactor) || 1,
        isBase: !!u.isBase,
        isPurchase: !!u.isPurchase,
        isDispense: !!u.isDispense,
        sortOrder: i
      }))
    }
    if (editingId.value) await api.put(`/outpatient/medicines/${editingId.value}`, payload)
    else await api.post('/outpatient/medicines', payload)
    toast.add({ title: 'Berhasil', description: 'Data obat tersimpan', color: 'success' })
    isModalOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || JSON.stringify((err as ApiError)?.response?.data?.errors ?? ''), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(med: Medicine) {
  if (!window.confirm(`Hapus obat ${med.name}?`)) return
  try {
    await api.delete(`/outpatient/medicines/${med.id}`)
    toast.add({ title: 'Berhasil', description: 'Obat dihapus', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="pharmacy-medicines">
    <template #header>
      <UDashboardNavbar title="Master Obat">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton label="Tambah Obat" icon="i-lucide-plus" @click="openCreate" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Cari obat..."
        class="max-w-sm"
      />

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated/50 text-left">
            <tr>
              <th class="px-3 py-2">
                Kode
              </th>
              <th class="px-3 py-2">
                Nama
              </th>
              <th class="px-3 py-2">
                Bentuk
              </th>
              <th class="px-3 py-2">
                Satuan
              </th>
              <th v-if="canSeePrice" class="px-3 py-2">
                HPP
              </th>
              <th v-if="canSeePrice" class="px-3 py-2">
                Markup
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
            <tr v-for="med in rows" :key="med.id" class="border-t border-default">
              <td class="px-3 py-2">
                {{ med.code }}
              </td>
              <td class="px-3 py-2">
                <div class="font-medium">
                  {{ med.name }}
                </div>
                <div class="text-xs text-muted">
                  {{ med.strength || '' }}
                </div>
              </td>
              <td class="px-3 py-2">
                {{ med.form }}
              </td>
              <td class="px-3 py-2">
                {{ med.baseUnit }} ({{ med.units?.length || 0 }} UOM)
              </td>
              <td v-if="canSeePrice" class="px-3 py-2">
                {{ formatRupiah(Number(med.hpp ?? 0)) }}
              </td>
              <td v-if="canSeePrice" class="px-3 py-2">
                {{ med.markupPercent }}%
              </td>
              <td class="px-3 py-2">
                <UBadge :label="med.isActive ? 'Aktif' : 'Nonaktif'" :color="med.isActive ? 'success' : 'neutral'" variant="subtle" />
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-2">
                  <UButton
                    label="Edit"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    @click="openEdit(med)"
                  />
                  <UButton
                    label="Hapus"
                    size="xs"
                    color="error"
                    variant="subtle"
                    @click="remove(med)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!pending && !rows.length">
              <td :colspan="canSeePrice ? 8 : 6" class="px-3 py-8 text-center text-muted">
                Belum ada obat.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <UModal v-model:open="isModalOpen" :title="editingId ? 'Edit Obat' : 'Tambah Obat'">
        <template #body>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Kode" required>
                <UInput v-model="form.code" />
              </UFormField>
              <UFormField label="Nama" required>
                <UInput v-model="form.name" />
              </UFormField>
              <UFormField label="Bentuk">
                <USelect v-model="form.form" :items="MEDICINE_FORM_OPTIONS" class="w-full" />
              </UFormField>
              <UFormField label="Kekuatan">
                <UInput v-model="form.strength" placeholder="500 mg" />
              </UFormField>
              <UFormField label="Satuan Dasar">
                <UInput v-model="form.baseUnit" />
              </UFormField>
              <UFormField label="Kategori">
                <UInput v-model="form.category" />
              </UFormField>
              <template v-if="canSeePrice">
                <UFormField label="HPP">
                  <UInput v-model="form.hpp" type="number" />
                </UFormField>
                <UFormField label="Markup (%)">
                  <UInput v-model="form.markupPercent" type="number" />
                </UFormField>
              </template>
              <UFormField label="Produsen">
                <UInput v-model="form.manufacturer" />
              </UFormField>
            </div>

            <div class="flex flex-wrap gap-4">
              <UCheckbox v-model="form.isSellable" label="Bisa dijual" />
              <UCheckbox v-model="form.isStocked" label="Kelola stok" />
              <UCheckbox v-model="form.isCompoundIngredient" label="Bahan racikan" />
              <UCheckbox v-model="form.isActive" label="Aktif" />
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="font-medium">Konversi Satuan</span>
                <UButton
                  label="Tambah Satuan"
                  icon="i-lucide-plus"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="addUnit"
                />
              </div>
              <div v-for="(u, i) in form.units" :key="i" class="mb-2 grid grid-cols-12 items-center gap-2">
                <UInput v-model="u.uom" placeholder="Satuan" class="col-span-3" />
                <UInput
                  v-model="u.conversionFactor"
                  type="number"
                  placeholder="Faktor"
                  class="col-span-2"
                />
                <UCheckbox v-model="u.isBase" label="Base" class="col-span-2" />
                <UCheckbox v-model="u.isPurchase" label="Beli" class="col-span-2" />
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  color="error"
                  variant="ghost"
                  class="col-span-1"
                  @click="removeUnit(i)"
                />
              </div>
              <div class="text-xs text-muted">
                Faktor = jumlah satuan dasar per 1 satuan ini (mis. Box = 100 Tablet).
              </div>
            </div>

            <UFormField label="Catatan">
              <UTextarea v-model="form.notes" :rows="2" />
            </UFormField>
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
