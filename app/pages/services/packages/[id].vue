<script setup lang="ts">
const route = useRoute()
const api = useApi()
const toast = useToast()

type Registration = {
  id: number
  id_reg: string
  examDate: string
  scheduleDateExam: string
  serviceType: string
  serviceNumber: string
  priorityRegist: string
  paymentType: string
  statusRegistration: string
  createdAt: string
  patient: {
    id: string
    patientCode: string
    patientName: string
    firstName: string
    middleName?: string
    lastName: string
    gender: 'MALE' | 'FEMALE'
    idType: string
    idNumber: string
    phone?: string
    email?: string
    dob?: string
  } | null
  branch: { branchId: string, nameBranch: string } | null
  company: { id: number, codeCostumer: string, customerName: string } | null
}

type PaketMCU = {
  id: string
  name: string
  isActive: boolean
  paketItems: PaketItem[]
}

type PaketItem = {
  id: string
  paketId: string
  itemId: string
  sortOrder: number
  item: ItemMCU
}

type ItemMCU = {
  id: string
  code: string
  name: string
  inputans: InputanMCU[]
}

type InputanMCU = {
  id: string
  label: string
  inputType: 'number' | 'selected' | 'string' | 'calculated' | string
  uom?: string | null
  sortOrder: number
  allowBlank: boolean
  opsis: {
    id: string
    label: string
    value: string
    sortOrder: number
  }[]
  formula?: {
    id: string
    formula: string
  } | null
}

const { data: reg, refresh } = await useAsyncData(
  `registration-${route.params.id}`,
  () =>
    api
      .get(`/registration/number/${route.params.id}`)
      .then(r => r.data.data as Registration)
)

const { data: paketMcuData } = await useAsyncData(
  `mcu-pakets-${route.params.id}`,
  () =>
    api
      .get('/mcu/pakets')
      .then(r => r.data.data as PaketMCU[])
)

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
  Open: 'success',
  Checkin: 'info',
  CheckOut: 'neutral',
  Reschedule: 'warning',
  PartialExam: 'warning',
  Cancel: 'error'
}

const PRIORITY_COLOR: Record<string, string> = {
  Normal: 'neutral',
  VIP: 'warning',
  Emegency: 'error'
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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getInputIcon(type: string) {
  if (type === 'number') return 'i-lucide-hash'
  if (type === 'selected') return 'i-lucide-list-checks'
  if (type === 'calculated') return 'i-lucide-calculator'
  if (type === 'string') return 'i-lucide-type'

  return 'i-lucide-circle'
}

function getInputTypeLabel(type: string) {
  const labels: Record<string, string> = {
    number: 'Number',
    selected: 'Selected',
    calculated: 'Calculated',
    string: 'Text'
  }

  return labels[type] ?? type
}

const selectedPaket = computed(() => {
  return paketMcuData.value?.[0] ?? null
})

const mcuCategories = computed(() => {
  const paket = selectedPaket.value

  if (!paket) return []

  return paket.paketItems
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(paketItem => ({
      id: paketItem.id,
      label: paketItem.item?.name ?? '-',
      code: paketItem.item?.code ?? '-',
      icon: 'i-lucide-flask-conical',
      items: (paketItem.item?.inputans ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(input => ({
          id: input.id,
          name: input.label,
          type: input.inputType,
          typeLabel: getInputTypeLabel(input.inputType),
          icon: getInputIcon(input.inputType),
          uom: input.uom,
          required: !input.allowBlank,
          done: false,
          options: input.opsis ?? [],
          formula: input.formula?.formula ?? null
        }))
    }))
})

const questionnaires = [
  {
    name: 'MCU Questionnaire',
    completionDate: 'May 06, 2026',
    status: 'Completed'
  },
  {
    name: 'SRQ-20 Mental Health',
    completionDate: 'May 06, 2026',
    status: 'Completed'
  },
  {
    name: 'Physical Assessment Questionnaire',
    completionDate: null,
    status: 'Pending'
  }
]

const modalOpen = ref(false)
const modalTitle = ref('')

function openModal(name: string) {
  modalTitle.value = name
  modalOpen.value = true
}

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

const cancelLoading = ref(false)
const checkinLoading = ref(false)

async function cancelRegistration() {
  cancelLoading.value = true

  try {
    await api.patch(`/registration/${reg.value?.id}/cancel`)

    toast.add({
      title: 'Berhasil',
      description: 'Registrasi dibatalkan',
      color: 'success'
    })

    await refresh()
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal membatalkan registrasi',
      color: 'error'
    })
  } finally {
    cancelLoading.value = false
  }
}

