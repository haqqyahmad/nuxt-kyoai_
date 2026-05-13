<script setup lang="ts">
// definePageMeta({ layout: 'dashboard' })

const api = useApi()
const toast = useToast()
const router = useRouter()

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Branch = {
  id: string
  branchId: string
  nameBranch: string
  addressBranch?: string
}

type Patient = {
  id: string
  PatientId: string
  firstName: string
  middleName?: string
  lastName: string
  gender: 'MALE' | 'FEMALE'
  idType: string
  idNumber: string
  phone?: string
  email?: string
  dob?: string
  histories?: {
    id: string
    companyName: string
    position?: string
    startDate?: string
    endDate?: string | null
  }[]
}

type Company = {
  id: number
  codeCostumer: string
  customerName: string
}

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

// ── Tambahan: relasi department & group dari backend ──
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
  department?: MstDepartment | null
  group?: MstItemGroup | null
}

type MstItem = {
  id: string
  name: string
  code: string
  // Backend sekarang mengembalikan relasi object, bukan string
  department?: MstDepartment | null
  group?: MstItemGroup | null
  inputans: ItemInputan[]
}

type PaketItem = {
  id: string
  sortOrder: number
  item: MstItem
}

type Paket = {
  id: string
  name: string
  isActive: boolean
  paketItems: PaketItem[]
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const SERVICE_TYPES = [
  {
    value: 'Laboratorium',
    label: 'Laboratorium',
    icon: 'i-lucide-flask-conical'
  },
  {
    value: 'DoctorConsultation',
    label: 'Konsultasi Dokter',
    icon: 'i-lucide-stethoscope'
  },
  { value: 'MCU', label: 'MCU', icon: 'i-lucide-clipboard-list' },
  { value: 'Vaccine', label: 'Vaksin', icon: 'i-lucide-syringe' },
  { value: 'Antigen', label: 'Antigen', icon: 'i-lucide-microscope' },
  { value: 'PCR', label: 'PCR', icon: 'i-lucide-dna' },
  {
    value: 'VitaminInjection',
    label: 'Vitamin Injection',
    icon: 'i-lucide-pill'
  },
  { value: 'Pharmacy', label: 'Farmasi', icon: 'i-lucide-tablets' },
  { value: 'Dental', label: 'Gigi', icon: 'i-lucide-smile' }
] as const

const PAYMENT_TYPES = [
  { value: 'Personal', label: 'Personal' },
  { value: 'Insurance', label: 'Asuransi' },
  { value: 'BillToCompany', label: 'Bill to Company' }
] as const

const PRIORITY_TYPES = [
  { value: 'Normal', label: 'Normal' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Emegency', label: 'Emergency' }
] as const

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
// Branch
// ─────────────────────────────────────────────
const selectedBranch = ref<Branch | null>(null)
const branchModalOpen = ref(false)
const branchSearch = ref('')

const { data: branches } = await useAsyncData('branches', () =>
  api.get('/branch').then(r => r.data.data as Branch[])
)

const filteredBranches = computed(() => {
  const q = branchSearch.value.toLowerCase()
  if (!q) return branches.value ?? []
  return (branches.value ?? []).filter(
    b =>
      b.nameBranch.toLowerCase().includes(q)
      || b.branchId.toLowerCase().includes(q)
  )
})

function openBranchModal() {
  branchSearch.value = ''
  branchModalOpen.value = true
}

function selectBranch(b: Branch) {
  selectedBranch.value = b
  branchModalOpen.value = false
}

// ─────────────────────────────────────────────
// Patient
// ─────────────────────────────────────────────
const patientSearch = ref('')
const patientResults = ref<Patient[]>([])
const patientPending = ref(false)
const selectedPatient = ref<Patient | null>(null)
const isNewPatient = ref(false)
const patientDropOpen = ref(false)

const { data: initialPatients } = await useAsyncData('patients-initial', () =>
  api
    .get('/patient', { params: { limit: 6 } })
    .then(r => r.data.data as Patient[])
)

const displayedPatients = computed(() =>
  patientSearch.value.length >= 2
    ? patientResults.value
    : (initialPatients.value ?? [])
)

const newPatient = ref({
  firstName: '',
  middleName: '',
  lastName: '',
  gender: 'MALE' as 'MALE' | 'FEMALE',
  idType: 'KTP',
  idNumber: '',
  phone: '',
  email: '',
  dob: ''
})

let debounce: ReturnType<typeof setTimeout>
let requestId = 0

watch(patientSearch, (val) => {
  clearTimeout(debounce)
  if (selectedPatient.value || !val || val.length < 2) {
    patientResults.value = []
    patientPending.value = false
    return
  }
  const currentId = ++requestId
  patientPending.value = true
  debounce = setTimeout(async () => {
    try {
      const res = await api.get('/patient', { params: { search: val } })
      if (currentId === requestId) patientResults.value = res.data.data ?? []
    } catch {
      if (currentId === requestId) patientResults.value = []
    } finally {
      if (currentId === requestId) patientPending.value = false
    }
  }, 350)
})

function fullName(p: Patient) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
}

function selectPatient(p: Patient) {
  selectedPatient.value = p
  isNewPatient.value = false
  patientSearch.value = fullName(p)
  patientResults.value = []
  patientDropOpen.value = false
}

function clearPatient() {
  selectedPatient.value = null
  isNewPatient.value = false
  patientSearch.value = ''
  patientResults.value = []
}

function useNewPatient() {
  isNewPatient.value = true
  selectedPatient.value = null
  patientResults.value = []
  patientDropOpen.value = false
}

// ─────────────────────────────────────────────
// Registration Form
// ─────────────────────────────────────────────
const selectedService = ref('')

const { data: companies, pending: companiesPending } = await useAsyncData(
  'companies',
  () => api.get('/customer').then(r => r.data.data as Company[])
)

const regForm = ref({
  companyId: '',
  paymentType: 'Personal',
  priorityRegist: 'Normal',
  examDate: new Date().toISOString().slice(0, 10),
  scheduleDateExam: new Date().toISOString().slice(0, 10)
})

// ─────────────────────────────────────────────
// Paket MCU
// ─────────────────────────────────────────────
const selectedPaket = ref<Paket | null>(null)
const paketModalOpen = ref(false)
const paketSearch = ref('')
const expandedItems = ref<Set<string>>(new Set())

const { data: allPakets, pending: paketListPending } = await useAsyncData(
  'pakets',
  () =>
    api
      .get('/mcu/pakets', { params: { limit: 100 } })
      .then(r => r.data.data as Paket[]),
  { lazy: true }
)

const filteredPakets = computed(() => {
  const q = paketSearch.value.toLowerCase().trim()
  const list = allPakets.value ?? []
  if (!q) return list
  return list.filter(p => p.name.toLowerCase().includes(q))
})

watch(selectedService, (val) => {
  if (val !== 'MCU') {
    selectedPaket.value = null
    expandedItems.value.clear()
  }
})

function openPaketModal() {
  paketSearch.value = ''
  paketModalOpen.value = true
}

function selectPaket(p: Paket) {
  selectedPaket.value = p
  paketModalOpen.value = false
  expandedItems.value.clear()
}

function toggleItem(itemId: string) {
  if (expandedItems.value.has(itemId)) {
    expandedItems.value.delete(itemId)
  } else {
    expandedItems.value.add(itemId)
  }
}

const totalInputan = computed(
  () =>
    selectedPaket.value?.paketItems.reduce(
      (sum, pi) => sum + pi.item.inputans.length,
      0
    ) ?? 0
)

// ── Helper: ambil nama department dari MstItem ──
function getDepartmentName(item: MstItem): string | null {
  return item.department?.name ?? null
}

// Format nilai normal untuk display
function formatNilaiNormal(
  inp: ItemInputan,
  sex?: 'MALE' | 'FEMALE' | null
): string {
  if (inp.inputType === 'number' || inp.inputType === 'calculated') {
    const rows = inp.nilaiNormalNum
    if (!rows.length) return '-'
    const row
      = rows.find(r => r.sex === sex)
        ?? rows.find(r => r.sex === null)
        ?? rows[0]
    if (!row) return '-'
    const min = row.minValue != null ? row.minValue : '...'
    const max = row.maxValue != null ? row.maxValue : '...'
    return `${min} – ${max}${inp.uom ? ' ' + inp.uom : ''}`
  }
  if (inp.inputType === 'selected') {
    const normals = inp.nilaiNormalSel
    if (!normals.length) return 'Semua opsi valid'
    const labels = [...new Set(normals.map(n => n.opsi.label))]
    return labels.slice(0, 3).join(', ') + (labels.length > 3 ? '...' : '')
  }
  return '-'
}

// ─────────────────────────────────────────────
// Additional Items
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
        params: { search: val.trim(), limit: 20 }
      })
      if (currentId === additionalReqId) {
        const paketItemIds = new Set(
          selectedPaket.value?.paketItems.map(pi => pi.item.id) ?? []
        )
        const addedIds = new Set(additionalItems.value.map(i => i.id))
        additionalResults.value = (res.data.data as MstItem[]).filter(
          i => !paketItemIds.has(i.id) && !addedIds.has(i.id)
        )
      }
    } catch {
      if (currentId === additionalReqId) additionalResults.value = []
    } finally {
      if (currentId === additionalReqId) additionalPending.value = false
    }
  }, 300)
})

