<script setup lang="ts">
const route = useRoute()
const api = useApi()
const toast = useToast()
const router = useRouter()

type TempRegistration = {
  id: string
  idType: string
  idValue: string
  firstName: string
  middleName?: string
  lastName: string
  phone?: string
  dob?: string
  gender: 'male' | 'female'
  email?: string
  branchId: string
  companyId: string
  serviceType: string
  paymentType: string
  priorityRegist: string
  examDate: string
  scheduleDateExam: string
  notes: string
  patientExists?: boolean
  patientId: string | null
  status: string
  rejectedReason: string | null
  registrationId: number | null
  createdAt: string
  updatedAt?: string
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED'
}

const { data: reg, refresh } = await useAsyncData(
  `registration-temp-${route.params.id}`,
  () =>
    api
      .get(`/registration-temp/${route.params.id}`)
      .then(r => r.data.data as TempRegistration)
)

const fullName = computed(() =>
  [
    reg.value?.firstName,
    reg.value?.middleName,
    reg.value?.lastName
  ]
    .filter(v => v?.trim())
    .join(' ')
)

// ─────────────────────────────────────────────
// Approve / Reject Modal State
// ─────────────────────────────────────────────
const isStatusModalOpen = ref(false)
const selectedStatus = ref<string>('')

const formApprove = reactive({
  examDate: '',
  priorityRegist: '',
  patientExists: false as boolean | null,
  patientId: '' as string
})

const formReject = reactive({
  rejectReason: ''
})

const errors = reactive({
  examDate: '',
  priorityRegist: '',
  patientExists: '',
  confirmOverwrite: '',
  rejectReason: ''
})

const touched = reactive({
  examDate: false,
  priorityRegist: false,
  patientExists: false,
  confirmOverwrite: false,
  rejectReason: false
})

const isFormValid = computed(() => {
  if (selectedStatus.value === 'APPROVED') {
    const answered = formApprove.patientExists !== null
    if (!answered) return false
    if (formApprove.patientExists) {
      return !!formApprove.examDate
        && !!formApprove.priorityRegist
        && !!selectedPatient.value
        && confirmOverwrite.value
    }
    return !!formApprove.examDate && !!formApprove.priorityRegist
  }

  if (selectedStatus.value === 'REJECTED') {
    return !!formReject.rejectReason
  }

  return false
})

const validate = () => {
  errors.examDate = ''
  errors.priorityRegist = ''
  errors.patientExists = ''
  errors.confirmOverwrite = ''
  errors.rejectReason = ''

  if (selectedStatus.value === 'APPROVED') {
    if (!formApprove.examDate && touched.examDate) {
      errors.examDate = 'Exam Date wajib diisi'
    }
    if (!formApprove.priorityRegist && touched.priorityRegist) {
      errors.priorityRegist = 'Priority wajib dipilih'
    }
    if (formApprove.patientExists === null && touched.patientExists) {
      errors.patientExists = 'Jawab dulu apakah pasien pernah MCU di Kyoai'
    }
    if (formApprove.patientExists === true && !selectedPatient.value && touched.patientExists) {
      errors.patientExists = 'Pilih pasien existing terlebih dahulu'
    }
    if (formApprove.patientExists === true && !confirmOverwrite.value && touched.confirmOverwrite) {
      errors.confirmOverwrite = 'Centang konfirmasi sebelum melanjutkan'
    }
  }

  if (selectedStatus.value === 'REJECTED') {
    if (!formReject.rejectReason && touched.rejectReason) {
      errors.rejectReason = 'Alasan wajib diisi'
    }
  }
}

watch(
  () => [
    formApprove.examDate,
    formApprove.priorityRegist,
    formApprove.patientExists,
    confirmOverwrite.value,
    selectedPatient.value,
    formReject.rejectReason,
    selectedStatus.value
  ],
  () => {
    validate()
  }
)

// Patient search for approval
type Patient = {
  id: string
  PatientId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  gender?: string
}

const patientSearchQuery = ref('')
const patientResults = ref<Patient[]>([])
const patientSearchLoading = ref(false)
const selectedPatient = ref<Patient | null>(null)
const confirmOverwrite = ref(false)

// [F-ringan] Auto-suggest kandidat duplikat saat FO memilih "Pasien Baru"
const duplicateSuggestions = ref<Patient[]>([])
const duplicateSuggestionsLoading = ref(false)
const duplicateSuggestionsChecked = ref(false)
const duplicateSearchTerm = ref('')

