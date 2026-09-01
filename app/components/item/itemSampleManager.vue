<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  itemId: string
}>()

const api  = useApi()
const toast = useToast()

// ─── Types ────────────────────────────────────────────────────────────────────

type SampleType = {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
}

type ItemSample = {
  id: string
  sampleTypeId: string
  sampleType: SampleType
  isPrimary: boolean
  sortOrder: number
}

// ─── State ────────────────────────────────────────────────────────────────────

const currentSamples  = ref<ItemSample[]>([])    // samples yang sudah tersimpan
const allSampleTypes  = ref<SampleType[]>([])     // master list dari BE
const loading         = ref(false)
const saveLoading     = ref(false)

// draft — apa yang ada di UI (belum tentu tersimpan)
type DraftRow = {
  sampleTypeId: string
  isPrimary:    boolean
  sortOrder:    number
  _key:         number
}

const draft = ref<DraftRow[]>([])
let keyCounter = 0

// ─── Computed ────────────────────────────────────────────────────────────────

// sampleType yang belum dipilih di draft (untuk dropdown)
const availableSampleTypes = computed(() => {
  const picked = new Set(draft.value.map((d) => d.sampleTypeId))
  return allSampleTypes.value.filter((s) => s.isActive && !picked.has(s.id))
})

const isDirty = computed(() => {
  // bandingkan draft vs currentSamples
  const cur = currentSamples.value
    .map((s) => ({ sampleTypeId: s.sampleTypeId, isPrimary: s.isPrimary, sortOrder: s.sortOrder }))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const drft = draft.value
    .map((d) => ({ sampleTypeId: d.sampleTypeId, isPrimary: d.isPrimary, sortOrder: d.sortOrder }))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return JSON.stringify(cur) !== JSON.stringify(drft)
})

// label untuk dropdown
const sampleTypeOptions = computed(() =>
  availableSampleTypes.value.map((s) => ({
    label: `${s.name} (${s.code})`,
    value: s.id,
  }))
)

// ─── Load ────────────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  try {
    const [itemRes, sampleRes] = await Promise.all([
      api.get(`/mcu/items/${props.itemId}`),
      api.get('/medical/exams/sample-types?isActive=true&limit=100'),
    ])

    allSampleTypes.value = sampleRes.data.data ?? []

    // sampleTypes dari item — sesuai relasi MstItemSample
    const raw: ItemSample[] = itemRes.data.data?.sampleTypes ?? []
    currentSamples.value = raw

    // inisialisasi draft dari data tersimpan
    draft.value = raw
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        sampleTypeId: s.sampleTypeId,
        isPrimary:    s.isPrimary,
        sortOrder:    s.sortOrder,
        _key:         keyCounter++,
      }))
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal memuat data sample', color: 'error' })
  } finally {
    loading.value = false
  }
}

watch(() => props.itemId, load, { immediate: true })

// ─── Draft mutation ───────────────────────────────────────────────────────────

function addRow() {
  draft.value.push({
    sampleTypeId: '',
    isPrimary:    false,
    sortOrder:    draft.value.length + 1,
    _key:         keyCounter++,
  })
}

function removeRow(key: number) {
  const idx = draft.value.findIndex((d) => d._key === key)
  if (idx === -1) return
  draft.value.splice(idx, 1)
  recalcSortOrder()
}

function moveUp(idx: number) {
  if (idx === 0) return
  const arr = draft.value
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  recalcSortOrder()
}

function moveDown(idx: number) {
  if (idx === draft.value.length - 1) return
  const arr = draft.value
  ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
  recalcSortOrder()
}

function recalcSortOrder() {
  draft.value.forEach((d, i) => (d.sortOrder = i + 1))
}

// hanya 1 row yang boleh isPrimary = true
function onPrimaryChange(key: number) {
  draft.value.forEach((d) => {
    if (d._key !== key) d.isPrimary = false
  })
}

function resetDraft() {
  draft.value = currentSamples.value
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      sampleTypeId: s.sampleTypeId,
      isPrimary:    s.isPrimary,
      sortOrder:    s.sortOrder,
      _key:         keyCounter++,
    }))
}

// ─── Save ────────────────────────────────────────────────────────────────────

async function save() {
  if (saveLoading.value) return

  // validasi — semua row harus punya sampleTypeId
  const invalid = draft.value.some((d) => !d.sampleTypeId)
  if (invalid) {
    toast.add({
      title: 'Validasi',
      description: 'Setiap baris harus memilih jenis sample.',
      color: 'warning',
    })
    return
  }

  saveLoading.value = true
  try {
    // PUT /mcu/sample-types/item/:itemId/samples
    // Body: { samples: [{ sampleTypeId, isPrimary, sortOrder }] }
    await api.put(`/medical/exams/sample-types/item/${props.itemId}/samples`, {
      samples: draft.value.map((d) => ({
        sampleTypeId: d.sampleTypeId,
        isPrimary:    d.isPrimary,
        sortOrder:    d.sortOrder,
      })),
    })

    toast.add({ title: 'Berhasil', description: 'Sample item berhasil disimpan', color: 'success' })
    await load()
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal menyimpan sample item',
      color: 'error',
    })
  } finally {
    saveLoading.value = false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSampleTypeName(id: string) {
  return allSampleTypes.value.find((s) => s.id === id)?.name ?? '-'
}

function getSampleTypeCode(id: string) {
  return allSampleTypes.value.find((s) => s.id === id)?.code ?? ''
}

// opsi dropdown per row — includes yang sedang dipilih row ini
function rowOptions(row: DraftRow) {
  const picked = new Set(draft.value.filter((d) => d._key !== row._key).map((d) => d.sampleTypeId))
  return allSampleTypes.value
    .filter((s) => s.isActive && !picked.has(s.id))
    .map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))
}
</script>

