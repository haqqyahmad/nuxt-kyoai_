<script setup lang="ts">
const route = useRoute()
const api = useApi()
const toast = useToast()

type TempRegistration = {
  id: string
  idType: string
  idValue: number
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
  patientId: string
  status: string
  rejectedReason: string
  registrationId: number
  createdAt: string
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

const STATUS_COLOR: Record<string, string> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error'
}

const PRIORITY_COLOR: Record<string, string> = {
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

// ─────────────────────────────────────────────
// MCU Breakdown (static mock — replace with API)
// ─────────────────────────────────────────────
const mcuCategories = [
  {
    label: 'Physical Examination',
    icon: 'i-lucide-stethoscope',
    items: [
      { name: 'General Physical Exam', done: true },
      { name: 'Eyes (Vision/Color)', done: true },
      { name: 'Dental Examination', done: false }
    ]
  },
  {
    label: 'Laboratory Tests',
    icon: 'i-lucide-flask-conical',
    items: [
      { name: 'Hematology (Complete)', done: true },
      { name: 'Kidney Function', done: false },
      { name: 'Liver Function', done: false },
      { name: 'Lipid Profile', done: false },
      { name: 'Diabetes (HbA1c)', done: false }
    ]
  },
  {
    label: 'Radiology & Imaging',
    icon: 'i-lucide-scan',
    items: [
      { name: 'Chest X-Ray', done: false },
      { name: 'EKG (Resting)', done: false },
      { name: 'USG Abdomen', done: false }
    ]
  }
]

// ─────────────────────────────────────────────
// Questionnaires (static mock — replace with API)
// ─────────────────────────────────────────────
const questionnaires = [
  { name: 'MCU Questionnaire', completionDate: 'May 06, 2026', status: 'Completed' },
  { name: 'SRQ-20 Mental Health', completionDate: 'May 06, 2026', status: 'Completed' },
  { name: 'Physical Assessment Questionnaire', completionDate: null, status: 'Pending' }
]

// Modal
const modalOpen = ref(false)
const modalTitle = ref('')
function openModal(name: string) { modalTitle.value = name; modalOpen.value = true }

// ─────────────────────────────────────────────
// Status history
// ─────────────────────────────────────────────
const statusHistory = computed(() => {
  if (!reg.value) return []
  return [
    {
      label: `Status: ${reg.value.statusRegistration}`,
      time: reg.value.createdAt,
      desc: 'Status diperbarui otomatis oleh sistem setelah validasi berhasil.',
      dot: 'bg-primary'
    },
    {
      label: 'Registrasi Dibuat',
      time: reg.value.createdAt,
      desc: 'Registrasi dibuat oleh Admission Staff.',
      dot: 'bg-muted'
    }
  ]
})

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────
const cancelLoading = ref(false)
const checkinLoading = ref(false)

async function cancelRegistration() {
  cancelLoading.value = true
  try {
    await api.patch(`/registration/${reg.value?.id}/cancel`)
    toast.add({ title: 'Berhasil', description: 'Registrasi dibatalkan', color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal membatalkan registrasi', color: 'error' })
  } finally { cancelLoading.value = false }
}

async function checkinPatient() {
  checkinLoading.value = true
  try {
    await api.patch(`/registration/${reg.value?.id_reg}/status`, { status: 'Checkin' })
    toast.add({ title: 'Berhasil', description: 'Pasien berhasil check-in', color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal check-in', color: 'error' })
  } finally { checkinLoading.value = false }
}

const isCancelled = computed(() => reg.value?.statusRegistration === 'Cancel')
const isCheckedIn = computed(() => ['Checkin', 'CheckOut', 'PartialExam'].includes(reg.value?.statusRegistration ?? ''))
const isMCU = computed(() => reg.value?.serviceType === 'MCU')
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
              <span v-if="reg.patient" class="text-xs text-muted">ID: {{ reg.patient.patientCode }}</span>
            </div>
            <div v-if="reg.firstName" class="px-5 py-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-default pb-4 mb-4">
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
                <code class="text-xs bg-elevated border border-default rounded px-2 py-0.5 font-mono">{{ reg.registrationId }}</code>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Branch</span>
                <span class="text-sm font-semibold">{{ BRANCH_NAME[reg.branchId ?? '-'] }}</span>
              </div>
            </div>
          </div>

          <!-- ════ MCU Breakdown (12 cols, only MCU) ════ -->
          <div v-if="isMCU" class="col-span-12 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-activity" class="text-primary" />
                MCU Breakdown
              </h3>
              <div class="flex items-center gap-4 text-xs text-muted">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-green-500" /> Completed
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-default" /> Pending
                </span>
              </div>
            </div>
            <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="cat in mcuCategories"
                :key="cat.label"
                class="bg-elevated rounded-xl p-4"
              >
                <h4 class="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <UIcon :name="cat.icon" class="text-sm" />
                  {{ cat.label }}
                </h4>
                <ul class="space-y-2">
                  <li
                    v-for="item in cat.items"
                    :key="item.name"
                    class="flex items-center justify-between bg-background rounded-lg border border-default px-3 py-2"
                  >
                    <span class="text-sm">{{ item.name }}</span>
                    <UIcon
                      :name="item.done ? 'i-lucide-check-circle-2' : 'i-lucide-clock'"
                      :class="item.done ? 'text-green-500' : 'text-muted'"
                      class="text-base flex-shrink-0"
                    />
                  </li>
                </ul>
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
              <UButton
                icon="i-lucide-printer"
                color="neutral"
                variant="outline"
                size="xs"
                label="Print All Results"
              />
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
                    :key="q.name"
                    class="hover:bg-elevated transition-colors"
                  >
                    <td class="px-5 py-3">
                      <span class="text-sm font-semibold">{{ q.name }}</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <span v-if="q.completionDate" class="text-sm text-muted">{{ q.completionDate }}</span>
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
                          @click="q.status === 'Completed' && openModal(q.name)"
                        />
                        <UButton
                          icon="i-lucide-printer"
                          color="primary"
                          variant="ghost"
                          size="xs"
                          :disabled="q.status !== 'Completed'"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ════ Map / Branch location (12 cols) ════ -->
          <div class="col-span-12 rounded-xl overflow-hidden border border-default relative h-48 bg-elevated group shadow-sm">
            <div class="absolute inset-0 flex items-center justify-center text-muted">
              <UIcon name="i-lucide-map" class="text-4xl opacity-20" />
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-elevated to-transparent" />
            <div class="absolute bottom-4 left-4 bg-background border border-default rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div class="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-xl text-primary flex-shrink-0">
                <UIcon name="i-lucide-building-2" />
              </div>
              <div>
                <p class="text-xs text-muted">
                  Current Location
                </p>
                <p class="text-sm font-bold">
                  {{ reg.branch?.nameBranch ?? '-' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════ Questionnaire Modal ════ -->
      <UModal v-model:open="modalOpen" :title="modalTitle">
        <template #body>
          <div class="space-y-3">
            <div class="p-3 bg-elevated rounded-lg">
              <p class="text-xs text-muted mb-1">
                Allergies
              </p>
              <p class="text-sm font-semibold">
                None reported
              </p>
            </div>
            <div class="p-3 bg-elevated rounded-lg">
              <p class="text-xs text-muted mb-1">
                Current Medications
              </p>
              <p class="text-sm font-semibold">
                Amoxicillin (500mg, 1x Daily)
              </p>
            </div>
            <div class="p-3 bg-elevated rounded-lg">
              <p class="text-xs text-muted mb-1">
                Previous Surgeries
              </p>
              <p class="text-sm font-semibold">
                Appendectomy (2018)
              </p>
            </div>
            <div class="p-3 bg-elevated rounded-lg">
              <p class="text-xs text-muted mb-1">
                Family History
              </p>
              <p class="text-sm font-semibold">
                Hypertension (Father), Diabetes Type 2 (Mother)
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
            <UButton color="primary" icon="i-lucide-printer" label="Print Answers" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