async function checkDuplicateSuggestions() {
  if (formApprove.patientExists !== false) return
  if (!reg.value?.firstName && !reg.value?.phone) return

  const terms = [reg.value.firstName, reg.value.middleName, reg.value.lastName, reg.value.phone]
    .filter(Boolean)
  const searchTerm = terms.join(' ')
  duplicateSearchTerm.value = searchTerm
  duplicateSuggestionsChecked.value = false
  duplicateSuggestionsLoading.value = true
  try {
    const res = await api.get('/patient', { params: { search: searchTerm, limit: 5 } })
    duplicateSuggestions.value = (res.data.data ?? []).filter(
      (p: Patient) => p.id !== reg.value?.patientId
    )
  } catch {
    duplicateSuggestions.value = []
  } finally {
    duplicateSuggestionsLoading.value = false
    duplicateSuggestionsChecked.value = true
  }
}

let patientSearchTimer: ReturnType<typeof setTimeout> | null = null

watch(patientSearchQuery, (val) => {
  if (patientSearchTimer) clearTimeout(patientSearchTimer)
  if (!val || val.length < 2) {
    patientResults.value = []
    return
  }
  patientSearchTimer = setTimeout(async () => {
    patientSearchLoading.value = true
    try {
      const res = await api.get('/patient', { params: { search: val, limit: 10 } })
      patientResults.value = res.data.data ?? []
    } catch {
      patientResults.value = []
    } finally {
      patientSearchLoading.value = false
    }
  }, 350)
})

function selectPatient(patient: Patient) {
  selectedPatient.value = patient
  formApprove.patientId = patient.id
  formApprove.patientExists = true
  patientSearchQuery.value = ''
  patientResults.value = []
  duplicateSuggestions.value = []
}

function clearPatient() {
  selectedPatient.value = null
  formApprove.patientId = ''
  confirmOverwrite.value = false
  duplicateSuggestions.value = []
}

watch(() => formApprove.patientExists, (val) => {
  confirmOverwrite.value = false
  duplicateSuggestions.value = []
  duplicateSuggestionsChecked.value = false
  if (val === false) {
    checkDuplicateSuggestions()
  }
})

const updateStatus = async (id: string, status: string, payload?: any) => {
  if (status === 'APPROVED') {
    return api.post(`/registration-temp/${id}/approve`, payload)
  }

  if (status === 'REJECTED') {
    return api.post(`/registration-temp/${id}/reject`, payload)
  }
}

const examDateRef = ref<any>(null)
const rejectReasonRef = ref<any>(null)

function focusInput(refEl: any) {
  if (!refEl) return
  const el = refEl.$el as HTMLElement
  const input = el?.querySelector('input, textarea') as HTMLElement
  input?.focus()
}

async function openStatusModal(status: string) {
  selectedStatus.value = status
  isStatusModalOpen.value = true

  if (status === 'APPROVED') {
    formApprove.examDate = reg.value?.examDate || ''
    formApprove.priorityRegist = reg.value?.priorityRegist || ''
    // [A+] Preload jawaban dari hasil deteksi portal sebagai saran awal
    formApprove.patientExists = reg.value?.patientExists ?? null
    if (formApprove.patientExists === true && reg.value?.patientId) {
      const res = await api.get(`/patient/${reg.value.patientId}`)
      selectedPatient.value = res.data.data ?? null
      formApprove.patientId = selectedPatient.value?.id ?? ''
    }
  }
  if (status === 'REJECTED') {
    formReject.rejectReason = ''
  }

  touched.examDate = false
  touched.priorityRegist = false
  touched.patientExists = false
  touched.confirmOverwrite = false
  touched.rejectReason = false
  errors.examDate = ''
  errors.priorityRegist = ''
  errors.patientExists = ''
  errors.confirmOverwrite = ''
  errors.rejectReason = ''
  confirmOverwrite.value = false
  duplicateSuggestions.value = []
  duplicateSuggestionsChecked.value = false
}

