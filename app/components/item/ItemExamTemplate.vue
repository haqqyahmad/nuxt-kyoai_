<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  itemId: string
}>()

const api = useApi()
const toast = useToast()
const lastSavedSnapshot = ref('')

// ─── Types ────────────────────────────────────────────────────────────────────

type InputType = 'number' | 'calculated' | 'selected' | 'string'

type NilaiNormalNum = {
  id?: string
  sex: 'MALE' | 'FEMALE' | null
  ageMin: number
  minValue: number | null
  maxValue: number | null
}

// Pilihan dropdown — MstInputanOpsi
type Opsi = {
  id?: string        // ada setelah disimpan ke BE
  label: string
  value: string
  sortOrder: number
}

// Penanda opsi mana yang normal — MstNilaiNormalSelected
type NilaiNormalSel = {
  id?: string
  sex: 'MALE' | 'FEMALE' | null
  ageMin: number
  opsiId: string     // FK ke MstInputanOpsi.id — wajib ada (opsi sudah tersimpan)
}

type Inputan = {
  id?: string
  label: string
  inputType: InputType
  uom: string | null
  sortOrder: number
  allowBlank: boolean
  formula: string | null
  nilaiNormalNumber: NilaiNormalNum[]
  opsis: Opsi[]
  nilaiNormalSel: NilaiNormalSel[]
  _key: number
}

// ─── State ────────────────────────────────────────────────────────────────────

const inputans              = ref<Inputan[]>([])
const loading               = ref(false)
const saveLoading           = ref(false)
const nilaiNormalSelLoading = ref(false)
const selectedInputanKey    = ref<number | null>(null)
const configTab             = ref<'range' | 'selektif'>('range')
let keyCounter = 0

// ─── Computed ────────────────────────────────────────────────────────────────

const selectedInputan = computed(() =>
  inputans.value.find((i) => i._key === selectedInputanKey.value) ?? null
)

const availableLabels = computed(() =>
  inputans.value
    .filter((i) => i.inputType === 'number' && i._key !== selectedInputanKey.value)
    .map((i) => i.label)
)

// Apakah semua opsi sudah punya id (sudah tersimpan ke BE)?
const opsisAlreadySaved = computed(() => {
  const inp = selectedInputan.value
  if (!inp || inp.inputType !== 'selected') return false
  return inp.opsis.length > 0 && inp.opsis.every((o) => !!o.id)
})

// Items untuk dropdown pilih opsi normal
const opsiSelectItems = computed(() => {
  const inp = selectedInputan.value
  if (!inp) return []
  return inp.opsis
    .filter((o) => !!o.id)
    .map((o) => ({ label: `${o.label} (${o.value})`, value: o.id as string }))
})

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))

