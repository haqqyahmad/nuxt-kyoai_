<!-- app/components/mcu/McuPrintTemplateModal.vue
     Editor + preview template print hasil MCU.
     - Template tersimpan di DB (versi aktif), hanya disanitasi server.
     - Preview memakai data nyata exam via iframe sandbox (tanpa script).
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMcuReportPrint, type McuPrintPayload } from '~/composables/mcu/useMcuReportPrint'

const props = defineProps<{
  examId: string
}>()

const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const toast = useToast()
const { loadPrintData, renderMcuReportHtml } = useMcuReportPrint()

const template = ref('')
const editorTheme = ref<'light' | 'dark'>('light')
const versions = ref<Array<{ id: string, version: number, isActive: boolean, createdAt: string }>>([])
const loading = ref(false)
const saving = ref(false)
const previewOpen = ref(false)
const previewHtml = ref('')

const PRINT_TEMPLATE_KEY = '__mcu_draft_template__'

// Variabel yang boleh dipakai template (help box)
const availableVars = [
  { var: '{{ patient.name }}', desc: 'Nama pasien' },
  { var: '{{ patient.patientId }}', desc: 'No. pasien' },
  { var: '{{ patient.gender }}', desc: 'Jenis kelamin (M/F)' },
  { var: '{{ patient.age }}', desc: 'Umur' },
  { var: '{{ patient.dob }}', desc: 'Tanggal lahir' },
  { var: '{{ patient.company }}', desc: 'Perusahaan' },
  { var: '{{ patient.address }}', desc: 'Alamat' },
  { var: '{{ patient.position }}', desc: 'Posisi kerja' },
  { var: '{{ patient.package }}', desc: 'Jenis paket MCU' },
  { var: '{{ editions.length }}', desc: 'Jumlah kedatangan' },
  { var: '{{ editions.0/1/2.examCode }}', desc: 'Kode edisi' },
  { var: '{{ editions.0/1/2.examDate }}', desc: 'Tanggal edisi' },
  { var: '{{ resultPages }}', desc: 'Halaman hasil (loop {% for page in resultPages %})' },
  { var: '{{ gradeRowsLeft/Right }}', desc: 'Tabel grade (loop)' },
  { var: '{{ submission.finalGrade }}', desc: 'Grade akhir' },
  { var: '{{ submission.fitnessLevel }}', desc: 'Kebugaran' },
  { var: '{{ submission.finalComment }}', desc: 'Komentar dokter' },
  { var: '{{ submission.internalNote }}', desc: 'Catatan internal' },
  { var: '{{ submission.doctorName }}', desc: 'Nama dokter' },
  { var: '{{ attachments }}', desc: 'Daftar lampiran PDF (loop {% for a in attachments %})' }
]

function loadVersions() {
  return api.get('/mcu/print-templates/versions').then((res) => {
    versions.value = ((res.data?.data ?? res.data) ?? []) as Array<{ id: string, version: number, isActive: boolean, createdAt: string }>
  })
}