async function confirmChangeStatus() {
  touched.examDate = true
  touched.priorityRegist = true
  touched.patientExists = true
  touched.confirmOverwrite = true
  touched.rejectReason = true
  validate()

  if (!isFormValid.value) {
    toast.add({
      title: 'Warning',
      description: 'Form belum lengkap',
      color: 'warning'
    })
    return
  }

  // Alur baru: APPROVED tidak membuat registrasi di sini.
  // Set status PROCESS, lalu redirect ke create → FO pilih paket MCU → registrasi dibuat saat simpan.
  if (selectedStatus.value === 'APPROVED') {
    const query = new URLSearchParams({ tempId: String(route.params.id) })
    if (formApprove.examDate) query.set('examDate', formApprove.examDate)
    if (formApprove.priorityRegist) query.set('priorityRegist', formApprove.priorityRegist)
    if (formApprove.patientId) query.set('patientId', formApprove.patientId)
    // [A+] Kirim keputusan FO: existing → pakai pasien lama, new → buat pasien baru
    query.set('patientType', formApprove.patientExists ? 'existing' : 'new')

    isStatusModalOpen.value = false
    try {
      await api.post(`/registration-temp/${String(route.params.id)}/process`)
    } catch {
      // best-effort — redirect tetap jalan
    }
    toast.add({
      title: 'Lanjutkan Registrasi',
      description: formApprove.patientExists
        ? 'Pasien lama terpilih. Pilih paket MCU lalu simpan untuk membuat registrasi.'
        : 'Pasien baru akan dibuat. Pilih paket MCU lalu simpan untuk membuat registrasi.',
      color: 'info'
    })
    router.push(`/front-office/registration-patient/create?${query.toString()}`)
    return
  }

  try {
    const oldStatus = reg.value?.status

    const payload: any = {
      reason: formReject.rejectReason
    }

    await updateStatus(String(route.params.id), selectedStatus.value, payload)

    // Update local state
    if (reg.value) {
      reg.value.status = selectedStatus.value
      reg.value.rejectedReason = selectedStatus.value === 'REJECTED' ? formReject.rejectReason : null
    }

    toast.add({
      title: 'Berhasil',
      description: `Status berubah dari ${oldStatus} → ${selectedStatus.value}`,
      color: 'success'
    })

    await refresh()
    isStatusModalOpen.value = false
  } catch (err) {
    toast.add({
      title: 'Gagal',
      description: 'Gagal mengubah status',
      color: 'error'
    })
    console.error(err)
  }
}

const statusLabel: Record<string, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
  PROCESS: 'Process'
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const SERVICE_LABEL: Record<string, string> = {
  Laboratorium: 'Laboratorium',
  DoctorConsultation: 'Konsultasi Dokter',
  MCU: 'MCU (Medical Checkup)',
  Vaccine: 'Vaksin',
  Antigen: 'Antigen',
  PCR: 'PCR',
  VitaminInjection: 'Vitamin Injection',
  Pharmacy: 'Farmasi',
  Dental: 'Gigi'
}

const STATUS_COLOR: Record<string, 'success' | 'info' | 'neutral' | 'warning' | 'error'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
  PROCESS: 'info'
}

const PRIORITY_COLOR: Record<string, 'success' | 'info' | 'neutral' | 'warning' | 'error'> = {
  Normal: 'neutral',
  VIP: 'warning',
  Emergency: 'error'
}

const BRANCH_NAME: Record<string, string> = {
  '01': 'Jakarta - Wisma Keiai (Main Clinic)',
  '02': 'Ejip - Cikarang',
  '03': 'Bali',
  '04': 'Clinique Suisse Jakarta',
  '05': 'Surya Cipta - Karawang',
  '06': 'KIIC - Karawang',
  '07': 'AXIA - Cikarang',
  '08': 'Delta Mas - Cikarang',
  '09': 'Jakarta - Summitmas',
  '10': 'Jakarta - Kyoai Medical Park'
}

