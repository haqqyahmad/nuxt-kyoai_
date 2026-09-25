<script setup lang="ts">
import type { DoctorResultResponse, DoctorResultDepartment, DoctorResultItem } from '~/types/doctor-result'
import { MR_STATUS_COLOR, MR_STATUS_LABEL } from '~/types/medical-report'
import type { MedicalReportDetail } from '~/types/medical-report'

const props = defineProps<{
  reportId: string
}>()

const api = useApi()
const toast = useToast()

type CompanyHistory = { company: string | null, position: string | null, isCurrent: boolean } | null

type McuDetail = {
  medicalReport: MedicalReportDetail
  doctorResult: DoctorResultResponse | null
  companyHistory: CompanyHistory
}

type HistoryRow = {
  id: string
  regNumber: string | null
  examDate: string | null
  status: string
  finalGrade: string | null
  fitnessLevel: string | null
}

const loading = ref(true)
const detail = ref<McuDetail | null>(null)
const history = ref<HistoryRow[]>([])

const TABS = [
  { key: 'summary', label: 'Ringkasan', icon: 'i-lucide-layout-list' },
  { key: 'exam', label: 'Pemeriksaan', icon: 'i-lucide-stethoscope' },
  { key: 'lab', label: 'Laboratorium', icon: 'i-lucide-flask-conical' },
  { key: 'support', label: 'Penunjang', icon: 'i-lucide-scan-line' },
  { key: 'doctor', label: 'Dokter & Diagnosis', icon: 'i-lucide-user-round-check' },
  { key: 'conclusion', label: 'Kesimpulan', icon: 'i-lucide-check-circle-2' }
] as const

const activeTab = ref<string>('summary')

const mr = computed(() => detail.value?.medicalReport ?? null)
const dr = computed(() => detail.value?.doctorResult ?? null)
const departments = computed<DoctorResultDepartment[]>(() => dr.value?.departments ?? [])

const labDepts = computed(() =>
  departments.value.filter(d => /LAB/i.test(d.departmentCode))
)
const physicalDepts = computed(() =>
  departments.value.filter(d => /DOK|NURSE|VIS|FIS/i.test(d.departmentCode))
)
const supportDepts = computed(() =>
  departments.value.filter(d => !labDepts.value.includes(d) && !physicalDepts.value.includes(d))
)

const patientName = computed(() =>
  dr.value?.patient?.name || mr.value?.patient?.name || '-'
)
const patientCode = computed(() =>
  dr.value?.patient?.patientId || mr.value?.patient?.PatientId || '-'
)
const genderLabel = computed(() => {
  const g = dr.value?.patient?.gender || mr.value?.patient?.gender
  return g === 'MALE' ? 'Laki-laki' : g === 'FEMALE' ? 'Perempuan' : '-'
})
const patientAge = computed(() => {
  const age = dr.value?.patient?.age
  if (age != null && age !== '') return `${age} tahun`
  const dob = mr.value?.patient?.dob
  if (!dob) return '-'
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return '-'
  const now = new Date()
  let a = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a -= 1
  return `${a} tahun`
})

const examDate = computed(() => dr.value?.patient?.examDate || mr.value?.examDate || null)
const companyName = computed(() =>
  detail.value?.companyHistory?.company || dr.value?.patient?.company || mr.value?.companyName || '-'
)
const positionName = computed(() => detail.value?.companyHistory?.position || '-')
const packageName = computed(() => dr.value?.patient?.package || '-')

const finalGrade = computed(() => mr.value?.meta?.finalGrade || dr.value?.submission?.finalGrade || '-')
const fitnessLevel = computed(() => mr.value?.meta?.fitnessLevel || dr.value?.submission?.fitnessLevel || '-')
const finalComment = computed(() => mr.value?.meta?.finalComment || dr.value?.submission?.finalComment || '-')

const fitTone = computed(() => {
  const f = String(fitnessLevel.value).toLowerCase()
  if (f.includes('unfit')) return 'danger'
  if (f.includes('follow') || f.includes('restriction')) return 'warning'
  return 'success'
})

