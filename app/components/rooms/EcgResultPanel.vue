<script setup lang="ts">
type Attachment = {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}
type EcgOverview = {
  hasEcg: boolean
  ecg: {
    id: string
    code: string
    name: string
    workStatus: string
    resultStatus: string
    attachments: Attachment[]
    warning?: string | null
    externalAssignment?: {
      status: 'ASSIGNED' | 'PROCESSING' | 'CANCELLED' | 'FILLED'
      assignedExternalUserId?: number | null
    } | null
  }
  treadmill?: {
    id: string
    code: string
    name: string
    clearanceStatus: 'NOT_REQUIRED' | 'PENDING_DOCTOR' | 'APPROVED' | 'REJECTED'
    clearanceReason?: string | null
    questionnaireId?: string | null
  } | null
}

const props = defineProps<{ examId: string, physicalExamAllNormal?: boolean }>()
const api = useApi()
const toast = useToast()
const overview = ref<EcgOverview | null>(null)
const loading = ref(false)
const uploading = ref(false)
const clearanceLoading = ref(false)
const deletingId = ref<string | null>(null)
const downloadingId = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const rejectReason = ref('')

const fileSize = (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`
const externalStatusColor = { ASSIGNED: 'warning', PROCESSING: 'info', CANCELLED: 'neutral', FILLED: 'success' } as const
const canClear = computed(() => !['APPROVED'].includes(overview.value?.treadmill?.clearanceStatus ?? ''))

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
  }
  return fallback
}
function notify(title: string, description: string, color: 'success' | 'error' | 'warning') {
  toast.add({ title, description, color })
}
async function loadOverview() {
  if (!props.examId) return
  loading.value = true
  try {
    const res = await api.get(`/mcu/exams/${props.examId}/ecg`)
    overview.value = res.data?.data ?? res.data ?? null
  } catch (error: unknown) {
    overview.value = null
    if ((error as { response?: { status?: number } })?.response?.status !== 404) {
      notify('Gagal memuat ECG', errorMessage(error, 'Data ECG tidak dapat dimuat.'), 'error')
    }
  } finally {
    loading.value = false
  }
}
async function _uploadFile() {
  if (!selectedFile.value) return
  if (selectedFile.value.type !== 'application/pdf') {
    notify('File tidak valid', 'Hanya file PDF yang dapat diunggah.', 'warning')
    return
  }
  const form = new FormData()
  form.append('file', selectedFile.value)
  uploading.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/ecg/attachments`, form)
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    await loadOverview()
    notify('Berhasil', 'PDF ECG berhasil diunggah.', 'success')
  } catch (error: unknown) {
    notify('Gagal upload PDF', errorMessage(error, 'PDF ECG tidak dapat diunggah.'), 'error')
  } finally {
    uploading.value = false
  }
}
async function downloadAttachment(attachment: Attachment) {
  downloadingId.value = attachment.id
  try {
    const res = await api.get(`/mcu/exams/${props.examId}/ecg/attachments/${attachment.id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error: unknown) {
    notify('Gagal membuka PDF', errorMessage(error, 'PDF ECG tidak dapat dibuka.'), 'error')
  } finally {
    downloadingId.value = null
  }
}
async function _deleteAttachment(attachment: Attachment) {
  if (!window.confirm(`Archive attachment ${attachment.originalName}?`)) return
  deletingId.value = attachment.id
  try {
    await api.delete(`/mcu/exams/${props.examId}/ecg/attachments/${attachment.id}`)
    await loadOverview()
    notify('Berhasil', 'Attachment ECG dihapus.', 'success')
  } catch (error: unknown) {
    notify('Gagal menghapus', errorMessage(error, 'Attachment ECG tidak dapat dihapus.'), 'error')
  } finally {
    deletingId.value = null
  }
}
async function submitClearance(decision: 'APPROVE' | 'REJECT') {
  if (decision === 'REJECT' && !rejectReason.value.trim()) {
    notify('Alasan wajib diisi', 'Masukkan alasan penolakan treadmill.', 'warning')
    return
  }
  clearanceLoading.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/ecg/clearance`, { decision, reason: rejectReason.value.trim() || undefined })
    rejectReason.value = ''
    await loadOverview()
    notify('Berhasil', decision === 'APPROVE' ? 'Treadmill dibuka ke queue.' : 'Treadmill ditolak.', 'success')
  } catch (error: unknown) {
    notify('Gagal memproses clearance', errorMessage(error, 'Clearance treadmill tidak dapat diproses.'), 'error')
  } finally {
    clearanceLoading.value = false
  }
}
watch(() => props.examId, loadOverview, { immediate: true })
</script>

