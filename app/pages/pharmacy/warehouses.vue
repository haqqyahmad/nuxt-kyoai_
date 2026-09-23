<script setup lang="ts">
import type { ApiError, Warehouse } from '~/types/outpatient'
import { WAREHOUSE_TYPE_OPTIONS } from '~/constants/outpatient'

const api = useApi()
const toast = useToast()

const { data: warehouses, refresh, pending } = await useAsyncData('pharmacy-warehouses', async () => {
  const res = await api.get('/outpatient/warehouses')
  return res.data.data as Warehouse[]
})
const rows = computed(() => warehouses.value ?? [])

const branches = ref<Array<{ branchId: string, nameBranch: string }>>([])
onMounted(async () => {
  try {
    const res = await api.get('/branch')
    branches.value = res.data.data
  } catch {
    branches.value = []
  }
})
const branchOptions = computed(() => branches.value.map(b => ({ value: b.branchId, label: `${b.branchId} — ${b.nameBranch}` })))

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive<{
  branchId: string
  code: string
  name: string
  type: string
  isDefault: boolean
  isActive: boolean
  notes: string
}>({ branchId: '', code: '', name: '', type: 'PHARMACY', isDefault: false, isActive: true, notes: '' })

function openCreate() {
  editingId.value = null
  Object.assign(form, { branchId: '', code: '', name: '', type: 'PHARMACY', isDefault: false, isActive: true, notes: '' })
  isModalOpen.value = true
}

function openEdit(wh: Warehouse) {
  editingId.value = wh.id
  Object.assign(form, { branchId: wh.branchId, code: wh.code, name: wh.name, type: wh.type, isDefault: wh.isDefault, isActive: wh.isActive, notes: wh.notes ?? '' })
  isModalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    if (editingId.value) await api.put(`/outpatient/warehouses/${editingId.value}`, form)
    else await api.post('/outpatient/warehouses', form)
    toast.add({ title: 'Berhasil', description: 'Gudang tersimpan', color: 'success' })
    isModalOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(wh: Warehouse) {
  if (!window.confirm(`Hapus gudang ${wh.name}?`)) return
  try {
    await api.delete(`/outpatient/warehouses/${wh.id}`)
    toast.add({ title: 'Berhasil', description: 'Gudang dihapus', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="pharmacy-warehouses">
    <template #header>
      <UDashboardNavbar title="Master Gudang">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton label="Tambah Gudang" icon="i-lucide-plus" @click="openCreate" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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
                Cabang
              </th>
              <th class="px-3 py-2">
                Tipe
              </th>
              <th class="px-3 py-2">
                Default
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
            <tr v-for="wh in rows" :key="wh.id" class="border-t border-default">
              <td class="px-3 py-2 font-medium">
                {{ wh.code }}
              </td>
              <td class="px-3 py-2">
                {{ wh.name }}
              </td>
              <td class="px-3 py-2">
                {{ wh.branchId }}
              </td>
              <td class="px-3 py-2">
                {{ wh.type }}
              </td>
              <td class="px-3 py-2">
                <UBadge
                  v-if="wh.isDefault"
                  label="Default"
                  color="success"
                  variant="subtle"
                />
                <span v-else class="text-muted">-</span>
              </td>
              <td class="px-3 py-2">
                <UBadge :label="wh.isActive ? 'Aktif' : 'Nonaktif'" :color="wh.isActive ? 'success' : 'neutral'" variant="subtle" />
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-2">
                  <UButton
                    label="Edit"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    @click="openEdit(wh)"
                  />
                  <UButton
                    label="Hapus"
                    size="xs"
                    color="error"
                    variant="subtle"
                    @click="remove(wh)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!pending && !rows.length">
              <td colspan="7" class="px-3 py-8 text-center text-muted">
                Belum ada gudang.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <UModal v-model:open="isModalOpen" :title="editingId ? 'Edit Gudang' : 'Tambah Gudang'">
        <template #body>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Cabang" required>
              <USelect v-model="form.branchId" :items="branchOptions" class="w-full" />
            </UFormField>
            <UFormField label="Kode" required>
              <UInput v-model="form.code" />
            </UFormField>
            <UFormField label="Nama" required>
              <UInput v-model="form.name" />
            </UFormField>
            <UFormField label="Tipe">
              <USelect v-model="form.type" :items="WAREHOUSE_TYPE_OPTIONS" class="w-full" />
            </UFormField>
            <div class="col-span-2 flex gap-4">
              <UCheckbox v-model="form.isDefault" label="Gudang default cabang" />
              <UCheckbox v-model="form.isActive" label="Aktif" />
            </div>
            <UFormField label="Catatan" class="col-span-2">
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
