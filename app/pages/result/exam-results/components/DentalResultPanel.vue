<script setup lang="ts">
import DentalExamPanel from '~/components/DentalExamPanel.vue'
import DentalResultDisplay from '~/components/dental/DentalResultDisplay.vue'
import type { DentalExamData } from '~/types/dental'

const props = defineProps<{
  examId: string
  examItemId: string
  roomTypeId?: string
  departmentId?: string
  resultStatus?: string | null
  submittedBy?: number | null
}>()

const emit = defineEmits<{ approved: [] }>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const data = ref<DentalExamData | null>(null)
const editing = ref(false)
const saving = ref(false)
const approving = ref(false)

const canApprove = computed(() => data.value?.canApproveDepartment === true)

const approvalStatus = computed<{ label: string, color: 'success' | 'warning' | 'info' | 'neutral' | 'error' }>(() => {
  switch (props.resultStatus) {
    case 'DEPARTMENT_APPROVED': return { label: `Approved by ${data.value?.doctorName || 'Dokter'}`, color: 'success' }
    case 'DEPARTMENT_REVIEW': return { label: 'Menunggu Approval', color: 'warning' }
    case 'RETURNED_TO_DEPARTMENT': return { label: 'Dikembalikan', color: 'error' }
    default: return { label: 'Belum Disubmit', color: 'neutral' }
  }
})

async function handleApprove() {
  if (!props.examId || !props.departmentId || approving.value) return
  approving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/department-result/approve`, { departmentId: props.departmentId })
    toast.add({ title: 'Disetujui', description: 'Hasil dental disetujui departemen.', color: 'success' })
    emit('approved')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal approve.'
    toast.add({ title: 'Gagal approve', description: message, color: 'error' })
  } finally {
    approving.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await api.get(`/mcu/exams/${props.examId}/dental`)
    data.value = (res.data?.data ?? res.data ?? null) as DentalExamData | null
    if (data.value) editing.value = data.value.canEdit && data.value.status !== 'SUBMITTED'
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

function handleSaved() {
  loadData()
}

const isSubmitted = computed(() => data.value?.status === 'SUBMITTED')
const canEdit = computed(() => data.value?.canEdit === true)
const canPrint = computed(() => props.resultStatus === 'DEPARTMENT_APPROVED')

function printDental() {
  window.open(`/rooms/dental/print/${props.examId}`, '_blank')
}
</script>

<template>
  <UCard class="overflow-hidden border border-default/80 shadow-sm">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow">
            <UIcon name="i-lucide-stethoscope" class="size-5" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-highlighted">
              Pemeriksaan Gigi (Dental)
            </h3>
            <p class="text-xs text-muted">
              {{ isSubmitted ? 'Hasil sudah disubmit' : canEdit ? 'Bisa diedit sebelum submit' : 'Dental examination' }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            :label="isSubmitted ? 'Submitted' : data?.status === 'DRAFT' ? 'Draft' : 'Ready'"
            :color="isSubmitted ? 'success' : 'warning'"
            variant="soft"
          />
          <UBadge :label="approvalStatus.label" :color="approvalStatus.color" variant="soft" />
          <UButton
            v-if="canPrint"
            color="neutral"
            variant="soft"
            icon="i-lucide-printer"
            size="sm"
            @click="printDental"
          >
            Cetak
          </UButton>
          <UButton
            v-if="canApprove"
            color="success"
            icon="i-lucide-check-circle"
            size="sm"
            :loading="approving"
            @click="handleApprove"
          >
            Approve
          </UButton>
          <UButton
            v-if="canEdit && !editing"
            color="primary"
            variant="soft"
            icon="i-lucide-pencil"
            size="sm"
            @click="editing = true"
          >
            Edit
          </UButton>
        </div>
      </div>
    </template>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-48 w-full" />
    </div>

    <DentalResultDisplay
      v-else-if="data && !editing"
      :data="data"
    />

    <DentalExamPanel
      v-if="data && editing"
      :exam-id="examId"
      :disabled="false"
      @saved="handleSaved"
    />

    <div v-if="data && editing" class="mt-4 flex flex-wrap justify-end gap-2 border-t border-default pt-4">
      <UButton
        color="neutral"
        variant="soft"
        :disabled="saving"
        @click="editing = false"
      >
        Batal
      </UButton>
    </div>

    <UAlert
      v-if="data && !isSubmitted && !editing"
      color="info"
      variant="soft"
      icon="i-lucide-info"
      class="mt-4"
      title="Submit hasil dental"
      description="Klik 'Edit' untuk mengubah data, lalu 'Submit & Release' untuk menyelesaikan. Submit = release langsung, tidak perlu approval MCU doctor."
    />

    <div v-if="isSubmitted" class="mt-3 flex items-center gap-2 text-sm text-success">
      <UIcon name="i-lucide-check-circle-2" class="size-4" />
      <span>Hasil dental sudah disubmit dan di-release.</span>
    </div>
  </UCard>
</template>