function openAdditionalModal() {
  if (!selectedPaket.value) {
    toast.add({
      title: 'Pilih Paket MCU',
      description:
        'Additional item hanya bisa ditambahkan setelah paket dipilih',
      color: 'warning'
    })

    return
  }

  additionalSearch.value = ''
  additionalResults.value = []
  additionalModalOpen.value = true
}

function addAdditionalItem(item: MstItem) {
  if (!additionalItems.value.find(i => i.id === item.id)) {
    additionalItems.value.push(item)
  }
  additionalResults.value = additionalResults.value.filter(
    i => i.id !== item.id
  )
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

watch(selectedService, (val) => {
  if (val !== 'MCU') {
    additionalItems.value = []
    expandedAdditional.value.clear()
  }
})

const totalAdditionalInputan = computed(() =>
  additionalItems.value.reduce((sum, i) => sum + i.inputans.length, 0)
)

const groupedAdditionalResults = computed(() => {
  const groups: Record<string, MstItem[]> = {}

  for (const item of additionalResults.value) {
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

const canSubmit = computed(() => {
  const hasPatient
    = !!selectedPatient.value
      || (isNewPatient.value
        && !!newPatient.value.firstName
        && !!newPatient.value.idNumber)

  const hasPaket = selectedService.value !== 'MCU' || !!selectedPaket.value

  return (
    !!selectedBranch.value
    && hasPatient
    && !!selectedService.value
    && hasPaket
    && !!regForm.value.companyId
    && !!regForm.value.examDate
  )
})

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true

  try {
    // 1. Buat pasien baru jika perlu
    let patientId = selectedPatient.value?.id
    if (isNewPatient.value) {
      const res = await api.post('/patient', { ...newPatient.value })
      patientId = res.data.data.id
    }

    // 2. Buat registrasi
    await api.post('/registration', {
      patientId,
      branchId: selectedBranch.value!.branchId,
      companyId: String(regForm.value.companyId),
      serviceType: selectedService.value,
      paymentType: regForm.value.paymentType,
      priorityRegist: regForm.value.priorityRegist,
      examDate: regForm.value.examDate,
      scheduleDateExam: regForm.value.scheduleDateExam
    })

    // 3. Jika MCU — buat exam
    if (selectedService.value === 'MCU' && selectedPaket.value && patientId) {
      await api.post('/mcu/exams', {
        paketId: selectedPaket.value.id,
        patientId,
        examDate: regForm.value.examDate
      })

      // CATATAN: Additional items saat ini hanya dicatat di FE (state lokal).
      // Backend belum memiliki endpoint untuk menambah item spesifik per-exam
      // tanpa memodifikasi master paket secara permanen.
      //
      // Opsi ke depan (pilih salah satu sesuai kebutuhan):
      //   A) Buat endpoint baru: POST /mcu/exams/:id/items  → tambah item ke exam tertentu
      //   B) Buat "paket sementara" baru yang di-clone dari paket yang dipilih + additional items
      //   C) Simpan additional item IDs ke field tambahan di TrxExam (perlu migrasi schema)
      //
      // Untuk sementara additional items TIDAK diproses ke backend
      // agar tidak merusak data master paket.
      if (additionalItems.value.length > 0) {
        console.warn(
          '[MCU] Additional items belum diproses ke backend:',
          additionalItems.value.map(i => i.id)
        )
      }
    }

    toast.add({
      title: 'Berhasil',
      description: 'Registrasi berhasil dibuat',
      color: 'success'
    })
    router.push('/front-office/registration-patient')
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
  <UDashboardPanel id="registration-create">
    <!-- ── Header ── -->
    <template #header>
      <UDashboardNavbar title="Buat Registrasi Baru">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/front-office/registration-patient"
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

    <!-- ── Body ── -->
    <template #body>
      <div class="max-w-5xl mx-auto py-6 px-4 space-y-5">
        <div
          class="grid gap-5 items-start"
          style="grid-template-columns: repeat(2, minmax(0, 1fr))"
        >
          <!-- ══════════════════════════════
               KOLOM KIRI
          ══════════════════════════════ -->
          <div class="space-y-5 min-w-0 w-full">
            <!-- ── Cabang ── -->
            <div class="rounded-xl border border-default">
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-building-2"
                    class="text-primary text-xs"
                  />
                </div>
                <h3 class="text-sm font-semibold">
                  Cabang
                </h3>
                <UBadge
                  v-if="selectedBranch"
                  :label="selectedBranch.branchId"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>

              <div class="p-4">
                <button
                  v-if="!selectedBranch"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-default hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  @click="openBranchModal"
                >
                  <div
                    class="w-9 h-9 rounded-lg bg-accented flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors"
                  >
                    <UIcon
                      name="i-lucide-building-2"
                      class="text-muted group-hover:text-primary transition-colors"
                    />
                  </div>
                  <div class="text-left flex-1">
                    <p class="text-sm font-medium">
                      Pilih Cabang
                    </p>
                    <p class="text-xs text-muted">
                      Klik untuk memilih cabang tujuan
                    </p>
                  </div>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="text-muted group-hover:text-primary transition-colors"
                  />
                </button>

                <div
                  v-else
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div
                    class="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0"
                  >
                    <UIcon name="i-lucide-building-2" class="text-primary" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate">
                      {{ selectedBranch.nameBranch }}
                    </p>
                    <p class="text-xs text-muted flex items-center gap-1">
                      <UIcon name="i-lucide-map-pin" class="text-xs" />
                      {{ selectedBranch.branchId }}
                    </p>
                  </div>
                  <UButton
                    size="xs"
                    color="primary"
                    variant="subtle"
                    icon="i-lucide-pencil"
                    label="Ganti"
                    @click="openBranchModal"
                  />
                </div>
              </div>
            </div>

            <!-- ── Pasien ── -->
            <div
              class="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-visible"
            >
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="text-primary text-xs" />
                </div>
                <h3 class="text-sm font-semibold">
                  Pasien
                </h3>
                <UBadge
                  v-if="isNewPatient"
                  label="Baru"
                  color="warning"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
                <UBadge
                  v-else-if="selectedPatient"
                  label="Terpilih"
                  color="success"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>

              <div class="p-4 space-y-3">
                <div v-if="!isNewPatient" class="relative overflow-visible">
                  <UInput
                    v-model="patientSearch"
                    icon="i-lucide-search"
                    :loading="patientPending"
                    :disabled="!!selectedPatient"
                    placeholder="Cari nama, nomor ID, atau kode pasien..."
                    @focus="patientDropOpen = true"
                    @blur="setTimeout(() => (patientDropOpen = false), 200)"
                  />

                  <div
                    v-if="
                      patientDropOpen
                        && !selectedPatient
                        && displayedPatients.length
                    "
                    class="absolute z-[9999] left-0 right-0 mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <div
                      class="px-3 py-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 flex items-center gap-1.5"
                    >
                      <UIcon name="i-lucide-users" class="text-muted text-xs" />
                      <span class="text-xs text-muted">
                        {{
                          patientSearch.length >= 2
                            ? "Hasil pencarian"
                            : "Pasien terbaru"
                        }}
                      </span>
                    </div>
                    <button
                      v-for="p in displayedPatients.slice(0, 6)"
                      :key="p.id"
                      class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-elevated transition-colors text-left border-b border-default last:border-0"
                      @mousedown.prevent="selectPatient(p)"
                    >
                      <div
                        class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-xs"
                      >
                        {{ p.firstName.charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">
                          {{ fullName(p) }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ p.idType }}: {{ p.idNumber }}
                        </p>
                      </div>
                      <UBadge
                        :label="p.PatientId"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      />
                    </button>
                    <div class="px-3 py-2 border-t border-default">
                      <button
                        class="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        @mousedown.prevent="useNewPatient"
                      >
                        <UIcon name="i-lucide-user-plus" />
                        Pasien tidak ada? Tambah baru
                      </button>
                    </div>
                  </div>

                  <div
                    v-else-if="
                      patientDropOpen
                        && patientSearch.length >= 2
                        && !patientPending
                        && !patientResults.length
                        && !selectedPatient
                    "
                    class="absolute z-[9999] left-0 right-0 mt-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl"
                  >
                    <p class="px-3 py-2.5 text-xs text-muted">
                      Tidak ditemukan untuk "<span class="text-default">{{
                        patientSearch
                      }}</span>"
                    </p>
                    <div class="px-3 py-2 border-t border-default">
                      <button
                        class="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        @mousedown.prevent="useNewPatient"
                      >
                        <UIcon name="i-lucide-user-plus" />
                        Tambah sebagai pasien baru
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Card pasien terpilih -->
                <div
                  v-if="selectedPatient"
                  class="w-full min-w-0 rounded-lg border border-primary/20 overflow-hidden"
                >
                  <div
                    class="px-3 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2"
                  >
                    <div
                      class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0"
                    >
                      {{ selectedPatient.firstName.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold leading-none">
                        {{ fullName(selectedPatient) }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ selectedPatient.PatientId }}
                      </p>
                    </div>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      label="Ganti"
                      class="ml-auto"
                      @click="clearPatient"
                    />
                  </div>
                  <div class="p-3 space-y-2">
                    <div class="grid grid-cols-3 gap-2">
                      <UFormField label="First Name" class="min-w-0">
                        <UInput
                          :model-value="selectedPatient.firstName"
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                      <UFormField label="Middle Name" class="min-w-0">
                        <UInput
                          :model-value="selectedPatient.middleName ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                      <UFormField label="Last Name" class="min-w-0">
                        <UInput
                          :model-value="selectedPatient.lastName"
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <UFormField label="Gender" class="min-w-0">
                        <UInput
                          :model-value="
                            selectedPatient.gender === 'MALE'
                              ? 'Laki-laki'
                              : 'Perempuan'
                          "
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                      <UFormField label="Tgl Lahir" class="min-w-0">
                        <UInput
                          :model-value="
                            selectedPatient.dob
                              ? selectedPatient.dob.slice(0, 10)
                              : '-'
                          "
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                      <UFormField label="Tipe ID" class="min-w-0">
                        <UInput
                          :model-value="selectedPatient.idType"
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                      <UFormField label="Nomor ID" class="min-w-0">
                        <UInput
                          :model-value="selectedPatient.idNumber"
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                      <UFormField label="No. HP" class="min-w-0">
                        <UInput
                          :model-value="selectedPatient.phone ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                      <UFormField label="Email" class="min-w-0">
                        <UInput
                          :model-value="selectedPatient.email ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-90 min-w-0"
                        />
                      </UFormField>
                    </div>
                  </div>
                </div>

                <!-- Form pasien baru -->
                <div
                  v-if="isNewPatient"
                  class="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
                >
                  <div class="flex items-center justify-between">
                    <p
                      class="text-xs font-semibold text-warning flex items-center gap-1.5"
                    >
                      <UIcon name="i-lucide-user-plus" />
                      Pasien Baru
                    </p>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      label="Batal"
                      @click="
                        isNewPatient = false;
                        patientSearch = '';
                      "
                    />
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <UFormField label="First Name *">
                      <UInput
                        v-model="newPatient.firstName"
                        size="sm"
                        placeholder="Budi"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Middle">
                      <UInput
                        v-model="newPatient.middleName"
                        size="sm"
                        placeholder="-"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Last Name">
                      <UInput
                        v-model="newPatient.lastName"
                        size="sm"
                        placeholder="Santoso"
                        class="w-full"
                      />
                    </UFormField>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <UFormField label="Gender">
                      <USelect
                        v-model="newPatient.gender"
                        size="sm"
                        :items="[
                          { label: 'Laki-laki', value: 'MALE' },
                          { label: 'Perempuan', value: 'FEMALE' }
                        ]"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Tgl Lahir">
                      <UInput
                        v-model="newPatient.dob"
                        type="date"
                        size="sm"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Tipe ID">
                      <USelect
                        v-model="newPatient.idType"
                        size="sm"
                        :items="
                          ['KTP', 'PASSPORT', 'SIM', 'KITAS'].map((v) => ({
                            label: v,
                            value: v
                          }))
                        "
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Nomor ID *">
                      <UInput
                        v-model="newPatient.idNumber"
                        size="sm"
                        placeholder="Nomor identitas"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="No. HP">
                      <UInput
                        v-model="newPatient.phone"
                        size="sm"
                        placeholder="08xxx"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Email">
                      <UInput
                        v-model="newPatient.email"
                        type="email"
                        size="sm"
                        placeholder="email@..."
                        class="w-full"
                      />
                    </UFormField>
                  </div>
                </div>

                <div
                  v-if="!selectedPatient && !isNewPatient && !patientSearch"
                  class="text-center"
                >
                  <button
                    class="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                    @click="useNewPatient"
                  >
                    <UIcon name="i-lucide-user-plus" />
                    Tambah pasien baru tanpa pencarian
                  </button>
                </div>
              </div>
            </div>

            <!-- ── Data Registrasi ── -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-clipboard"
                    class="text-primary text-xs"
                  />
                </div>
                <h3 class="text-sm font-semibold">
                  Data Registrasi
                </h3>
              </div>
              <div class="p-4 space-y-4">
                <UFormField label="Perusahaan / Pembayar *">
                  <USelect
                    v-model="regForm.companyId"
                    :loading="companiesPending"
                    :items="
                      (companies ?? []).map((c) => ({
                        label: `${c.codeCostumer} – ${c.customerName}`,
                        value: String(c.id)
                      }))
                    "
                    placeholder="Pilih perusahaan..."
                    class="w-full"
                  />
                </UFormField>
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Tipe Pembayaran">
                    <USelect
                      v-model="regForm.paymentType"
                      :items="PAYMENT_TYPES"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Prioritas">
                    <USelect
                      v-model="regForm.priorityRegist"
                      :items="PRIORITY_TYPES"
                      class="w-full"
                    />
                  </UFormField>
                </div>
                <UFormField label="Tanggal Periksa *">
                  <UInput
                    v-model="regForm.examDate"
                    type="date"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════
               KOLOM KANAN
          ══════════════════════════════ -->
          <div class="space-y-5 min-w-0 w-full">
            <!-- ── Jenis Layanan ── -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-stethoscope"
                    class="text-primary text-xs"
                  />
                </div>
                <h3 class="text-sm font-semibold">
                  Jenis Layanan
                </h3>
                <UBadge
                  v-if="selectedService"
                  :label="
                    SERVICE_TYPES.find((s) => s.value === selectedService)
                      ?.label ?? ''
                  "
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>
              <div class="p-4">
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="svc in SERVICE_TYPES"
                    :key="svc.value"
                    class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all"
                    :class="
                      selectedService === svc.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-default bg-elevated hover:border-primary/40'
                    "
                    @click="selectedService = svc.value"
                  >
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center"
                      :class="
                        selectedService === svc.value
                          ? 'bg-primary text-white'
                          : 'bg-accented text-muted'
                      "
                    >
                      <UIcon :name="svc.icon" class="text-sm" />
                    </div>
                    <span
                      class="text-xs font-medium text-center leading-tight"
                    >{{ svc.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- ── Paket MCU ── -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div
                v-if="selectedService === 'MCU'"
                class="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden"
              >
                <div
                  class="px-4 py-3 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 flex items-center gap-2"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                  >
                    <UIcon
                      name="i-lucide-clipboard-list"
                      class="text-primary text-xs"
                    />
                  </div>
                  <h3
                    class="text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Paket MCU
                  </h3>
                  <UBadge
                    v-if="selectedPaket"
                    label="Terpilih"
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
                  <button
                    v-if="!selectedPaket"
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-neutral-700 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
                    :disabled="paketListPending"
                    @click="openPaketModal"
                  >
                    <div
                      class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors"
                    >
                      <UIcon
                        :name="
                          paketListPending
                            ? 'i-lucide-loader-circle'
                            : 'i-lucide-package'
                        "
                        :class="[
                          'transition-colors',
                          paketListPending
                            ? 'animate-spin text-muted'
                            : 'text-muted group-hover:text-primary'
                        ]"
                      />
                    </div>
                    <div class="text-left flex-1">
                      <p class="text-sm font-medium">
                        Pilih Paket MCU
                      </p>
                      <p class="text-xs text-muted">
                        Klik untuk memilih paket pemeriksaan
                      </p>
                    </div>
                    <UIcon
                      name="i-lucide-chevron-right"
                      class="text-muted group-hover:text-primary transition-colors"
                    />
                  </button>

                  <template v-else>
                    <div
                      class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/20"
                    >
                      <div
                        class="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0"
                      >
                        <UIcon name="i-lucide-package" class="text-primary" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold truncate">
                          {{ selectedPaket.name }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ selectedPaket.paketItems.length }} item ·
                          {{ totalInputan }} inputan
                        </p>
                      </div>
                      <UButton
                        size="xs"
                        color="primary"
                        variant="subtle"
                        icon="i-lucide-pencil"
                        label="Ganti"
                        @click="openPaketModal"
                      />
                    </div>

                    <div class="space-y-1.5">
                      <p
                        class="text-xs font-semibold text-muted uppercase tracking-wider px-0.5"
                      >
                        Detail Item Pemeriksaan
                      </p>

                      <div
                        v-for="pi in selectedPaket.paketItems"
                        :key="pi.id"
                        class="rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-900"
                      >
                        <button
                          class="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-left"
                          @click="toggleItem(pi.item.id)"
                        >
                          <div
                            class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
                          >
                            <UIcon
                              name="i-lucide-flask-conical"
                              class="text-primary text-xs"
                            />
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold truncate">
                              {{ pi.item.name }}
                            </p>
                            <p class="text-xs text-muted">
                              {{ pi.item.code }}
                              <!-- FIX: department sekarang object, ambil .name -->
                              <template v-if="getDepartmentName(pi.item)">
                                · {{ getDepartmentName(pi.item) }}
                              </template>
                              · {{ pi.item.inputans.length }} inputan
                            </p>
                          </div>
                          <UIcon
                            :name="
                              expandedItems.has(pi.item.id)
                                ? 'i-lucide-chevron-up'
                                : 'i-lucide-chevron-down'
                            "
                            class="text-muted text-xs flex-shrink-0 transition-transform"
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
                            v-if="expandedItems.has(pi.item.id)"
                            class="border-t border-default overflow-hidden"
                          >
                            <div
                              class="grid px-3 py-2 bg-gray-50 dark:bg-neutral-800/80"
                              style="grid-template-columns: 1fr 90px 100px 1fr"
                            >
                              <span
                                class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                              >Label</span>
                              <span
                                class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                              >Tipe</span>
                              <span
                                class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                              >Satuan</span>
                              <span
                                class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                              >Nilai Normal</span>
                            </div>

                            <div
                              v-for="inp in pi.item.inputans"
                              :key="inp.id"
                              class="grid px-3 py-2 border-t border-default/50 hover:bg-gray-50 dark:hover:bg-neutral-800/60 transition-colors"
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
                                  :color="
                                    INPUT_TYPE_COLOR[inp.inputType] as any
                                  "
                                  variant="subtle"
                                  size="xs"
                                />
                              </div>
                              <p class="text-xs text-muted truncate">
                                {{ inp.uom ?? "—" }}
                              </p>
                              <div class="min-w-0">
                                <p
                                  v-if="inp.inputType === 'string'"
                                  class="text-xs text-muted italic"
                                >
                                  Teks bebas
                                </p>
                                <p v-else class="text-xs text-default truncate">
                                  {{ formatNilaiNormal(inp) }}
                                </p>
                                <div
                                  v-if="
                                    inp.inputType === 'selected'
                                      && inp.opsis.length
                                  "
                                  class="flex flex-wrap gap-1 mt-1"
                                >
                                  <span
                                    v-for="opsi in inp.opsis.slice(0, 4)"
                                    :key="opsi.id"
                                    class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-gray-400"
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
                              v-if="!pi.item.inputans.length"
                              class="px-3 py-3 text-center"
                            >
                              <p class="text-xs text-muted">
                                Belum ada inputan
                              </p>
                            </div>
                          </div>
                        </Transition>
                      </div>

                      <div
                        v-if="!selectedPaket.paketItems.length"
                        class="py-4 text-center rounded-lg border border-default border-dashed"
                      >
                        <p class="text-xs text-muted">
                          Paket ini belum memiliki item
                        </p>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </Transition>

            <!-- ── Additional Item ── -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div
                v-if="selectedService === 'MCU'"
                class="rounded-xl border border-default overflow-hidden"
              >
                <div
                  class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                  >
                    <UIcon
                      name="i-lucide-plus-circle"
                      class="text-primary text-xs"
                    />
                  </div>
                  <h3 class="text-sm font-semibold">
                    Additional Item
                  </h3>
                  <span class="text-xs text-muted ml-0.5">(opsional)</span>
                  <UBadge
                    v-if="additionalItems.length"
                    :label="`${additionalItems.length} item`"
                    color="primary"
                    variant="subtle"
                    size="xs"
                    class="ml-auto"
                  />
                  <!-- Info: belum diproses ke backend -->
                  <UTooltip
                    v-if="additionalItems.length"
                    text="Item tambahan belum tersimpan ke backend — butuh endpoint exam-specific"
                  >
                    <UIcon
                      name="i-lucide-info"
                      class="text-warning text-xs ml-1"
                    />
                  </UTooltip>
                </div>

                <div class="p-4 space-y-3">
                  <button
                    class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-dashed transition-all group"
                    :class="
                      !selectedPaket
                        ? 'border-default opacity-50 cursor-not-allowed bg-elevated'
                        : 'border-default hover:border-primary/50 hover:bg-primary/5'
                    "
                    :disabled="!selectedPaket"
                    @click="openAdditionalModal"
                  >
                    <div
                      class="w-7 h-7 rounded-md bg-accented flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors"
                    >
                      <UIcon
                        name="i-lucide-search"
                        class="text-muted group-hover:text-primary transition-colors text-xs"
                      />
                    </div>
                    <span
                      class="text-sm transition-colors flex-1 text-left"
                      :class="
                        selectedPaket
                          ? 'text-muted group-hover:text-default'
                          : 'text-muted/70'
                      "
                    >
                      {{
                        selectedPaket
                          ? "Cari dan tambah item pemeriksaan..."
                          : "Pilih paket MCU terlebih dahulu"
                      }}
                    </span>
                    <UIcon
                      name="i-lucide-plus"
                      class="text-muted group-hover:text-primary transition-colors text-xs"
                    />
                  </button>

                  <div v-if="additionalItems.length" class="space-y-1.5">
                    <div class="flex items-center justify-between px-0.5">
                      <p
                        class="text-xs font-semibold text-muted uppercase tracking-wider"
                      >
                        Item Tambahan
                      </p>
                      <span class="text-[11px] text-muted">{{ totalAdditionalInputan }} inputan</span>
                    </div>

                    <div
                      v-for="item in additionalItems"
                      :key="item.id"
                      class="rounded-lg border border-primary/20 bg-primary/3 overflow-hidden"
                    >
                      <div class="flex items-center gap-2.5 px-3 py-2.5">
                        <button
                          class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                          @click="toggleAdditional(item.id)"
                        >
                          <UIcon
                            :name="
                              expandedAdditional.has(item.id)
                                ? 'i-lucide-chevron-up'
                                : 'i-lucide-chevron-down'
                            "
                            class="text-primary text-xs"
                          />
                        </button>

                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-1.5">
                            <p class="text-xs font-semibold truncate">
                              {{ item.name }}
                            </p>
                            <UBadge
                              label="Tambahan"
                              color="primary"
                              variant="subtle"
                              size="xs"
                              class="flex-shrink-0"
                            />
                          </div>
                          <p class="text-[11px] text-muted">
                            {{ item.code }}
                            <!-- FIX: department sekarang object, ambil .name -->
                            <template v-if="getDepartmentName(item)">
                              · {{ getDepartmentName(item) }}
                            </template>
                            · {{ item.inputans.length }} inputan
                          </p>
                        </div>

                        <button
                          class="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-error hover:bg-error/10 transition-all flex-shrink-0"
                          @click="removeAdditionalItem(item.id)"
                        >
                          <UIcon name="i-lucide-x" class="text-xs" />
                        </button>
                      </div>

                      <Transition
                        enter-active-class="transition-all duration-200 ease-out"
                        enter-from-class="opacity-0 max-h-0"
                        enter-to-class="opacity-100 max-h-[400px]"
                        leave-active-class="transition-all duration-150 ease-in"
                        leave-from-class="opacity-100 max-h-[400px]"
                        leave-to-class="opacity-0 max-h-0"
                      >
                        <div
                          v-if="expandedAdditional.has(item.id)"
                          class="border-t border-primary/20 overflow-hidden"
                        >
                          <div
                            class="grid px-3 py-1.5 bg-primary/5"
                            style="grid-template-columns: 1fr 90px 100px 1fr"
                          >
                            <span
                              class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                            >Label</span>
                            <span
                              class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                            >Tipe</span>
                            <span
                              class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                            >Satuan</span>
                            <span
                              class="text-[10px] font-semibold text-muted uppercase tracking-wider"
                            >Nilai Normal</span>
                          </div>

                          <div
                            v-for="inp in item.inputans"
                            :key="inp.id"
                            class="grid px-3 py-2 border-t border-primary/10 hover:bg-primary/5 transition-colors"
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
                              {{ inp.uom ?? "—" }}
                            </p>
                            <div class="min-w-0">
                              <p
                                v-if="inp.inputType === 'string'"
                                class="text-xs text-muted italic"
                              >
                                Teks bebas
                              </p>
                              <p v-else class="text-xs text-default truncate">
                                {{ formatNilaiNormal(inp) }}
                              </p>
                              <div
                                v-if="
                                  inp.inputType === 'selected'
                                    && inp.opsis.length
                                "
                                class="flex flex-wrap gap-1 mt-1"
                              >
                                <span
                                  v-for="opsi in inp.opsis.slice(0, 3)"
                                  :key="opsi.id"
                                  class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-gray-400"
                                >
                                  {{ opsi.label }}
                                </span>
                                <span
                                  v-if="inp.opsis.length > 3"
                                  class="text-[10px] text-muted"
                                >+{{ inp.opsis.length - 3 }}</span>
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

                  <div v-else class="py-3 text-center">
                    <p class="text-xs text-muted">
                      Belum ada item tambahan
                    </p>
                    <p class="text-[11px] text-muted/60 mt-0.5">
                      Item di luar paket yang diinput saat exam
                    </p>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- ── Bottom bar ── -->
        <div
          class="sticky bottom-0 -mx-4 px-4 py-3 border-t border-default bg-background/90 backdrop-blur flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2 flex-wrap text-xs text-muted">
            <span
              v-if="selectedBranch"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{ selectedBranch.nameBranch }}
            </span>
            <span
              v-if="selectedPatient || isNewPatient"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{ isNewPatient ? "Pasien baru" : fullName(selectedPatient!) }}
            </span>
            <span
              v-if="selectedService"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{
                SERVICE_TYPES.find((s) => s.value === selectedService)?.label
              }}
            </span>
            <span
              v-if="selectedService === 'MCU' && selectedPaket"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{ selectedPaket.name }}
            </span>
            <span
              v-if="selectedService === 'MCU' && additionalItems.length"
              class="flex items-center gap-1 text-warning"
            >
              <UIcon name="i-lucide-info" />
              {{ additionalItems.length }} item tambahan (belum diproses)
            </span>
            <span
              v-if="selectedService === 'MCU' && !selectedPaket"
              class="flex items-center gap-1 text-error"
            >
              <UIcon name="i-lucide-alert-circle" />
              Paket MCU belum dipilih
            </span>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <UButton
              color="neutral"
              variant="outline"
              to="/front-office/registration-patient"
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
              Simpan Registrasi
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ════════════════════════════════════════════
       MODAL PILIH CABANG
  ════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="branchModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="
          backdrop-filter: blur(8px) saturate(150%);
          background: rgba(0, 0, 0, 0.1);
        "
        @click.self="branchModalOpen = false"
      >
        <Transition name="modal-pop">
          <div
            v-if="branchModalOpen"
            class="w-full max-w-sm bg-white/80 dark:bg-neutral-900/90 backdrop-blur-md rounded-2xl overflow-hidden border border-gray-200/70 dark:border-neutral-700/60"
            style="
              box-shadow:
                0 32px 64px -12px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(128, 128, 128, 0.12);
            "
          >
            <div class="px-5 pt-5 pb-3">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h2
                    class="text-[15px] font-semibold tracking-tight leading-snug text-gray-900 dark:text-white"
                  >
                    Pilih Cabang
                  </h2>

                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Cabang tujuan registrasi pasien
                  </p>
                </div>

                <button
                  class="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
                  @click="branchModalOpen = false"
                >
                  <UIcon name="i-lucide-x" class="text-xs" />
                </button>
              </div>

              <div class="relative">
                <UIcon
                  name="i-lucide-search"
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                  style="font-size: 13px"
                />

                <input
                  v-model="branchSearch"
                  type="text"
                  placeholder="Ketik nama atau kode cabang..."
                  autofocus
                  class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none transition-all bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white border border-transparent focus:border-primary/40 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
              </div>
            </div>

            <div class="h-px bg-gray-200 dark:bg-neutral-700 mx-4" />

            <div class="overflow-y-auto py-1.5" style="max-height: 260px">
              <template v-if="filteredBranches.length">
                <button
                  v-for="(b, i) in filteredBranches"
                  :key="b.branchId"
                  class="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left hover:bg-gray-100 dark:hover:bg-neutral-800"
                  :class="
                    selectedBranch?.branchId === b.branchId
                      ? 'bg-primary/10 dark:bg-primary/15'
                      : ''
                  "
                  @click="selectBranch(b)"
                >
                  <span
                    class="text-[10px] font-semibold w-5 h-5 rounded flex items-center justify-center flex-shrink-0 tabular-nums transition-colors"
                    :class="
                      selectedBranch?.branchId === b.branchId
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-300'
                    "
                  >
                    {{ i + 1 }}
                  </span>

                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm font-medium leading-snug truncate"
                      :class="
                        selectedBranch?.branchId === b.branchId
                          ? 'text-primary'
                          : 'text-gray-900 dark:text-gray-100'
                      "
                    >
                      {{ b.nameBranch }}
                    </p>

                    <p
                      class="text-[11px] truncate leading-tight mt-px text-gray-500 dark:text-gray-400"
                    >
                      {{ b.branchId }}

                      <template v-if="b.addressBranch">
                        &middot; {{ b.addressBranch }}
                      </template>
                    </p>
                  </div>

                  <UIcon
                    v-if="selectedBranch?.branchId === b.branchId"
                    name="i-lucide-check"
                    class="text-primary flex-shrink-0 text-sm"
                  />
                </button>
              </template>

              <div v-else class="py-8 text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Tidak ada hasil
                </p>

                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Coba kata kunci lain
                </p>
              </div>
            </div>

            <div class="h-px bg-gray-200 dark:bg-neutral-700 mx-4" />

            <div class="px-5 py-3 flex items-center justify-between">
              <p class="text-[11px] text-gray-400 dark:text-gray-500">
                {{ filteredBranches.length }} cabang tersedia
              </p>

              <button
                class="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                @click="branchModalOpen = false"
              >
                Tutup
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>

  <!-- ════════════════════════════════════════════
     MODAL PILIH PAKET MCU
