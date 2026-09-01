<!-- app/components/mcu/McuPrintTemplateModal.vue
     Editor + preview template print hasil MCU.
     - Template tersimpan di DB (versi aktif), hanya disanitasi server.
     - Preview memakai data nyata exam via iframe sandbox (tanpa script).
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMcuReportPrint, type McuPrintPayload } from '~/composables/mcu/useMcuReportPrint'
import JsonTreeNode from '~/components/mcu/JsonTreeNode.vue'

const props = defineProps<{
  examId: string
  itemTemplates?: Array<{ id: string, code: string, name: string, templateName: string, hasTemplate: boolean }>
}>()

const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const toast = useToast()
const { loadPrintData, renderMcuReportHtml, renderMcuItemReportHtml } = useMcuReportPrint()

const template = ref('')
const templateKey = ref('MCU_REPORT')
const editorTheme = ref<'light' | 'dark'>('light')
const versions = ref<Array<{ id: string, version: number, isActive: boolean, createdAt: string }>>([])
const loading = ref(false)
const saving = ref(false)
const previewOpen = ref(false)
const previewHtml = ref('')
const varOpen = ref(false)
const varLoading = ref(false)
const cachedPayload = ref<McuPrintPayload | null>(null)
const varQuery = ref('')
const dataCopied = ref<string | null>(null)

const PRINT_TEMPLATE_KEY = '__mcu_draft_template__'

const templateOptions = computed(() => [
  { label: 'Laporan MCU', value: 'MCU_REPORT' },
  ...(props.itemTemplates ?? []).map(item => ({ label: `${item.name} (${item.code})`, value: item.templateName }))
])
const templateLabel = computed(() => templateOptions.value.find(option => option.value === templateKey.value)?.label ?? templateKey.value)

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
  { var: '{{ attachments }}', desc: 'Daftar lampiran PDF (loop {% for a in attachments %})' },
  { var: '{{ item.code }}', desc: 'Kode item (mis. ECG/USG/EYE)' },
  { var: '{{ item.name }}', desc: 'Nama item' },
  { var: '{{ results }}', desc: 'Hasil item (loop {% for r in results %}): {{ r.label }} {{ r.value }} {{ r.uom }} ({{ r.flag }})' }
]

const draftKey = () => `${PRINT_TEMPLATE_KEY}:${templateKey.value}`

function loadVersions() {
  return api.get('/mcu/print-templates/versions', { params: { name: templateKey.value } }).then((res) => {
    versions.value = ((res.data?.data ?? res.data) ?? []) as Array<{ id: string, version: number, isActive: boolean, createdAt: string }>
  })
}

async function loadTemplate() {
  loading.value = true
  try {
    const res = await api.get('/mcu/print-templates', { params: { name: templateKey.value } })
    const active = res.data?.data ?? res.data
    // Prioritas draft lokal (per jenis template), fallback versi aktif DB
    const draft = localStorage.getItem(draftKey())
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
  api.get(`/mcu/print-templates/versions/${version.id}`, { params: { name: templateKey.value } }).then((res) => {
    const row = res.data?.data ?? res.data
    if (row?.html) template.value = row.html
    localStorage.removeItem(draftKey())
  }).catch(() => {
    toast.add({ title: 'Gagal', description: 'Tidak dapat memuat versi template', color: 'error' })
  })
}

async function ensurePayload() {
  if (cachedPayload.value) return cachedPayload.value
  const payload = await loadPrintData(props.examId)
  if (!payload) return null
  cachedPayload.value = payload
  return payload
}

async function refreshData() {
  varLoading.value = true
  cachedPayload.value = null
  try {
    return await ensurePayload()
  } finally {
    varLoading.value = false
  }
}

async function runPreview() {
  const payload = await ensurePayload()
  if (!payload) return
  const headerImageUrl = await loadHeaderImageDataUri()
  if (templateKey.value !== 'MCU_REPORT') {
    const section = (payload as unknown as { itemSections?: Array<Record<string, unknown>> }).itemSections?.find(
      section => section.templateName === templateKey.value
    )
    previewHtml.value = renderMcuItemReportHtml(template.value, payload, (
      Array.isArray(section?.results) ? section : undefined
    ) as never, { headerImageUrl })
  } else {
    const draft: McuPrintPayload = { ...payload, printTemplate: template.value }
    previewHtml.value = renderMcuReportHtml(draft, { headerImageUrl })
  }
  previewOpen.value = true
}

async function loadHeaderImageDataUri(): Promise<string> {
  try {
    const res = await api.get('/mcu/print-templates/image', { params: { name: templateKey.value }, responseType: 'blob' })
    if (!res.data || res.data.size === 0) return ''
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(res.data)
    })
  } catch {
    return ''
  }
}

