<script setup lang="ts">
import type { PhysicalExamData, PhysicalSection } from '~/types/physical'
import { createPhysicalExamData, formatPhysicalExamination } from '~/utils/physical-examination-report'

type LegacyRow = { id: string, label: string, value: string, uom?: string | null, flag?: 'normal' | 'abnormal' | null }

const props = withDefaults(defineProps<{
  examId: string
  examItemId: string
  disabled?: boolean
  legacyResults?: LegacyRow[]
}>(), { disabled: false, legacyResults: () => [] })
const emit = defineEmits<{ saved: [], submitted: [] }>()
const api = useApi()
const toast = useToast()
const data = ref<PhysicalExamData>(createPhysicalExamData())
const physicianComment = ref('Dalam batas normal.')
const status = ref('DRAFT')
const loaded = ref(false)
const loading = ref(false)
const saving = ref(false)
const confirmSubmit = ref(false)
const canEdit = ref(true)
const canSubmit = ref(true)

const editable = computed(() => !props.disabled && canEdit.value && status.value !== 'SUBMITTED')
const sectionStatus = (section: PhysicalSection) => section.normal
  ? 'NORMAL'
  : section.findings.some(finding => finding.value)
    && section.findings.filter(finding => finding.value && finding.detail_required_when === 'YES').every(finding => finding.detail?.trim())
    ? 'ABNORMAL_COMPLETE'
    : 'INCOMPLETE'
const incomplete = computed(() => data.value.sections.filter(section => sectionStatus(section) === 'INCOMPLETE'))
const abnormalCount = computed(() => data.value.sections.filter(section => !section.normal).length)
const preview = computed(() => formatPhysicalExamination(data.value))

function setNormal(section: PhysicalSection, normal: boolean) {
  section.normal = normal
  if (normal) {
    section.findings.forEach((finding) => {
      finding.value = false
      finding.detail = ''
    })
  }
}

function normalizeLoaded(value: unknown): PhysicalExamData {
  if (!value || typeof value !== 'object' || !Array.isArray((value as PhysicalExamData).sections)) return createPhysicalExamData()
  const loadedData = value as PhysicalExamData
  const defaults = createPhysicalExamData()
  return {
    sections: defaults.sections.map((section) => {
      const saved = loadedData.sections.find(candidate => candidate.code === section.code && (candidate.side ?? null) === (section.side ?? null))
      if (!saved) return section
      return { ...section, normal: saved.normal !== false, findings: section.findings.map(finding => ({ ...finding, ...saved.findings?.find(candidate => candidate.key === finding.key) })) }
    })
  }
}

async function load() {
  if (!props.examId || !props.examItemId) return
  loading.value = true
  try {
    const res = await api.get(`/mcu/exams/${props.examId}/doctor-exams/${props.examItemId}`)
    const payload = res.data?.data ?? res.data ?? {}
    data.value = normalizeLoaded(payload.data)
    physicianComment.value = payload.physicianComment ?? (data.value.sections.every(section => section.normal) ? 'Dalam batas normal.' : '')
    status.value = payload.status ?? 'DRAFT'
    canEdit.value = payload.canEdit !== false
    canSubmit.value = payload.canSubmit !== false
    loaded.value = true
  } catch (error: unknown) {
    const code = (error as { response?: { status?: number } })?.response?.status
    if (code !== 404) toast.add({ title: 'Gagal memuat', description: 'Hasil pemeriksaan fisik tidak dapat dimuat.', color: 'error' })
  } finally { loading.value = false }
}

function body() {
  return { rendererKey: 'PHYSICAL_EXAMINATION', data: data.value, physicianComment: physicianComment.value.trim() || null }
}

async function saveDraft(showToast = true) {
  saving.value = true
  try {
    const res = await api.post(`/mcu/exams/${props.examId}/doctor-exams/${props.examItemId}`, body())
    status.value = res.data?.data?.status ?? 'DRAFT'
    loaded.value = true
    if (showToast) toast.add({ title: 'Draft tersimpan', description: 'Pemeriksaan fisik dapat dilanjutkan nanti.', color: 'success' })
    emit('saved')
    return true
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Draft tidak dapat disimpan.'
    toast.add({ title: 'Gagal menyimpan', description: message, color: 'error' })
    return false
  } finally { saving.value = false }
}