═════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="paketModalOpen"
        class="fixed inset-0 z-[999] flex items-center justify-center p-4"
        style="
          backdrop-filter: blur(10px) saturate(160%);
          background: rgba(10, 10, 15, 0.55);
        "
        @click.self="paketModalOpen = false"
      >
        <Transition name="modal-pop">
          <div
            v-if="paketModalOpen"
            class="relative w-full max-w-2xl overflow-hidden rounded-3xl backdrop-blur-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95"
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
                <div>
                  <h2
                    class="text-base font-semibold tracking-tight text-gray-900 dark:text-white"
                  >
                    Pilih Paket MCU
                  </h2>

                  <p
                    class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                  >
                    Paket pemeriksaan yang akan dijalani pasien
                  </p>
                </div>

                <button
                  class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-all"
                  @click="paketModalOpen = false"
                >
                  <UIcon name="i-lucide-x" class="text-sm" />
                </button>
              </div>

              <!-- SEARCH -->
              <div class="relative mt-4">
                <UIcon
                  name="i-lucide-search"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />

                <input
                  v-model="paketSearch"
                  type="text"
                  placeholder="Cari nama paket..."
                  autofocus
                  class="w-full h-11 rounded-xl pl-10 pr-4 text-sm outline-none transition-all bg-white dark:bg-neutral-800/90 text-neutral-900 dark:text-white border border-black/10 dark:border-white/10 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                >
              </div>
            </div>

            <!-- BODY -->
            <div class="overflow-y-auto" style="max-height: min(65vh, 620px)">
              <!-- LOADING -->
              <div
                v-if="paketListPending"
                class="py-14 flex flex-col items-center justify-center"
              >
                <UIcon
                  name="i-lucide-loader-circle"
                  class="animate-spin text-primary text-2xl"
                />

                <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                  Memuat paket...
                </p>
              </div>

              <!-- LIST -->
              <template v-else-if="filteredPakets.length">
                <div class="p-3 space-y-2">
                  <button
                    v-for="p in filteredPakets"
                    :key="p.id"
                    class="group relative w-full rounded-2xl border transition-all overflow-hidden"
                    :class="
                      selectedPaket?.id === p.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/20'
                    "
                    @click="selectPaket(p)"
                  >
                    <div class="flex items-start gap-4 p-4">
                      <!-- ICON -->
                      <div
                        class="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
                        :class="
                          selectedPaket?.id === p.id
                            ? 'bg-primary text-white'
                            : 'bg-primary/15 text-primary'
                        "
                      >
                        <UIcon name="i-lucide-package" class="text-lg" />
                      </div>

                      <!-- CONTENT -->
                      <div class="flex-1 min-w-0 text-left">
                        <div class="flex items-start gap-2">
                          <div class="flex-1 min-w-0">
                            <p
                              class="text-sm font-semibold truncate transition-colors"
                              :class="
                                selectedPaket?.id === p.id
                                  ? 'text-primary'
                                  : 'text-white'
                              "
                            >
                              {{ p.name }}
                            </p>

                            <div
                              class="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400"
                            >
                              <span> {{ p.paketItems.length }} item </span>

                              <span>•</span>

                              <span>
                                {{
                                  p.paketItems.reduce(
                                    (s, pi) => s + pi.item.inputans.length,
                                    0
                                  )
                                }}
                                inputan
                              </span>
                            </div>
                          </div>

                          <UIcon
                            v-if="selectedPaket?.id === p.id"
                            name="i-lucide-check-circle-2"
                            class="text-primary text-lg flex-shrink-0"
                          />
                        </div>

                        <!-- TAGS -->
                        <div class="flex flex-wrap gap-1.5 mt-3">
                          <span
                            v-for="pi in p.paketItems.slice(0, 4)"
                            :key="pi.id"
                            class="px-2 py-1 rounded-lg text-[10px] border border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300"
                          >
                            {{ pi.item.name }}
                          </span>

                          <span
                            v-if="p.paketItems.length > 4"
                            class="px-2 py-1 rounded-lg text-[10px] border border-primary/20 bg-primary/10 text-primary"
                          >
                            +{{ p.paketItems.length - 4 }} lainnya
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </template>

              <!-- EMPTY -->
              <div
                v-else
                class="py-16 flex flex-col items-center justify-center text-center px-6"
              >
                <div
                  class="w-14 h-14 rounded-2xl bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4"
                >
                  <UIcon
                    name="i-lucide-package-x"
                    class="text-neutral-500 text-2xl"
                  />
                </div>

                <p class="text-sm font-medium text-neutral-300">
                  Tidak ada paket
                </p>

                <p class="text-xs text-neutral-500 mt-1">
                  Coba kata kunci lain
                </p>
              </div>
            </div>

            <!-- FOOTER -->
            <div
              class="px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between"
            >
              <p class="text-[11px] text-neutral-500">
                {{ filteredPakets.length }} paket tersedia
              </p>

              <button
                class="px-4 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-black/10 dark:border-white/10 text-sm text-neutral-300 transition-all"
                @click="paketModalOpen = false"
              >
                Tutup
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>

  <!-- ════════════════════════════════════════════
     MODAL TAMBAH ADDITIONAL ITEM
