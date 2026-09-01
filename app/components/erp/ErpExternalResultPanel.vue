<script setup lang="ts">
type Assignment = {
  id: string
  status: 'ASSIGNED' | 'PROCESSING' | 'CANCELLED' | 'FILLED'
  assignedExternalUserId?: number | null
  attachmentUrl?: string | null
  assignedExternalUser?: { id: number, name: string } | null
}
type Doctor = { id: number, name: string }
type UserRow = {
  id: number | string
  name: string
  isExternal?: boolean
  roles?: Array<{ role?: { name?: string } | null }>
}

const props = withDefaults(defineProps<{
  examId: string
  examItemId: string
  assignment?: Assignment | null
  requiresAttachmentForDone?: boolean
  disabled?: boolean
}>(), {
  assignment: null,
  requiresAttachmentForDone: false,
  disabled: false
})
const emit = defineEmits<{ updated: [] }>()
const api = useApi()
const toast = useToast()
const doctors = ref<Doctor[]>([])
const loadingDoctors = ref(false)
const doctorsError = ref('')
const doctorSelection = ref<number | Doctor>()
const pdf = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const action = ref<'assign' | 'cancel' | 'upload' | 'open' | null>(null)

const statusMeta = {
  ASSIGNED: { label: 'Ditugaskan', color: 'warning' },
  PROCESSING: { label: 'Sedang Diproses', color: 'info' },
  CANCELLED: { label: 'Dibatalkan', color: 'neutral' },
  FILLED: { label: 'Hasil diisi', color: 'success' }
} as const
const doctorName = computed(() =>
  props.assignment?.assignedExternalUser?.name
  || doctors.value.find(item => item.id === props.assignment?.assignedExternalUserId)?.name
  || 'Dokter luar terpilih'
)
const selectedDoctorId = computed(() => {
  const value = doctorSelection.value
  return typeof value === 'number' ? value : value?.id
})
const canAssign = computed(() => !props.disabled && !action.value && Boolean(selectedDoctorId.value))

watch(() => props.assignment?.assignedExternalUserId, (value) => {
  doctorSelection.value = value ?? undefined
}, { immediate: true })

function errorText(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: unknown } }, message?: string }
  const detail = value?.response?.data?.message
  return typeof detail === 'string' ? detail : value?.message || fallback
}

async function loadDoctors() {
  loadingDoctors.value = true
  doctorsError.value = ''
  try {
    const response = await api.get('/mcu/exams/external-doctors')
    const payload = response.data?.data ?? response.data
    const rows: UserRow[] = Array.isArray(payload)
      ? payload as UserRow[]
      : Array.isArray(payload?.data)
        ? payload.data as UserRow[]
        : []
    doctors.value = rows
      .map(user => ({ id: Number(user.id), name: String(user.name) }))
    if (!doctors.value.length) {
      doctorsError.value = 'Belum ada dokter luar aktif. Admin perlu mengaktifkan opsi Dokter luar pada master pengguna.'
    }
  } catch (error: unknown) {
    doctorsError.value = errorText(error, 'Daftar dokter luar tidak dapat dimuat.')
  } finally {
    loadingDoctors.value = false
  }
}

function pickPdf(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.files?.[0] ?? null
  if (!value) return
  if (value.type !== 'application/pdf' || value.size > 10 * 1024 * 1024) {
    pdf.value = null
    input.value = ''
    toast.add({ title: 'PDF tidak valid', description: 'Gunakan PDF maksimal 10 MB.', color: 'warning' })
    return
  }
  pdf.value = value
}

async function assign() {
  if (!canAssign.value) return
  action.value = 'assign'
  try {
    await api.post(`/mcu/exams/${props.examId}/assign-external`, {
      examItemId: props.examItemId,
      externalUserId: selectedDoctorId.value
    })
    toast.add({ title: 'Dokter luar ditugaskan', color: 'success' })
    emit('updated')
  } catch (error: unknown) {
    toast.add({ title: 'Gagal menugaskan dokter', description: errorText(error, 'Penugasan gagal.'), color: 'error' })
  } finally { action.value = null }
}

async function cancel() {
  if (props.disabled || props.assignment?.status !== 'ASSIGNED') return
  action.value = 'cancel'
  try {
    await api.post(`/mcu/exams/${props.examId}/cancel-external`, { examItemId: props.examItemId })
    doctorSelection.value = undefined
    toast.add({ title: 'Penugasan dibatalkan', color: 'success' })
    emit('updated')
  } catch (error: unknown) {
    toast.add({ title: 'Gagal membatalkan', description: errorText(error, 'Pembatalan gagal.'), color: 'error' })
  } finally { action.value = null }
}

