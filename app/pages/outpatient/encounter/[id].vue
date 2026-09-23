<script setup lang="ts">
import type {
  ApiError,
  AuditLog,
  EncounterDetail,
  Icd10,
  Medicine,
  MedicineStockItem,
  MstItemOption,
  OutpatientExamOrder,
  Prescription,
  PrescriptionOption,
  PrescriptionOptionType,
  PricePreview
} from '~/types/outpatient'
import {
  ENCOUNTER_STATUS_COLOR,
  ENCOUNTER_STATUS_LABEL,
  ITEM_STATUS_COLOR,
  ITEM_STATUS_LABEL,
  PRESCRIPTION_STATUS_LABEL,
  TIMING_OPTIONS,
  formatDateTime,
  formatRupiah
} from '~/constants/outpatient'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { permissions } = await useCurrentUser()

const encounterId = String(route.params.id)
const canSeePrice = computed(() => (permissions.value ?? []).includes('medicine:price:read') || (permissions.value ?? []).includes('*:*'))
const canEditPatient = computed(() => (permissions.value ?? []).some(p => p === 'patient:update' || p === '*:*'))
const medicalNotesOpen = ref(false)

const activeTab = ref('vitals')

const { data: detail, refresh, pending } = await useAsyncData(
  `outpatient-encounter-${encounterId}`,
  async () => {
    const res = await api.get(`/outpatient/encounters/${encounterId}`)
    return res.data.data as EncounterDetail
  }
)

const encounter = computed(() => detail.value)
const locked = computed(() => ['DONE', 'CANCELLED'].includes(encounter.value?.status ?? ''))
const lockTabContent = computed(() => locked.value && !['audit', 'soap'].includes(activeTab.value))

/* ── Vitals ── */
type VitalsForm = {
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  respiratoryRate: number | null
  temperature: number | null
  spo2: number | null
  weightKg: number | null
  heightCm: number | null
  bloodSugar: number | null
  painScale: number | null
  notes: string
}
const vitalsForm = reactive<VitalsForm>({
  systolic: null,
  diastolic: null,
  pulse: null,
  respiratoryRate: null,
  temperature: null,
  spo2: null,
  weightKg: null,
  heightCm: null,
  bloodSugar: null,
  painScale: null,
  notes: ''
})
watch(detail, (d) => {
  if (d?.vitals) Object.assign(vitalsForm, d.vitals)
}, { immediate: true })

const bmiPreview = computed(() => {
  const w = Number(vitalsForm.weightKg)
  const h = Number(vitalsForm.heightCm) / 100
  if (!w || !h) return null
  return Math.round((w / (h * h)) * 100) / 100
})

