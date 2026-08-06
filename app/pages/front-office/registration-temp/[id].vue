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
  rejectReason: ''
})

const touched = reactive({
  examDate: false,
  priorityRegist: false,
  rejectReason: false
})

const isFormValid = computed(() => {
  if (selectedStatus.value === 'APPROVED') {
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
  errors.rejectReason = ''

  if (selectedStatus.value === 'APPROVED') {
    if (!formApprove.examDate && touched.examDate) {
      errors.examDate = 'Exam Date wajib diisi'
    }
    if (!formApprove.priorityRegist && touched.priorityRegist) {
      errors.priorityRegist = 'Priority wajib dipilih'
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
}

function clearPatient() {
  selectedPatient.value = null
  formApprove.patientId = ''
  confirmOverwrite.value = false
}

watch(() => formApprove.patientExists, () => {
  confirmOverwrite.value = false
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
  }
  if (status === 'REJECTED') {
    formReject.rejectReason = ''
  }

  touched.examDate = false
  touched.priorityRegist = false
  touched.rejectReason = false
  errors.examDate = ''
  errors.priorityRegist = ''
  errors.rejectReason = ''
  confirmOverwrite.value = false
}

async function confirmChangeStatus() {
  touched.examDate = true
  touched.priorityRegist = true
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

    isStatusModalOpen.value = false
    try {
      await api.post(`/registration-temp/${String(route.params.id)}/process`)
    } catch {
      // best-effort — redirect tetap jalan
    }
    toast.add({
      title: 'Lanjutkan Registrasi',
      description: 'Pilih paket MCU lalu simpan untuk membuat registrasi.',
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

const BRANCH_MAP: Record<string, string> = {
  '01': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.4450865724266!2d106.81850222573125!3d-6.204870410783341!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f41ce7e1f987%3A0xa81d4a263f590cf7!2sKyoai%20Medical%20Services%20(Jakarta)!5e0!3m2!1sid!2sid!4v1778207696766!5m2!1sid!2sid',
  '02': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.507045156583!2d107.1199049757327!3d-6.328280361922893!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e699b6b48535879%3A0x45cfdf89d5efefd3!2sKyoai%20Medical%20Service%20(ejip-Cikarang)!5e0!3m2!1sid!2sid!4v1778208642576!5m2!1sid!2sid',
  '03': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3943.8113633280796!2d115.18111617576245!3d-8.709456088771848!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd246b266a503d3%3A0xf5a9befaee9f4ef3!2sKYOAI%20Medical%20Services!5e0!3m2!1sid!2sid!4v1778208457615!5m2!1sid!2sid',
  '04': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.4368959284984!2d106.81885787573135!3d-6.205958560793301!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f545efaa54e9%3A0xebf3673ac277c8cb!2sClinique%20Suisse!5e0!3m2!1sid!2sid!4v1778208429063!5m2!1sid!2sid',
  '05': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.1483724977975!2d107.32518307573302!3d-6.374838962359312!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6975cfda39901f%3A0x9db8f0db713ac1c9!2sKYOAI%20MEDICAL%20SERVICES%20(SURYA%20CIPTA%20-%20KARAWANG%20TIMUR)!5e0!3m2!1sid!2sid!4v1778208337540!5m2!1sid!2sid',
  '06': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.2762054029545!2d107.27948547573287!3d-6.358284162203742!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e699dfbae4a1b21%3A0x2f8b6c48250a7384!2sKYOAI%20Medical%20Services%20Cabang%20KIIC!5e0!3m2!1sid!2sid!4v1778208492016!5m2!1sid!2sid',
  '07': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.5038859183333!2d107.12950428384168!3d-6.328691945562345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e699b421336f985%3A0x7b46fefe4854d9e!2sKYOAI%20MEDICAL%20SERVICES%20(AXIA)!5e0!3m2!1sid!2sid!4v1778207915884!5m2!1sid!2sid',
  '08': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.3979473068357!2d107.18457407573287!3d-6.342478162055634!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e699bd266827a35%3A0xd26c322b81472c22!2sKYOAI%20MEDICAL%20SERVICES%20(VIA%20ALMA)!5e0!3m2!1sid!2sid!4v1778208390754!5m2!1sid!2sid',
  '09': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.2797069348126!2d106.80102857573152!3d-6.226804860984086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f194f63b2305%3A0xc9285b218cd9c279!2sKyoai%20Medical%20Services%20(Summitmas)!5e0!3m2!1sid!2sid!4v1778208240970!5m2!1sid!2sid',
  '10': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.4532976086493!2d106.81796907573128!3d-6.203779360773392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f56cc518478d%3A0x24769a84120576ed!2sKyoai%20Medical%20Park!5e0!3m2!1sid!2sid!4v1778208530259!5m2!1sid!2sid'
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
const statusHistory = computed(() => {
  if (!reg.value) return []
  const items = [
    {
      label: `Status: ${reg.value.status}`,
      time: reg.value.createdAt,
      desc: 'Status diperbarui otomatis oleh sistem setelah validasi berhasil.',
      dot: 'bg-primary'
    },
    {
      label: 'Registrasi Dibuat',
      time: reg.value.createdAt,
      desc: 'Registrasi dibuat oleh pasien melalui portal.',
      dot: 'bg-muted'
    }
  ]
  if (reg.value.status === 'REJECTED' && reg.value.rejectedReason) {
    items.splice(1, 0, {
      label: 'Ditolak',
      time: reg.value.updatedAt || reg.value.createdAt,
      desc: `Alasan: ${reg.value.rejectedReason}`,
      dot: 'bg-error'
    })
  }
  return items
})

onMounted(() => {
  loadQuestionnaires()
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
              <div class="p-4">
                <div class="relative space-y-4">
                  <div class="absolute left-[7px] top-2 bottom-2 w-px bg-default" />
                  <div
                    v-for="(item, i) in statusHistory"
                    :key="i"
                    class="relative flex gap-3 pl-6"
                  >
                    <div
                      class="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background flex-shrink-0"
                      :class="item.dot"
                    />
                    <div>
                      <p class="text-sm font-semibold">
                        {{ item.label }}
                      </p>
                      <p class="text-xs text-muted mt-0.5">
                        {{ formatDateTime(item.time) }}
                      </p>
                      <p class="text-xs text-muted italic mt-0.5">
                        {{ item.desc }}
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

          <!-- ════ Map / Branch location (12 cols) ════ -->
          <div
            class="col-span-12 rounded-xl overflow-hidden border border-default relative h-48 bg-elevated group shadow-sm"
          >
            <!-- Google Maps Embed -->
            <iframe
              class="absolute inset-0 w-full h-full"
              :src="BRANCH_MAP[reg.branchId ?? '-']"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            />

            <!-- Overlay gradient -->
            <div class="absolute inset-0 bg-gradient-to-t from-elevated/80 to-transparent pointer-events-none" />

            <!-- Branch Info -->
            <div
              class="absolute bottom-4 left-4 bg-background border border-default rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              <div
                class="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-xl text-primary flex-shrink-0"
              >
                <UIcon name="i-lucide-building-2" />
              </div>

              <div>
                <p class="text-xs text-muted">
                  Current Location
                </p>

                <p class="text-sm font-bold">
                  {{ BRANCH_NAME[reg.branchId ?? '-'] }}
                </p>
              </div>
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
                  @click="formApprove.patientExists = true; clearPatient()"
                >
                  Ya
                </UButton>
                <UButton
                  size="xs"
                  :color="formApprove.patientExists === false ? 'primary' : 'neutral'"
                  variant="soft"
                  @click="formApprove.patientExists = false; clearPatient()"
                >
                  Tidak
                </UButton>
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
