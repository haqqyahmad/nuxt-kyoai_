<script setup lang="ts">
const route = useRoute()
const api = useApi()
const toast = useToast()
const router = useRouter()
const isDeleteModalOpen = ref(false)

type InputanOpsi = {
  id: string
  label: string
  value: string
  sortOrder?: number | null
}

type NilaiNormalNumber = {
  sex: 'MALE' | 'FEMALE' | null
  ageMin: number
  minValue: number | null
  maxValue: number | null
}

type NilaiNormalSelected = {
  sex: 'MALE' | 'FEMALE' | null
  ageMin: number
  opsi: InputanOpsi
}

type ItemInputan = {
  id: string
  label: string
  inputType: 'number' | 'string' | 'selected' | 'calculated'
  uom?: string | null
  sortOrder: number
  allowBlank: boolean
  opsis: InputanOpsi[]
  formula?: { formula: string } | null
  nilaiNormalNum: NilaiNormalNumber[]
  nilaiNormalSel: NilaiNormalSelected[]
}

type PaketItem = {
  id: string
  paketId: string
  itemId: string
  sortOrder: number
  item: {
    id: string
    code: string
    name: string
    inputans: ItemInputan[]
  }
}

type PaketMCU = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  paketItems: PaketItem[]
}

const { data: paket, pending, refresh } = await useAsyncData(
  `mcu-paket-${route.params.id}`,
  () =>
    api
      .get(`/mcu/pakets/${route.params.id}`)
      .then(r => r.data.data as PaketMCU | null)
)

const INPUT_TYPE_LABEL: Record<string, string> = {
  number: 'Number',
  string: 'String',
  selected: 'Selected',
  calculated: 'Calculated'
}

const INPUT_TYPE_COLOR: Record<string, string> = {
  number: 'sky',
  string: 'violet',
  selected: 'amber',
  calculated: 'rose'
}

const totalItems = computed(() => paket.value?.paketItems.length ?? 0)
const totalInputans = computed(() =>
  paket.value?.paketItems.reduce(
    (sum, paketItem) => sum + (paketItem.item?.inputans?.length ?? 0),
    0
  ) ?? 0
)
const sortedPaketItems = computed(() =>
  paket.value?.paketItems.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? []
)
const editFormRoute = computed(() => `/services/packages/create?paketId=${route.params.id}`)

function formatNilaiNormal(inp: ItemInputan): string {
  if (inp.inputType === 'number' || inp.inputType === 'calculated') {
    const rows = inp.nilaiNormalNum ?? []
    if (!rows.length) return '-'

    const row = rows.find(r => r.sex === null) ?? rows[0]
    if (!row) return '-'

    const min = row.minValue != null ? row.minValue : '...'
    const max = row.maxValue != null ? row.maxValue : '...'

    return `${min} - ${max}${inp.uom ? ' ' + inp.uom : ''}`
  }

  if (inp.inputType === 'selected') {
    const normals = inp.nilaiNormalSel ?? []
    if (!normals.length) return 'Semua opsi valid'

    const labels = [...new Set(normals.map(n => n.opsi.label))]
    return labels.slice(0, 3).join(', ') + (labels.length > 3 ? '...' : '')
  }

  return '-'
}

async function deletePaket() {
  try {
    await api.delete(`/mcu/pakets/${route.params.id}`)

    toast.add({
      title: 'Berhasil',
      description: 'Paket berhasil dihapus',
      color: 'success'
    })

    router.push('/services/packages')
  } catch (err: any) {
    toast.add({
      title: 'Gagal',
      description: err?.response?.data?.message ?? 'Gagal menghapus paket',
      color: 'error'
    })
  }
}

async function confirmDeletePaket() {
  isDeleteModalOpen.value = false
  await deletePaket()
}

const showEmptyState = computed(() => !pending.value && !paket.value)
</script>