function handleShortcut(e: KeyboardEvent) {
  if (e.ctrlKey && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
  if (
    e.ctrlKey && e.key === 'Enter' &&
    configTab.value === 'range' &&
    selectedInputan.value
  ) {
    if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return
    e.preventDefault()
    addRange(selectedInputan.value)
  }
}

// ─── Load ────────────────────────────────────────────────────────────────────

async function loadInputans() {
  loading.value = true
  try {
    const res = await api.get(`/mcu/items/${props.itemId}`)
    const raw: any[] = res.data.data?.inputans ?? []

    inputans.value = raw.map((inp) => ({
      id:                inp.id,
      label:             inp.label,
      inputType:         inp.inputType,
      uom:               inp.uom ?? '',
      sortOrder:         inp.sortOrder,
      allowBlank:        inp.allowBlank,
      formula:           inp.formula?.formula ?? null,
      nilaiNormalNumber: inp.nilaiNormalNum ?? [],
      opsis:             inp.opsis ?? [],
      // BE mengembalikan nilaiNormalSel dengan nested { id, sex, ageMin, opsiId, opsi }
      nilaiNormalSel: (inp.nilaiNormalSel ?? []).map((n: any) => ({
        id:     n.id,
        sex:    n.sex ?? null,
        ageMin: n.ageMin ?? 0,
        opsiId: n.opsiId ?? n.opsi?.id ?? ''
      })),
      _key: keyCounter++
    }))

    if (inputans.value.length > 0) {
  const first = inputans.value[0]

  selectedInputanKey.value = first._key
  configTab.value =
    first.inputType === 'selected'
      ? 'selektif'
      : 'range'
}

    lastSavedSnapshot.value = createSnapshot()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal memuat data template', color: 'error' })
  } finally {
    loading.value = false
  }
}

watch(() => props.itemId, loadInputans, { immediate: true })

// ─── Select inputan ───────────────────────────────────────────────────────────

function selectInputan(inp: Inputan) {
  selectedInputanKey.value = inp._key
  configTab.value = inp.inputType === 'selected' ? 'selektif' : 'range'
}

// ─── Add / remove inputan ────────────────────────────────────────────────────

function addInputan() {
  const newInp: Inputan = {
    label:             '',
    inputType:         'number',
    uom:               '',
    sortOrder:         inputans.value.length + 1,
    allowBlank:        false,
    formula:           null,
    nilaiNormalNumber: [],
    opsis:             [],
    nilaiNormalSel:    [],
    _key:              keyCounter++
  }
  inputans.value.push(newInp)
  selectedInputanKey.value = newInp._key
  configTab.value = 'range'
}

function removeInputan(key: number) {
  const idx = inputans.value.findIndex((i) => i._key === key)
  if (idx === -1) return
  inputans.value.splice(idx, 1)
  inputans.value.forEach((inp, i) => (inp.sortOrder = i + 1))
  if (selectedInputanKey.value === key) {
    selectedInputanKey.value = inputans.value[0]?._key ?? null
  }
}

// ─── Type change ─────────────────────────────────────────────────────────────

function onTypeChange(inp: Inputan) {
  inp.nilaiNormalNumber = []
  inp.opsis             = []
  inp.nilaiNormalSel    = []
  inp.formula           = null
  configTab.value = inp.inputType === 'selected' ? 'selektif' : 'range'
}

// ─── Range normal ────────────────────────────────────────────────────────────

function addRange(inp: Inputan) {
  inp.nilaiNormalNumber.push({ sex: null, ageMin: 0, minValue: null, maxValue: null })
}
function removeRange(inp: Inputan, idx: number) {
  inp.nilaiNormalNumber.splice(idx, 1)
}

// ─── Opsis ───────────────────────────────────────────────────────────────────

function addOpsi(inp: Inputan) {
  inp.opsis.push({ label: '', value: '', sortOrder: inp.opsis.length + 1 })
}
function removeOpsi(inp: Inputan, idx: number) {
  const removed = inp.opsis[idx]
  inp.opsis.splice(idx, 1)
  inp.opsis.forEach((o, i) => (o.sortOrder = i + 1))
  // bersihkan nilaiNormalSel yang mengacu opsi yang dihapus
  if (removed.id) {
    inp.nilaiNormalSel = inp.nilaiNormalSel.filter((n) => n.opsiId !== removed.id)
  }
}

// ─── Nilai Normal Selected ────────────────────────────────────────────────────

function addNilaiNormalSel(inp: Inputan) {
  inp.nilaiNormalSel.push({ sex: null, ageMin: 0, opsiId: '' })
}
function removeNilaiNormalSel(inp: Inputan, idx: number) {
  inp.nilaiNormalSel.splice(idx, 1)
}

/**
 * Simpan nilaiNormalSel via endpoint dedicated:
 * PUT /items/:itemId/inputan/:inputanId/nilai-normal/selected
 *
 * Dipisah dari "Simpan Template" karena endpoint ini butuh opsiId (FK)
 * yang baru tersedia setelah opsis tersimpan ke DB.
 */
async function saveNilaiNormalSel(inp: Inputan) {
  if (!inp.id) {
    toast.add({
      title: 'Perhatian',
      description: 'Simpan template terlebih dahulu sebelum mengatur nilai normal pilihan.',
      color: 'warning'
    })
    return
  }

  const invalid = inp.nilaiNormalSel.some((n) => !n.opsiId)
  if (invalid) {
    toast.add({
      title: 'Validasi',
      description: 'Setiap baris nilai normal harus memilih salah satu opsi.',
      color: 'warning'
    })
    return
  }

  nilaiNormalSelLoading.value = true
  try {
    await api.put(
      `/mcu/items/${props.itemId}/inputan/${inp.id}/nilai-normal/selected`,
      {
        rows: inp.nilaiNormalSel.map((n) => ({
          sex:    n.sex,
          ageMin: n.ageMin,
          opsiId: n.opsiId
        }))
      }
    )
    toast.add({ title: 'Berhasil', description: 'Nilai normal pilihan berhasil disimpan', color: 'success' })
    const savedId = inp.id
    await loadInputans()
    const found = inputans.value.find((i) => i.id === savedId)
    if (found) {
      selectedInputanKey.value = found._key
      configTab.value = 'selektif'
    }
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menyimpan nilai normal pilihan',
      color: 'error'
    })
  } finally {
    nilaiNormalSelLoading.value = false
  }
}