async function submit() {
  if (incomplete.value.length) return
  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/doctor-exams/${props.examItemId}`, body())
    const res = await api.post(`/mcu/exams/${props.examId}/doctor-exams/${props.examItemId}/submit`, body())
    status.value = res.data?.data?.status ?? 'SUBMITTED'
    loaded.value = true
    confirmSubmit.value = false
    toast.add({ title: 'Pemeriksaan disubmit', description: 'Hasil pemeriksaan fisik masuk workflow department.', color: 'success' })
    emit('submitted')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Pemeriksaan tidak dapat disubmit.'
    toast.add({ title: 'Gagal submit', description: message, color: 'error' })
  } finally { saving.value = false }
}

onMounted(load)
watch(() => [props.examId, props.examItemId], load)
</script>

<template>
  <div class="space-y-4">
    <UAlert v-if="loading" color="neutral" title="Memuat pemeriksaan fisik..." />

    <div v-else-if="!loaded && legacyResults.length" class="overflow-hidden rounded-xl border border-default">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-elevated/40 px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          <h4 class="truncate font-semibold">
            Physical Exam
          </h4>
          <small class="text-xs text-muted">Result approved dari department</small>
        </div>
        <span class="text-xs font-semibold" :class="legacyResults.every(row => !row.flag || row.flag === 'normal') ? 'text-success' : 'text-error'">
          {{ legacyResults.every(row => !row.flag || row.flag === 'normal') ? '✓ Normal' : `⚠ ${legacyResults.filter(row => row.flag && row.flag !== 'normal').length} abnormal` }}
        </span>
      </div>
      <div class="p-4">
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div v-for="row in legacyResults" :key="row.id" class="rounded-lg border border-default bg-default px-3 py-2">
            <p class="text-xs text-muted">
              {{ row.label }}
            </p>
            <p class="text-sm font-semibold" :class="row.flag === 'abnormal' ? 'text-error' : 'text-highlighted'">
              {{ row.value }}<span v-if="row.uom" class="ml-1 text-xs font-normal text-muted">{{ row.uom }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <UAlert
      v-else-if="!loaded && disabled"
      color="neutral"
      variant="soft"
      title="Hasil pemeriksaan lama"
      description="Pemeriksaan ini dibuat sebelum format terstruktur dan tidak memiliki data fisik terstruktur."
    />

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-semibold text-highlighted">
            Physical Examination
          </h3><p class="text-xs text-muted">
            Hasil terstruktur per bagian
          </p>
        </div>
        <div class="flex gap-2">
          <UBadge :label="status" color="primary" variant="soft" /><UBadge :label="`${abnormalCount} abnormal`" :color="abnormalCount ? 'warning' : 'success'" variant="soft" />
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]">
        <div class="space-y-3">
          <section v-for="section in data.sections" :key="`${section.code}-${section.side ?? ''}`" class="rounded-xl border border-default p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <strong class="text-sm">{{ section.label }}{{ section.side ? ` · ${section.side === 'RIGHT' ? 'Right' : 'Left'}` : '' }}</strong>
              <UBadge :label="sectionStatus(section).replace('_', ' ')" :color="sectionStatus(section) === 'NORMAL' ? 'success' : sectionStatus(section) === 'INCOMPLETE' ? 'error' : 'warning'" variant="soft" />
            </div>
            <div class="mt-3 flex gap-2">
              <UButton
                size="sm"
                :disabled="!editable"
                :color="section.normal ? 'success' : 'neutral'"
                :variant="section.normal ? 'solid' : 'outline'"
                @click="setNormal(section, true)"
              >
                No abnormality
              </UButton>
              <UButton
                size="sm"
                :disabled="!editable"
                :color="!section.normal ? 'warning' : 'neutral'"
                :variant="!section.normal ? 'solid' : 'outline'"
                @click="setNormal(section, false)"
              >
                Abnormality found
              </UButton>
            </div>
            <div v-if="!section.normal" class="mt-3 grid gap-2 md:grid-cols-2">
              <div v-for="finding in section.findings" :key="finding.key" class="rounded-lg border border-default p-3">
                <UCheckbox v-model="finding.value" :disabled="!editable" :label="finding.label" />
                <UInput
                  v-if="finding.value && finding.detail_required_when === 'YES'"
                  v-model="finding.detail"
                  class="mt-2 w-full"
                  :disabled="!editable"
                  :placeholder="`${finding.label} detail (wajib)`"
                />
              </div>
            </div>
            <p v-if="sectionStatus(section) === 'INCOMPLETE'" class="mt-2 text-xs text-error">
              Pilih minimal satu temuan. Lengkapi detail wajib.
            </p>
          </section>
          <UFormField label="Physician comments">
            <UTextarea
              v-model="physicianComment"
              :disabled="!editable"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>

        <aside class="xl:sticky xl:top-4 xl:self-start">
          <UCard>
            <template #header>
              <strong class="text-sm">Report Preview</strong>
            </template><div class="space-y-2 text-sm">
              <p v-for="row in preview" :key="`${row.label}-${row.value}`" class="border-b border-default pb-2 last:border-0">
                {{ row.label }} : {{ row.value }}
              </p><p class="pt-2 font-medium">
                Physician comments: {{ physicianComment || '-' }}
              </p>
            </div>
          </UCard>
        </aside>
      </div>

      <UAlert
        v-if="incomplete.length"
        color="warning"
        title="Pemeriksaan belum lengkap"
        :description="`${incomplete.length} bagian abnormal belum memiliki temuan/detail lengkap.`"
      />
      <div v-if="editable" class="flex justify-end gap-2 border-t border-default pt-4">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-save"
          :loading="saving"
          @click="saveDraft()"
        >
          Save Draft
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-send"
          :disabled="Boolean(incomplete.length) || !canSubmit"
          :loading="saving"
          @click="confirmSubmit = true"
        >
          Selesaikan Pemeriksaan
        </UButton>
      </div>
    </template>

    <UModal
      v-model:open="confirmSubmit"
      :dismissible="false"
      :close="false"
      title="Konfirmasi submit pemeriksaan fisik"
    >
      <template #body>
        <p class="text-sm">
          Pastikan seluruh hasil sudah benar. Setelah submit, hasil masuk workflow department.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="confirmSubmit = false">
            Kembali
          </UButton><UButton :loading="saving" @click="submit">
            Ya, submit
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