const headerFileInput = ref<HTMLInputElement | null>(null)
const uploadingHeader = ref(false)

async function uploadHeaderImage() {
  const file = headerFileInput.value?.files?.[0]
  if (!file) return
  uploadingHeader.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('name', templateKey.value)
    await api.post('/mcu/print-templates/image', form)
    toast.add({ title: 'Tersimpan', description: 'Header image berhasil diupload untuk template ini.', color: 'success' })
    // Sisipkan snippet img header bila belum ada di template
    if (!template.value.includes('headerImageUrl')) {
      const snippet = '\n{% if headerImageUrl %}<img class="header-img" src="{{ headerImageUrl }}" alt="Logo" />{% endif %}\n'
      const headerMatch = /<header[^>]*>/i.exec(template.value)
      if (headerMatch) {
        const at = headerMatch.index + headerMatch[0].length
        template.value = template.value.slice(0, at) + snippet + template.value.slice(at)
      } else {
        template.value = template.value.replace(/<body[^>]*>/i, m => `${m}${snippet}`)
      }
    }
  } catch (err) {
    const msg = (err as { response?: { data?: { message?: string } }, message?: string })?.response?.data?.message || (err as { message?: string })?.message || 'Gagal upload header image'
    toast.add({ title: 'Gagal', description: msg, color: 'error' })
  } finally {
    uploadingHeader.value = false
    if (headerFileInput.value) headerFileInput.value.value = ''
  }
}

function switchTemplate() {
  loadTemplate()
}

async function openVariableViewer() {
  varOpen.value = true
  if (cachedPayload.value) return
  varLoading.value = true
  try {
    const payload = await ensurePayload()
    if (!payload) toast.add({ title: 'Tidak ada data', description: 'Data print tidak dapat dimuat.', color: 'error' })
  } finally {
    varLoading.value = false
  }
}

async function copyPath(path: string, value: unknown) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  try {
    await navigator.clipboard.writeText(raw)
    dataCopied.value = path
    setTimeout(() => { dataCopied.value = null }, 1500) // eslint-disable-line @stylistic/max-statements-per-line
  } catch {
    dataCopied.value = null
  }
}

async function saveTemplate() {
  if (!template.value.trim() || saving.value) return
  saving.value = true
  try {
    const res = await api.post('/mcu/print-templates', { html: template.value }, { params: { name: templateKey.value } })
    const saved = res.data?.data ?? res.data
    toast.add({ title: 'Tersimpan', description: `Template ${templateLabel.value} versi ${saved.version ?? ''} disimpan`, color: 'success' })
    localStorage.removeItem(draftKey())
    await loadVersions()
  } catch (err) {
    const msg = (err as { response?: { data?: { message?: string } }, message?: string })?.response?.data?.message || (err as { message?: string })?.message || 'Gagal menyimpan template'
    toast.add({ title: 'Gagal menyimpan', description: msg, color: 'error' })
  } finally {
    saving.value = false
  }
}

function resetDraft() {
  localStorage.removeItem(draftKey())
  loadTemplate()
}