// ─── Formula ─────────────────────────────────────────────────────────────────

function insertVar(inp: Inputan, label: string) {
  inp.formula = (inp.formula ?? '') + `{{${label}}}`
}

// ─── Move order ───────────────────────────────────────────────────────────────

function moveUp(idx: number) {
  if (idx === 0) return
  const arr = inputans.value
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  arr.forEach((inp, i) => (inp.sortOrder = i + 1))
}
function moveDown(idx: number) {
  const arr = inputans.value
  if (idx === arr.length - 1) return
  ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
  arr.forEach((inp, i) => (inp.sortOrder = i + 1))
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

function createSnapshot() {
  return JSON.stringify(
    inputans.value.map((inp) => ({
      id:        inp.id,
      label:     inp.label,
      inputType: inp.inputType,
      uom:       inp.uom || null,
      sortOrder: inp.sortOrder,
      allowBlank: inp.allowBlank,
      formula:   inp.inputType === 'calculated' ? inp.formula : null,
      nilaiNormalNumber:
        inp.inputType === 'number' || inp.inputType === 'calculated'
          ? inp.nilaiNormalNumber : [],
      opsis:               inp.inputType === 'selected' ? inp.opsis : [],
      nilaiNormalSelected: []  // tidak ikut batch — disimpan terpisah
    }))
  )
}

// ─── Save (batch replace inputans + opsis) ────────────────────────────────────

async function save() {
  if (saveLoading.value) return
  const currentSnapshot = createSnapshot()
  if (currentSnapshot === lastSavedSnapshot.value) {
    toast.add({ title: 'Info', description: 'Tidak ada perubahan untuk disimpan', color: 'neutral' })
    return
  }
  saveLoading.value = true
  try {
    await api.put(`/mcu/items/${props.itemId}/inputans`, {
      inputans: JSON.parse(currentSnapshot)
    })
    lastSavedSnapshot.value = currentSnapshot
    await loadInputans()
    toast.add({ title: 'Berhasil', description: 'Template exam berhasil disimpan', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menyimpan template',
      color: 'error'
    })
  } finally {
    saveLoading.value = false
  }
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<InputType, string> = {
  number: 'info', calculated: 'warning', selected: 'secondary', string: 'neutral'
}
const TYPE_LABEL: Record<InputType, string> = {
  number: 'Angka', calculated: 'Formula', selected: 'Pilihan', string: 'Teks'
}
</script>

<template>
  <div class="space-y-4 relative pb-10" tabindex="0">

    <!-- Toolbar -->
    <div class="sticky top-0 z-20 flex items-center justify-between border-b border-default bg-default/95 backdrop-blur px-4 py-2.5">
      <p class="text-sm text-muted">{{ inputans.length }} komponen terdaftar</p>
      <div class="flex gap-2">
        <UButton icon="i-lucide-plus" size="sm" variant="soft" @click="addInputan">
          Tambah Komponen
        </UButton>
        <UButton icon="i-lucide-save" size="sm" :loading="saveLoading" :disabled="inputans.length === 0" @click="save">
          Simpan Template
          <UKbd value="Ctrl+S" class="ml-2" />
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <!-- Empty -->
    <div v-else-if="inputans.length === 0"
      class="flex flex-col items-center justify-center py-12 border border-dashed border-default rounded-lg text-center">
      <UIcon name="i-lucide-test-tube-diagonal" class="size-10 text-muted mb-3" />
      <p class="font-medium text-sm">Belum ada komponen</p>
      <p class="text-xs text-muted mt-1">Klik "Tambah Komponen" untuk mulai mengkonfigurasi template exam</p>
    </div>

    <!-- Main grid -->
    <div v-else class="grid grid-cols-12 gap-4">

      <!-- Left: list -->
      <div class="col-span-5 space-y-1.5">
        <div class="text-xs font-semibold text-muted uppercase tracking-wider px-1 mb-2">Komponen Inputan</div>
        <div
          v-for="(inp, idx) in inputans" :key="inp._key"
          class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all"
          :class="selectedInputanKey === inp._key
            ? 'border-primary bg-primary/5'
            : 'border-default bg-elevated/30 hover:bg-elevated/60'"
          @click="selectInputan(inp)"
        >
          <div class="flex flex-col gap-0.5">
            <UButton icon="i-lucide-chevron-up" size="xs" color="neutral" variant="ghost"
              class="h-4 w-4" :disabled="idx === 0" @click.stop="moveUp(idx)" />
            <UButton icon="i-lucide-chevron-down" size="xs" color="neutral" variant="ghost"
              class="h-4 w-4" :disabled="idx === inputans.length - 1" @click.stop="moveDown(idx)" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-mono text-muted">{{ idx + 1 }}.</span>
              <span class="text-sm font-medium truncate">{{ inp.label || 'Tanpa nama' }}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <UBadge :label="TYPE_LABEL[inp.inputType]" :color="TYPE_COLOR[inp.inputType]" variant="subtle" size="xs" />
              <span v-if="inp.uom" class="text-xs text-muted">{{ inp.uom }}</span>
            </div>
          </div>
          <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost"
            @click.stop="removeInputan(inp._key)" />
        </div>
      </div>

      <!-- Right: config panel -->
      <div class="col-span-7 space-y-4">
        <div v-if="!selectedInputan"
          class="flex items-center justify-center h-40 border border-dashed border-default rounded-lg">
          <p class="text-sm text-muted">Pilih komponen untuk konfigurasi</p>
        </div>

        <template v-else>

          <!-- Detail -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/20">
            <p class="text-xs font-semibold text-muted uppercase tracking-wider">Detail Komponen</p>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Label / Nama">
                <UInput v-model="selectedInputan.label" placeholder="Contoh: Hemoglobin" size="sm" class="w-full" />
              </UFormField>
              <UFormField label="Tipe Input">
                <USelect
                  v-model="selectedInputan.inputType"
                  :items="[
                    { label: 'Angka (number)',       value: 'number'     },
                    { label: 'Formula (calculated)',  value: 'calculated' },
                    { label: 'Pilihan (selected)',    value: 'selected'   },
                    { label: 'Teks (string)',          value: 'string'     }
                  ]"
                  size="sm" class="w-full"
                  @change="onTypeChange(selectedInputan)"
                />
              </UFormField>
              <UFormField label="Satuan (UoM)">
                <UInput v-model="selectedInputan.uom" placeholder="Contoh: g/dL, %, mm/jam"
                  size="sm" class="w-full"
                  :disabled="['selected','string'].includes(selectedInputan.inputType)" />
              </UFormField>
              <UFormField label="Opsi">
                <div class="flex h-8 items-center">
                  <USwitch v-model="selectedInputan.allowBlank" label="Allow Blank" />
                </div>
              </UFormField>
            </div>
            <!-- Formula -->
            <div v-if="selectedInputan.inputType === 'calculated'" class="space-y-2">
              <UFormField label="Formula">
                <UInput v-model="selectedInputan.formula" placeholder="Contoh: {{Hb}} / {{Ht}} * 100"
                  size="sm" class="w-full font-mono" />
              </UFormField>
              <div v-if="availableLabels.length" class="flex flex-wrap gap-1">
                <p class="w-full text-xs text-muted">Variabel tersedia:</p>
                <UBadge v-for="lbl in availableLabels" :key="lbl" :label="`{{${lbl}}}`"
                  color="primary" variant="soft" size="xs" class="cursor-pointer font-mono"
                  @click="insertVar(selectedInputan, lbl)" />
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div v-if="['number','calculated','selected'].includes(selectedInputan.inputType)"
            class="border border-default rounded-lg overflow-hidden">

            <!-- Tab header -->
            <div class="flex border-b border-default bg-elevated/40">
              <button
                v-if="['number','calculated'].includes(selectedInputan.inputType)"
                class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                :class="configTab === 'range' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-default'"
                @click="configTab = 'range'"
              >
                <UIcon name="i-lucide-ruler" class="size-4" />
                Range Nilai Normal
                <UBadge v-if="selectedInputan.nilaiNormalNumber.length"
                  :label="String(selectedInputan.nilaiNormalNumber.length)"
                  color="primary" variant="subtle" size="xs" />
              </button>

              <button
                v-if="selectedInputan.inputType === 'selected'"
                class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                :class="configTab === 'selektif' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-default'"
                @click="configTab = 'selektif'"
              >
                <UIcon name="i-lucide-list-checks" class="size-4" />
                Daftar Pilihan &amp; Nilai Normal
                <UBadge v-if="selectedInputan.opsis.length"
                  :label="String(selectedInputan.opsis.length)"
                  color="secondary" variant="subtle" size="xs" />
              </button>
            </div>

            <!-- Tab: Range Normal -->
            <div v-if="configTab === 'range'" class="p-4 space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium">
                  Range untuk <span class="text-primary">{{ selectedInputan.label || '...' }}</span>
                </p>
                <UButton icon="i-lucide-plus" size="xs" variant="soft" @click="addRange(selectedInputan)">
                  Tambah Aturan <UKbd value="ctrl+Enter" class="ml-2" />
                </UButton>
              </div>
              <div v-if="selectedInputan.nilaiNormalNumber.length === 0" class="text-center py-6 text-sm text-muted">
                Belum ada aturan range normal
              </div>
              <div v-for="(range, ridx) in selectedInputan.nilaiNormalNumber" :key="ridx"
                class="grid grid-cols-12 gap-2 p-3 bg-elevated/30 border border-default rounded-lg items-end">
                <div class="col-span-4">
                  <label class="text-xs text-muted block mb-1">Jenis Kelamin</label>
                  <USelect v-model="range.sex"
                    :items="[{ label:'Semua', value:null },{ label:'Laki-laki', value:'MALE' },{ label:'Perempuan', value:'FEMALE' }]"
                    size="sm" class="w-full" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs text-muted block mb-1">Usia Min</label>
                  <UInput v-model="range.ageMin" type="number" min="0" size="sm" class="w-full" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs text-muted block mb-1">Nilai Min</label>
                  <UInput v-model="range.minValue" type="number" size="sm" class="w-full" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs text-muted block mb-1">Nilai Max</label>
                  <UInput v-model="range.maxValue" type="number" size="sm" class="w-full" />
                </div>
                <div class="col-span-2 flex justify-end">
                  <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost"
                    @click="removeRange(selectedInputan, ridx)" />
                </div>
              </div>
            </div>

            <!-- Tab: Daftar Pilihan + Nilai Normal Selected -->
            <div v-if="configTab === 'selektif'" class="divide-y divide-default">

              <!-- Bagian 1: Daftar Opsi -->
              <div class="p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium">
                      Daftar Pilihan — <span class="text-secondary">{{ selectedInputan.label || '...' }}</span>
                    </p>
                    <p class="text-xs text-muted mt-0.5">
                      Klik <span class="font-medium">Simpan Template</span> dulu agar opsi punya ID
                      sebelum mengatur nilai normal.
                    </p>
                  </div>
                  <UButton icon="i-lucide-plus" size="xs" variant="soft" color="secondary"
                    @click="addOpsi(selectedInputan)">
                    Tambah Opsi
                  </UButton>
                </div>

                <div v-if="selectedInputan.opsis.length === 0" class="text-center py-4 text-sm text-muted">
                  Belum ada pilihan. Tambahkan minimal 1 opsi.
                </div>

                <div v-for="(opsi, oidx) in selectedInputan.opsis" :key="oidx"
                  class="grid grid-cols-12 gap-2 p-3 bg-elevated/30 border border-default rounded-lg items-end">
                  <div class="col-span-1 flex items-center justify-center pb-1">
                    <span class="text-xs font-mono text-muted">{{ oidx + 1 }}</span>
                  </div>
                  <div class="col-span-5">
                    <label class="text-xs text-muted block mb-1">Label (tampil di UI)</label>
                    <UInput v-model="opsi.label" placeholder="Contoh: Negatif" size="sm" class="w-full" />
                  </div>
                  <div class="col-span-4">
                    <label class="text-xs text-muted block mb-1">Value (disimpan)</label>
                    <UInput v-model="opsi.value" placeholder="Contoh: NEG" size="sm" class="w-full font-mono" />
                  </div>
                  <div class="col-span-2 flex items-end justify-end gap-1">
                    <!-- Indikator sudah tersimpan ke DB -->
                    <UTooltip v-if="opsi.id" text="Opsi sudah tersimpan">
                      <UIcon name="i-lucide-circle-check" class="size-4 text-success mb-2" />
                    </UTooltip>
                    <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost"
                      @click="removeOpsi(selectedInputan, oidx)" />
                  </div>
                </div>
              </div>

              <!-- Bagian 2: Nilai Normal Selected -->
              <div class="p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium">Nilai Normal Pilihan</p>
                    <p class="text-xs text-muted mt-0.5">
                      Tentukan opsi mana yang dianggap
                      <span class="text-success font-medium">normal</span>
                      per jenis kelamin &amp; usia minimum.
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <UButton icon="i-lucide-plus" size="xs" variant="soft"
                      :disabled="!opsisAlreadySaved"
                      @click="addNilaiNormalSel(selectedInputan)">
                      Tambah Aturan
                    </UButton>
                    <UButton icon="i-lucide-save" size="xs" color="success" variant="soft"
                      :loading="nilaiNormalSelLoading"
                      :disabled="!opsisAlreadySaved || selectedInputan.nilaiNormalSel.length === 0"
                      @click="saveNilaiNormalSel(selectedInputan)">
                      Simpan Nilai Normal
                    </UButton>
                  </div>
                </div>

                <!-- Peringatan opsi belum tersimpan -->
                <UAlert
                  v-if="!opsisAlreadySaved && selectedInputan.opsis.length > 0"
                  icon="i-lucide-info" color="warning" variant="soft"
                  title="Simpan template terlebih dahulu"
                  description="Klik 'Simpan Template' di atas agar opsi mendapat ID dari database, baru kemudian atur nilai normal."
                />
                <UAlert
                  v-else-if="selectedInputan.opsis.length === 0"
                  icon="i-lucide-circle-alert" color="neutral" variant="soft"
                  title="Tidak ada opsi"
                  description="Tambahkan opsi di bagian 'Daftar Pilihan' terlebih dahulu."
                />

                <div v-if="opsisAlreadySaved && selectedInputan.nilaiNormalSel.length === 0"
                  class="text-center py-4 text-sm text-muted">
                  Belum ada aturan nilai normal pilihan
                </div>

                <div v-for="(nn, nidx) in selectedInputan.nilaiNormalSel" :key="nidx"
                  class="grid grid-cols-12 gap-2 p-3 bg-elevated/30 border border-default rounded-lg items-end">
                  <div class="col-span-3">
                    <label class="text-xs text-muted block mb-1">Jenis Kelamin</label>
                    <USelect v-model="nn.sex"
                      :items="[{ label:'Semua', value:null },{ label:'Laki-laki', value:'MALE' },{ label:'Perempuan', value:'FEMALE' }]"
                      size="sm" class="w-full" />
                  </div>
                  <div class="col-span-2">
                    <label class="text-xs text-muted block mb-1">Usia Min</label>
                    <UInput v-model="nn.ageMin" type="number" min="0" size="sm" class="w-full" />
                  </div>
                  <div class="col-span-5">
                    <label class="text-xs text-muted block mb-1">Opsi yang Normal</label>
                    <USelect
                      v-model="nn.opsiId"
                      :items="opsiSelectItems"
                      placeholder="Pilih opsi..."
                      size="sm" class="w-full"
                    />
                  </div>
                  <div class="col-span-2 flex justify-end">
                    <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost"
                      @click="removeNilaiNormalSel(selectedInputan, nidx)" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>