<template>
  <UCard v-if="loading || overview?.hasEcg" class="border border-primary/20 shadow-sm">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-primary">
            MCU ECG
          </p>
          <h3 class="mt-1 text-base font-semibold text-highlighted">
            Hasil ECG & clearance treadmill
          </h3>
          <UBadge
            v-if="overview?.ecg?.externalAssignment"
            :color="externalStatusColor[overview.ecg.externalAssignment.status]"
            variant="subtle"
            class="mt-2"
          >
            Dokter luar: {{ overview.ecg.externalAssignment.status }}
          </UBadge>
        </div>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="loading"
          aria-label="Refresh ECG"
          @click="loadOverview"
        />
      </div>
    </template>

    <USkeleton v-if="loading" class="h-24 rounded-xl" />
    <div v-else-if="overview" class="space-y-4">
      <UAlert
        v-if="overview.ecg.warning"
        color="warning"
        icon="i-lucide-triangle-alert"
        title="PDF ECG belum diupload"
        :description="overview.ecg.warning"
      />

      <div v-if="overview.ecg.attachments.length" class="space-y-2">
        <p class="text-sm font-medium text-highlighted">
          Attachment ECG
        </p>
        <div v-for="attachment in overview.ecg.attachments" :key="attachment.id" class="flex flex-wrap items-center gap-3 rounded-lg border border-default px-3 py-2">
          <UIcon name="i-lucide-file-text" class="size-5 text-primary" />
          <UButton
            class="min-w-0 flex-1 justify-start truncate"
            color="primary"
            variant="link"
            :loading="downloadingId === attachment.id"
            @click="downloadAttachment(attachment)"
          >
            {{ attachment.originalName }}
          </UButton>
          <span class="text-xs text-muted">{{ fileSize(attachment.sizeBytes) }}</span>
        </div>
      </div>

      <div v-if="overview.treadmill" class="rounded-xl border border-default p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-highlighted">
              Treadmill clearance
            </p>
            <p class="mt-1 text-xs text-muted">
              Questionnaire: {{ overview.treadmill.questionnaireId || 'Belum dikonfigurasi' }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge :label="overview.treadmill.clearanceStatus" :color="overview.treadmill.clearanceStatus === 'APPROVED' ? 'success' : overview.treadmill.clearanceStatus === 'REJECTED' ? 'error' : 'warning'" variant="subtle" />
            <UButton
              v-if="canClear"
              color="error"
              variant="soft"
              size="xs"
              :loading="clearanceLoading"
              @click="submitClearance('REJECT')"
            >
              Reject treadmill
            </UButton>
            <UButton
              v-if="canClear && props.physicalExamAllNormal"
              color="success"
              size="xs"
              :loading="clearanceLoading"
              @click="submitClearance('APPROVE')"
            >
              Approve & buka treadmill
            </UButton>
            <UBadge
              v-if="canClear && !props.physicalExamAllNormal"
              label="Menunggu Physical Done"
              color="warning"
              variant="soft"
            />
          </div>
        </div>
        <p v-if="overview.treadmill.clearanceReason" class="mt-3 text-sm text-error">
          Alasan: {{ overview.treadmill.clearanceReason }}
        </p>
        <div v-if="canClear" class="mt-4 space-y-3">
          <UAlert
            v-if="props.physicalExamAllNormal === false"
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Clearance menunggu hasil Physical Examination"
            description="Treadmill dapat di-approve setelah seluruh hasil Physical Examination menunjukkan No Abnormality."
          />
          <UTextarea v-model="rejectReason" placeholder="Alasan reject treadmill (wajib saat reject)" :rows="2" />
          <p v-if="props.physicalExamAllNormal === false" class="text-xs text-muted">
            Approve hanya tersedia setelah seluruh hasil Physical Examination No Abnormality.
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
