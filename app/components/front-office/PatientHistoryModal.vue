<script setup lang="ts">
const api = useApi()
const toast = useToast()

const open = defineModel<boolean>('open', { default: false })

type PatientLite = {
  id: string
  patientCode?: string | null
  patientName?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: string | null
  idType?: string | null
  idNumber?: string | null
  phone?: string | null
  email?: string | null
  dob?: string | null
  maritalStatus?: string | null
}

type PatientDetail = PatientLite & {
  addresses?: Array<{
    type?: string | null
    detail?: string | null
    city?: string | null
    province?: string | null
  }>
  allergyNotes?: string | null
  diseaseNotes?: string | null
}

type MedicalRecordRow = {
  id: string
  examId: string
  examDate: string | null
  regNumber: string | null
  status: string
  finalGrade: string | null
  fitnessLevel: string | null
  companyName: string | null
}

const props = defineProps<{
  patientId?: string | null
  patient?: PatientLite | null
}>()

const emit = defineEmits<{
  (e: 'edit', patientId: string): void
}>()

const loading = ref(false)
const detail = ref<PatientDetail | null>(null)
const rows = ref<MedicalRecordRow[]>([])

const mrModalOpen = ref(false)
const selectedReportId = ref<string | null>(null)

const patientInfo = computed<PatientLite>(() => {
  const p = detail.value ?? props.patient ?? null
  if (!p) return { id: props.patientId ?? '' }
  return {
    ...p,
    patientName:
      p.patientName
      || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  }
})

const primaryAddress = computed(() => {
  const list = detail.value?.addresses ?? []
  const home = list.find(a => a.type === 'HOME') ?? list[0]
  if (!home) return '-'
  return [home.detail, home.city, home.province].filter(Boolean).join(', ') || '-'
})

function formatDate(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getAge(dob?: string | null) {
  if (!dob) return '-'
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return '-'
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return `${age} th`
}

async function load(patientId: string) {
  loading.value = true
  try {
    const [mrRes, detailRes] = await Promise.all([
      api.get(`/front-office/patients/${patientId}/medical-records`),
      api.get(`/patient/${patientId}`).catch(() => null)
    ])
    rows.value = (mrRes.data?.data ?? []) as MedicalRecordRow[]
    detail.value = (detailRes?.data?.data ?? null) as PatientDetail | null
  } catch {
    rows.value = []
    toast.add({
      title: 'Failed',
      description: 'Failed to load patient MR history',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch([open, () => props.patientId], ([isOpen, id]) => {
  if (isOpen && id) void load(id)
})

function openMr(reportId: string) {
  selectedReportId.value = reportId
  mrModalOpen.value = true
}

function openEdit() {
  if (!props.patientId) return
  emit('edit', props.patientId)
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Patient MR History"
    description="Patient identity and released medical records"
    :ui="{ content: 'sm:max-w-5xl w-full' }"
  >
    <template #body>
      <div class="space-y-4">
        <UCard>
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-elevated">
                <UIcon name="i-lucide-user-round" class="size-6 text-muted" />
              </div>
              <div class="space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-semibold">
                    {{ patientInfo.patientName || '-' }}
                  </h3>
                  <UBadge
                    :label="patientInfo.patientCode || '-'"
                    color="neutral"
                    variant="subtle"
                  />
                </div>
                <div
                  class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-3"
                >
                  <span>
                    Gender:
                    {{ patientInfo.gender === 'MALE' ? 'Male' : patientInfo.gender === 'FEMALE' ? 'Female' : '-' }}
                  </span>
                  <span>DOB: {{ formatDate(patientInfo.dob) }}</span>
                  <span>Age: {{ getAge(patientInfo.dob) }}</span>
                  <span>Phone: {{ patientInfo.phone || '-' }}</span>
                  <span>Email: {{ patientInfo.email || '-' }}</span>
                  <span>
                    {{ patientInfo.idType ? `${patientInfo.idType}: ${patientInfo.idNumber}` : 'ID: -' }}
                  </span>
                </div>
                <p class="text-sm text-muted">
                  Address: {{ primaryAddress }}
                </p>
                <p
                  v-if="detail?.allergyNotes"
                  class="flex items-center gap-1.5 text-sm text-warning"
                >
                  <UIcon name="i-lucide-alert-triangle" class="size-3.5" />
                  Allergy: {{ detail.allergyNotes }}
                </p>
                <p v-if="detail?.diseaseNotes" class="text-sm text-muted">
                  Disease: {{ detail.diseaseNotes }}
                </p>
              </div>
            </div>
            <UButton
              icon="i-lucide-pencil"
              label="Edit Patient"
              color="neutral"
              variant="outline"
              class="shrink-0"
              @click="openEdit"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-2 text-sm font-semibold">
                <UIcon name="i-lucide-folder-open" class="size-4" />
                Medical Records
              </h3>
              <UBadge
                :label="`${rows.length} record(s)`"
                color="neutral"
                variant="subtle"
              />
            </div>
          </template>

          <div v-if="loading" class="py-10 text-center text-sm text-muted">
            Loading medical records...
          </div>
          <div v-else-if="!rows.length" class="py-10 text-center text-sm text-muted">
            No medical record yet.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-default text-left text-muted">
                  <th class="py-2 pr-4 font-medium">
                    Regist ID
                  </th>
                  <th class="py-2 pr-4 font-medium">
                    Exam Date
                  </th>
                  <th class="py-2 pr-4 font-medium">
                    Result
                  </th>
                  <th class="py-2 pr-4 font-medium">
                    Company
                  </th>
                  <th class="py-2 pr-2 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in rows"
                  :key="row.id"
                  class="border-b border-default/60 last:border-0"
                >
                  <td class="py-2.5 pr-4 font-mono">
                    {{ row.regNumber || '-' }}
                  </td>
                  <td class="py-2.5 pr-4">
                    {{ formatDate(row.examDate) }}
                  </td>
                  <td class="py-2.5 pr-4">
                    {{ row.fitnessLevel || '-' }}
                    <span v-if="row.finalGrade" class="text-muted">({{ row.finalGrade }})</span>
                  </td>
                  <td class="py-2.5 pr-4">
                    {{ row.companyName || '-' }}
                  </td>
                  <td class="py-2.5 pr-2 text-right">
                    <UButton
                      size="xs"
                      icon="i-lucide-eye"
                      label="View"
                      color="primary"
                      variant="subtle"
                      @click="openMr(row.id)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="mrModalOpen"
    title="Medical Record (MR) MCU"
    :ui="{ content: 'sm:max-w-6xl w-full' }"
  >
    <template #body>
      <MrMcuDetail v-if="selectedReportId" :report-id="selectedReportId" />
    </template>
  </UModal>
</template>