watch(open, (val) => {
  if (val) {
    templateKey.value = 'MCU_REPORT'
    loadTemplate()
  }
})
watch(templateKey, () => {
  cachedPayload.value = null
})
watch(() => props.examId, () => {
  cachedPayload.value = null
  varQuery.value = ''
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
                Template Print {{ templateKey === 'MCU_REPORT' ? 'Hasil MCU' : templateLabel }}
              </h2>
              <p class="text-sm text-muted">
                Tersimpan terversi; disanitasi server. Script/iframe/event handler otomatis dibuang.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <USelect
                :items="templateOptions"
                :model-value="templateKey"
                class="w-56"
                searchable
                placeholder="Cari template item..."
                @update:model-value="templateKey = $event as string; switchTemplate()"
              />
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
            <div class="flex items-center justify-between gap-2 border-b p-2">
              <p class="text-xs font-semibold text-muted">
                Variabel tersedia
              </p>
              <UButton
                label="Lihat Data"
                icon="i-lucide-braces"
                size="xs"
                variant="soft"
                :loading="varLoading"
                @click="openVariableViewer"
              />
            </div>
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
              <input
                ref="headerFileInput"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                class="hidden"
                @change="uploadHeaderImage"
              >
              <UButton
                label="Upload Header"
                icon="i-lucide-image-up"
                color="neutral"
                variant="outline"
                size="sm"
                :loading="uploadingHeader"
                @click="headerFileInput?.click()"
              />
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

  <!-- Data variabel dimuat lazy, lalu dipakai ulang oleh Preview. -->
  <UModal v-model:open="varOpen" :ui="{ content: 'sm:max-w-4xl h-[88vh] max-h-[88vh] overflow-hidden' }">
    <template #content>
      <UCard class="flex h-full min-h-0 flex-col overflow-hidden" :ui="{ header: 'shrink-0', body: 'flex min-h-0 flex-1 flex-col overflow-hidden', footer: 'shrink-0' }">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold">
                Data Variabel Print MCU
              </h2>
              <p class="text-xs text-muted">
                Data nyata exam ini. Klik baris object/array untuk buka-tutup.
              </p>
            </div>
            <UButton
              icon="i-lucide-refresh-cw"
              label="Refresh Data"
              size="sm"
              variant="outline"
              :loading="varLoading"
              @click="refreshData"
            />
          </div>
        </template>

        <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div class="flex items-center gap-2">
            <UInput
              v-model="varQuery"
              icon="i-lucide-search"
              placeholder="Cari path atau nilai..."
              class="flex-1"
            />
            <UButton
              icon="i-lucide-copy"
              label="Copy JSON"
              size="sm"
              color="neutral"
              variant="outline"
              :disabled="!cachedPayload"
              @click="cachedPayload && copyPath('root', cachedPayload)"
            />
          </div>
          <div class="flex items-center gap-3 text-[11px] text-muted">
            <span><i class="mr-1 inline-block size-2 rounded-full bg-emerald-500" />string</span>
            <span><i class="mr-1 inline-block size-2 rounded-full bg-blue-500" />number</span>
            <span><i class="mr-1 inline-block size-2 rounded-full bg-violet-500" />boolean</span>
            <span><i class="mr-1 inline-block size-2 rounded-full bg-rose-500" />null</span>
          </div>
          <div v-if="varLoading" class="py-8 text-center text-sm text-muted">
            Memuat data variabel...
          </div>
          <div v-else-if="!cachedPayload" class="py-8 text-center text-sm text-muted">
            Data belum tersedia.
          </div>
          <div v-else class="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded border bg-default p-2">
            <JsonTreeNode
              v-if="cachedPayload"
              name="payload"
              :value="cachedPayload"
              path=""
              :query="varQuery"
              default-open
              @copy="copyPath"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex w-full justify-end">
            <UButton label="Tutup" variant="soft" @click="varOpen = false" />
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