async function saveVitals() {
  try {
    await api.put(`/outpatient/encounters/${encounterId}/vitals`, vitalsForm)
    toast.add({ title: 'Berhasil', description: 'Vital sign tersimpan', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}

/* ── SOAP ── */
type SoapForm = {
  subjective: string
  objective: string
  assessment: string
  plan: string
  followUpDate: string
  referralTo: string
  referralNote: string
}
const soapForm = reactive<SoapForm>({
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  followUpDate: '',
  referralTo: '',
  referralNote: ''
})
watch(detail, (d) => {
  if (d?.soap) Object.assign(soapForm, d.soap)
}, { immediate: true })

async function saveSoap(submit = false) {
  try {
    await api.put(`/outpatient/encounters/${encounterId}/soap`, { ...soapForm, submit })
    toast.add({ title: 'Berhasil', description: submit ? 'SOAP difinalkan' : 'SOAP tersimpan', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}

/* ── Diagnosis ICD10 ── */
const icdPickerOpen = ref(false)

async function addDiagnoses(list: Icd10[]) {
  const existing = new Set((encounter.value?.diagnoses ?? []).map(d => d.icd10Code))
  const fresh = list.filter(icd => !existing.has(icd.code))
  if (!fresh.length) {
    toast.add({ title: 'ICD10 sudah ada', description: 'Semua pilihan sudah terdaftar di encounter ini', color: 'warning' })
    return
  }
  try {
    for (const icd of fresh) {
      await api.post(`/outpatient/encounters/${encounterId}/diagnoses`, {
        icd10Code: icd.code,
        icd10Description: icd.descriptionEng || icd.descriptionInd
      })
    }
    toast.add({ title: 'Berhasil', description: `${fresh.length} diagnosis ditambahkan`, color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
    await refresh()
  }
}

async function removeDiagnosis(id: string) {
  try {
    await api.delete(`/outpatient/encounters/${encounterId}/diagnoses/${id}`)
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}

/* ── Resep ── */
const medicines = ref<Medicine[]>([])
const medicineOptions = computed(() =>
  medicines.value.map(m => ({
    value: m.id,
    label: `${m.name}${m.strength ? ` ${m.strength}` : ''}`
  }))
)

async function loadMedicines() {
  try {
    const res = await api.get('/outpatient/medicines', { params: { activeOnly: 'true' } })
    medicines.value = res.data.data
  } catch {
    medicines.value = []
  }
}

type DraftUnit = { uom: string, conversionFactor: number, isBase?: boolean, isDispense?: boolean }

type DraftItem = {
  kind: 'UNIT' | 'COMPOUND'
  medicineId: string
  medicineName: string
  uom: string
  quantity: number
  stockBase: number
  baseUnit: string
  units: DraftUnit[]
  stokAkhir: number | null
  dose: string
  frequency: string
  route: string
  method: string
  timing: string
  asNeededFor: string
  durationDays: number | null
  instructions: string
  compoundName: string
  components: Array<{ medicineId: string, name: string, quantity: number, uom: string }>
}
const newItem = ref<DraftItem>(emptyItem())

function emptyItem(): DraftItem {
  return {
    kind: 'UNIT',
    medicineId: '',
    medicineName: '',
    uom: '',
    quantity: 1,
    stockBase: 0,
    baseUnit: '',
    units: [],
    stokAkhir: null,
    dose: '',
    frequency: '',
    route: '',
    method: '',
    timing: 'AFTER_MEAL',
    asNeededFor: '',
    durationDays: 3,
    instructions: '',
    compoundName: '',
    components: []
  }
}

function medicineById(id: string) {
  return medicines.value.find(m => m.id === id)
}

function uomOptions(medicineId: string) {
  const med = medicineById(medicineId)
  if (!med) return []
  return (med.units?.length ? med.units : [{ uom: med.baseUnit }]).map(u => ({ value: u.uom, label: u.uom }))
}

function itemFactor(item: { baseUnit?: string, units?: DraftUnit[] }, uom: string) {
  if (!uom || uom === (item.baseUnit ?? '')) return 1
  const unit = (item.units ?? []).find(u => u.uom === uom)
  return Number(unit?.conversionFactor) || 1
}

function stockInUom(item: { baseUnit?: string, units?: DraftUnit[], stockBase?: number }, uom: string) {
  const factor = itemFactor(item, uom)
  return factor ? Number(item.stockBase ?? 0) / factor : Number(item.stockBase ?? 0)
}

const newStockInUom = computed(() => stockInUom(newItem.value, newItem.value.uom))

const newStockAfter = computed(() => {
  const qty = Number(newItem.value.quantity)
  const used = Number.isFinite(qty) ? qty : 0
  const after = newStockInUom.value - used
  return after > 0 ? Math.round(after * 100) / 100 : 0
})

const newUomOptions = computed(() => {
  const units = newItem.value.units?.length ? newItem.value.units : [{ uom: newItem.value.baseUnit } as DraftUnit]
  return units.filter(u => u.uom).map(u => ({ value: u.uom, label: u.uom }))
})

function defaultUnit(item: MedicineStockItem) {
  const dispense = item.units?.find(u => u.isDispense)
  const base = item.units?.find(u => u.isBase)
  return dispense?.uom || base?.uom || item.baseUnit
}

const medicinePickerOpen = ref(false)

function pickMedicine(item: MedicineStockItem) {
  const uom = defaultUnit(item)
  newItem.value.kind = 'UNIT'
  newItem.value.medicineId = item.id
  newItem.value.medicineName = item.name
  newItem.value.baseUnit = item.baseUnit
  newItem.value.units = item.units ?? []
  newItem.value.stockBase = item.stock
  newItem.value.uom = uom
  newItem.value.quantity = 1
  newItem.value.stokAkhir = null
}

const prescriptionOptions = ref<PrescriptionOption[]>([])
const doseOptions = computed(() => prescriptionOptions.value.filter(o => o.type === 'DOSE').map(o => ({ value: o.value, label: o.labelInd || o.labelEng })))
const frequencyOptions = computed(() => prescriptionOptions.value.filter(o => o.type === 'FREQUENCY').map(o => ({ value: o.value, label: o.labelInd || o.labelEng })))
const routeOptions = computed(() => prescriptionOptions.value.filter(o => o.type === 'ROUTE').map(o => ({ value: o.value, label: o.labelInd || o.labelEng })))
const methodOptions = computed(() => prescriptionOptions.value.filter(o => o.type === 'METHOD').map(o => ({ value: o.value, label: o.labelInd || o.labelEng })))
const asNeededOptions = computed(() => prescriptionOptions.value.filter(o => o.type === 'AS_NEEDED_REASON').map(o => ({ value: o.value, label: o.labelInd || o.labelEng })))
const timingOptions = computed(() => {
  const list = prescriptionOptions.value.filter(o => o.type === 'TIMING').map(o => ({ value: o.value, label: o.labelInd || o.labelEng }))
  return list.length ? list : TIMING_OPTIONS
})

async function loadPrescriptionOptions() {
  try {
    const res = await api.get('/outpatient/prescription-options', { params: { activeOnly: 'true', limit: 500 } })
    prescriptionOptions.value = res.data.data ?? []
  } catch {
    prescriptionOptions.value = []
  }
}

function optionLabel(type: PrescriptionOptionType, value: string) {
  if (!value) return ''
  const opt = prescriptionOptions.value.find(o => o.type === type && o.value === value)
  return opt ? (opt.labelInd || opt.labelEng) : value
}

const examOrderOpen = ref(false)
const examOrder = ref<OutpatientExamOrder>({ exam: null, items: [] })
const examOrderLoading = ref(false)
const pendingExamItems = ref<MstItemOption[]>([])
const examOrderSending = ref(false)

async function loadEncounterExams() {
  examOrderLoading.value = true
  try {
    const res = await api.get(`/outpatient/encounters/${encounterId}/exams`)
    examOrder.value = res.data.data ?? { exam: null, items: [] }
  } catch {
    examOrder.value = { exam: null, items: [] }
  } finally {
    examOrderLoading.value = false
  }
}

function addExamItems(list: MstItemOption[]) {
  const existing = new Set(pendingExamItems.value.map(i => i.id))
  for (const item of list) {
    if (!existing.has(item.id)) {
      pendingExamItems.value.push(item)
      existing.add(item.id)
    }
  }
}

function removePendingExamItem(itemId: string) {
  pendingExamItems.value = pendingExamItems.value.filter(i => i.id !== itemId)
}

async function sendExamOrder() {
  if (!pendingExamItems.value.length) return
  examOrderSending.value = true
  try {
    await api.post(`/outpatient/encounters/${encounterId}/exams`, {
      itemIds: pendingExamItems.value.map(i => i.id)
    })
    toast.add({ title: 'Berhasil', description: 'Order pemeriksaan dikirim', color: 'success' })
    pendingExamItems.value = []
    await loadEncounterExams()
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    examOrderSending.value = false
  }
}

function addComponent() {
  newItem.value.components.push({ medicineId: '', name: '', quantity: 1, uom: '' })
}

function componentName(component: { medicineId: string, name: string }) {
  const med = medicineById(component.medicineId)
  return med?.name || component.name || 'Bahan'
}

const draftItems = ref<DraftItem[]>([])

function pushItem() {
  if (newItem.value.kind === 'UNIT') {
    if (!newItem.value.medicineId) {
      toast.add({ title: 'Pilih obat dulu', color: 'warning' })
      return
    }
    const qty = Number(newItem.value.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.add({ title: 'Isi jumlah diambil', color: 'warning' })
      return
    }
    if (qty > newStockInUom.value) {
      toast.add({ title: `Jumlah diambil melebihi stok tersedia (${newStockInUom.value})`, color: 'warning' })
      return
    }
  }
  if (newItem.value.kind === 'COMPOUND' && !newItem.value.compoundName) {
    toast.add({ title: 'Isi nama racikan dulu', color: 'warning' })
    return
  }
  const draft = JSON.parse(JSON.stringify(newItem.value)) as DraftItem
  draft.dose = optionLabel('DOSE', draft.dose)
  draft.frequency = optionLabel('FREQUENCY', draft.frequency)
  draft.route = optionLabel('ROUTE', draft.route)
  draft.method = optionLabel('METHOD', draft.method)
  draft.timing = optionLabel('TIMING', draft.timing)
  draft.asNeededFor = optionLabel('AS_NEEDED_REASON', draft.asNeededFor)
  draftItems.value.push(draft)
  newItem.value = emptyItem()
}

function removeDraftItem(index: number) {
  draftItems.value.splice(index, 1)
}

function buildPayloadItems() {
  return draftItems.value.map((it, idx) => {
    if (it.kind === 'COMPOUND') {
      return {
        kind: 'COMPOUND' as const,
        compoundName: it.compoundName,
        compoundComponents: it.components.map(c => ({
          medicineId: c.medicineId || null,
          name: componentName(c),
          quantity: Number(c.quantity) || 0,
          uom: c.uom || null
        })),
        dose: it.dose || null,
        frequency: it.frequency || null,
        route: it.route || null,
        method: it.method || null,
        timing: it.timing || null,
        asNeededFor: it.asNeededFor || null,
        durationDays: it.durationDays || null,
        uom: it.uom || null,
        quantity: Number(it.quantity) || 0,
        instructions: it.instructions || null,
        sortOrder: idx
      }
    }
    const med = medicineById(it.medicineId)
    return {
      kind: 'UNIT' as const,
      medicineId: it.medicineId,
      medicineName: it.medicineName || med?.name || 'Obat',
      dose: it.dose || null,
      frequency: it.frequency || null,
      route: it.route || null,
      timing: it.timing || null,
      durationDays: it.durationDays || null,
      uom: it.uom || it.baseUnit || med?.baseUnit || null,
      quantity: Number(it.quantity) || 0,
      instructions: it.instructions || null,
      sortOrder: idx
    }
  })
}

const pricePreview = ref<PricePreview | null>(null)
const savingPrescription = ref(false)

async function previewPrice() {
  if (!draftItems.value.length) return
  try {
    const res = await api.post(`/outpatient/encounters/${encounterId}/price-preview`, {
      items: buildPayloadItems()
    })
    pricePreview.value = res.data.data
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal hitung harga', color: 'error' })
  }
}

async function savePrescription() {
  if (!draftItems.value.length) {
    toast.add({ title: 'Belum ada item resep', color: 'warning' })
    return
  }
  savingPrescription.value = true
  try {
    await api.post(`/outpatient/encounters/${encounterId}/prescriptions`, { items: buildPayloadItems() })
    toast.add({ title: 'Berhasil', description: 'Resep disimpan sebagai draft', color: 'success' })
    draftItems.value = []
    pricePreview.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    savingPrescription.value = false
  }
}

async function sendPrescription(order: Prescription) {
  try {
    await api.post(`/outpatient/prescriptions/${order.id}/send`)
    toast.add({ title: 'Berhasil', description: 'Resep dikirim ke farmasi (stok dipotong)', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}

async function sendFirstDraft() {
  const draft = encounter.value?.prescriptions.find(o => o.status === 'DRAFT')
  if (!draft) {
    toast.add({ title: 'Tidak ada order draft', color: 'warning' })
    return
  }
  await sendPrescription(draft)
}

async function cancelPrescription(order: Prescription) {
  const reason = window.prompt('Alasan pembatalan resep?') ?? ''
  try {
    await api.post(`/outpatient/prescriptions/${order.id}/cancel`, { reason })
    toast.add({ title: 'Berhasil', description: 'Resep dibatalkan, stok dikembalikan', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  }
}

/* ── Encounter actions ── */
const acting = ref(false)
async function callPatient() {
  acting.value = true
  try {
    await api.patch(`/outpatient/encounters/${encounterId}/call`)
    await refresh()
  } finally {
    acting.value = false
  }
}
async function returnPatient() {
  acting.value = true
  try {
    await api.patch(`/outpatient/encounters/${encounterId}/return`)
    await refresh()
  } finally {
    acting.value = false
  }
}
async function completeEncounter() {
  acting.value = true
  try {
    await api.patch(`/outpatient/encounters/${encounterId}/complete`)
    toast.add({ title: 'Berhasil', description: 'Encounter selesai', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    acting.value = false
  }
}

async function reopenEncounter() {
  acting.value = true
  try {
    await api.patch(`/outpatient/encounters/${encounterId}/reopen`)
    toast.add({ title: 'Berhasil', description: 'Encounter dibuka kembali', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    acting.value = false
  }
}

/* ── Audit ── */
const auditLogs = ref<AuditLog[]>([])

async function loadAuditLogs() {
  try {
    const res = await api.get(`/audit/encounter/${encounterId}`)
    auditLogs.value = res.data.data ?? []
  } catch {
    auditLogs.value = []
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'r') return
  if (event.shiftKey) return
  event.preventDefault()
  refresh()
}

onMounted(() => {
  loadMedicines()
  loadPrescriptionOptions()
  loadAuditLogs()
  loadEncounterExams()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

/* ── Workspace UI ── */
const tabs = [
  { label: 'Vital Sign', value: 'vitals', icon: 'i-lucide-heart-pulse' },
  { label: 'SOAP', value: 'soap', icon: 'i-lucide-notebook-pen' },
  { label: 'Diagnosis', value: 'diagnosis', icon: 'i-lucide-stethoscope' },
  { label: 'Resep', value: 'prescription', icon: 'i-lucide-pill' },
  { label: 'Pemeriksaan', value: 'exam', icon: 'i-lucide-flask-conical' },
  { label: 'Audit', value: 'audit', icon: 'i-lucide-history' }
]

const patientAge = computed(() => {
  const dob = encounter.value?.patient?.dob
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
})

const genderLabel = computed(() => {
  const g = (encounter.value?.patient?.gender || '').toUpperCase()
  if (g === 'MALE' || g === 'L' || g.startsWith('LAKI')) return 'Laki-laki'
  if (g === 'FEMALE' || g === 'P' || g.startsWith('PEREMPUAN')) return 'Perempuan'
  return encounter.value?.patient?.gender || '-'
})

const bmiCategory = computed(() => {
  const v = bmiPreview.value
  if (v == null) return 'Belum dihitung'
  if (v < 18.5) return 'Berat badan kurang'
  if (v < 25) return 'Normal'
  if (v < 30) return 'Berat badan lebih'
  return 'Obesitas'
})

const vitalChips = computed(() => {
  const v = encounter.value?.vitals
  return [
    { label: 'TD', value: v?.systolic && v?.diastolic ? `${v.systolic}/${v.diastolic} mmHg` : '-' },
    { label: 'Nadi', value: v?.pulse ? `${v.pulse} x/mnt` : '-' },
    { label: 'Suhu', value: v?.temperature != null ? `${v.temperature} °C` : '-' },
    { label: 'SpO2', value: v?.spo2 != null ? `${v.spo2} %` : '-' },
    { label: 'BB', value: v?.weightKg != null ? `${v.weightKg} kg` : '-' },
    { label: 'TB', value: v?.heightCm != null ? `${v.heightCm} cm` : '-' },
    { label: 'GDS', value: v?.bloodSugar != null ? `${v.bloodSugar} mg/dL` : '-' },
    { label: 'BMI', value: v?.bmi != null ? String(v.bmi) : (bmiPreview.value != null ? String(bmiPreview.value) : '-') }
  ]
})

type SoapSectionKey = 'subjective' | 'objective' | 'assessment' | 'plan'
const soapSections: Array<{ key: SoapSectionKey, label: string, letter: string, hint: string }> = [
  { key: 'subjective', label: 'Subjective', letter: 'S', hint: 'Keluhan & riwayat' },
  { key: 'objective', label: 'Objective', letter: 'O', hint: 'Pemeriksaan fisik' },
  { key: 'assessment', label: 'Assessment', letter: 'A', hint: 'Diagnosis kerja' },
  { key: 'plan', label: 'Plan', letter: 'P', hint: 'Rencana terapi' }
]
const soapSection = ref<SoapSectionKey>('subjective')

const selectedAuditId = ref<number | null>(null)
const selectedAudit = computed(() => auditLogs.value.find(l => l.id === selectedAuditId.value) ?? null)

function auditChanges(log: AuditLog) {
  const payload = log.payloadAfter ?? log.payloadBefore
  if (!payload || typeof payload !== 'object') return []
  return Object.entries(payload).map(([field, value]) => ({
    field,
    from: (value as { from?: unknown } | null)?.from,
    to: (value as { to?: unknown } | null)?.to
  }))
}

function fmtAuditValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const vitalsSummary = computed(() => {
  const v = encounter.value?.vitals
  return [
    { label: 'TD Sistolik', value: v?.systolic != null ? `${v.systolic} mmHg` : '-' },
    { label: 'TD Diastolik', value: v?.diastolic != null ? `${v.diastolic} mmHg` : '-' },
    { label: 'Nadi', value: v?.pulse != null ? `${v.pulse} x/mnt` : '-' },
    { label: 'Pernapasan', value: v?.respiratoryRate != null ? `${v.respiratoryRate} x/mnt` : '-' },
    { label: 'Suhu', value: v?.temperature != null ? `${v.temperature} °C` : '-' },
    { label: 'SpO2', value: v?.spo2 != null ? `${v.spo2} %` : '-' },
    { label: 'Berat Badan', value: v?.weightKg != null ? `${v.weightKg} kg` : '-' },
    { label: 'Tinggi Badan', value: v?.heightCm != null ? `${v.heightCm} cm` : '-' },
    { label: 'Gula Darah', value: v?.bloodSugar != null ? `${v.bloodSugar} mg/dL` : '-' },
    { label: 'Skala Nyeri', value: v?.painScale != null ? `${v.painScale}/10` : '-' },
    { label: 'BMI', value: v?.bmi != null ? String(v.bmi) : (bmiPreview.value != null ? String(bmiPreview.value) : '-') },
    { label: 'Kategori BMI', value: bmiCategory.value }
  ]
})

const draftTotal = computed(() => draftItems.value.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0))
</script>

<template>
  <UDashboardPanel id="outpatient-encounter">
    <template #header>
      <UDashboardNavbar :title="encounter ? `Encounter ${encounter.queueCode}` : 'Encounter'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge
            v-if="encounter"
            :label="ENCOUNTER_STATUS_LABEL[encounter.status] || encounter.status"
            :color="ENCOUNTER_STATUS_COLOR[encounter.status] as any"
            variant="subtle"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="encounter" class="space-y-3">
        <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
          <div class="flex flex-wrap items-start gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-sm bg-[#00355F]/10 dark:bg-white/10">
              <UIcon name="i-lucide-user-round" class="size-6 text-[#00355F] dark:text-[#BFD6FF]" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-heading text-lg font-bold text-[#00355F] dark:text-[#BFD6FF]">
                  {{ encounter.patient?.fullName || '-' }}
                </h2>
                <span class="text-sm text-muted">
                  {{ patientAge != null ? `${patientAge} th` : '-' }} · {{ genderLabel }}
                </span>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>No. RM: <b class="text-[#42474F] dark:text-neutral-300">{{ encounter.patient?.patientCode || '-' }}</b></span>
                <span>No. Registrasi: <b class="text-[#42474F] dark:text-neutral-300">{{ encounter.registration?.id_reg || '-' }}</b></span>
                <span>Layanan: <b class="text-[#42474F] dark:text-neutral-300">{{ encounter.registration?.serviceType || '-' }}</b></span>
                <span>Pembayaran: <b class="text-[#42474F] dark:text-neutral-300">{{ encounter.registration?.paymentType || '-' }}</b></span>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="chip in vitalChips"
                  :key="chip.label"
                  class="inline-flex items-center gap-1 rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-2 py-1 text-xs"
                >
                  <span class="text-muted">{{ chip.label }}:</span>
                  <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ chip.value }}</b>
                </span>
              </div>
              <div
                class="mt-2 flex flex-wrap items-center gap-2 text-xs"
              >
                <span
                  class="inline-flex items-start gap-1.5 rounded-sm px-2 py-1"
                  :class="encounter.patient?.allergyNotes ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-[#F2F3FF] text-muted dark:bg-white/5'"
                >
                  <UIcon name="i-lucide-alert-triangle" class="mt-0.5 size-3.5 shrink-0" />
                  <span><b>Alergi:</b> {{ encounter.patient?.allergyNotes || '-' }}</span>
                </span>
                <span
                  class="inline-flex items-start gap-1.5 rounded-sm bg-[#F2F3FF] px-2 py-1 text-muted dark:bg-white/5"
                >
                  <UIcon name="i-lucide-clipboard-list" class="mt-0.5 size-3.5 shrink-0" />
                  <span><b>Penyakit:</b> {{ encounter.patient?.diseaseNotes || '-' }}</span>
                </span>
                <UButton
                  v-if="canEditPatient"
                  label="Catatan Medis"
                  icon="i-lucide-pencil"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="medicalNotesOpen = true"
                />
              </div>
            </div>

            <div class="flex flex-col items-end gap-2">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 text-xs font-semibold text-[#00355F] dark:text-[#BFD6FF]">{{ encounter.queueCode }}</span>
                <UBadge :label="`Prioritas: ${encounter.priority}`" color="neutral" variant="subtle" />
                <UBadge
                  :label="ENCOUNTER_STATUS_LABEL[encounter.status] || encounter.status"
                  :color="ENCOUNTER_STATUS_COLOR[encounter.status] as any"
                  variant="subtle"
                />
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <UButton
                  v-if="encounter.status === 'WAITING'"
                  label="Ambil Pasien"
                  icon="i-lucide-hand"
                  :loading="acting"
                  @click="callPatient"
                />
                <template v-if="encounter.status === 'IN_CONSULTATION'">
                  <UButton
                    label="Kembalikan"
                    icon="i-lucide-undo-2"
                    color="neutral"
                    variant="subtle"
                    :loading="acting"
                    @click="returnPatient"
                  />
                  <UButton
                    label="Selesai"
                    icon="i-lucide-check"
                    color="success"
                    :loading="acting"
                    @click="completeEncounter"
                  />
                </template>
                <UButton
                  v-if="encounter.status === 'DONE'"
                  label="Buka Kembali"
                  icon="i-lucide-undo-2"
                  color="warning"
                  variant="subtle"
                  :loading="acting"
                  @click="reopenEncounter"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="locked"
          class="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        >
          Encounter sudah {{ ENCOUNTER_STATUS_LABEL[encounter.status] || encounter.status }} — data tidak dapat diubah.
          <span v-if="encounter.status === 'DONE'">Klik "Buka Kembali" untuk mengedit.</span>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-default bg-default p-2 shadow-sm">
          <div class="flex flex-wrap items-center gap-1 rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-1">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition"
              :class="activeTab === tab.value ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white shadow-sm' : 'text-[#42474F] dark:text-neutral-300 hover:bg-white dark:hover:bg-white/10'"
              @click="activeTab = tab.value"
            >
              <UIcon :name="tab.icon" class="size-4" />
              {{ tab.label }}
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 font-semibold text-[#00355F] dark:text-[#BFD6FF]">
              {{ encounter.diagnoses.length }} Diagnosis
            </span>
            <span class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-2 py-1 font-semibold text-[#00355F] dark:text-[#BFD6FF]">
              {{ encounter.prescriptions.length }} Order Obat
            </span>
          </div>
        </div>

        <div
          class="grid grid-cols-1 gap-3 xl:grid-cols-[480px_minmax(0,1fr)]"
          :inert="lockTabContent"
          :class="{ 'opacity-60': lockTabContent }"
        >
          <template v-if="activeTab === 'vitals'">
            <div class="space-y-3">
              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                    Ringkasan Tanda Vital
                  </h3>
                  <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 text-xs font-semibold text-[#00355F] dark:text-[#BFD6FF]">{{ bmiCategory }}</span>
                </div>
                <div class="mt-3 divide-y divide-[#E2E7FF] dark:divide-white/10 rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-3">
                  <div v-for="row in vitalsSummary" :key="row.label" class="flex items-center justify-between py-2 text-sm">
                    <span class="text-muted">{{ row.label }}</span>
                    <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ row.value }}</b>
                  </div>
                </div>
              </div>
              <div class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-4 py-3 text-xs text-muted">
                BMI dihitung otomatis dari berat & tinggi badan. Simpan ulang setelah mengubah data.
              </div>
            </div>

            <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="h-8 w-1 rounded-full bg-[#00355F] dark:bg-[#8EBDF9]" />
                <div>
                  <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                    Form Tanda Vital
                  </h3>
                  <p class="text-xs text-muted">
                    Input & simpan pengukuran terbaru
                  </p>
                </div>
              </div>

              <div class="mt-4 space-y-4">
                <section class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-4">
                  <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                    1. TANDA-TANDA VITAL
                  </p>
                  <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <UFormField label="TD Sistolik">
                      <UInput v-model="vitalsForm.systolic" type="number" class="w-full" />
                    </UFormField>
                    <UFormField label="TD Diastolik">
                      <UInput v-model="vitalsForm.diastolic" type="number" class="w-full" />
                    </UFormField>
                    <UFormField label="Nadi">
                      <UInput v-model="vitalsForm.pulse" type="number" class="w-full" />
                    </UFormField>
                    <UFormField label="Pernapasan">
                      <UInput v-model="vitalsForm.respiratoryRate" type="number" class="w-full" />
                    </UFormField>
                    <UFormField label="Suhu (°C)">
                      <UInput
                        v-model="vitalsForm.temperature"
                        type="number"
                        step="0.1"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="SpO2 (%)">
                      <UInput v-model="vitalsForm.spo2" type="number" class="w-full" />
                    </UFormField>
                  </div>
                </section>

                <section class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-4">
                  <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                    2. ANTROPOMETRI & LABORATORIUM
                  </p>
                  <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <UFormField label="Berat (kg)">
                      <UInput
                        v-model="vitalsForm.weightKg"
                        type="number"
                        step="0.1"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Tinggi (cm)">
                      <UInput
                        v-model="vitalsForm.heightCm"
                        type="number"
                        step="0.1"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Gula Darah">
                      <UInput v-model="vitalsForm.bloodSugar" type="number" class="w-full" />
                    </UFormField>
                    <UFormField label="Skala Nyeri">
                      <UInput v-model="vitalsForm.painScale" type="number" class="w-full" />
                    </UFormField>
                    <UFormField label="BMI (otomatis)">
                      <UInput :model-value="bmiPreview != null ? String(bmiPreview) : ''" disabled class="w-full" />
                    </UFormField>
                  </div>
                </section>

                <section class="rounded-sm border border-[#E2E7FF] dark:border-white/10 p-4">
                  <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                    3. CATATAN
                  </p>
                  <UTextarea v-model="vitalsForm.notes" :rows="3" class="mt-3 w-full" />
                </section>

                <div class="flex justify-end">
                  <UButton label="Simpan Vital Sign" icon="i-lucide-save" @click="saveVitals" />
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'soap'">
            <div v-if="locked" class="rounded-sm border border-default bg-default p-4 shadow-sm xl:col-span-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                  Catatan SOAP
                </h3>
                <span class="text-xs text-muted">
                  Status: <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ encounter.soap?.status || 'DRAFT' }}</b>
                  <template v-if="encounter.soap?.submittedAt"> · Final {{ formatDateTime(encounter.soap.submittedAt) }}</template>
                </span>
              </div>
              <div class="mt-3 space-y-3">
                <div
                  v-for="section in soapSections"
                  :key="section.key"
                  class="rounded-sm border border-[#E2E7FF] dark:border-white/10 p-3"
                >
                  <div class="flex items-center gap-2">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-sm bg-[#E2E7FF] dark:bg-white/10 text-xs font-bold text-[#00355F] dark:text-[#BFD6FF]">
                      {{ section.letter }}
                    </span>
                    <span class="text-sm font-semibold text-[#00355F] dark:text-[#BFD6FF]">{{ section.label }}</span>
                    <span class="text-xs text-muted">{{ section.hint }}</span>
                  </div>
                  <p class="mt-2 whitespace-pre-line text-sm text-[#42474F] dark:text-neutral-300">
                    {{ soapForm[section.key] || '-' }}
                  </p>
                </div>
              </div>
              <div class="mt-3 space-y-1.5 rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-3 text-sm">
                <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                  TINDAK LANJUT
                </p>
                <div>Kontrol Berikutnya: <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ soapForm.followUpDate || '-' }}</b></div>
                <div>Rujuk Ke: <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ soapForm.referralTo || '-' }}</b></div>
                <div>Catatan Rujukan: <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ soapForm.referralNote || '-' }}</b></div>
              </div>
            </div>

            <template v-else>
              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                  Catatan SOAP
                </h3>
                <div class="mt-3 space-y-2">
                  <button
                    v-for="section in soapSections"
                    :key="section.key"
                    type="button"
                    class="flex w-full items-start gap-3 rounded-sm border p-3 text-left transition"
                    :class="soapSection === section.key ? 'border-[#0F4C81] dark:border-[#8EBDF9] bg-[#F2F3FF] dark:bg-white/5' : 'border-[#E2E7FF] dark:border-white/10 hover:bg-[#F2F3FF]/60 dark:hover:bg-white/5'"
                    @click="soapSection = section.key"
                  >
                    <span
                      class="flex size-8 shrink-0 items-center justify-center rounded-sm text-sm font-bold"
                      :class="soapSection === section.key ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white' : 'bg-[#E2E7FF] dark:bg-white/10 text-[#00355F] dark:text-[#BFD6FF]'"
                    >
                      {{ section.letter }}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-semibold text-[#00355F] dark:text-[#BFD6FF]">{{ section.label }}</span>
                      <span class="block text-xs text-muted">{{ section.hint }}</span>
                      <span class="mt-1 line-clamp-2 block text-xs text-[#42474F] dark:text-neutral-300">
                        {{ soapForm[section.key] || 'Belum diisi' }}
                      </span>
                    </span>
                  </button>
                </div>

                <div class="mt-4 space-y-2 rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-3">
                  <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                    TINDAK LANJUT
                  </p>
                  <UFormField label="Kontrol Berikutnya">
                    <UInput v-model="soapForm.followUpDate" type="date" class="w-full" />
                  </UFormField>
                  <UFormField label="Rujuk Ke">
                    <UInput v-model="soapForm.referralTo" placeholder="RS / Spesialis" class="w-full" />
                  </UFormField>
                  <UFormField label="Catatan Rujukan">
                    <UInput v-model="soapForm.referralNote" class="w-full" />
                  </UFormField>
                </div>
              </div>

              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-1 rounded-full bg-[#00355F] dark:bg-[#8EBDF9]" />
                  <div>
                    <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                      {{ soapSections.find(s => s.key === soapSection)?.letter }} — {{ soapSections.find(s => s.key === soapSection)?.label }}
                    </h3>
                    <p class="text-xs text-muted">
                      {{ soapSections.find(s => s.key === soapSection)?.hint }}
                    </p>
                  </div>
                </div>

                <UTextarea v-model="soapForm[soapSection]" :rows="14" class="mt-4 w-full" />

                <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs text-muted">
                    Status: <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ encounter.soap?.status || 'DRAFT' }}</b> ·
                    {{ encounter.soap?.submittedAt ? `Final ${formatDateTime(encounter.soap.submittedAt)}` : 'Belum difinalkan' }}
                  </span>
                  <div class="flex gap-2">
                    <UButton
                      label="Simpan Draft"
                      icon="i-lucide-save"
                      color="neutral"
                      variant="outline"
                      @click="saveSoap(false)"
                    />
                    <UButton label="Finalkan SOAP" icon="i-lucide-check" @click="saveSoap(true)" />
                  </div>
                </div>
              </div>
            </template>
          </template>

          <template v-else-if="activeTab === 'diagnosis'">
            <div class="space-y-3">
              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                  Tambah Diagnosis
                </h3>
                <div class="mt-3 space-y-3">
                  <UButton
                    label="Cari Diagnosis ICD10"
                    icon="i-lucide-search"
                    block
                    @click="icdPickerOpen = true"
                  />
                </div>
              </div>

              <div class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-4 py-3 text-xs text-muted">
                Pencarian ICD10 dibuka lewat modal dan dimuat dari server (pagination).
              </div>
            </div>

            <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-1 rounded-full bg-[#00355F] dark:bg-[#8EBDF9]" />
                  <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                    Diagnosis Encounter
                  </h3>
                </div>
                <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 text-xs font-semibold text-[#00355F] dark:text-[#BFD6FF]">
                  {{ encounter.diagnoses.length }} item
                </span>
              </div>

              <div class="mt-4 overflow-x-auto rounded-sm border border-default">
                <table class="w-full text-sm">
                  <thead class="bg-[#E2E7FF] dark:bg-white/10 text-left text-[#00355F] dark:text-[#BFD6FF]">
                    <tr>
                      <th class="px-3 py-2 font-semibold">
                        Kode
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Diagnosis
                      </th>
                      <th class="px-3 py-2 text-right font-semibold">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="d in encounter.diagnoses" :key="d.id" class="border-t border-[#E2E7FF] dark:border-white/10">
                      <td class="px-3 py-2 font-medium text-[#00355F] dark:text-[#BFD6FF]">
                        {{ d.icd10Code }}
                      </td>
                      <td class="px-3 py-2">
                        {{ d.icd10Description }}
                      </td>
                      <td class="px-3 py-2 text-right">
                        <UButton
                          label="Hapus"
                          size="xs"
                          color="error"
                          variant="subtle"
                          @click="removeDiagnosis(d.id)"
                        />
                      </td>
                    </tr>
                    <tr v-if="!encounter.diagnoses.length">
                      <td colspan="3" class="px-3 py-6 text-center text-muted">
                        Belum ada diagnosis.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'prescription'">
            <div class="space-y-3">
              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                    Resep Aktif
                  </h3>
                  <div class="flex items-center gap-2">
                    <UButton
                      label="Refresh"
                      icon="i-lucide-refresh-cw"
                      size="xs"
                      color="neutral"
                      variant="subtle"
                      title="Ctrl+R refresh data · Shift+Ctrl+R reload halaman"
                      :loading="pending"
                      @click="refresh()"
                    />
                    <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 text-xs font-semibold text-[#00355F] dark:text-[#BFD6FF]">
                      {{ encounter.prescriptions.length }} order
                    </span>
                  </div>
                </div>
                <div class="mt-3 space-y-3">
                  <div
                    v-for="order in encounter.prescriptions"
                    :key="order.id"
                    class="rounded-sm border border-[#E2E7FF] dark:border-white/10"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E7FF] dark:border-white/10 bg-[#F2F3FF] dark:bg-white/5 px-3 py-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-[#00355F] dark:text-[#BFD6FF]">#{{ order.orderNo }}</span>
                        <UBadge
                          v-if="order.isAdditional"
                          label="Tambahan"
                          color="warning"
                          variant="subtle"
                        />
                        <UBadge :label="PRESCRIPTION_STATUS_LABEL[order.status] || order.status" color="neutral" variant="subtle" />
                      </div>
                      <div class="flex gap-1">
                        <UButton
                          v-if="order.status === 'DRAFT'"
                          label="Kirim"
                          icon="i-lucide-send"
                          size="xs"
                          @click="sendPrescription(order)"
                        />
                        <UButton
                          v-if="order.status !== 'DRAFT' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED'"
                          label="Batal"
                          icon="i-lucide-x"
                          size="xs"
                          color="error"
                          variant="subtle"
                          @click="cancelPrescription(order)"
                        />
                      </div>
                    </div>
                    <div class="divide-y divide-[#E2E7FF] dark:divide-white/10">
                      <div v-for="item in order.items" :key="item.id" class="px-3 py-2">
                        <div class="flex items-start justify-between gap-2">
                          <span class="text-sm font-medium text-[#00355F] dark:text-[#BFD6FF]">
                            {{ item.kind === 'COMPOUND' ? item.compoundName : item.medicineName }}
                          </span>
                          <UBadge :label="ITEM_STATUS_LABEL[item.status] || item.status" :color="ITEM_STATUS_COLOR[item.status] as any" variant="subtle" />
                        </div>
                        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{{ item.quantity }} {{ item.uom }}</span>
                          <span>{{ item.dose }} {{ item.frequency }}</span>
                          <span>{{ item.timing || '-' }}</span>
                          <span v-if="canSeePrice" class="text-[#00355F] dark:text-[#BFD6FF]">{{ formatRupiah(item.lineTotal) }}</span>
                        </div>
                      </div>
                      <div v-if="!order.items.length" class="px-3 py-3 text-center text-xs text-muted">
                        Belum ada item.
                      </div>
                    </div>
                  </div>
                  <div v-if="!encounter.prescriptions.length" class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-4 py-3 text-xs text-muted">
                    Belum ada order obat.
                  </div>
                </div>
              </div>

              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                    Item Draft
                  </h3>
                  <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 text-xs font-semibold text-[#00355F] dark:text-[#BFD6FF]">
                    {{ draftItems.length }} item · {{ draftTotal }} unit
                  </span>
                </div>
                <div v-if="draftItems.length" class="mt-3 space-y-2">
                  <div v-for="(it, i) in draftItems" :key="i" class="flex items-start justify-between gap-2 rounded-sm border border-[#E2E7FF] dark:border-white/10 px-3 py-2">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-[#00355F] dark:text-[#BFD6FF]">
                        {{ it.kind === 'COMPOUND' ? it.compoundName : medicineById(it.medicineId)?.name }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ it.quantity }} {{ it.uom || medicineById(it.medicineId)?.baseUnit }} · {{ it.dose }} {{ it.frequency }} · {{ it.timing || '-' }}
                      </p>
                    </div>
                    <UButton
                      size="xs"
                      color="error"
                      variant="subtle"
                      icon="i-lucide-trash-2"
                      @click="removeDraftItem(i)"
                    />
                  </div>
                </div>
                <div v-else class="mt-3 rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-4 py-3 text-xs text-muted">
                  Belum ada item pada draft resep.
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-1 rounded-full bg-[#00355F] dark:bg-[#8EBDF9]" />
                  <div>
                    <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                      Builder Resep
                    </h3>
                    <p class="text-xs text-muted">
                      Susun obat satuan atau racikan lalu tambahkan ke resep
                    </p>
                  </div>
                </div>

                <div class="mt-4 space-y-4">
                  <section class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-4">
                    <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                      1. JENIS & OBAT
                    </p>
                    <div class="mt-3 flex gap-2">
                      <UButton
                        :variant="newItem.kind === 'UNIT' ? 'solid' : 'outline'"
                        label="Obat Satuan"
                        @click="newItem.kind = 'UNIT'"
                      />
                      <UButton
                        :variant="newItem.kind === 'COMPOUND' ? 'solid' : 'outline'"
                        label="Racikan"
                        @click="newItem.kind = 'COMPOUND'"
                      />
                    </div>

                    <div v-if="newItem.kind === 'UNIT'" class="mt-3 space-y-3">
                      <div>
                        <UButton
                          :label="newItem.medicineId ? 'Ganti Obat' : 'Pilih Obat'"
                          icon="i-lucide-search"
                          color="neutral"
                          variant="outline"
                          @click="medicinePickerOpen = true"
                        />
                      </div>

                      <div
                        v-if="newItem.medicineId"
                        class="rounded-sm border border-[#E2E7FF] bg-default p-3 dark:border-white/10"
                      >
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div class="min-w-0">
                            <p class="font-heading text-base font-bold text-[#00355F] sm:text-lg dark:text-[#BFD6FF]">
                              {{ newItem.medicineName }}
                            </p>
                            <p class="text-xs text-muted">
                              Stok tersedia:
                              <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ newStockInUom }} {{ newItem.uom || newItem.baseUnit }}</b>
                              <span v-if="newItem.uom && newItem.uom !== newItem.baseUnit">
                                ({{ newItem.stockBase }} {{ newItem.baseUnit }})
                              </span>
                            </p>
                          </div>
                          <div class="text-right">
                            <p class="text-[11px] uppercase tracking-wide text-muted">
                              Stok akhir
                            </p>
                            <p class="font-heading text-lg font-bold text-[#00355F] dark:text-[#BFD6FF]">
                              {{ newStockAfter }} {{ newItem.uom || newItem.baseUnit }}
                            </p>
                          </div>
                        </div>

                        <div class="mt-3 grid grid-cols-2 gap-3">
                          <UFormField label="Satuan">
                            <USelect v-model="newItem.uom" :items="newUomOptions" class="w-full" />
                          </UFormField>
                          <UFormField label="Jumlah diambil">
                            <UInput
                              v-model="newItem.quantity"
                              type="number"
                              class="w-full"
                              :max="newStockInUom"
                              min="0"
                            />
                          </UFormField>
                        </div>
                        <p class="mt-2 text-xs text-muted">
                          Stok akhir dihitung otomatis: stok tersedia − jumlah diambil.
                        </p>
                      </div>

                      <div v-else class="rounded-sm bg-[#F2F3FF] px-4 py-3 text-xs text-muted dark:bg-white/5">
                        Belum ada obat dipilih. Klik "Pilih Obat".
                      </div>
                    </div>

                    <div v-else class="mt-3 space-y-2">
                      <UFormField label="Nama Racikan">
                        <UInput v-model="newItem.compoundName" placeholder="mis. Racikan Batuk" class="w-full" />
                      </UFormField>
                      <div v-for="(c, i) in newItem.components" :key="i" class="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <USelect
                          v-model="c.medicineId"
                          :items="medicineOptions"
                          placeholder="Bahan"
                          class="col-span-2"
                        />
                        <UInput v-model="c.quantity" type="number" placeholder="Qty" />
                        <USelect v-model="c.uom" :items="uomOptions(c.medicineId)" placeholder="Satuan" />
                      </div>
                      <UButton
                        label="Tambah Bahan"
                        icon="i-lucide-plus"
                        size="xs"
                        color="neutral"
                        variant="subtle"
                        @click="addComponent"
                      />
                    </div>
                  </section>

                  <section class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-4">
                    <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                      2. ATURAN PAKAI
                    </p>
                    <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                      <UFormField label="Dosis">
                        <USelect
                          v-model="newItem.dose"
                          :items="doseOptions"
                          placeholder="Pilih dosis"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField label="Frekuensi">
                        <USelect
                          v-model="newItem.frequency"
                          :items="frequencyOptions"
                          placeholder="Pilih frekuensi"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField label="Waktu Konsumsi">
                        <USelect v-model="newItem.timing" :items="timingOptions" class="w-full" />
                      </UFormField>
                      <UFormField label="Rute">
                        <USelect
                          v-model="newItem.route"
                          :items="routeOptions"
                          placeholder="Pilih rute"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField label="Metode">
                        <USelect
                          v-model="newItem.method"
                          :items="methodOptions"
                          placeholder="Pilih metode"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField v-if="newItem.timing === 'AS_NEEDED'" label="Alasan Perlu">
                        <USelect
                          v-model="newItem.asNeededFor"
                          :items="asNeededOptions"
                          placeholder="Pilih alasan"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField label="Durasi (hari)">
                        <UInput v-model="newItem.durationDays" type="number" class="w-full" />
                      </UFormField>
                    </div>
                  </section>

                  <section class="rounded-sm border border-[#E2E7FF] dark:border-white/10 p-4">
                    <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                      3. INSTRUKSI
                    </p>
                    <UFormField label="Catatan / Instruksi" class="mt-3">
                      <UInput v-model="newItem.instructions" class="w-full" />
                    </UFormField>
                  </section>

                  <div class="flex justify-end">
                    <UButton label="Tambahkan ke Resep" icon="i-lucide-plus" @click="pushItem" />
                  </div>
                </div>
              </div>

              <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                    Item Resep (Draft)
                  </h3>
                  <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 text-xs font-semibold text-[#00355F] dark:text-[#BFD6FF]">
                    {{ draftItems.length }} item
                  </span>
                </div>

                <div class="mt-3 overflow-x-auto rounded-sm border border-default">
                  <table class="w-full text-sm">
                    <thead class="bg-[#E2E7FF] dark:bg-white/10 text-left text-[#00355F] dark:text-[#BFD6FF]">
                      <tr>
                        <th class="px-3 py-2 font-semibold">
                          Obat
                        </th>
                        <th class="px-3 py-2 font-semibold">
                          Qty
                        </th>
                        <th class="px-3 py-2 font-semibold">
                          Aturan
                        </th>
                        <th class="px-3 py-2 text-right font-semibold">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(it, i) in draftItems" :key="i" class="border-t border-[#E2E7FF] dark:border-white/10">
                        <td class="px-3 py-2">
                          {{ it.kind === 'COMPOUND' ? it.compoundName : medicineById(it.medicineId)?.name }}
                          <span class="text-xs text-muted">{{ it.kind === 'COMPOUND' ? `(${it.components.length} bahan)` : '' }}</span>
                        </td>
                        <td class="px-3 py-2">
                          {{ it.quantity }} {{ it.uom || medicineById(it.medicineId)?.baseUnit }}
                        </td>
                        <td class="px-3 py-2">
                          {{ it.dose }} {{ it.frequency }} · {{ it.timing || '-' }}
                        </td>
                        <td class="px-3 py-2 text-right">
                          <UButton
                            label="Hapus"
                            size="xs"
                            color="error"
                            variant="subtle"
                            @click="removeDraftItem(i)"
                          />
                        </td>
                      </tr>
                      <tr v-if="!draftItems.length">
                        <td colspan="4" class="px-3 py-6 text-center text-muted">
                          Belum ada item draft.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div v-if="canSeePrice" class="flex flex-wrap items-center gap-3">
                    <UButton
                      label="Hitung Harga"
                      icon="i-lucide-calculator"
                      color="neutral"
                      variant="outline"
                      @click="previewPrice"
                    />
                    <div v-if="pricePreview" class="text-sm">
                      Tier: <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ pricePreview.tier?.label || '-' }} ({{ pricePreview.tier?.percent ?? 0 }}%)</b> ·
                      Total: <b class="text-[#00355F] dark:text-[#BFD6FF]">{{ formatRupiah(pricePreview.total) }}</b>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <UButton
                      label="Kirim ke Farmasi"
                      icon="i-lucide-send"
                      color="success"
                      :disabled="!encounter.prescriptions.some(o => o.status === 'DRAFT')"
                      @click="sendFirstDraft"
                    />
                    <UButton
                      label="Simpan sebagai Draft"
                      icon="i-lucide-save"
                      :loading="savingPrescription"
                      @click="savePrescription"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'exam'">
            <div class="rounded-sm border border-default bg-default p-4 shadow-sm xl:col-span-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-1 rounded-full bg-[#00355F] dark:bg-[#8EBDF9]" />
                  <div>
                    <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                      Pemeriksaan Penunjang
                    </h3>
                    <p class="text-xs text-muted">
                      Order Lab / Radiologi / Dental / Nurse — item master MCU, masuk queue departemen (label Outpatient).
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    label="Refresh"
                    icon="i-lucide-refresh-cw"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    :loading="examOrderLoading"
                    @click="loadEncounterExams()"
                  />
                  <UButton
                    label="Order Pemeriksaan"
                    icon="i-lucide-plus"
                    size="xs"
                    @click="examOrderOpen = true"
                  />
                </div>
              </div>

              <div v-if="pendingExamItems.length" class="mt-4 rounded-sm border border-[#E2E7FF] p-3 dark:border-white/10">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-[#00355F] dark:text-[#BFD6FF]">
                    Item akan diorder ({{ pendingExamItems.length }})
                  </p>
                  <UButton
                    label="Kirim Order"
                    icon="i-lucide-send"
                    size="xs"
                    :loading="examOrderSending"
                    @click="sendExamOrder"
                  />
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="it in pendingExamItems"
                    :key="it.id"
                    class="inline-flex items-center gap-1 rounded-sm bg-[#F2F3FF] px-2 py-1 text-xs dark:bg-white/5"
                  >
                    {{ it.name }}
                    <button
                      type="button"
                      class="text-muted hover:text-error"
                      @click="removePendingExamItem(it.id)"
                    >
                      <UIcon name="i-lucide-x" class="size-3.5" />
                    </button>
                  </span>
                </div>
              </div>

              <div class="mt-4 overflow-x-auto rounded-sm border border-default">
                <table class="w-full text-sm">
                  <thead class="bg-[#E2E7FF] text-left text-[#00355F] dark:bg-white/10 dark:text-[#BFD6FF]">
                    <tr>
                      <th class="px-3 py-2 font-semibold">
                        Item
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Departemen
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Room
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Antrian
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in examOrder.items"
                      :key="row.trxExamItemId"
                      class="border-t border-[#E2E7FF] dark:border-white/10"
                    >
                      <td class="px-3 py-2">
                        <div class="font-medium text-[#00355F] dark:text-[#BFD6FF]">
                          {{ row.name || '-' }}
                        </div>
                        <div class="text-xs text-muted">
                          {{ row.code }}
                        </div>
                      </td>
                      <td class="px-3 py-2">
                        {{ row.department || '-' }}
                      </td>
                      <td class="px-3 py-2">
                        {{ row.roomType || '-' }}
                      </td>
                      <td class="px-3 py-2">
                        {{ row.queueCode || '-' }}
                      </td>
                      <td class="px-3 py-2">
                        {{ row.status || 'PENDING' }}
                      </td>
                    </tr>
                    <tr v-if="!examOrder.items.length">
                      <td colspan="5" class="px-3 py-6 text-center text-muted">
                        Belum ada order pemeriksaan.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'audit'">
            <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
              <div class="flex items-center justify-between gap-2">
                <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                  Riwayat Audit
                </h3>
                <span class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-2 py-1 text-xs font-semibold text-[#00355F] dark:text-[#BFD6FF]">
                  {{ auditLogs.length }} entri
                </span>
              </div>
              <div class="mt-3 space-y-2">
                <button
                  v-for="log in auditLogs"
                  :key="log.id"
                  type="button"
                  class="flex w-full items-start gap-3 rounded-sm border p-3 text-left transition"
                  :class="selectedAuditId === log.id ? 'border-[#0F4C81] dark:border-[#8EBDF9] bg-[#F2F3FF] dark:bg-white/5' : 'border-[#E2E7FF] dark:border-white/10 hover:bg-[#F2F3FF]/60 dark:hover:bg-white/5'"
                  @click="selectedAuditId = log.id"
                >
                  <span class="mt-1 size-2 shrink-0 rounded-full bg-[#00553A] dark:bg-[#4ADE80]" />
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-1">
                      <span class="text-sm font-semibold text-[#00355F] dark:text-[#BFD6FF]">{{ log.action }}</span>
                      <span v-if="log.entity" class="rounded-sm bg-[#E2E7FF] dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#00355F] dark:text-[#BFD6FF]">{{ log.entity }}</span>
                    </span>
                    <span class="block text-xs text-muted">{{ formatDateTime(log.createdAt) }} · {{ log.actorName || log.actorId || '-' }}</span>
                    <span class="mt-1 line-clamp-2 block text-xs text-[#42474F] dark:text-neutral-300">
                      {{ log.notes || auditChanges(log).map(c => c.field).join(', ') || '-' }}
                    </span>
                  </span>
                </button>
                <div v-if="!auditLogs.length" class="rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-4 py-3 text-xs text-muted">
                  Belum ada audit.
                </div>
              </div>
            </div>

            <div class="rounded-sm border border-default bg-default p-4 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="h-8 w-1 rounded-full bg-[#00355F] dark:bg-[#8EBDF9]" />
                <h3 class="font-heading font-bold text-[#00355F] dark:text-[#BFD6FF]">
                  Detail Audit
                </h3>
              </div>

              <div v-if="selectedAudit" class="mt-4 space-y-3">
                <div class="grid grid-cols-2 gap-3 rounded-sm bg-[#F2F3FF] dark:bg-white/5 p-4 text-sm">
                  <div>
                    <p class="text-xs text-muted">
                      Waktu
                    </p>
                    <p class="font-medium text-[#00355F] dark:text-[#BFD6FF]">
                      {{ formatDateTime(selectedAudit.createdAt) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted">
                      Actor
                    </p>
                    <p class="font-medium text-[#00355F] dark:text-[#BFD6FF]">
                      {{ selectedAudit.actorName || selectedAudit.actorId || '-' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted">
                      Entity
                    </p>
                    <p class="font-medium text-[#00355F] dark:text-[#BFD6FF]">
                      {{ selectedAudit.entity || '-' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted">
                      Aksi
                    </p>
                    <p class="font-medium text-[#00355F] dark:text-[#BFD6FF]">
                      {{ selectedAudit.action }}
                    </p>
                  </div>
                </div>

                <div v-if="auditChanges(selectedAudit).length" class="rounded-sm border border-[#E2E7FF] dark:border-white/10 p-4">
                  <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                    PERUBAHAN
                  </p>
                  <div class="mt-2 divide-y divide-[#E2E7FF] dark:divide-white/10">
                    <div
                      v-for="c in auditChanges(selectedAudit)"
                      :key="c.field"
                      class="flex flex-wrap items-center gap-2 py-1 text-sm"
                    >
                      <span class="font-medium text-[#00355F] dark:text-[#BFD6FF]">{{ c.field }}</span>
                      <span class="text-muted">{{ fmtAuditValue(c.from) }}</span>
                      <UIcon name="i-lucide-arrow-right" class="size-3 text-muted" />
                      <span class="text-[#42474F] dark:text-neutral-300">{{ fmtAuditValue(c.to) }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="selectedAudit.notes" class="rounded-sm border border-[#E2E7FF] dark:border-white/10 p-4">
                  <p class="text-xs font-semibold tracking-wide text-[#0F4C81] dark:text-[#8EBDF9]">
                    CATATAN
                  </p>
                  <p class="mt-2 text-sm text-[#42474F] dark:text-neutral-300">
                    {{ selectedAudit.notes }}
                  </p>
                </div>
              </div>
              <div v-else class="mt-4 rounded-sm bg-[#F2F3FF] dark:bg-white/5 px-4 py-3 text-xs text-muted">
                Pilih salah satu entri audit untuk melihat detail.
              </div>

              <div class="mt-4 overflow-x-auto rounded-sm border border-default">
                <table class="w-full text-sm">
                  <thead class="bg-[#E2E7FF] dark:bg-white/10 text-left text-[#00355F] dark:text-[#BFD6FF]">
                    <tr>
                      <th class="px-3 py-2 font-semibold">
                        Waktu
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Aksi
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Entity
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Actor
                      </th>
                      <th class="px-3 py-2 font-semibold">
                        Catatan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="log in auditLogs" :key="log.id" class="border-t border-[#E2E7FF] dark:border-white/10">
                      <td class="px-3 py-2">
                        {{ formatDateTime(log.createdAt) }}
                      </td>
                      <td class="px-3 py-2 font-medium text-[#00355F] dark:text-[#BFD6FF]">
                        {{ log.action }}
                      </td>
                      <td class="px-3 py-2">
                        {{ log.entity || '-' }}
                      </td>
                      <td class="px-3 py-2">
                        {{ log.actorName || log.actorId || '-' }}
                      </td>
                      <td class="px-3 py-2">
                        {{ log.notes || auditChanges(log).map(c => c.field).join(', ') || '-' }}
                      </td>
                    </tr>
                    <tr v-if="!auditLogs.length">
                      <td colspan="5" class="px-3 py-6 text-center text-muted">
                        Belum ada audit.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-else-if="pending" class="py-10 text-center text-muted">
        Memuat encounter...
      </div>

      <OutpatientIcd10PickerModal
        v-model:open="icdPickerOpen"
        :exclude="encounter ? encounter.diagnoses.map(d => d.icd10Code) : []"
        @select="addDiagnoses"
      />

      <PatientMedicalNotesModal
        v-model:open="medicalNotesOpen"
        :patient-id="encounter?.patient?.id"
        :allergy-notes="encounter?.patient?.allergyNotes"
        :disease-notes="encounter?.patient?.diseaseNotes"
        @saved="refresh()"
      />

      <OutpatientMedicinePickerModal
        v-model:open="medicinePickerOpen"
        :encounter-id="encounterId"
        @select="pickMedicine"
      />

      <OutpatientExamOrderModal
        v-model:open="examOrderOpen"
        @select="addExamItems"
      />
    </template>
  </UDashboardPanel>
</template>