<template>
  <UDashboardPanel :id="`paket-detail-${route.params.id}`">
    <template #header>
      <UDashboardNavbar title="Detail Paket MCU">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/services/packages"
          />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-pencil"
              color="primary"
              variant="subtle"
              :disabled="!paket"
              :to="editFormRoute"
            >
              Edit
            </UButton>

            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="outline"
              :loading="pending"
              @click="refresh"
            >
              Refresh
            </UButton>

            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              :disabled="!paket"
              @click="isDeleteModalOpen = true"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div v-if="pending" class="flex items-center justify-center py-20">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
        </div>

        <div v-else-if="showEmptyState" class="rounded-2xl border border-dashed border-default py-16 text-center">
          <UIcon name="i-lucide-package-x" class="mx-auto text-4xl text-muted" />
          <p class="mt-3 text-sm font-medium">Data paket tidak ditemukan</p>
          <p class="text-xs text-muted mt-1">Periksa kembali paket yang dipilih atau refresh daftar paket</p>
        </div>

        <template v-else>
          <div class="grid gap-5 lg:grid-cols-3">
            <div class="lg:col-span-2 rounded-2xl border border-default bg-background overflow-hidden">
              <div class="px-5 py-4 border-b border-default flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs uppercase tracking-[0.18em] text-muted">
                    Paket MCU
                  </p>

                  <h1 class="mt-1 text-2xl font-bold tracking-tight truncate">
                    {{ paket?.name ?? '-' }}
                  </h1>

                  <p class="mt-2 text-sm text-muted">
                    {{ totalItems }} item pemeriksaan, {{ totalInputans }} inputan, status
                    {{ paket?.isActive ? 'aktif' : 'nonaktif' }}.
                  </p>
                </div>

                <div class="flex flex-col items-end gap-2 flex-shrink-0">
                  <UBadge
                    :label="paket?.isActive ? 'Active' : 'Inactive'"
                    :color="paket?.isActive ? 'success' : 'error'"
                    variant="subtle"
                  />

                  <code class="text-[11px] text-muted font-mono">
                    {{ paket?.id ?? '-' }}
                  </code>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-5">
                <div class="rounded-xl border border-default bg-elevated p-4">
                  <p class="text-xs text-muted">Total Item</p>
                  <p class="mt-1 text-2xl font-bold">{{ totalItems }}</p>
                </div>

                <div class="rounded-xl border border-default bg-elevated p-4">
                  <p class="text-xs text-muted">Total Inputan</p>
                  <p class="mt-1 text-2xl font-bold">{{ totalInputans }}</p>
                </div>

                <div class="rounded-xl border border-default bg-elevated p-4">
                  <p class="text-xs text-muted">Created</p>
                  <p class="mt-1 text-sm font-medium">
                    {{ paket?.createdAt ? new Date(paket.createdAt).toLocaleString('id-ID') : '-' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-default bg-background overflow-hidden">
              <div class="px-5 py-4 border-b border-default">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon name="i-lucide-info" class="text-primary" />
                  Summary
                </h3>
                <p class="text-xs text-muted mt-1">
                  Ringkasan data master paket dan status terakhir.
                </p>
              </div>

              <div class="divide-y divide-default">
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs text-muted">Paket ID</span>
                  <code class="text-xs font-mono">{{ paket?.id ?? '-' }}</code>
                </div>

                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-xs text-muted">Updated</span>
                  <span class="text-sm font-medium">
                    {{ paket?.updatedAt ? new Date(paket.updatedAt).toLocaleString('id-ID') : '-' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

            <div class="rounded-2xl border border-default bg-background overflow-hidden">
              <div class="px-5 py-4 border-b border-default flex items-center justify-between">
                <div>
                  <h3 class="font-semibold flex items-center gap-2">
                    <UIcon name="i-lucide-clipboard-list" class="text-primary" />
                    Item dalam Paket
                  </h3>
                  <p class="text-xs text-muted mt-1">
                    {{ totalItems }} item pemeriksaan terdaftar di paket ini
                  </p>
                </div>

                <UBadge
                  :label="`${totalInputans} inputan`"
                  color="neutral"
                  variant="subtle"
                />
              </div>

              <div class="px-5 py-3 border-b border-default bg-elevated/40 flex items-center justify-between gap-3">
                <p class="text-xs text-muted">
                  Untuk mengubah item di dalam paket, masuk ke form edit paket.
                </p>

                <UButton
                  icon="i-lucide-pencil"
                  color="primary"
                  variant="soft"
                  size="sm"
                  :to="editFormRoute"
                >
                  Edit Paket
                </UButton>
              </div>

              <div v-if="!paket?.paketItems.length" class="p-8 text-center text-sm text-muted">
                Belum ada item di dalam paket
              </div>

            <div v-else class="space-y-4 p-5">
              <div
                v-for="(paketItem, index) in sortedPaketItems"
                :key="paketItem.id"
                class="rounded-2xl border border-default overflow-hidden"
              >
                <div class="px-4 py-3 bg-elevated flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="text-sm font-semibold truncate">
                        {{ paketItem.item?.name ?? '-' }}
                      </p>

                      <UBadge
                        :label="`#${paketItem.sortOrder + 1}`"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      />
                    </div>

                    <p class="text-xs text-muted font-mono">
                      {{ paketItem.item?.code ?? '-' }}
                    </p>
                  </div>

                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left">
                    <thead>
                      <tr class="border-b border-default">
                        <th class="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                          Label
                        </th>
                        <th class="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                          Tipe
                        </th>
                        <th class="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                          Satuan
                        </th>
                        <th class="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                          Nilai Normal
                        </th>
                      </tr>
                    </thead>

                    <tbody class="divide-y divide-default">
                      <tr
                        v-for="inp in paketItem.item?.inputans?.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? []"
                        :key="inp.id"
                      >
                        <td class="px-4 py-2">
                          <p class="text-sm font-medium">{{ inp.label }}</p>
                          <p v-if="inp.formula" class="text-[11px] text-muted font-mono mt-0.5">
                            {{ inp.formula.formula }}
                          </p>
                        </td>

                        <td class="px-4 py-2">
                          <UBadge
                            :label="INPUT_TYPE_LABEL[inp.inputType]"
                            :color="INPUT_TYPE_COLOR[inp.inputType] as any"
                            variant="subtle"
                            size="xs"
                          />
                        </td>

                        <td class="px-4 py-2 text-sm text-muted">
                          {{ inp.uom ?? '-' }}
                        </td>

                        <td class="px-4 py-2 text-sm">
                          <div v-if="inp.inputType === 'string'" class="text-muted italic">
                            Teks bebas
                          </div>
                          <div v-else>
                            {{ formatNilaiNormal(inp) }}
                          </div>
                        </td>
                      </tr>

                      <tr v-if="!paketItem.item?.inputans?.length">
                        <td colspan="4" class="px-4 py-4 text-center text-sm text-muted">
                          Belum ada inputan
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="editModalOpen"
    title="Edit Paket MCU"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Nama Paket">
          <UInput
            v-model="editName"
            placeholder="Nama paket"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="editIsActive"
            :items="[
              { label: 'Active', value: true },
              { label: 'Inactive', value: false }
            ]"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="editModalOpen = false"
        >
          Batal
        </UButton>

        <UButton
          color="primary"
          icon="i-lucide-save"
          :loading="editSubmitting"
          :disabled="!editName.trim()"
          @click="submitEditPaket"
        >
          Simpan
        </UButton>
      </div>
    </template>
  </UModal>

  <BaseDeleteModal
    v-model:open="isDeleteModalOpen"
    :count="1"
    entity="paket"
    @confirm="confirmDeletePaket"
  />
</template>