async function loadTemplate() {
  loading.value = true
  try {
    const res = await api.get('/mcu/print-templates')
    const active = res.data?.data ?? res.data
    // Prioritas draft lokal, fallback versi aktif DB
    const draft = localStorage.getItem(PRINT_TEMPLATE_KEY)
    template.value = draft ?? active?.html ?? ''
    await loadVersions()
  } catch (err) {
    const msg = (err as { response?: { data?: { message?: string } }, message?: string })?.response?.data?.message || (err as { message?: string })?.message || 'Gagal memuat template'
    toast.add({ title: 'Error', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

function useVersion(version: { id: string, version: number }) {
  api.get(`/mcu/print-templates/versions/${version.id}`).then((res) => {
    const row = res.data?.data ?? res.data
    if (row?.html) template.value = row.html
  }).catch(() => {
    toast.add({ title: 'Gagal', description: 'Tidak dapat memuat versi template', color: 'error' })
  })
}

async function runPreview() {
  const payload = await loadPrintData(props.examId)
  if (!payload) return
  const draft: McuPrintPayload = { ...payload, printTemplate: template.value }
  previewHtml.value = renderMcuReportHtml(draft)
  previewOpen.value = true
}

async function saveTemplate() {
  if (!template.value.trim() || saving.value) return
  saving.value = true
  try {
    const res = await api.post('/mcu/print-templates', { html: template.value })
    const saved = res.data?.data ?? res.data
    toast.add({ title: 'Tersimpan', description: `Template versi ${saved.version ?? ''} disimpan`, color: 'success' })
    localStorage.removeItem(PRINT_TEMPLATE_KEY)
    await loadVersions()
  } catch (err) {
    const msg = (err as { response?: { data?: { message?: string } }, message?: string })?.response?.data?.message || (err as { message?: string })?.message || 'Gagal menyimpan template'
    toast.add({ title: 'Gagal menyimpan', description: msg, color: 'error' })
  } finally {
    saving.value = false
  }
}

function resetDraft() {
  localStorage.removeItem(PRINT_TEMPLATE_KEY)
  loadTemplate()
}

watch(open, (val) => {
  if (val) loadTemplate()
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-[90vw] max-h-[92vh] overflow-hidden' }">
    <template #content>
      <UCard class="flex h-[92vh] max-h-[92vh] flex-col" :ui="{ body: 'flex min-h-0 flex-1 flex-col overflow-hidden p-0', footer: 'shrink-0' }">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">
                Template Print Hasil MCU
              </h2>
              <p class="text-sm text-muted">
                Tersimpan terversi; disanitasi server. Script/iframe/event handler otomatis dibuang.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <USelect
                v-if="versions.length"
                :items="versions.map(v => ({ label: `Versi ${v.version}${v.isActive ? ' (aktif)' : ''}`, value: v.id }))"
                placeholder="Muat versi lain"
                class="w-48"
                @update:model-value="useVersion"
              />
              <USelect
                v-model="editorTheme"
                :items="[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]"
                class="w-32"
              />
            </div>
          </div>
        </template>

        <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:flex-row">
          <!-- Editor -->
          <div class="flex min-h-0 min-w-0 flex-1 flex-col">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-semibold text-muted" v-text="'HTML (Jinja-like: {{ var }}, {% for %}, {% if %})'" />
              <span class="text-xs text-muted">{{ template.length.toLocaleString() }} chars</span>
            </div>
            <McuTemplateCodeEditor v-model="template" :theme="editorTheme" class="min-h-0 flex-1" />
          </div>

          <!-- Variabel help -->
          <aside class="min-h-0 w-full shrink-0 rounded border lg:w-64">
            <p class="border-b p-2 text-xs font-semibold text-muted">
              Variabel tersedia
            </p>
            <div class="variable-scroll max-h-[40vh] min-h-0 space-y-1.5 overflow-y-scroll p-2 lg:max-h-[55vh]">
              <div v-for="v in availableVars" :key="v.var" class="rounded bg-elevated/60 px-2 py-1">
                <code class="block break-all text-[10px] text-primary">{{ v.var }}</code>
                <p class="text-[10px] text-muted">
                  {{ v.desc }}
                </p>
              </div>
            </div>
          </aside>
        </div>

        <template #footer>
          <div class="flex w-full items-center justify-between gap-2">
            <UButton
              label="Reset ke versi aktif"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="resetDraft"
            />
            <div class="flex gap-2">
              <UButton
                label="Preview"
                icon="i-lucide-eye"
                color="neutral"
                variant="outline"
                :loading="loading"
                @click="runPreview"
              />
              <UButton
                label="Simpan Template"
                icon="i-lucide-save"
                color="primary"
                :loading="saving"
                :disabled="!template.trim()"
                @click="saveTemplate"
              />
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- Preview sandboxed -->
  <UModal v-model:open="previewOpen" :ui="{ content: 'sm:max-w-[90vw] max-h-[92vh]' }">
    <template #content>
      <UCard class="flex max-h-[92vh] flex-col" :ui="{ body: 'min-h-0 flex-1 p-0', footer: 'shrink-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">
              Preview Template Print
            </h2>
            <div class="flex gap-2">
              <UButton
                label="Refresh"
                icon="i-lucide-refresh-cw"
                variant="outline"
                size="sm"
                @click="runPreview"
              />
              <UButton
                label="Tutup"
                variant="soft"
                size="sm"
                @click="previewOpen = false"
              />
            </div>
          </div>
        </template>
        <div class="min-h-0 flex-1 bg-muted/20">
          <iframe
            sandbox=""
            referrerpolicy="no-referrer"
            class="h-full min-h-[70vh] w-full border-0"
            :srcdoc="previewHtml"
          />
        </div>
        <template #footer>
          <p class="text-xs text-muted">
            Preview berjalan dalam sandbox tanpa script &amp; tanpa akses origin. Hasil print final memakai CSP ketat.
          </p>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped>
.variable-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--ui-border) transparent;
}
.variable-scroll::-webkit-scrollbar { width: 8px; }
.variable-scroll::-webkit-scrollbar-thumb {
  background: var(--ui-border);
  border-radius: 999px;
}
</style>
