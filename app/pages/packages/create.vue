<!-- app/pages/packages/create.vue -->
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

// ────────────────────────────────────────────
// Department
// ────────────────────────────────────────────
const departments = ref<MstDepartment[]>([])
const departmentsPending = ref(false)

async function fetchDepartments() {
  departmentsPending.value = true

  try {
    const res = await api.get('/medical/departments')

    console.log('departments full response:', res.data?.data)

    const payload = res.data?.data

    departments.value = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : []

    console.log('departments parsed:', departments.value)
    console.log('department id:', departments.value[0]?.id)
    console.log('department name:', departments.value[0]?.name)
  } catch (err) {
    console.error('fetch departments error:', err)
    departments.value = []
  } finally {
    departmentsPending.value = false
  }
}

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

const ALL_VALUE = 'ALL'

const selectedDepartmentId = ref(ALL_VALUE)
const selectedGroupId = ref(ALL_VALUE)

let additionalDebounce: ReturnType<typeof setTimeout>
let additionalReqId = 0

const departmentOptions = computed(() => {
  return [
    {
      label: 'Semua Department',
      value: ALL_VALUE
    },
    ...departments.value.map(dep => ({
      label: dep.name ?? '-',
      value: dep.id ?? ''
    }))
  ]
})

// DUMMY DEPARTMENT
// const departmentOptions = computed(() => [
//   { label: 'Semua Department', value: ALL_VALUE },
//   { label: 'Laboratory', value: '1' },
//   { label: 'Radiology', value: '2' }
// ])

const groupOptions = computed(() => {
  const map = new Map<string, MstItemGroup>()

  for (const item of additionalResults.value) {
    if (item.group?.id && item.group?.name) {
      map.set(item.group.id, item.group)
    }
  }

  return [
    {
      label: 'Semua Item Group',
      value: ALL_VALUE
    },
    ...Array.from(map.values()).map(group => ({
      label: group.name,
      value: group.id
    }))
  ]
})

// DUMMY GROUP
// const groupOptions = computed(() => [
//   { label: 'Semua Item Group', value: ALL_VALUE },
//   { label: 'Hematology', value: '10' },
//   { label: 'Urine', value: '11' }
// ])

const filteredAdditionalResults = computed(() => {
  return additionalResults.value.filter((item) => {
    const matchDepartment
      = selectedDepartmentId.value === ALL_VALUE
        || item.department?.id === selectedDepartmentId.value

    const matchGroup
      = selectedGroupId.value === ALL_VALUE
        || item.group?.id === selectedGroupId.value

    return matchDepartment && matchGroup
  })
})

