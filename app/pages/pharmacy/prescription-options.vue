<script setup lang="ts">
import type { ApiError, PrescriptionOption } from '~/types/outpatient'

type OptionType = 'DOSE' | 'FREQUENCY' | 'TIMING' | 'ROUTE' | 'METHOD' | 'AS_NEEDED_REASON'

const api = useApi()
const toast = useToast()

const activeType = ref<OptionType>('DOSE')
const search = ref('')
const page = ref(1)
const limit = 20

const { data, refresh, pending } = await useAsyncData(
  'prescription-options',
  async () => {
    const res = await api.get('/outpatient/prescription-options', {
      params: { type: activeType.value, search: search.value || undefined, page: page.value, limit }
    })
    return {
      rows: (res.data.data ?? []) as PrescriptionOption[],
      total: Number(res.data.meta?.total ?? 0)
    }
  },
  { watch: [activeType, search, page] }
)

const rows = computed(() => data.value?.rows ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

watch([activeType, search], () => {
  page.value = 1
})

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive<{
  type: OptionType
  value: string
  labelEng: string
  labelInd: string
  sortOrder: number
  isActive: boolean
}>({ type: 'DOSE', value: '', labelEng: '', labelInd: '', sortOrder: 0, isActive: true })

function openCreate() {
  editingId.value = null
  Object.assign(form, { type: activeType.value, value: '', labelEng: '', labelInd: '', sortOrder: 0, isActive: true })
  isModalOpen.value = true
}

function openEdit(option: PrescriptionOption) {
  editingId.value = option.id
  Object.assign(form, {
    type: option.type,
    value: option.value,
    labelEng: option.labelEng,
    labelInd: option.labelInd ?? '',
    sortOrder: option.sortOrder,
    isActive: option.isActive
  })
  isModalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      ...form,
      labelInd: form.labelInd || null,
      sortOrder: Number(form.sortOrder) || 0
    }
    if (editingId.value) await api.put(`/outpatient/prescription-options/${editingId.value}`, payload)
    else await api.post('/outpatient/prescription-options', payload)
    toast.add({ title: 'Berhasil', description: 'Aturan pakai tersimpan', color: 'success' })
    isModalOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    saving.value = false
  }
}

const deleteTarget = ref<PrescriptionOption | null>(null)
const isDeleteOpen = ref(false)
const deleting = ref(false)

function openDelete(option: PrescriptionOption) {
  deleteTarget.value = option
  isDeleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/outpatient/prescription-options/${deleteTarget.value.id}`)
    toast.add({ title: 'Berhasil', description: 'Aturan pakai dihapus', color: 'success' })
    isDeleteOpen.value = false
    deleteTarget.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="prescription-options">
    <template #header>
      <UDashboardNavbar title="Master Aturan Pakai">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton label="Tambah" icon="i-lucide-plus" @click="openCreate" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari value / label..."
          class="max-w-sm"
        />
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          @click="refresh()"
        />
      </div>

      <UTabs
        v-model="activeType"
        :items="[
          { label: 'Dosis', value: 'DOSE', icon: 'i-lucide-pill' },
          { label: 'Frekuensi', value: 'FREQUENCY', icon: 'i-lucide-repeat' },
          { label: 'Waktu Konsumsi', value: 'TIMING', icon: 'i-lucide-clock' },
          { label: 'Rute', value: 'ROUTE', icon: 'i-lucide-route' },
          { label: 'Metode', value: 'METHOD', icon: 'i-lucide-hand' },
          { label: 'Alasan Perlu', value: 'AS_NEEDED_REASON', icon: 'i-lucide-circle-help' }
        ]"
      />

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-elevated/50 text-left">
            <tr>
              <th class="px-3 py-2">
                Value
              </th>
              <th class="px-3 py-2">
                Label (EN)
              </th>
              <th class="px-3 py-2">
                Label (ID)
              </th>
              <th class="px-3 py-2">
                Urutan
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
            <tr v-for="option in rows" :key="option.id" class="border-t border-default">
              <td class="px-3 py-2 font-mono text-xs">
                {{ option.value }}
              </td>
              <td class="px-3 py-2">
                {{ option.labelEng }}
              </td>
              <td class="px-3 py-2">
                {{ option.labelInd ?? '-' }}
              </td>
              <td class="px-3 py-2">
                {{ option.sortOrder }}
              </td>
              <td class="px-3 py-2">
                <UBadge
                  :label="option.isActive ? 'Aktif' : 'Nonaktif'"
                  :color="option.isActive ? 'success' : 'neutral'"
                  variant="subtle"
                />
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-1">
                  <UButton
                    icon="i-lucide-pencil"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="openEdit(option)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    size="xs"
                    color="error"
                    variant="ghost"
                    @click="openDelete(option)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!pending && !rows.length">
              <td colspan="6" class="px-3 py-8 text-center text-muted">
                Belum ada data.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span class="text-muted">{{ total }} data · halaman {{ page }} / {{ totalPages }}</span>
        <div class="flex gap-2">
          <UButton
            label="Sebelumnya"
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="page <= 1"
            @click="page--"
          />
          <UButton
            label="Berikutnya"
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="page >= totalPages"
            @click="page++"
          />
        </div>
      </div>

      <UModal
        v-model:open="isModalOpen"
        :title="editingId ? 'Edit Aturan Pakai' : 'Tambah Aturan Pakai'"
      >
        <template #body>
          <div class="space-y-4">
            <UFormField label="Tipe">
              <USelect
                v-model="form.type"
                :items="[
                  { label: 'Dosis', value: 'DOSE' },
                  { label: 'Frekuensi', value: 'FREQUENCY' },
                  { label: 'Waktu Konsumsi', value: 'TIMING' },
                  { label: 'Rute', value: 'ROUTE' },
                  { label: 'Metode', value: 'METHOD' },
                  { label: 'Alasan Perlu', value: 'AS_NEEDED_REASON' }
                ]"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Value (kode internal)">
              <UInput v-model="form.value" placeholder="cth. TID / 26643006" class="w-full" />
            </UFormField>
            <UFormField label="Label (English)">
              <UInput v-model="form.labelEng" placeholder="cth. Three times a day" class="w-full" />
            </UFormField>
            <UFormField label="Label (Indonesia)">
              <UInput v-model="form.labelInd" placeholder="cth. 3x sehari" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Urutan">
                <UInput v-model="form.sortOrder" type="number" class="w-full" />
              </UFormField>
              <UFormField label="Aktif">
                <USwitch v-model="form.isActive" />
              </UFormField>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Batal"
              @click="isModalOpen = false"
            />
            <UButton
              color="primary"
              label="Simpan"
              :loading="saving"
              @click="save"
            />
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isDeleteOpen" title="Hapus Aturan Pakai">
        <template #body>
          <p class="text-sm">
            Yakin ingin menghapus
            <b>{{ deleteTarget?.labelEng }}</b>
            <span v-if="deleteTarget?.labelInd">({{ deleteTarget.labelInd }})</span>?
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Batal"
              :disabled="deleting"
              @click="isDeleteOpen = false"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Hapus"
              :loading="deleting"
              @click="confirmDelete"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