═════════════════════════════════════════════ -->
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
            class="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-neutral-900/95 backdrop-blur-xl"
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

                <button
                  class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-all"
                  @click="additionalModalOpen = false"
                >
                  <UIcon name="i-lucide-x" class="text-sm" />
                </button>
              </div>

              <!-- SEARCH -->
              <div class="relative mt-4">
                <UIcon
                  name="i-lucide-search"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />

                <input
                  v-model="additionalSearch"
                  type="text"
                  placeholder="Ketik nama atau kode item..."
                  autofocus
                  class="w-full h-11 rounded-xl bg-neutral-800/90 border border-black/10 dark:border-white/10 pl-10 pr-10 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
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
            <div class="overflow-y-auto" style="max-height: min(65vh, 620px)">
              <!-- EMPTY SEARCH -->
              <div
                v-if="!additionalSearch && !additionalPending"
                class="py-16 flex flex-col items-center justify-center text-center px-6"
              >
                <div
                  class="w-16 h-16 rounded-2xl bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4"
                >
                  <UIcon
                    name="i-lucide-search"
                    class="text-neutral-500 text-3xl"
                  />
                </div>

                <p class="text-sm font-medium text-neutral-300">
                  Ketik untuk mencari item
                </p>

                <p class="text-xs text-neutral-500 mt-1 max-w-sm">
                  Item yang sudah ada di paket tidak akan ditampilkan
                </p>
              </div>

              <!-- LOADING -->
              <div
                v-else-if="additionalPending && !additionalResults.length"
                class="py-16 flex flex-col items-center justify-center"
              >
                <UIcon
                  name="i-lucide-loader-circle"
                  class="animate-spin text-primary text-2xl"
                />

                <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                  Mencari item...
                </p>
              </div>

              <!-- RESULTS -->
              <template v-else-if="groupedAdditionalResults.length">
                <div class="space-y-4 p-4">
                  <div
                    v-for="[groupName, items] in groupedAdditionalResults"
                    :key="groupName"
                    class="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden"
                  >
                    <!-- GROUP HEADER -->
                    <div
                      class="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-black/10 dark:border-white/10 bg-neutral-900/95 backdrop-blur-xl"
                    >
                      <div
                        class="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center"
                      >
                        <UIcon name="i-lucide-folder" class="text-sm" />
                      </div>

                      <div class="flex-1 min-w-0">
                        <p
                          class="text-xs font-semibold uppercase tracking-wider text-white truncate"
                        >
                          {{ groupName }}
                        </p>
                      </div>

                      <span
                        class="px-2 py-1 rounded-lg border border-black/10 dark:border-white/10 bg-white/5 text-[10px] text-neutral-500 dark:text-neutral-400"
                      >
                        {{ items.length }} item
                      </span>
                    </div>

                    <!-- ITEMS -->
                    <div class="divide-y divide-white/5">
                      <button
                        v-for="item in items"
                        :key="item.id"
                        class="group w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-primary/[0.07] transition-all"
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
                            <p class="text-sm font-medium text-white truncate">
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

                            <span> {{ item.inputans.length }} inputan </span>
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
                v-else-if="additionalSearch && !additionalPending"
                class="py-16 flex flex-col items-center justify-center text-center px-6"
              >
                <div
                  class="w-16 h-16 rounded-2xl bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-4"
                >
                  <UIcon
                    name="i-lucide-search-x"
                    class="text-neutral-500 text-3xl"
                  />
                </div>

                <p class="text-sm font-medium text-neutral-300">
                  Tidak ditemukan
                </p>

                <p class="text-xs text-neutral-500 mt-1">
                  Coba kata kunci lain atau periksa master item
                </p>
              </div>
            </div>

            <!-- FOOTER -->
            <div
              class="px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between"
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

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-pop-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-pop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.modal-pop-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(6px);
}
.modal-pop-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(3px);
}
</style>