<template>
  <div class="space-y-4">

    <!-- Toolbar -->
    <div class="flex items-center justify-between border-b border-default pb-3">
      <div>
        <p class="text-sm font-medium">Sample yang dibutuhkan</p>
        <p class="text-xs text-muted mt-0.5">
          Item dengan sample akan otomatis melewati tahap
          <span class="font-medium text-primary">COLLECT → RECEIVE → EXAM</span>
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="isDirty"
          icon="i-lucide-rotate-ccw"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="resetDraft"
        >
          Reset
        </UButton>
        <UButton
          icon="i-lucide-plus"
          size="sm"
          variant="soft"
          :disabled="availableSampleTypes.length === 0 && draft.length > 0"
          @click="addRow"
        >
          Tambah Sample
        </UButton>
        <UButton
          icon="i-lucide-save"
          size="sm"
          :loading="saveLoading"
          :disabled="!isDirty"
          @click="save"
        >
          Simpan
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="draft.length === 0"
      class="flex flex-col items-center justify-center py-10 border border-dashed border-default rounded-lg text-center"
    >
      <UIcon name="i-lucide-test-tube-diagonal" class="size-8 text-muted mb-2" />
      <p class="text-sm font-medium">Tidak ada sample</p>
      <p class="text-xs text-muted mt-1">
        Item ini tidak membutuhkan sample — pasien langsung ke tahap pemeriksaan.
      </p>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        variant="soft"
        class="mt-3"
        @click="addRow"
      >
        Tambah Sample
      </UButton>
    </div>

    <!-- Draft rows -->
    <div v-else class="space-y-2">

      <!-- Header kolom -->
      <div class="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">
        <div class="col-span-1" />
        <div class="col-span-5">Jenis Sample</div>
        <div class="col-span-3 text-center">Sample Utama</div>
        <div class="col-span-2 text-center">Urutan</div>
        <div class="col-span-1" />
      </div>

      <div
        v-for="(row, idx) in draft"
        :key="row._key"
        class="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-default bg-elevated/20 transition-colors"
        :class="{ 'border-primary/40 bg-primary/5': row.isPrimary }"
      >
        <!-- Urutan badge -->
        <div class="col-span-1 flex items-center justify-center">
          <span class="text-xs font-mono text-muted w-5 text-center">{{ idx + 1 }}</span>
        </div>

        <!-- Dropdown pilih sample type -->
        <div class="col-span-5">
          <USelectMenu
            v-model="row.sampleTypeId"
            :items="rowOptions(row)"
            value-key="value"
            label-key="label"
            placeholder="Pilih jenis sample..."
            size="sm"
            class="w-full"
          />
        </div>

        <!-- isPrimary toggle -->
        <div class="col-span-3 flex items-center justify-center">
          <UTooltip text="Hanya 1 sample yang bisa menjadi sample utama">
            <USwitch
              v-model="row.isPrimary"
              size="sm"
              @change="onPrimaryChange(row._key)"
            />
          </UTooltip>
        </div>

        <!-- Move up / down -->
        <div class="col-span-2 flex items-center justify-center gap-1">
          <UButton
            icon="i-lucide-chevron-up"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="idx === 0"
            @click="moveUp(idx)"
          />
          <UButton
            icon="i-lucide-chevron-down"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="idx === draft.length - 1"
            @click="moveDown(idx)"
          />
        </div>

        <!-- Delete -->
        <div class="col-span-1 flex justify-end">
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="error"
            variant="ghost"
            @click="removeRow(row._key)"
          />
        </div>
      </div>

    </div>

    <!-- Info: sudah tersimpan -->
    <div v-if="currentSamples.length > 0 && !isDirty" class="space-y-1.5 pt-1">
      <p class="text-xs font-medium text-muted uppercase tracking-wider px-1">Tersimpan di database</p>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="s in currentSamples.sort((a, b) => a.sortOrder - b.sortOrder)"
          :key="s.id"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs"
          :class="s.isPrimary
            ? 'border-primary/40 bg-primary/5 text-primary'
            : 'border-default bg-elevated/30 text-muted'"
        >
          <UIcon
            :name="s.isPrimary ? 'i-lucide-star' : 'i-lucide-test-tube'"
            class="size-3"
          />
          <span class="font-medium">{{ s.sampleType.name }}</span>
          <span class="font-mono opacity-60">({{ s.sampleType.code }})</span>
          <UBadge v-if="s.isPrimary" label="Utama" color="primary" variant="subtle" size="xs" />
        </div>
      </div>
    </div>

    <!-- Warning: ada perubahan belum disimpan -->
    <UAlert
      v-if="isDirty"
      icon="i-lucide-circle-alert"
      color="warning"
      variant="soft"
      title="Ada perubahan yang belum disimpan"
      description="Klik 'Simpan' untuk menyimpan konfigurasi sample."
    />

  </div>
</template>