async function checkinPatient() {
  checkinLoading.value = true

  try {
    await api.patch(`/registration/${reg.value?.id_reg}/status`, {
      status: 'Checkin'
    })

    toast.add({
      title: 'Berhasil',
      description: 'Pasien berhasil check-in',
      color: 'success'
    })

    await refresh()
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal check-in',
      color: 'error'
    })
  } finally {
    checkinLoading.value = false
  }
}

const isCancelled = computed(() => reg.value?.statusRegistration === 'Cancel')

const isCheckedIn = computed(() =>
  ['Checkin', 'CheckOut', 'PartialExam'].includes(
    reg.value?.statusRegistration ?? ''
  )
)

const isMCU = computed(() => reg.value?.serviceType === 'MCU')
</script>

<template>
  <UDashboardPanel :id="`registration-${route.params.id}`">
    <template #header>
      <UDashboardNavbar title="Detail Registrasi">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/front-office/registration-patient"
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
              v-if="!isCancelled"
              icon="i-lucide-x-circle"
              color="error"
              variant="outline"
              label="Cancel Registrasi"
              :loading="cancelLoading"
              @click="cancelRegistration"
            />

            <UButton
              v-if="!isCancelled && !isCheckedIn"
              icon="i-lucide-user-check"
              color="primary"
              label="Check-in Pasien"
              :loading="checkinLoading"
              @click="checkinPatient"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="!reg"
        class="flex items-center justify-center h-full"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin text-2xl text-muted"
        />
      </div>

      <div
        v-else
        class="w-full max-w-7xl mx-auto py-6 px-4 space-y-6"
      >
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p class="text-xs text-muted mb-1">
              Kembali ke Daftar Registrasi
            </p>

            <h1 class="text-2xl font-bold text-default">
              Registration Detail
            </h1>

            <div class="flex items-center gap-3 mt-2">
              <code class="text-base font-bold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg">
                {{ reg.id_reg }}
              </code>

              <UBadge
                :label="reg.statusRegistration"
                :color="STATUS_COLOR[reg.statusRegistration] ?? 'neutral'"
                variant="subtle"
                size="md"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-12 gap-5">
          <div class="col-span-12 lg:col-span-8 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon
                  name="i-lucide-user-circle"
                  class="text-primary"
                />
                Patient Information
              </h3>

              <span
                v-if="reg.patient"
                class="text-xs text-muted"
              >
                ID: {{ reg.patient.patientCode }}
              </span>
            </div>

            <div
              v-if="reg.patient"
              class="px-5 py-4"
            >
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-default pb-4 mb-4">
                <div>
                  <p class="text-xs text-muted mb-1">
                    Full Name
                  </p>

                  <p class="font-semibold text-base">
                    {{ reg.patient.patientName }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted mb-1">
                    Gender
                  </p>

                  <p class="font-semibold">
                    {{ reg.patient.gender === 'MALE' ? 'Male' : 'Female' }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted mb-1">
                    Contact Status
                  </p>

                  <p class="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                    <UIcon
                      name="i-lucide-check-circle-2"
                      class="text-base"
                    />
                    Verified
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted mb-1">
                    Nomor HP
                  </p>

                  <p class="font-medium">
                    {{ reg.patient.phone ?? '-' }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted mb-1">
                    Email
                  </p>

                  <p class="font-medium truncate">
                    {{ reg.patient.email ?? '-' }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted mb-1">
                    ID Type
                  </p>

                  <p class="font-medium">
                    {{ reg.patient.idType }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted mb-1">
                    ID Number
                  </p>

                  <p class="font-mono text-xs font-medium">
                    {{ reg.patient.idNumber }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-else
              class="p-6 text-center text-sm text-muted"
            >
              Data pasien tidak ditemukan
            </div>
          </div>

          <div class="col-span-12 lg:col-span-4 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon
                  name="i-lucide-clipboard-list"
                  class="text-primary"
                />
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
                <span class="text-sm font-semibold text-primary">
                  {{ SERVICE_LABEL[reg.serviceType] ?? reg.serviceType }}
                </span>
              </div>

              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Service No.</span>

                <code class="text-xs bg-elevated border border-default rounded px-2 py-0.5 font-mono">
                  {{ reg.serviceNumber }}
                </code>
              </div>

              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Branch</span>
                <span class="text-sm font-semibold">
                  {{ reg.branch?.nameBranch ?? '-' }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="isMCU"
            class="col-span-12 rounded-xl border border-default bg-background overflow-hidden shadow-sm"
          >
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <div>
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon
                    name="i-lucide-activity"
                    class="text-primary"
                  />
                  MCU Breakdown
                </h3>

                <p
                  v-if="selectedPaket"
                  class="text-xs text-muted mt-1"
                >
                  {{ selectedPaket.name }}
                </p>
              </div>

              <div class="flex items-center gap-4 text-xs text-muted">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-green-500" />
                  Completed
                </span>

                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-default" />
                  Pending
                </span>
              </div>
            </div>

            <div
              v-if="!mcuCategories.length"
              class="p-6 text-center text-sm text-muted"
            >
              Data paket MCU tidak ditemukan
            </div>

            <div
              v-else
              class="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <div
                v-for="cat in mcuCategories"
                :key="cat.id"
                class="bg-elevated rounded-xl p-4"
              >
                <div class="mb-3">
                  <h4 class="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <UIcon
                      :name="cat.icon"
                      class="text-sm"
                    />
                    {{ cat.label }}
                  </h4>

                  <p class="text-xs text-muted mt-1">
                    {{ cat.code }}
                  </p>
                </div>

                <ul class="space-y-2">
                  <li
                    v-for="item in cat.items"
                    :key="item.id"
                    class="bg-background rounded-lg border border-default px-3 py-2"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <UIcon
                            :name="item.icon"
                            class="text-muted text-sm"
                          />

                          <span class="text-sm font-medium">
                            {{ item.name }}
                          </span>
                        </div>

                        <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          <UBadge
                            :label="item.typeLabel"
                            color="neutral"
                            variant="subtle"
                            size="xs"
                          />

                          <span v-if="item.uom">
                            {{ item.uom }}
                          </span>

                          <UBadge
                            v-if="item.required"
                            label="Required"
                            color="warning"
                            variant="subtle"
                            size="xs"
                          />

                          <UBadge
                            v-else
                            label="Optional"
                            color="neutral"
                            variant="subtle"
                            size="xs"
                          />
                        </div>

                        <p
                          v-if="item.formula"
                          class="text-xs text-primary mt-1 font-mono"
                        >
                          Formula: {{ item.formula }}
                        </p>

                        <div
                          v-if="item.options.length"
                          class="mt-2 flex flex-wrap gap-1"
                        >
                          <UBadge
                            v-for="opt in item.options"
                            :key="opt.id"
                            :label="opt.label"
                            color="info"
                            variant="subtle"
                            size="xs"
                          />
                        </div>
                      </div>

                      <UIcon
                        :name="item.done ? 'i-lucide-check-circle-2' : 'i-lucide-clock'"
                        :class="item.done ? 'text-green-500' : 'text-muted'"
                        class="text-base flex-shrink-0 mt-0.5"
                      />
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div class="col-span-12 lg:col-span-4 flex flex-col gap-5">
            <div class="rounded-xl border border-default bg-background overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-default">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon
                    name="i-lucide-credit-card"
                    class="text-primary"
                  />
                  Payment & Priority
                </h3>
              </div>

              <div class="p-4 space-y-3">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-elevated border border-default">
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UIcon
                      :name="reg.paymentType === 'Insurance'
                        ? 'i-lucide-shield-check'
                        : reg.paymentType === 'BillToCompany'
                          ? 'i-lucide-building-2'
                          : 'i-lucide-wallet'"
                      class="text-primary"
                    />
                  </div>

                  <div>
                    <p class="text-xs text-muted">
                      Payment Type
                    </p>

                    <p class="font-bold text-sm">
                      {{ reg.paymentType === 'Personal'
                        ? 'Personal'
                        : reg.paymentType === 'Insurance'
                          ? 'Insurance'
                          : 'Bill to Company' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-between px-1">
                  <span class="text-sm text-muted">Priority Level</span>

                  <UBadge
                    :label="reg.priorityRegist"
                    :color="PRIORITY_COLOR[reg.priorityRegist] ?? 'neutral'"
                    variant="subtle"
                  />
                </div>
              </div>
            </div>

            <div class="flex-grow rounded-xl border border-default bg-background overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-default">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon
                    name="i-lucide-history"
                    class="text-primary"
                  />
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

          <div class="col-span-12 lg:col-span-8 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon
                  name="i-lucide-clipboard-check"
                  class="text-primary"
                />
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
                      <span
                        v-if="q.completionDate"
                        class="text-sm text-muted"
                      >
                        {{ q.completionDate }}
                      </span>

                      <span
                        v-else
                        class="text-sm text-muted italic"
                      >
                        Not completed
                      </span>
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

          <div class="col-span-12 rounded-xl overflow-hidden border border-default relative h-48 bg-elevated group shadow-sm">
            <iframe
              class="absolute inset-0 w-full h-full"
              :src="BRANCH_MAP[reg.branch?.branchId ?? '-']"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            />

            <div class="absolute inset-0 bg-gradient-to-t from-elevated/80 to-transparent pointer-events-none" />

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

      <UModal
        v-model:open="modalOpen"
        :title="modalTitle"
      >
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

            <UButton
              color="primary"
              icon="i-lucide-printer"
              label="Print Answers"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
