<script setup lang="ts">
import type { PhysicalExamData } from '~/types/physical'
import { formatPhysicalExamination } from '~/utils/physical-examination-report'

const props = defineProps<{
  result: {
    queueCode?: string | null
    company?: string | null
    packageName?: string | null
    checkinAt?: string | null
    exam?: { examCode?: string | null } | null
    patient?: {
      PatientId?: string | null
      firstName?: string | null
      middleName?: string | null
      lastName?: string | null
      gender?: string | null
      dob?: string | null
    } | null
    item?: { name?: string | null, code?: string | null, department?: { name?: string | null } | null } | null
    doctorExam?: {
      status?: string | null
      data?: PhysicalExamData | null
      physicianComment?: string | null
      submittedAt?: string | null
    } | null
  }
}>()

const emit = defineEmits<{ back: [] }>()
const rows = computed(() => props.result.doctorExam?.data
  ? formatPhysicalExamination(props.result.doctorExam.data)
  : [])
const isNormal = (value: string) => value.trim().toLowerCase() === 'no abnormality'
const patientName = computed(() => [props.result.patient?.firstName, props.result.patient?.middleName, props.result.patient?.lastName].filter(Boolean).join(' ') || '-')
const genderLabel = computed(() => props.result.patient?.gender === 'MALE' ? 'Laki-laki' : props.result.patient?.gender === 'FEMALE' ? 'Perempuan' : props.result.patient?.gender || '-')
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}
function ageAtDob(value?: string | null) {
  if (!value) return '-'
  const dob = new Date(value)
  const ref = props.result.checkinAt ? new Date(props.result.checkinAt) : new Date()
  let age = ref.getFullYear() - dob.getFullYear()
  if (ref.getMonth() < dob.getMonth() || (ref.getMonth() === dob.getMonth() && ref.getDate() < dob.getDate())) age--
  return `${Math.max(age, 0)} tahun`
}
</script>

<template>
  <div class="space-y-4 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
          @click="emit('back')"
        >
          Back
        </UButton>
        <div>
          <h2 class="font-semibold text-highlighted">
            {{ result.item?.name || 'Physical Examination' }}
          </h2>
          <p class="text-xs text-muted">
            {{ patientName }} · {{ result.item?.department?.name || '-' }}
          </p>
        </div>
      </div>
      <UBadge :color="result.doctorExam?.status === 'SUBMITTED' ? 'success' : 'warning'" variant="soft">
        {{ result.doctorExam?.status || 'DRAFT' }}
      </UBadge>
    </div>

    <UCard>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="text-xs text-muted">
            Nama Pasien
          </p>
          <p class="mt-1 font-semibold text-highlighted">
            {{ patientName }}
          </p>
          <p class="text-xs text-muted">
            {{ result.patient?.PatientId || '-' }} · {{ result.queueCode || '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Jenis Kelamin / Umur
          </p>
          <p class="mt-1 font-semibold">
            {{ genderLabel }} · {{ ageAtDob(result.patient?.dob) }}
          </p>
          <p class="text-xs text-muted">
            Lahir {{ formatDate(result.patient?.dob) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Perusahaan / Paket
          </p>
          <p class="mt-1 font-semibold">
            {{ result.company || '-' }}
          </p>
          <p class="text-xs text-muted">
            {{ result.packageName || '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            Pemeriksaan
          </p>
          <p class="mt-1 font-semibold">
            {{ result.exam?.examCode || '-' }}
          </p>
          <p class="text-xs text-muted">
            {{ formatDate(result.checkinAt) }}
          </p>
        </div>
      </div>
    </UCard>

    <UCard class="overflow-hidden">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold">
              Physical Examination
            </h3>
            <p class="text-xs text-muted">
              Result approved dari department
            </p>
          </div>
          <span v-if="rows.every(row => isNormal(row.value))" class="text-xs font-semibold text-success">✓ Normal</span>
          <UBadge v-else color="error" variant="soft">
            ⚠ {{ rows.filter(row => !isNormal(row.value)).length }} abnormal
          </UBadge>
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[680px] text-sm">
          <thead class="bg-elevated/50 text-left text-xs text-muted">
            <tr>
              <th class="border-b border-default px-4 py-3">
                Item
              </th>
              <th class="border-b border-default px-4 py-3">
                Result
              </th>
              <th class="border-b border-default px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="`${row.label}-${row.value}`">
              <td class="border-b border-default px-4 py-3 font-medium text-highlighted">
                {{ row.label }}
              </td>
              <td class="border-b border-default px-4 py-3" :class="isNormal(row.value) ? '' : 'font-semibold text-error'">
                {{ row.value }}
              </td>
              <td class="border-b border-default px-4 py-3">
                <UBadge :color="isNormal(row.value) ? 'success' : 'error'" variant="subtle">
                  {{ isNormal(row.value) ? 'Normal' : 'Abnormal' }}
                </UBadge>
              </td>
            </tr>
            <tr v-if="result.doctorExam?.physicianComment">
              <td class="px-4 py-3 font-medium text-highlighted">
                Physician comments
              </td>
              <td colspan="2" class="px-4 py-3">
                {{ result.doctorExam.physicianComment }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