async function upload() {
  if (!pdf.value || props.disabled || props.assignment?.status !== 'ASSIGNED') return
  action.value = 'upload'
  try {
    const body = new FormData()
    body.append('examItemId', props.examItemId)
    body.append('attachment', pdf.value)
    await api.post(`/mcu/exams/${props.examId}/external-attachment`, body, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    pdf.value = null
    if (fileInput.value) fileInput.value.value = ''
    toast.add({ title: 'PDF berhasil diunggah', color: 'success' })
    emit('updated')
  } catch (error: unknown) {
    toast.add({ title: 'Gagal mengunggah PDF', description: errorText(error, 'Upload gagal.'), color: 'error' })
  } finally { action.value = null }
}

async function openPdf() {
  if (!props.assignment?.attachmentUrl) return
  action.value = 'open'
  try {
    const response = await api.get(
      `/mcu/exams/${props.examId}/external-attachment/${props.examItemId}/download`,
      { responseType: 'blob' }
    )
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (error: unknown) {
    toast.add({ title: 'PDF tidak dapat dibuka', description: errorText(error, 'Coba lagi.'), color: 'error' })
  } finally { action.value = null }
}

onMounted(loadDoctors)
</script>

<template>
  <section class="rounded-xl border border-default bg-muted/20 p-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h4 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon name="i-lucide-stethoscope" class="size-5 text-primary" />
          Hasil dokter luar
        </h4>
        <p class="mt-1 text-xs text-muted">
          Tugaskan dokter luar, lalu unggah PDF hasil untuk item ini.
        </p>
      </div>
      <UBadge
        :label="requiresAttachmentForDone ? 'PDF wajib' : 'PDF dapat menyusul'"
        :color="requiresAttachmentForDone ? 'warning' : 'neutral'"
        variant="soft"
      />
      <UBadge
        v-if="assignment"
        :label="statusMeta[assignment.status].label"
        :color="statusMeta[assignment.status].color"
        variant="soft"
      />
      <UBadge
        v-else
        label="Belum ditugaskan"
        color="neutral"
        variant="soft"
      />
    </div>

    <UAlert
      v-if="disabled"
      class="mt-4"
      color="neutral"
      variant="soft"
      title="Mulai item untuk mengelola hasil dokter luar"
    />
    <UAlert
      v-if="doctorsError"
      class="mt-4"
      color="warning"
      variant="soft"
      title="Daftar dokter luar tidak tersedia"
      :description="doctorsError"
    >
      <template #actions>
        <UButton
          size="xs"
          color="warning"
          variant="soft"
          :loading="loadingDoctors"
          @click="loadDoctors"
        >
          Coba lagi
        </UButton>
      </template>
    </UAlert>

    <div v-if="!assignment || assignment.status === 'CANCELLED'" class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <UFormField label="Dokter luar" required>
        <USelectMenu
          v-model="doctorSelection"
          :items="doctors"
          value-key="id"
          label-key="name"
          placeholder="Pilih dokter luar"
          :loading="loadingDoctors"
          :disabled="disabled || loadingDoctors || !doctors.length"
          class="w-full"
        />
      </UFormField>
      <UButton
        class="w-full self-end sm:w-auto"
        icon="i-lucide-user-check"
        :loading="action === 'assign'"
        :disabled="!canAssign"
        @click="assign"
      >
        Tugaskan
      </UButton>
    </div>

    <div
      v-if="!assignment || assignment.status === 'CANCELLED'"
      class="mt-4 rounded-lg border border-dashed border-default bg-default/60 p-3 text-sm text-muted"
    >
      Upload PDF tersedia setelah dokter luar berhasil ditugaskan.
    </div>

    <div v-else class="mt-4 space-y-4">
      <dl class="grid gap-3 rounded-lg border border-default bg-default p-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-xs uppercase tracking-wide text-muted">
            Dokter
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ doctorName }}
          </dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-muted">
            Dokumen PDF
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ assignment.attachmentUrl ? 'Sudah tersedia' : 'Belum diunggah' }}
          </dd>
        </div>
      </dl>

      <template v-if="assignment.status === 'ASSIGNED'">
        <UFormField label="Dokumen hasil PDF" help="Format PDF, maksimal 10 MB." required>
          <input
            ref="fileInput"
            type="file"
            accept="application/pdf,.pdf"
            :disabled="disabled || Boolean(action)"
            class="block min-h-10 w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @change="pickPdf"
          >
        </UFormField>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <UButton
            class="w-full sm:w-auto"
            variant="soft"
            icon="i-lucide-upload"
            :loading="action === 'upload'"
            :disabled="disabled || !pdf || Boolean(action)"
            @click="upload"
          >
            {{ assignment.attachmentUrl ? 'Ganti PDF' : 'Upload PDF' }}
          </UButton>
          <UButton
            class="w-full sm:w-auto"
            color="error"
            variant="soft"
            icon="i-lucide-user-x"
            :loading="action === 'cancel'"
            :disabled="disabled || Boolean(action)"
            @click="cancel"
          >
            Batalkan penugasan
          </UButton>
        </div>
      </template>

      <UButton
        v-if="assignment.attachmentUrl"
        color="neutral"
        variant="outline"
        icon="i-lucide-file-text"
        :loading="action === 'open'"
        :disabled="Boolean(action)"
        @click="openPdf"
      >
        Buka PDF hasil
      </UButton>
    </div>
  </section>
</template>