function statusLabel(status?: string | null) {
  return MR_STATUS_LABEL[status ?? ''] ?? status ?? '-'
}
function statusColor(status?: string | null) {
  return MR_STATUS_COLOR[status ?? ''] ?? 'neutral'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function normalRange(item: DoctorResultItem) {
  if (item.normalMin == null && item.normalMax == null) return '-'
  if (item.normalMin != null && item.normalMax != null) return `${item.normalMin} – ${item.normalMax}`
  if (item.normalMin != null) return `≥ ${item.normalMin}`
  return `≤ ${item.normalMax}`
}

function resultText(item: DoctorResultItem) {
  const value = item.displayValue ?? item.resultValue ?? '-'
  return item.uom ? `${value} ${item.uom}` : String(value)
}

function flagColor(flag?: string | null) {
  const f = String(flag || 'normal').toLowerCase()
  if (f === 'normal') return 'success'
  if (f === 'increase' || f === 'decrease') return 'error'
  return 'warning'
}

function printPage() {
  if (import.meta.client) window.print()
}

async function load() {
  loading.value = true
  try {
    const res = await api.get(`/front-office/medical-records/${props.reportId}`)
    detail.value = (res.data?.data ?? null) as McuDetail | null

    const patientId = detail.value?.medicalReport?.patient?.id
    if (patientId) {
      const listRes = await api.get(`/front-office/patients/${patientId}/medical-records`)
      const rows = (listRes.data?.data ?? []) as HistoryRow[]
      history.value = rows.filter(r => r.id !== props.reportId)
    }
  } catch {
    toast.add({
      title: 'Failed',
      description: 'Failed to load medical record detail',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(
  () => props.reportId,
  (id) => {
    if (id) {
      void load()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="mr-doc text-slate-700">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="size-7 animate-spin text-primary" />
    </div>

    <div v-else-if="detail && mr" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-file-heart" class="size-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-800">
              Medical Record (MR) MCU
            </h1>
            <p class="text-xs text-muted">
              {{ mr.examCode || reportId }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-printer"
            color="neutral"
            variant="outline"
            label="Cetak PDF"
            @click="printPage"
          />
        </div>
      </div>

      <!-- Identity -->
      <div class="rounded-lg border border-default bg-white p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_270px]">
          <div class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            <div class="space-y-1.5">
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">No. MR</span><span class="font-semibold">{{ patientCode }}</span>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">Nama</span><span class="font-semibold">{{ patientName }}</span>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">Jenis Kelamin</span><span class="font-semibold">{{ genderLabel }}</span>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">Umur</span><span class="font-semibold">{{ patientAge }}</span>
              </div>
            </div>
            <div class="space-y-1.5">
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">Perusahaan</span><span class="font-semibold">{{ companyName }}</span>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">Jabatan</span><span class="font-semibold">{{ positionName }}</span>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">Paket</span><span class="font-semibold">{{ packageName }}</span>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="w-32 shrink-0 text-muted">Tanggal MCU</span><span class="font-semibold">{{ formatDate(examDate) }}</span>
              </div>
            </div>
          </div>

          <div
            class="rounded-lg border p-4"
            :class="{
              'border-green-200 bg-green-50': fitTone === 'success',
              'border-amber-200 bg-amber-50': fitTone === 'warning',
              'border-red-200 bg-red-50': fitTone === 'danger'
            }"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-badge-check"
                class="size-6"
                :class="{
                  'text-green-600': fitTone === 'success',
                  'text-amber-600': fitTone === 'warning',
                  'text-red-600': fitTone === 'danger'
                }"
              />
              <span class="text-lg font-extrabold uppercase text-slate-800">{{ fitnessLevel }}</span>
            </div>
            <p class="mt-2 text-xs leading-relaxed text-slate-600">
              {{ finalComment }}
            </p>
            <div class="mt-3 flex items-center gap-2">
              <UBadge :label="statusLabel(mr.status)" :color="statusColor(mr.status)" variant="subtle" />
              <UBadge :label="`Grade ${finalGrade}`" color="neutral" variant="subtle" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mr-tabs flex gap-1 overflow-x-auto rounded-lg border border-default bg-white p-1">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="activeTab === t.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated'"
          @click="activeTab = t.key"
        >
          <UIcon :name="t.icon" class="size-4" />
          {{ t.label }}
        </button>
      </div>

      <!-- Ringkasan -->
      <div v-show="activeTab === 'summary'" class="mr-panel space-y-4">
        <UCard>
          <template #header>
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <UIcon name="i-lucide-activity" class="size-4 text-primary" /> Ringkasan Hasil Pemeriksaan
            </h3>
          </template>
          <div v-if="!departments.length" class="text-sm text-muted">
            Belum ada hasil pemeriksaan.
          </div>
          <div v-else class="space-y-4">
            <div v-for="dept in departments" :key="dept.departmentId" class="space-y-2">
              <div class="flex items-center justify-between border-b pb-1.5">
                <h4 class="font-semibold">
                  {{ dept.departmentName }}
                </h4>
                <UBadge :label="dept.departmentCode" color="neutral" variant="subtle" />
              </div>
              <div v-for="group in dept.groups" :key="group.groupName" class="pl-2">
                <p class="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                  {{ group.groupName }}
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <UBadge
                    v-for="item in group.items"
                    :key="item.inputanId"
                    :color="flagColor(item.flag)"
                    variant="subtle"
                    :label="`${item.inputanLabel}: ${resultText(item)}`"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <UIcon name="i-lucide-history" class="size-4 text-primary" /> Riwayat MCU Sebelumnya
            </h3>
          </template>
          <div v-if="!history.length" class="text-sm text-muted">
            Tidak ada riwayat MCU sebelumnya.
          </div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-left text-xs uppercase text-muted">
                <th class="py-2 pr-4 font-medium">
                  Tanggal
                </th>
                <th class="py-2 pr-4 font-medium">
                  No. Registrasi
                </th>
                <th class="py-2 pr-4 font-medium">
                  Hasil
                </th>
                <th class="py-2 pr-4 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in history" :key="row.id" class="border-b border-default/60 last:border-0">
                <td class="py-2 pr-4">
                  {{ formatDate(row.examDate) }}
                </td>
                <td class="py-2 pr-4 font-mono">
                  {{ row.regNumber || '-' }}
                </td>
                <td class="py-2 pr-4">
                  {{ row.fitnessLevel || '-' }} ({{ row.finalGrade || '-' }})
                </td>
                <td class="py-2 pr-4">
                  <UBadge :label="statusLabel(row.status)" :color="statusColor(row.status)" variant="subtle" />
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>

      <!-- Pemeriksaan -->
      <div v-show="activeTab === 'exam'" class="mr-panel">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold">
              Pemeriksaan Fisik & Vital Sign
            </h3>
          </template>
          <div v-if="!physicalDepts.length" class="text-sm text-muted">
            Tidak ada data pemeriksaan.
          </div>
          <div v-else class="space-y-5">
            <div v-for="dept in physicalDepts" :key="dept.departmentId" class="space-y-2">
              <h4 class="font-semibold">
                {{ dept.departmentName }}
              </h4>
              <div v-for="group in dept.groups" :key="group.groupName" class="overflow-x-auto rounded-lg border border-default/70">
                <div class="border-b bg-elevated/40 px-4 py-2 text-sm font-medium">
                  {{ group.groupName }}
                </div>
                <table class="w-full text-sm">
                  <thead class="bg-elevated/20 text-left text-xs uppercase text-muted">
                    <tr>
                      <th class="px-4 py-2 font-medium">
                        Pemeriksaan
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Hasil
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Nilai Normal
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in group.items" :key="item.inputanId" class="border-b border-default/50 last:border-0">
                      <td class="px-4 py-2">
                        {{ item.inputanLabel }}
                      </td>
                      <td class="px-4 py-2 font-medium">
                        {{ resultText(item) }}
                      </td>
                      <td class="px-4 py-2 text-muted">
                        {{ normalRange(item) }}
                      </td>
                      <td class="px-4 py-2">
                        <UBadge :label="String(item.flag || 'normal')" :color="flagColor(item.flag)" variant="subtle" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Laboratorium -->
      <div v-show="activeTab === 'lab'" class="mr-panel">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold">
              Hasil Laboratorium
            </h3>
          </template>
          <div v-if="!labDepts.length" class="text-sm text-muted">
            Tidak ada data laboratorium.
          </div>
          <div v-else class="space-y-5">
            <div v-for="dept in labDepts" :key="dept.departmentId" class="space-y-2">
              <div v-for="group in dept.groups" :key="group.groupName" class="overflow-x-auto rounded-lg border border-default/70">
                <div class="border-b bg-elevated/40 px-4 py-2 text-sm font-medium">
                  {{ group.groupName }}
                </div>
                <table class="w-full text-sm">
                  <thead class="bg-elevated/20 text-left text-xs uppercase text-muted">
                    <tr>
                      <th class="px-4 py-2 font-medium">
                        Pemeriksaan
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Hasil
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Unit
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Nilai Rujukan
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in group.items" :key="item.inputanId" class="border-b border-default/50 last:border-0">
                      <td class="px-4 py-2">
                        {{ item.inputanLabel }}
                      </td>
                      <td class="px-4 py-2 font-medium">
                        {{ item.displayValue ?? item.resultValue ?? '-' }}
                      </td>
                      <td class="px-4 py-2 text-muted">
                        {{ item.uom || '-' }}
                      </td>
                      <td class="px-4 py-2 text-muted">
                        {{ normalRange(item) }}
                      </td>
                      <td class="px-4 py-2">
                        <UBadge :label="String(item.flag || 'normal')" :color="flagColor(item.flag)" variant="subtle" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Penunjang -->
      <div v-show="activeTab === 'support'" class="mr-panel">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold">
              Pemeriksaan Penunjang
            </h3>
          </template>
          <div v-if="!supportDepts.length" class="text-sm text-muted">
            Tidak ada data penunjang.
          </div>
          <div v-else class="space-y-5">
            <div v-for="dept in supportDepts" :key="dept.departmentId" class="space-y-2">
              <h4 class="font-semibold">
                {{ dept.departmentName }}
              </h4>
              <div v-for="group in dept.groups" :key="group.groupName" class="overflow-x-auto rounded-lg border border-default/70">
                <div class="border-b bg-elevated/40 px-4 py-2 text-sm font-medium">
                  {{ group.groupName }}
                </div>
                <table class="w-full text-sm">
                  <thead class="bg-elevated/20 text-left text-xs uppercase text-muted">
                    <tr>
                      <th class="px-4 py-2 font-medium">
                        Pemeriksaan
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Hasil
                      </th>
                      <th class="px-4 py-2 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in group.items" :key="item.inputanId" class="border-b border-default/50 last:border-0">
                      <td class="px-4 py-2">
                        {{ item.inputanLabel }}
                      </td>
                      <td class="px-4 py-2 font-medium">
                        {{ resultText(item) }}
                      </td>
                      <td class="px-4 py-2">
                        <UBadge :label="String(item.flag || 'normal')" :color="flagColor(item.flag)" variant="subtle" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Dokter & Diagnosis -->
      <div v-show="activeTab === 'doctor'" class="mr-panel space-y-4">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold">
              Catatan & Kesimpulan Dokter
            </h3>
          </template>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div class="text-xs text-muted">
                Final Grade
              </div>
              <div class="text-lg font-bold">
                {{ finalGrade }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">
                Fitness Level
              </div>
              <div class="text-lg font-bold">
                {{ fitnessLevel }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">
                Tanggal Dokter Approve
              </div>
              <div class="text-sm font-medium">
                {{ formatDate(mr.doctorApprovedAt) }}
              </div>
            </div>
          </div>
          <div class="mt-4 rounded-md border border-default bg-elevated/40 p-3 text-sm leading-relaxed">
            {{ finalComment }}
          </div>
        </UCard>

        <UCard v-for="dept in physicalDepts" :key="dept.departmentId">
          <template #header>
            <h3 class="text-sm font-semibold">
              {{ dept.departmentName }}
            </h3>
          </template>
          <div class="space-y-3">
            <div v-for="group in dept.groups" :key="group.groupName">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                {{ group.groupName }} — Grade {{ group.grade || group.defaultGrade || '-' }}
              </p>
              <p v-if="group.comment" class="text-sm">
                {{ group.comment }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Kesimpulan -->
      <div v-show="activeTab === 'conclusion'" class="mr-panel">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold">
              Kesimpulan Akhir MCU
            </h3>
          </template>
          <div
            class="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5"
            :class="{
              'border-green-200 bg-green-50': fitTone === 'success',
              'border-amber-200 bg-amber-50': fitTone === 'warning',
              'border-red-200 bg-red-50': fitTone === 'danger'
            }"
          >
            <div>
              <div class="text-xl font-extrabold uppercase text-slate-800">
                {{ fitnessLevel }}
              </div>
              <p class="mt-1 text-sm text-slate-600">
                {{ finalComment }}
              </p>
            </div>
            <div class="text-right text-xs text-muted">
              <div>{{ companyName }}</div>
              <div class="mt-1 font-semibold">
                Grade {{ finalGrade }}
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <div v-else class="py-16 text-center text-sm text-muted">
      Medical record tidak ditemukan.
    </div>
  </div>
</template>

<style scoped>
@media print {
  .mr-tabs {
    display: none !important;
  }
  .mr-panel {
    display: block !important;
  }
}
</style>