function formatDateTime(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function fmtDate(d?: string) {
  if (!d) return '-'
  const date = parseLocalDate(d)
  if (!date) return d
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function parseLocalDate(d: string): Date | null {
  if (!d) return null
  const iso = new Date(d)
  if (!Number.isNaN(iso.getTime())) return iso
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim())
  if (m) {
    const [_, y, mo, day] = m
    const parsed = new Date(Number(y), Number(mo) - 1, Number(day))
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

// ─────────────────────────────────────────────
// Questionnaires — data asli dari BE
// ─────────────────────────────────────────────
type TempQuestionnaire = {
  questionnaire_id: string
  questionnaire_name: string
  status: 'Completed' | 'Pending'
  completionDate: string | null
  answers?: Array<{
    questionId: string
    questionText: string
    questionType?: string
    optionId?: string | null
    optionText?: string | null
    answerText?: string | null
  }>
}

const questionnaires = ref<TempQuestionnaire[]>([])
const questionnairesLoading = ref(false)

async function loadQuestionnaires() {
  questionnairesLoading.value = true
  try {
    const res = await api.get(`/registration-temp/${route.params.id}/questionnaires`)
    questionnaires.value = res.data?.data ?? []
  } catch {
    questionnaires.value = []
  } finally {
    questionnairesLoading.value = false
  }
}

// Modal
const modalOpen = ref(false)
const modalTitle = ref('')
const modalAnswers = ref<NonNullable<TempQuestionnaire['answers']>>([])
function openModal(q: TempQuestionnaire) {
  modalTitle.value = q.questionnaire_name
  modalAnswers.value = q.answers ?? []
  modalOpen.value = true
}

type TempAnswer = NonNullable<TempQuestionnaire['answers']>[number]

function formatAnswer(q: TempAnswer): string {
  if (q.answerText != null && q.answerText !== '') return q.answerText
  if (q.optionText) return q.optionText
  if (q.optionId) return q.optionId
  return '-'
}

// ─────────────────────────────────────────────
// Status history
// ─────────────────────────────────────────────
type StatusHistoryItem = {
  id: string
  action: string
  notes: string | null
  createdAt: string
  actorId?: number | null
  actorRole?: string | null
  actorName?: string | null
  payloadBefore?: Record<string, any> | null
  payloadAfter?: Record<string, any> | null
}

const statusHistory = ref<StatusHistoryItem[]>([])
const statusHistoryLoading = ref(false)

async function loadStatusHistory() {
  statusHistoryLoading.value = true
  try {
    const res = await api.get(`/registration-temp/${route.params.id}/status-history`)
    statusHistory.value = res.data?.data?.history ?? []
  } catch {
    statusHistory.value = []
  } finally {
    statusHistoryLoading.value = false
  }
}

const statusHistoryDisplay = computed(() =>
  [...statusHistory.value].reverse()
)

function statusHistoryLabel(item: StatusHistoryItem): string {
  if (item.action === 'CREATE') return 'Registrasi Dibuat'
  if (item.action === 'STATUS_CHANGE') {
    const before = item.payloadBefore?.status
    const after = item.payloadAfter?.status
    const from = before?.from ?? before?.to
    const to = after?.to ?? after?.from
    if (from && to && from !== to) return `${from} → ${to}`
    if (to) return `Status: ${to}`
    return 'Perubahan status'
  }
  return item.action
}

function statusHistoryDesc(item: StatusHistoryItem): string {
  if (item.notes) return item.notes
  if (item.action === 'CREATE') return 'Registrasi dibuat.'
  return 'Perubahan status registrasi.'
}

onMounted(() => {
  loadQuestionnaires()
  loadStatusHistory()
})

function printQuestionnaires() {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  const completed = questionnaires.value.filter(q => q.status === 'Completed')
  const html = `
    <html>
      <head>
        <title>Medical Questionnaires - ${fullName.value}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
          th { background: #f3f4f6; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
          .badge-success { background: #dcfce7; color: #166534; }
          .badge-neutral { background: #f3f4f6; color: #374151; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Medical Questionnaires List</h1>
        <div class="meta">
          Patient: ${fullName.value} · ${reg.value?.patientId || '-'} · Reg: ${reg.value?.registrationId || '-'} · ${new Date().toLocaleString('id-ID')}
        </div>
        <table>
          <thead>
            <tr><th>Questionnaire</th><th style="text-align:center">Completion Date</th><th style="text-align:center">Status</th></tr>
          </thead>
          <tbody>
            ${completed.map(q => `
              <tr>
                <td>${q.questionnaire_name}</td>
                <td style="text-align:center">${q.completionDate ? formatDateTime(q.completionDate) : 'Not completed'}</td>
                <td style="text-align:center"><span class="badge ${q.status === 'Completed' ? 'badge-success' : 'badge-neutral'}">${q.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

function printSingleQuestionnaire(q: TempQuestionnaire) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  const answers = q.answers ?? []
  const html = `
    <html>
      <head>
        <title>${q.questionnaire_name} - ${fullName.value}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
          .section { margin-top: 16px; padding: 8px; background: #f9fafb; border-radius: 4px; }
          .question { margin-bottom: 8px; }
          .q-text { font-weight: 600; margin-bottom: 2px; }
          .q-answer { color: #374151; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${q.questionnaire_name}</h1>
        <div class="meta">
          Patient: ${fullName.value} · ${reg.value?.patientId || '-'} · Completed: ${q.completionDate ? formatDateTime(q.completionDate) : '-'} · ${new Date().toLocaleString('id-ID')}
        </div>
        ${answers.map((a: TempAnswer) => `
          <div class="question">
            <div class="q-text">${a.questionText}</div>
            <div class="q-answer">${a.answerText != null && a.answerText !== '' ? a.answerText : (a.optionText || a.optionId || '-')}</div>
          </div>
        `).join('')}
      </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

function printModalAnswers() {
  const q = questionnaires.value.find(x => x.questionnaire_name === modalTitle.value)
  if (!q) return
  printSingleQuestionnaire(q)
}
</script>

<template>
  <UDashboardPanel :id="`registration-${route.params.id}`">
    <template #header>
      <UDashboardNavbar title="Detail Temporary Registrasi">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/front-office/registration-temp"
          />
        </template>
         <template #right>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-printer"
              color="neutral"
              variant="outline"
              label="Print Label"
            />
            <UButton
              v-if="reg?.status === 'PENDING'"
              label="Approve"
              color="success"
              variant="solid"
              icon="i-lucide-check"
              @click="openStatusModal('APPROVED')"
            />
            <UButton
              v-if="reg?.status === 'PENDING'"
              label="Reject"
              color="error"
              variant="solid"
              icon="i-lucide-x"
              @click="openStatusModal('REJECTED')"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="!reg" class="flex items-center justify-center h-full">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
      </div>

      <div v-else class="w-full max-w-7xl mx-auto py-6 px-4 space-y-6">
        <!-- ── Page title + actions ── -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-default">
              Temporary Registration Detail
            </h1>
            <div class="flex items-center gap-3 mt-2">
              <code class="text-base font-bold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg">
                {{ fullName }}
              </code>
              <UBadge
                :label="reg.status"
                :color="STATUS_COLOR[reg.status] ?? 'neutral'"
                variant="subtle"
                size="md"
              />
            </div>
          </div>
        </div>

        <!-- ── Grid layout ── -->
        <div class="grid grid-cols-12 gap-5">
          <!-- ════ Patient Info (8 cols) ════ -->
          <div class="col-span-12 lg:col-span-8 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-user-circle" class="text-primary" />
                Patient Information
              </h3>
              <span v-if="reg.patientId" class="text-xs text-muted">ID: {{ reg.patientId }}</span>
            </div>
            <div v-if="reg.firstName" class="px-5 py-4">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-5 border-b border-default pb-4 mb-4">
                <div>
                  <p class="text-xs text-muted mb-1">
                    Full Name
                  </p>
                  <p class="font-semibold text-base">
                    {{ fullName }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Gender
                  </p>
                  <p class="font-semibold">
                    {{ reg.gender === 'male' ? 'Male' : 'Female' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Tanggal Lahir
                  </p>
                  <p class="font-semibold">
                    {{ fmtDate(reg.dob) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Contact Status
                  </p>
                  <p class="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                    <UIcon name="i-lucide-check-circle-2" class="text-base" /> Verified
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted mb-1">
                    Nomor HP
                  </p>
                  <p class="font-medium">
                    {{ reg.phone ?? '-' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Email
                  </p>
                  <p class="font-medium truncate">
                    {{ reg.email ?? '-' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    ID Type
                  </p>
                  <p class="font-medium">
                    {{ reg.idType }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    ID Number
                  </p>
                  <p class="font-medium">
                    {{ reg.idValue }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="p-6 text-center text-sm text-muted">
              Data pasien tidak ditemukan
            </div>
          </div>

          <!-- ════ Registration Details (4 cols) ════ -->
          <div class="col-span-12 lg:col-span-4 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-list" class="text-primary" />
                Registration Details
              </h3>
            </div>
            <div class="divide-y divide-default">
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Exam Date</span>
                <span class="text-sm font-semibold">{{ reg.examDate }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Service Type</span>
                <span class="text-sm font-semibold text-primary">{{ SERVICE_LABEL[reg.serviceType] ?? reg.serviceType }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Service No.</span>
                <code class="text-xs bg-elevated border border-default rounded px-2 py-0.5 font-mono">{{ reg.registrationId ?? '-' }}</code>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Branch</span>
                <span class="text-sm font-semibold">{{ BRANCH_NAME[reg.branchId ?? '-'] }}</span>
              </div>
            </div>
          </div>

          <!-- ════ Payment & Priority (4 cols) ════ -->
          <div class="col-span-12 lg:col-span-4 flex flex-col gap-5">
            <div class="rounded-xl border border-default bg-background overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-default">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon name="i-lucide-credit-card" class="text-primary" />
                  Payment & Priority
                </h3>
              </div>
              <div class="p-4 space-y-3">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-elevated border border-default">
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UIcon
                      :name="reg.paymentType === 'Insurance' ? 'i-lucide-shield-check'
                        : reg.paymentType === 'BillToCompany' ? 'i-lucide-building-2'
                          : 'i-lucide-wallet'"
                      class="text-primary"
                    />
                  </div>
                  <div>
                    <p class="text-xs text-muted">
                      Payment Type
                    </p>
                    <p class="font-bold text-sm">
                      {{ reg.paymentType === 'Personal' ? 'Personal'
                        : reg.paymentType === 'Insurance' ? 'Insurance'
                          : 'Bill to Company' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center justify-between px-1">
                  <span class="text-sm text-muted">Priority Level</span>
                  <UBadge :label="reg.priorityRegist" :color="PRIORITY_COLOR[reg.priorityRegist] ?? 'neutral'" variant="subtle" />
                </div>
              </div>
            </div>

            <!-- Status History -->
            <div class="flex-grow rounded-xl border border-default bg-background overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-default">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon name="i-lucide-history" class="text-primary" />
                  Status History
                </h3>
              </div>
              <div class="p-4 max-h-72 overflow-y-auto">
                <div v-if="statusHistoryLoading" class="flex items-center justify-center py-6">
                  <UIcon name="i-lucide-loader-circle" class="animate-spin text-xl text-muted" />
                </div>
                <div v-else-if="!statusHistory.length" class="py-6 text-center">
                  <p class="text-sm text-muted">Belum ada riwayat status.</p>
                </div>
                <div v-else class="relative space-y-4">
                  <div class="absolute left-[7px] top-2 bottom-2 w-px bg-default" />
                  <div v-for="(item, i) in statusHistoryDisplay" :key="item.id || i" class="relative flex gap-3 pl-6">
                    <div class="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background flex-shrink-0" :class="i === 0 ? 'bg-primary' : 'bg-muted'" />
                    <div>
                      <p class="text-sm font-semibold">
                        {{ statusHistoryLabel(item) }}
                      </p>
                      <p class="text-xs text-muted mt-0.5">
                        {{ formatDateTime(item.createdAt) }}
                      </p>
                      <p class="text-xs text-muted italic mt-0.5">
                        {{ statusHistoryDesc(item) }}
                      </p>
                      <p v-if="item.actorName" class="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <UIcon name="i-lucide-user" class="text-xs" />
                        {{ item.actorName }}<template v-if="item.actorRole"> · {{ item.actorRole }}</template>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ════ Questionnaires (8 cols) ════ -->
          <div class="col-span-12 lg:col-span-8 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-check" class="text-primary" />
                Medical Questionnaires List
              </h3>
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-lucide-printer"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  label="Print All Results"
                  @click="printQuestionnaires"
                />
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-default">
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                      Questionnaire Name
                    </th>
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">
                      Completion Date
                    </th>
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">
                      Status
                    </th>
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="q in questionnaires"
                    :key="q.questionnaire_id"
                    class="hover:bg-elevated transition-colors"
                  >
                    <td class="px-5 py-3">
                      <span class="text-sm font-semibold">{{ q.questionnaire_name }}</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <span v-if="q.completionDate" class="text-sm text-muted">{{ formatDateTime(q.completionDate) }}</span>
                      <span v-else class="text-sm text-muted italic">Not completed</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <UBadge
                        :label="q.status"
                        :color="q.status === 'Completed' ? 'success' : 'neutral'"
                        variant="subtle"
                        size="sm"
                      />
                    </td>
                    <td class="px-5 py-3 text-right">
                      <div class="flex justify-end gap-1">
                        <UButton
                          icon="i-lucide-eye"
                          color="primary"
                          variant="ghost"
                          size="xs"
                          :disabled="q.status !== 'Completed'"
                          @click="q.status === 'Completed' && openModal(q)"
                        />
                        <UButton
                          icon="i-lucide-printer"
                          color="primary"
                          variant="ghost"
                          size="xs"
                          :disabled="q.status !== 'Completed'"
                          @click="q.status === 'Completed' && printSingleQuestionnaire(q)"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ════ Questionnaire Modal ════ -->
      <UModal v-model:open="modalOpen" :title="modalTitle">
        <template #body>
          <div v-if="!modalAnswers.length" class="text-sm text-muted">
            Tidak ada jawaban tersimpan untuk questionnaire ini.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="(a, i) in modalAnswers"
              :key="a.questionId || i"
              class="p-3 bg-elevated rounded-lg"
            >
              <p class="text-xs text-muted mb-1">
                {{ a.questionText }}
              </p>
              <p class="text-sm font-semibold">
                {{ formatAnswer(a) }}
              </p>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Close"
              @click="modalOpen = false"
            />
            <UButton
              color="primary"
              icon="i-lucide-printer"
              label="Print Answers"
              @click="printModalAnswers"
            />
          </div>
        </template>
      </UModal>

      <BaseConfirmModal
        v-model:open="isStatusModalOpen"
        :count="1"
        entity="status"
        title="Ubah Status"
        description="Apakah yakin ingin mengubah status?"
        :disabled="!isFormValid"
        :variant="
          selectedStatus === 'APPROVED'
            ? 'success'
            : selectedStatus === 'REJECTED'
              ? 'danger'
              : 'warning'
        "
        @confirm="confirmChangeStatus"
      >
        <template #content>
          <div class="space-y-4">
            <!-- 🔥 Pasien sudah pernah MCU di Kyoai? (hanya muncul saat Approve) -->
            <div v-if="selectedStatus === 'APPROVED'" class="space-y-2">
              <label class="text-sm font-medium text-muted">
                Apakah pasien sudah pernah MCU di Kyoai?
              </label>
              <div class="flex gap-2">
                <UButton
                  size="xs"
                  :color="formApprove.patientExists === true ? 'primary' : 'neutral'"
                  variant="soft"
                  @click="formApprove.patientExists = true; clearPatient(); touched.patientExists = true"
                >
                  Ya
                </UButton>
                <UButton
                  size="xs"
                  :color="formApprove.patientExists === false ? 'primary' : 'neutral'"
                  variant="soft"
                  @click="formApprove.patientExists = false; clearPatient(); touched.patientExists = true"
                >
                  Tidak
                </UButton>
              </div>
              <p v-if="touched.patientExists && errors.patientExists" class="text-xs text-red-500">
                {{ errors.patientExists }}
              </p>

              <!-- [F-ringan] Auto-suggest kandidat duplikat saat pilih "Tidak" -->
              <div
                v-if="formApprove.patientExists === false && !selectedPatient"
                class="mt-2 space-y-2"
              >
                <div v-if="duplicateSuggestionsLoading" class="text-xs text-muted flex items-center gap-2">
                  <UIcon name="i-lucide-loader-circle" class="animate-spin" />
                  Mencari kemungkinan pasien yang sama...
                </div>
                <div
                  v-else-if="duplicateSuggestionsChecked && duplicateSuggestions.length"
                  class="border rounded-lg overflow-hidden bg-background"
                >
                  <p class="px-3 py-2 text-xs font-medium text-muted bg-elevated border-b border-default">
                    Kemungkinan pasien sudah terdaftar — pilih jika memang pasien yang sama:
                  </p>
                  <div
                    v-for="p in duplicateSuggestions"
                    :key="p.id"
                    class="px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-default last:border-0"
                    @click="selectPatient(p)"
                  >
                    <p class="text-sm font-medium text-highlighted">
                      {{ p.firstName }} {{ p.middleName || '' }} {{ p.lastName }}
                    </p>
                    <p class="text-xs text-muted">
                      RM: {{ p.PatientId || '-' }} · {{ p.gender || '-' }}
                    </p>
                  </div>
                </div>
                <div
                  v-else-if="duplicateSuggestionsChecked && !duplicateSuggestions.length"
                  class="text-xs text-muted"
                >
                  Tidak ada pasien serupa ditemukan untuk {{ duplicateSearchTerm }}.
                </div>
              </div>

              <div v-if="formApprove.patientExists && !selectedPatient" class="mt-2">
                <UInput
                  v-model="patientSearchQuery"
                  placeholder="Cari nama atau nomor RM pasien..."
                  icon="i-lucide-search"
                />
                <div v-if="patientSearchLoading" class="mt-2 text-xs text-muted">
                  Mencari...
                </div>
                <div v-else-if="patientResults.length" class="mt-2 border rounded-lg max-h-48 overflow-auto">
                  <div
                    v-for="p in patientResults"
                    :key="p.id"
                    class="px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-default last:border-0"
                    @click="selectPatient(p)"
                  >
                    <p class="text-sm font-medium text-highlighted">
                      {{ p.firstName }} {{ p.middleName || '' }} {{ p.lastName }}
                    </p>
                    <p class="text-xs text-muted">
                      RM: {{ p.PatientId || '-' }} · {{ p.gender || '-' }}
                    </p>
                  </div>
                </div>
                <div v-else-if="patientSearchQuery.length >= 2 && !patientSearchLoading" class="mt-2 text-xs text-muted">
                  Tidak ada pasien ditemukan.
                </div>
              </div>

              <div v-if="selectedPatient" class="mt-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <p class="text-sm font-medium text-primary">
                  {{ selectedPatient.firstName }} {{ selectedPatient.middleName || '' }} {{ selectedPatient.lastName }}
                </p>
                <p class="text-xs text-muted">
                  RM: {{ selectedPatient.PatientId || '-' }}
                  <UButton size="xs" variant="ghost" class="ml-2" @click="clearPatient">Ganti</UButton>
                </p>
              </div>
            </div>

            <!-- Konfirmasi overwrite data pasien existing -->
            <div
              v-if="selectedStatus === 'APPROVED' && formApprove.patientExists === true"
              class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
            >
              <label class="flex items-start gap-2.5 text-sm">
                <UCheckbox
                  v-model="confirmOverwrite"
                  color="warning"
                />
                <span class="text-amber-900 dark:text-amber-200">
                  Pasien sudah pernah MCU di Kyoai. Data pasien yang ada (nama,
                  gender, telepon, email, tanggal lahir) akan
                  <strong class="font-semibold">
                    ditimpa
                  </strong>
                  dengan data dari pendaftaran ini saat disetujui. Centang untuk konfirmasi.
                </span>
              </label>
              <p v-if="touched.confirmOverwrite && errors.confirmOverwrite" class="text-xs text-red-500">
                {{ errors.confirmOverwrite }}
              </p>
            </div>

            <!-- STATUS INFO -->
            <div class="text-sm text-muted">
              Status akan diubah menjadi:
              <span
                :class="[
                  'ml-2 px-2 py-1 rounded-md text-xs font-semibold border',
                  selectedStatus === 'APPROVED' && 'bg-green-100 text-green-700 border-green-200',
                  selectedStatus === 'REJECTED' && 'bg-red-100 text-red-700 border-red-200',
                  selectedStatus === 'PENDING' && 'bg-yellow-100 text-yellow-700 border-yellow-200'
                ]"
              >
                {{ selectedStatus }}
              </span>
            </div>

            <!-- APPROVED FORM -->
            <div
              v-if="selectedStatus === 'APPROVED'"
              class="space-y-4 border rounded-xl p-4 bg-muted/30"
            >
              <div class="text-sm font-medium text-muted">
                Informasi Approval
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-sm font-medium text-muted">
                    Exam Date <span class="text-red-500">*</span>
                  </label>
                  <UInput
                    ref="examDateRef"
                    v-model="formApprove.examDate"
                    type="date"
                    icon="i-lucide-calendar"
                    :color="touched.examDate && errors.examDate ? 'error' : 'neutral'"
                    @blur="touched.examDate = true"
                  />
                  <p v-if="touched.examDate && errors.examDate" class="text-xs text-red-500">
                    {{ errors.examDate }}
                  </p>
                </div>

                <div class="space-y-1">
                  <label class="text-sm font-medium text-muted">
                    Priority <span class="text-red-500">*</span>
                  </label>
                  <USelect
                    v-model="formApprove.priorityRegist"
                    icon="i-lucide-award"
                    :items="[
                      { label: 'VIP', value: 'VIP' },
                      { label: 'Normal', value: 'Normal' },
                      { label: 'Emergency', value: 'Emergency' }
                    ]"
                    placeholder="Pilih prioritas"
                    class="w-full min-w-[150px]"
                    :color="touched.priorityRegist && errors.priorityRegist ? 'error' : 'neutral'"
                    @update:model-value="() => touched.priorityRegist = true"
                    @blur="touched.priorityRegist = true"
                  />
                  <p v-if="touched.priorityRegist && errors.priorityRegist" class="text-xs text-red-500">
                    {{ errors.priorityRegist }}
                  </p>
                </div>
              </div>
            </div>

            <!-- REJECTED FORM -->
            <div
              v-else-if="selectedStatus === 'REJECTED'"
              class="space-y-3 border rounded-xl p-4 bg-muted/30"
            >
              <div class="text-sm font-medium text-muted">
                Alasan Penolakan
              </div>

              <div class="space-y-1 w-full">
                <label class="text-sm font-medium text-muted">
                  Reason :
                </label>
                <UTextarea
                  ref="rejectReasonRef"
                  v-model="formReject.rejectReason"
                  placeholder="Masukkan alasan penolakan..."
                  :rows="5"
                  class="w-full min-h-[120px]"
                  :color="touched.rejectReason && errors.rejectReason ? 'error' : 'neutral'"
                  @blur="touched.rejectReason = true"
                />
                <p v-if="touched.rejectReason && errors.rejectReason" class="text-xs text-red-500">
                  {{ errors.rejectReason }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </BaseConfirmModal>
    </template>
  </UDashboardPanel>
</template>
