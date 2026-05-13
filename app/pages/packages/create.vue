<script setup lang="ts">
const api = useApi()
const toast = useToast()
const router = useRouter()

type InputanOpsi = {
  id: string
  label: string
  value: string
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

type MstDepartment = {
  id: string
  code: string
  name: string
}

type MstItemGroup = {
  id: string
  code?: string | null
  name: string
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

type MstItem = {
  id: string
  name: string
  code: string
  department?: MstDepartment | null
  group?: MstItemGroup | null
  inputans: ItemInputan[]
}

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

// ─────────────────────────────────────────────
// Paket Form
// ─────────────────────────────────────────────

const displayPaketName = computed(() =>
  paketName.value.trim() || 'Paket MCU'
)

const paketName = ref('')

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getDepartmentName(item: MstItem): string | null {
  return item.department?.name ?? null
}

function formatNilaiNormal(inp: ItemInputan): string {
  if (inp.inputType === 'number' || inp.inputType === 'calculated') {
    const rows = inp.nilaiNormalNum ?? []

    if (!rows.length) return '-'

    const row = rows.find(r => r.sex === null) ?? rows[0]

    if (!row) return '-'

    const min = row.minValue != null ? row.minValue : '...'
    const max = row.maxValue != null ? row.maxValue : '...'

    return `${min} – ${max}${inp.uom ? ' ' + inp.uom : ''}`
  }

  if (inp.inputType === 'selected') {
    const normals = inp.nilaiNormalSel ?? []

    if (!normals.length) return 'Semua opsi valid'

    const labels = [...new Set(normals.map(n => n.opsi.label))]

    return labels.slice(0, 3).join(', ') + (labels.length > 3 ? '...' : '')
  }

  return '-'
}

// ─────────────────────────────────────────────
// Additional Item
// ─────────────────────────────────────────────
const additionalItems = ref<MstItem[]>([])
const additionalModalOpen = ref(false)
const additionalSearch = ref('')
const additionalPending = ref(false)
const additionalResults = ref<MstItem[]>([])
const expandedAdditional = ref<Set<string>>(new Set())

let additionalDebounce: ReturnType<typeof setTimeout>
let additionalReqId = 0

watch(additionalSearch, (val) => {
  clearTimeout(additionalDebounce)
  additionalResults.value = []

  if (!val || val.trim().length < 1) {
    additionalPending.value = false
    return
  }

  const currentId = ++additionalReqId
  additionalPending.value = true

  additionalDebounce = setTimeout(async () => {
    try {
      const res = await api.get('/mcu/items', {
        params: {
          search: val.trim(),
          limit: 20
        }
      })

      if (currentId === additionalReqId) {
        const addedIds = new Set(additionalItems.value.map(i => i.id))

        additionalResults.value = (res.data.data as MstItem[]).filter(
          i => !addedIds.has(i.id)
        )
      }
    } catch {
      if (currentId === additionalReqId) {
        additionalResults.value = []
      }
    } finally {
      if (currentId === additionalReqId) {
        additionalPending.value = false
      }
    }
  }, 300)
})

function openAdditionalModal() {
  additionalSearch.value = ''
  additionalResults.value = []
  additionalModalOpen.value = true
}

function addAdditionalItem(item: MstItem) {
  if (!additionalItems.value.find(i => i.id === item.id)) {
    additionalItems.value.push(item)
  }

  additionalResults.value = additionalResults.value.filter(i => i.id !== item.id)
}

function removeAdditionalItem(itemId: string) {
  additionalItems.value = additionalItems.value.filter(i => i.id !== itemId)
  expandedAdditional.value.delete(itemId)
}

function toggleAdditional(itemId: string) {
  if (expandedAdditional.value.has(itemId)) {
    expandedAdditional.value.delete(itemId)
  } else {
    expandedAdditional.value.add(itemId)
  }
}

const totalAdditionalInputan = computed(() =>
  additionalItems.value.reduce((sum, item) => sum + item.inputans.length, 0)
)

// ─────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────
const submitting = ref(false)

const canSubmit = computed(() =>
  paketName.value.trim().length > 0 && additionalItems.value.length > 0
)

async function submit() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true

  try {
    await api.post('/mcu/pakets', {
      name: paketName.value.trim(),
      itemIds: additionalItems.value.map(item => item.id)
    })

    toast.add({
      title: 'Berhasil',
      description: 'Paket MCU berhasil dibuat',
      color: 'success'
    })

    router.push('/items')
  } catch (err: any) {
    toast.add({
      title: 'Gagal',
      description: err?.response?.data?.message ?? 'Terjadi kesalahan',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="paket-mcu-create">
    <template #header>
      <UDashboardNavbar :title="`Buat ${displayPaketName}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/items"
          />
        </template>

        <template #right>
          <UButton
            color="primary"
            icon="i-lucide-check"
            :loading="submitting"
            :disabled="!canSubmit || submitting"
            @click="submit"
          >
            Simpan
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-5xl mx-auto py-6 px-4 space-y-5">
        <div
          class="grid gap-5 items-start"
          style="grid-template-columns: repeat(2, minmax(0, 1fr))"
        >
          <!-- KOLOM KIRI -->
          <div class="space-y-5 min-w-0 w-full">
            <!-- Data Paket -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <UIcon
                    name="i-lucide-package"
                    class="text-primary text-xs"
                  />
                </div>

                <h3 class="text-sm font-semibold">
                  Data {{ displayPaketName }}
                </h3>

                <UBadge
                  v-if="paketName"
                  label="Terisi"
                  color="success"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />

                <UBadge
                  v-else
                  label="Wajib"
                  color="error"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>

              <div class="p-4 space-y-3">
                <UFormField label="Nama Paket *">
                  <UInput
                    v-model="paketName"
                    icon="i-lucide-package"
                    placeholder="Contoh: Paket MCU Lengkap"
                    class="w-full"
                  />
                </UFormField>

                <div class="grid grid-cols-2 gap-2">
                  <UFormField label="Total Item">
                    <UInput
                      :model-value="`${additionalItems.length} item`"
                      size="sm"
                      disabled
                      class="w-full opacity-90"
                    />
                  </UFormField>

                  <UFormField label="Total Inputan">
                    <UInput
                      :model-value="`${totalAdditionalInputan} inputan`"
                      size="sm"
                      disabled
                      class="w-full opacity-90"
                    />
                  </UFormField>
                </div>
              </div>
            </div>

            <!-- Additional Item -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <UIcon
                    name="i-lucide-plus-circle"
                    class="text-primary text-xs"
                  />
                </div>

                <h3 class="text-sm font-semibold">
                  Item Pemeriksaan
                </h3>

                <UBadge
                  v-if="additionalItems.length"
                  :label="`${additionalItems.length} item`"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />

                <UBadge
                  v-else
                  label="Wajib"
                  color="error"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>

              <div class="p-4 space-y-3">
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-dashed border-default hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  @click="openAdditionalModal"
                >
                  <div class="w-7 h-7 rounded-md bg-accented flex items-center justify-center">
                    <UIcon
                      name="i-lucide-search"
                      class="text-muted text-xs"
                    />
                  </div>

                  <span class="text-sm text-muted flex-1 text-left">
                    Cari dan tambah item pemeriksaan...
                  </span>

                  <UIcon
                    name="i-lucide-plus"
                    class="text-muted text-xs"
                  />
                </button>

                <div
                  v-if="additionalItems.length"
                  class="space-y-1.5"
                >
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold text-muted uppercase tracking-wider">
                      Item Dipilih
                    </p>

                    <span class="text-[11px] text-muted">
                      {{ totalAdditionalInputan }} inputan
                    </span>
                  </div>

                  <div
                    v-for="item in additionalItems"
                    :key="item.id"
                    class="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden"
                  >
                    <div class="flex items-center gap-2.5 px-3 py-2.5">
                      <div class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UIcon
                          name="i-lucide-flask-conical"
                          class="text-primary text-sm"
                        />
                      </div>

                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                          <p class="text-xs font-semibold truncate">
                            {{ item.name }}
                          </p>

                          <UBadge
                            label="Dipilih"
                            color="primary"
                            variant="subtle"
                            size="xs"
                          />
                        </div>

                        <p class="text-[11px] text-muted">
                          {{ item.code }}

                          <template v-if="getDepartmentName(item)">
                            · {{ getDepartmentName(item) }}
                          </template>

                          · {{ item.inputans.length }} inputan
                        </p>
                      </div>

                      <button
                        class="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-error hover:bg-error/10"
                        @click="removeAdditionalItem(item.id)"
                      >
                        <UIcon
                          name="i-lucide-x"
                          class="text-xs"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="py-3 text-center"
                >
                  <p class="text-xs text-muted">
                    Belum ada item pemeriksaan
                  </p>

                  <p class="text-[11px] text-muted/60 mt-0.5">
                    Klik tombol cari untuk menambahkan item ke paket
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- KOLOM KANAN -->
          <div class="space-y-5 min-w-0 w-full">
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <UIcon
                    name="i-lucide-clipboard-list"
                    class="text-primary text-xs"
                  />
                </div>

                <h3 class="text-sm font-semibold">
                  Detail Item Pemeriksaan
                </h3>

                <UBadge
                  v-if="additionalItems.length"
                  :label="`${additionalItems.length} item`"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>

              <div class="p-4">
                <div
                  v-if="!additionalItems.length"
                  class="py-10 text-center rounded-lg border border-dashed border-default"
                >
                  <UIcon
                    name="i-lucide-package-open"
                    class="text-3xl text-muted mx-auto mb-2"
                  />

                  <p class="text-sm font-medium">
                    Belum ada item pemeriksaan
                  </p>

                  <p class="text-xs text-muted mt-1">
                    Tambahkan item terlebih dahulu untuk melihat detail inputan
                  </p>
                </div>

                <div
                  v-else
                  class="space-y-1.5"
                >
                  <div
                    v-for="item in additionalItems"
                    :key="item.id"
                    class="rounded-lg border border-default overflow-hidden bg-background"
                  >
                    <button
                      class="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-elevated transition-colors text-left"
                      @click="toggleAdditional(item.id)"
                    >
                      <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UIcon
                          name="i-lucide-flask-conical"
                          class="text-primary text-xs"
                        />
                      </div>

                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold truncate">
                          {{ item.name }}
                        </p>

                        <p class="text-xs text-muted">
                          {{ item.code }}

                          <template v-if="getDepartmentName(item)">
                            · {{ getDepartmentName(item) }}
                          </template>

                          · {{ item.inputans.length }} inputan
                        </p>
                      </div>

                      <UIcon
                        :name="
                          expandedAdditional.has(item.id)
                            ? 'i-lucide-chevron-up'
                            : 'i-lucide-chevron-down'
                        "
                        class="text-muted text-xs flex-shrink-0"
                      />
                    </button>

                    <Transition
                      enter-active-class="transition-all duration-200 ease-out"
                      enter-from-class="opacity-0 max-h-0"
                      enter-to-class="opacity-100 max-h-[600px]"
                      leave-active-class="transition-all duration-150 ease-in"
                      leave-from-class="opacity-100 max-h-[600px]"
                      leave-to-class="opacity-0 max-h-0"
                    >
                      <div
                        v-if="expandedAdditional.has(item.id)"
                        class="border-t border-default overflow-hidden"
                      >
                        <div
                          class="grid px-3 py-2 bg-elevated"
                          style="grid-template-columns: 1fr 90px 100px 1fr"
                        >
                          <span class="text-[10px] font-semibold text-muted uppercase tracking-wider">
                            Label
                          </span>

                          <span class="text-[10px] font-semibold text-muted uppercase tracking-wider">
                            Tipe
                          </span>

                          <span class="text-[10px] font-semibold text-muted uppercase tracking-wider">
                            Satuan
                          </span>

                          <span class="text-[10px] font-semibold text-muted uppercase tracking-wider">
                            Nilai Normal
                          </span>
                        </div>

                        <div
                          v-for="inp in item.inputans"
                          :key="inp.id"
                          class="grid px-3 py-2 border-t border-default/50 hover:bg-elevated/60 transition-colors"
                          style="grid-template-columns: 1fr 90px 100px 1fr"
                        >
                          <div class="min-w-0">
                            <p class="text-xs font-medium truncate">
                              {{ inp.label }}
                            </p>

                            <p
                              v-if="inp.formula"
                              class="text-[10px] text-muted font-mono truncate mt-0.5"
                            >
                              {{ inp.formula.formula }}
                            </p>
                          </div>

                          <div>
                            <UBadge
                              :label="INPUT_TYPE_LABEL[inp.inputType]"
                              :color="INPUT_TYPE_COLOR[inp.inputType] as any"
                              variant="subtle"
                              size="xs"
                            />
                          </div>

                          <p class="text-xs text-muted truncate">
                            {{ inp.uom ?? '—' }}
                          </p>

                          <div class="min-w-0">
                            <p
                              v-if="inp.inputType === 'string'"
                              class="text-xs text-muted italic"
                            >
                              Teks bebas
                            </p>

                            <p
                              v-else
                              class="text-xs text-default truncate"
                            >
                              {{ formatNilaiNormal(inp) }}
                            </p>

                            <div
                              v-if="inp.inputType === 'selected' && inp.opsis.length"
                              class="flex flex-wrap gap-1 mt-1"
                            >
                              <span
                                v-for="opsi in inp.opsis.slice(0, 4)"
                                :key="opsi.id"
                                class="text-[10px] px-1.5 py-0.5 rounded bg-elevated border border-default text-muted"
                              >
                                {{ opsi.label }}
                              </span>

                              <span
                                v-if="inp.opsis.length > 4"
                                class="text-[10px] text-muted"
                              >
                                +{{ inp.opsis.length - 4 }}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          v-if="!item.inputans.length"
                          class="px-3 py-3 text-center"
                        >
                          <p class="text-xs text-muted">
                            Belum ada inputan
                          </p>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="sticky bottom-0 -mx-4 px-4 py-3 border-t border-default bg-background/90 backdrop-blur flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 flex-wrap text-xs text-muted">
            <span
              v-if="paketName"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{ paketName }}
            </span>

            <span
              v-if="additionalItems.length"
              class="flex items-center gap-1 text-primary"
            >
              <UIcon name="i-lucide-plus-circle" />
              {{ additionalItems.length }} item pemeriksaan
            </span>

            <span
              v-if="!paketName"
              class="flex items-center gap-1 text-error"
            >
              <UIcon name="i-lucide-alert-circle" />
              Nama paket belum diisi
            </span>

            <span
              v-if="!additionalItems.length"
              class="flex items-center gap-1 text-error"
            >
              <UIcon name="i-lucide-alert-circle" />
              Item pemeriksaan belum dipilih
            </span>
          </div>

          <div class="flex gap-2 flex-shrink-0">
            <UButton
              color="neutral"
              variant="outline"
              to="/items"
            >
              Batal
            </UButton>

            <UButton
              color="primary"
              icon="i-lucide-check"
              :loading="submitting"
              :disabled="!canSubmit || submitting"
              @click="submit"
            >
              Simpan Paket
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modal Additional Item -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="additionalModalOpen"
        class="fixed inset-0 z-[999] flex items-center justify-center p-4"
        style="
          backdrop-filter: blur(10px) saturate(160%);
          background: rgba(10, 10, 15, 0.55);
        "
        @click.self="additionalModalOpen = false"
      >
        <Transition name="modal-pop">
          <div
            v-if="additionalModalOpen"
            class="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl"
          >
            <div class="px-6 py-5 border-b border-white/10 flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                <UIcon
                  name="i-lucide-plus-circle"
                  class="text-primary text-xl"
                />
              </div>

              <div class="flex-1">
                <h3 class="text-lg font-bold text-white">
                  Tambah Item Pemeriksaan
                </h3>

                <p class="text-xs text-neutral-400">
                  Cari item pemeriksaan untuk dimasukkan ke paket
                </p>
              </div>

              <button
                class="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
                @click="additionalModalOpen = false"
              >
                <UIcon name="i-lucide-x" />
              </button>
            </div>

            <div class="p-5 space-y-4">
              <UInput
                v-model="additionalSearch"
                icon="i-lucide-search"
                :loading="additionalPending"
                placeholder="Cari item pemeriksaan..."
                class="w-full"
              />

              <div
                v-if="additionalPending"
                class="py-10 text-center text-sm text-neutral-400"
              >
                <UIcon
                  name="i-lucide-loader-circle"
                  class="animate-spin text-2xl mx-auto mb-2"
                />

                Mencari item...
              </div>

              <div
                v-else-if="additionalSearch && !additionalResults.length"
                class="py-10 text-center text-sm text-neutral-400"
              >
                Item tidak ditemukan
              </div>

              <div
                v-else-if="!additionalSearch"
                class="py-10 text-center text-sm text-neutral-400"
              >
                Ketik nama atau kode item untuk mencari
              </div>

              <div
                v-else
                class="max-h-[420px] overflow-y-auto space-y-2 pr-1"
              >
                <button
                  v-for="item in additionalResults"
                  :key="item.id"
                  class="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-primary/40 transition-all text-left"
                  @click="addAdditionalItem(item)"
                >
                  <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UIcon
                      name="i-lucide-flask-conical"
                      class="text-primary"
                    />
                  </div>

                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-white truncate">
                      {{ item.name }}
                    </p>

                    <p class="text-xs text-neutral-400">
                      {{ item.code }}

                      <template v-if="getDepartmentName(item)">
                        · {{ getDepartmentName(item) }}
                      </template>

                      · {{ item.inputans.length }} inputan
                    </p>
                  </div>

                  <UIcon
                    name="i-lucide-plus"
                    class="text-neutral-500"
                  />
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