async function fetchAdditionalItems(search = '') {
  const currentId = ++additionalReqId
  additionalPending.value = true

  try {
    const res = await api.get('/mcu/items', {
      params: {
        search: search.trim(),
        limit: 100
      }
    })

    const payload = res.data?.data

    const items: MstItem[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : []

    if (currentId === additionalReqId) {
      const addedIds = new Set(additionalItems.value.map(i => i.id))

      additionalResults.value = items.filter(
        item => item?.id && !addedIds.has(item.id)
      )
    }
  } catch (err) {
    console.error('fetch additional items error:', err)

    if (currentId === additionalReqId) {
      additionalResults.value = []
    }
  } finally {
    if (currentId === additionalReqId) {
      additionalPending.value = false
    }
  }
}

watch(additionalSearch, (val) => {
  clearTimeout(additionalDebounce)

  additionalDebounce = setTimeout(() => {
    fetchAdditionalItems(val)
  }, 300)
})

async function openAdditionalModal() {
  additionalSearch.value = ''
  additionalResults.value = []
  selectedDepartmentId.value = ALL_VALUE
  selectedGroupId.value = ALL_VALUE
  additionalModalOpen.value = true

  fetchDepartments()
  fetchAdditionalItems()
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

  fetchAdditionalItems(additionalSearch.value)
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

const groupedAdditionalResults = computed(() => {
  const groups: Record<string, MstItem[]> = {}

  for (const item of filteredAdditionalResults.value) {
    const groupName = item.group?.name ?? 'Tanpa Group'

    if (!groups[groupName]) {
      groups[groupName] = []
    }

    groups[groupName].push(item)
  }

  return Object.entries(groups)
})

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
      <UDashboardNavbar :title="`New ${displayPaketName} Package`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/packages"
          />
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
        @keydown.esc.stop.prevent
      >
        <Transition name="modal-pop">
          <div
            v-if="additionalModalOpen"
            class="relative w-full max-w-3xl overflow-visible rounded-3xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl"
            style="
              box-shadow:
                0 30px 80px rgba(0, 0, 0, 0.55),
                inset 0 1px 0 rgba(255, 255, 255, 0.04);
            "
          >
            <!-- HEADER -->
            <div
              class="px-6 pt-5 pb-4 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]"
            >
              <div class="flex items-start justify-between gap-4">
                <!-- LEFT -->
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <UIcon
                      name="i-lucide-plus-circle"
                      class="text-primary text-xl"
                    />
                  </div>
                  <div>
                    <h2
                      class="text-base font-semibold tracking-tight text-gray-900 dark:text-white"
                    >
                      Tambah Item Pemeriksaan
                    </h2>

                    <p
                      class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                    >
                      Item ekstra di luar paket yang sudah dipilih
                    </p>
                  </div>
                </div>

                <button
                  class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                  @click="additionalModalOpen = false"
                >
                  <UIcon name="i-lucide-x" class="text-sm" />
                </button>
              </div>

              <!-- FILTER -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 relative z-[1000]">
                <USelect
                  v-model="selectedDepartmentId"
                  :items="departmentOptions"
                  placeholder="Semua Department"
                  icon="i-lucide-building-2"
                  class="w-full"
                  :portal="true"
                  :content="{
                    side: 'bottom',
                    sideOffset: 6,
                    class: 'z-[99999]'
                  }"
                />

                <USelect
                  v-model="selectedGroupId"
                  :items="groupOptions"
                  placeholder="Semua Item Group"
                  icon="i-lucide-folder"
                  class="w-full"
                  :portal="true"
                  :content="{
                    side: 'bottom',
                    sideOffset: 6,
                    class: 'z-[99999]'
                  }"
                />
              </div>

              <!-- DEBUG -->
              <!-- <div class="mt-4 text-sm">
                <p>Department: {{ selectedDepartmentId }}</p>
                <p>Group: {{ selectedGroupId }}</p>
              </div> -->

              <!-- SEARCH -->
              <div class="relative mt-3">
                <UIcon
                  name="i-lucide-search"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />

                <input
                  v-model="additionalSearch"
                  type="text"
                  placeholder="Cari item pemeriksaan..."
                  autofocus
                  class="w-full h-11 rounded-xl bg-white dark:bg-neutral-800/90 border border-black/10 dark:border-white/10 pl-10 pr-10 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                >

                <UIcon
                  v-if="additionalPending"
                  name="i-lucide-loader-circle"
                  class="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-500"
                />
              </div>

              <!-- SELECTED ITEMS -->
              <div
                v-if="additionalItems.length"
                class="flex flex-wrap gap-2 mt-4"
              >
                <div
                  v-for="item in additionalItems"
                  :key="item.id"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10"
                >
                  <span
                    class="text-[11px] font-medium text-primary truncate max-w-[160px]"
                  >
                    {{ item.name }}
                  </span>

                  <button
                    class="text-primary/70 hover:text-red-400 transition-colors"
                    @click="removeAdditionalItem(item.id)"
                  >
                    <UIcon name="i-lucide-x" class="text-[11px]" />
                  </button>
                </div>
              </div>
            </div>

            <!-- BODY -->
            <div class="overflow-y-auto relative z-0" style="max-height: min(65vh, 620px)">
              <!-- LOADING -->
              <div
                v-if="additionalPending && !additionalResults.length"
                class="py-16 flex flex-col items-center justify-center"
              >
                <UIcon
                  name="i-lucide-loader-circle"
                  class="animate-spin text-primary text-2xl"
                />

                <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                  Memuat item pemeriksaan...
                </p>
              </div>

              <!-- RESULTS -->
              <template v-else-if="groupedAdditionalResults.length">
                <div class="space-y-4 p-4">
                  <div
                    v-for="[groupName, items] in groupedAdditionalResults"
                    :key="groupName"
                    class="rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] overflow-hidden"
                  >
                    <!-- GROUP HEADER -->
                    <div
                      class="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-black/10 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl"
                    >
                      <div
                        class="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center"
                      >
                        <UIcon name="i-lucide-folder" class="text-sm" />
                      </div>

                      <div class="flex-1 min-w-0">
                        <p
                          class="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white truncate"
                        >
                          {{ groupName }}
                        </p>
                      </div>

                      <span
                        class="px-2 py-1 rounded-lg border border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-white/5 text-[10px] text-neutral-600 dark:text-neutral-400"
                      >
                        {{ items.length }} item
                      </span>
                    </div>

                    <!-- ITEMS -->
                    <div class="divide-y divide-black/5 dark:divide-white/5">
                      <button
                        v-for="item in items"
                        :key="item.id"
                        class="group w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-primary/[0.08] transition-all"
                        @click="addAdditionalItem(item)"
                      >
                        <!-- ICON -->
                        <div
                          class="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0"
                        >
                          <UIcon
                            name="i-lucide-flask-conical"
                            class="text-primary text-lg"
                          />
                        </div>

                        <!-- CONTENT -->
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p
                              class="text-sm font-medium text-neutral-900 dark:text-white truncate"
                            >
                              {{ item.name }}
                            </p>

                            <UBadge
                              v-if="item.group?.code"
                              :label="item.group.code"
                              size="xs"
                              color="neutral"
                              variant="subtle"
                            />
                          </div>

                          <div
                            class="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400"
                          >
                            <span class="font-mono">
                              {{ item.code }}
                            </span>

                            <template v-if="getDepartmentName(item)">
                              <span>•</span>

                              <span>
                                {{ getDepartmentName(item) }}
                              </span>
                            </template>

                            <span>•</span>

                            <span>{{ item.inputans.length }} inputan</span>
                          </div>
                        </div>

                        <!-- ACTION -->
                        <div
                          class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 group-hover:scale-110 transition-transform"
                        >
                          <UIcon
                            name="i-lucide-plus"
                            class="text-primary text-sm"
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- EMPTY -->
              <div
                v-else-if="!additionalPending"
                class="py-16 flex flex-col items-center justify-center text-center px-6"
              >
                <div
                  class="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4"
                >
                  <UIcon
                    name="i-lucide-search-x"
                    class="text-neutral-500 text-3xl"
                  />
                </div>

                <p
                  class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Tidak ada item pemeriksaan
                </p>

                <p class="text-xs text-neutral-500 mt-1">
                  Coba kata kunci lain atau periksa master item
                </p>
              </div>
            </div>

            <!-- FOOTER -->
            <div
              class="px-6 py-4 border-t border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] flex items-center justify-between"
            >
              <p class="text-[11px] text-neutral-500">
                <template v-if="additionalItems.length">
                  {{ additionalItems.length }} item ditambahkan
                </template>

                <template v-else>
                  Belum ada item tambahan
                </template>
              </p>

              <UButton
                size="sm"
                color="primary"
                variant="soft"
                class="rounded-xl"
                @click="additionalModalOpen = false"
              >
                Selesai
              </UButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
