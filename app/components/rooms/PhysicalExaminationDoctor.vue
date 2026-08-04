<script setup lang="ts">
type InputOption = { id: string, label: string, value: string }
type Inputan = { id: string, label: string, inputType: 'number' | 'string' | 'selected' | 'calculated', opsis?: InputOption[] }
type Result = { inputanId: string, valueString?: string | null, valueSelected?: string | null }
type Finding = { key: string, label: string, detail?: boolean }
type Section = { name: string, findings: Finding[] }

const props = defineProps<{
  examId: string
  examItemId: string
  inputans: Inputan[]
  results?: Result[]
}>()
const emit = defineEmits<{ saved: [] }>()
const api = useApi()
const toast = useToast()

const sections: Section[] = [
  { name: 'EYES', findings: [{ key: 'right-anemic', label: 'Right · Anemic' }, { key: 'right-icteric', label: 'Right · Icteric' }, { key: 'right-pterigium', label: 'Right · Pterigium' }, { key: 'right-strabismus', label: 'Right · Strabismus' }, { key: 'right-others', label: 'Right · Others, specify', detail: true }, { key: 'left-anemic', label: 'Left · Anemic' }, { key: 'left-icteric', label: 'Left · Icteric' }, { key: 'left-pterigium', label: 'Left · Pterigium' }, { key: 'left-strabismus', label: 'Left · Strabismus' }, { key: 'left-others', label: 'Left · Others, specify', detail: true }] },
  { name: 'EAR', findings: [{ key: 'right-cerumen', label: 'Right · Cerumen' }, { key: 'right-cerumen-prop', label: 'Right · Cerumen Prop' }, { key: 'right-tympanic', label: 'Right · Tympanic membrane intact' }, { key: 'right-others', label: 'Right · Others, specify', detail: true }, { key: 'left-cerumen', label: 'Left · Cerumen' }, { key: 'left-cerumen-prop', label: 'Left · Cerumen Prop' }, { key: 'left-tympanic', label: 'Left · Tympanic membrane intact' }, { key: 'left-others', label: 'Left · Others, specify', detail: true }] },
  { name: 'NOSE', findings: [{ key: 'right-deviated', label: 'Right · Septum deviated' }, { key: 'right-enlarged', label: 'Right · Conchae enlarged' }, { key: 'right-hyperemic', label: 'Right · Hyperemic' }, { key: 'right-polyp', label: 'Right · Polyp' }, { key: 'right-others', label: 'Right · Others, specify', detail: true }, { key: 'left-deviated', label: 'Left · Septum deviated' }, { key: 'left-enlarged', label: 'Left · Conchae enlarged' }, { key: 'left-hyperemic', label: 'Left · Hyperemic' }, { key: 'left-polyp', label: 'Left · Polyp' }, { key: 'left-others', label: 'Left · Others, specify', detail: true }] },
  { name: 'THROAT', findings: [{ key: 'enlarged-tonsil', label: 'Enlarged tonsil', detail: true }, { key: 'hyperemic-pharynx', label: 'Hyperemic pharynx' }, { key: 'others', label: 'Others, specify', detail: true }] },
  { name: 'NECK', findings: [{ key: 'enlarged-thyroid', label: 'Enlarged thyroid', detail: true }, { key: 'enlarged-lymph-node', label: 'Enlarged lymph node', detail: true }, { key: 'others', label: 'Others, specify', detail: true }] },
  { name: 'CARDIAC', findings: [{ key: 'regular-heart-sound', label: 'Regular heart sound' }, { key: 'murmur', label: 'Murmur' }, { key: 'gallop', label: 'Gallop' }, { key: 'others', label: 'Others, specify', detail: true }] },
  { name: 'BREAST', findings: [{ key: 'right-enlarged-glands', label: 'Right · Enlarged breast glands' }, { key: 'right-lumps', label: 'Right · Lumps' }, { key: 'right-others', label: 'Right · Others, specify', detail: true }, { key: 'left-enlarged-glands', label: 'Left · Enlarged breast glands' }, { key: 'left-lumps', label: 'Left · Lumps' }, { key: 'left-others', label: 'Left · Others, specify', detail: true }] },
  { name: 'RESPIRATORY SYSTEM', findings: [{ key: 'ronkhi', label: 'Lung · Ronkhi' }, { key: 'wheezing', label: 'Lung · Wheezing' }, { key: 'others', label: 'Lung · Others, specify', detail: true }] },
  { name: 'ABDOMEN', findings: [{ key: 'tenderness', label: 'Tenderness', detail: true }, { key: 'hepatomegaly', label: 'Hepatomegaly' }, { key: 'splenomegaly', label: 'Splenomegaly' }, { key: 'increased-bowel-sounds', label: 'Increased bowel sounds' }, { key: 'others', label: 'Others, specify', detail: true }] },
  { name: 'SPINE', findings: [{ key: 'details', label: 'Details / keterangan', detail: true }] },
  { name: 'GENITOURINARY', findings: [{ key: 'hernia', label: 'Hernia', detail: true }, { key: 'hemorrhoid', label: 'Hemorrhoid' }, { key: 'inguinal-nodes', label: 'Inguinal nodes' }, { key: 'others', label: 'Others, specify', detail: true }] },
  { name: 'NEUROLOGICAL SYSTEM', findings: [{ key: 'motoric', label: 'Motoric system abnormality', detail: true }, { key: 'sensory', label: 'Sensory system abnormality', detail: true }, { key: 'reflexes', label: 'Reflexes abnormality', detail: true }, { key: 'others', label: 'Others, specify', detail: true }] },
  { name: 'SKIN', findings: [{ key: 'psoriasis', label: 'Psoriasis' }, { key: 'tattoo', label: 'Tattoo', detail: true }, { key: 'skin-tag', label: 'Skin tag' }, { key: 'others', label: 'Others, specify', detail: true }] }
]

const state = reactive<Record<string, { mode: '' | 'normal' | 'abnormal', values: Record<string, string>, details: Record<string, string> }>>({})
const saving = ref(false)
const confirmed = ref(false)

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const inputFor = (section: Section, key: string, suffix = '') => {
  const term = normalize(`${section.name}-${key}-${suffix}`)
  return props.inputans.find(input => normalize(input.label).includes(term)) ?? props.inputans.find(input => normalize(input.label).includes(normalize(key)) && normalize(input.label).includes(normalize(section.name)))
}
const existingValue = (input?: Inputan) => {
  if (!input) return ''
  const result = props.results?.find(row => row.inputanId === input.id)
  return result?.valueSelected ?? result?.valueString ?? ''
}

function init() {
  for (const section of sections) {
    const normalInput = inputFor(section, 'no-abnormality')
    const abnormalInput = inputFor(section, 'abnormality-found')
    const normal = existingValue(normalInput)
    const abnormal = existingValue(abnormalInput)
    state[section.name] = { mode: normal === 'YES' ? 'normal' : abnormal === 'YES' ? 'abnormal' : '', values: {}, details: {} }
    for (const finding of section.findings) {
      const findingInput = inputFor(section, finding.key)
      state[section.name].values[finding.key] = existingValue(findingInput)
      state[section.name].details[finding.key] = existingValue(inputFor(section, `${finding.key}-detail`)) || (findingInput?.inputType === 'string' ? existingValue(findingInput) : '')
    }
  }
}
init()

const completed = computed(() => sections.every(section => state[section.name]?.mode))
const abnormalCount = computed(() => sections.filter(section => state[section.name]?.mode === 'abnormal').length)
function setMode(section: Section, mode: 'normal' | 'abnormal') {
  state[section.name].mode = mode
  if (mode === 'normal') {
    for (const finding of section.findings) state[section.name].values[finding.key] = ''
  }
}
function optionValue(input: Inputan | undefined, value: string) {
  const match = input?.opsis?.find(option => option.value === value || option.label.toUpperCase() === value)
  return match?.value ?? value
}
function buildResults() {
  const results: Array<Record<string, string>> = []
  for (const section of sections) {
    const current = state[section.name]
    const normalInput = inputFor(section, 'no-abnormality')
    const abnormalInput = inputFor(section, 'abnormality-found')
    if (normalInput) results.push({ inputanId: normalInput.id, valueSelected: optionValue(normalInput, current.mode === 'normal' ? 'YES' : 'NO') })
    if (abnormalInput) results.push({ inputanId: abnormalInput.id, valueSelected: optionValue(abnormalInput, current.mode === 'abnormal' ? 'YES' : 'NO') })
    for (const finding of section.findings) {
      const input = inputFor(section, finding.key)
      if (input && input.inputType !== 'string' && current.mode === 'abnormal') results.push({ inputanId: input.id, valueSelected: optionValue(input, current.values[finding.key] || 'NO') })
      const detail = inputFor(section, `${finding.key}-detail`) ?? (input?.inputType === 'string' ? input : undefined)
      if (detail && current.mode === 'abnormal' && current.details[finding.key]) results.push({ inputanId: detail.id, valueString: current.details[finding.key] })
    }
  }
  return results
}
async function submit() {
  confirmed.value = false
  saving.value = true
  try {
    await api.post(`/mcu/exams/${props.examId}/results`, { results: buildResults() })
    toast.add({ title: 'Submit sukses', description: 'Pemeriksaan fisik berhasil disimpan.', color: 'success' })
    emit('saved')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Pemeriksaan fisik tidak dapat disimpan.'
    toast.add({ title: 'Gagal submit', description: message, color: 'error' })
  } finally { saving.value = false }
}
</script>

<template>
  <UCard class="border border-primary/20 shadow-sm">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-primary">
            Doctor draft · 07/07/2023
          </p><h3 class="mt-1 text-base font-semibold text-highlighted">
            Physical Examination
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <UBadge :label="`${sections.length - (completed ? 0 : sections.filter(section => !state[section.name]?.mode).length)}/${sections.length} bagian`" color="neutral" variant="subtle" /><UBadge :label="`${abnormalCount} abnormal`" color="warning" variant="subtle" />
        </div>
      </div>
    </template>
    <div class="space-y-3">
      <UAlert color="info" title="Lengkapi semua checklist" description="Pilih No abnormality atau Abnormality found pada setiap bagian. Dropdown abnormality terkunci bila No abnormality dipilih." />
      <div v-for="section in sections" :key="section.name" class="rounded-xl border border-default p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 class="text-sm font-semibold text-highlighted">
            {{ section.name }}
          </h4><UBadge :label="state[section.name]?.mode ? (state[section.name].mode === 'normal' ? 'No abnormality' : 'Abnormality found') : 'Belum diisi'" :color="state[section.name]?.mode === 'normal' ? 'success' : state[section.name]?.mode === 'abnormal' ? 'warning' : 'neutral'" variant="subtle" />
        </div>
        <div class="mb-4 flex flex-wrap gap-2">
          <UButton
            :color="state[section.name]?.mode === 'normal' ? 'success' : 'neutral'"
            :variant="state[section.name]?.mode === 'normal' ? 'solid' : 'outline'"
            icon="i-lucide-circle-check"
            @click="setMode(section, 'normal')"
          >
            No abnormality
          </UButton>
          <UButton
            :color="state[section.name]?.mode === 'abnormal' ? 'warning' : 'neutral'"
            :variant="state[section.name]?.mode === 'abnormal' ? 'solid' : 'outline'"
            icon="i-lucide-triangle-alert"
            @click="setMode(section, 'abnormal')"
          >
            Abnormality found
          </UButton>
        </div>
        <div v-if="state[section.name]?.mode === 'abnormal'" class="grid gap-3 md:grid-cols-2">
          <div
            v-for="finding in section.findings"
            :key="finding.key"
            class="rounded-lg border border-default/70 p-3"
            :class="state[section.name]?.mode !== 'abnormal' ? 'opacity-50' : ''"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm">{{ finding.label }}</span>
              <input
                v-if="inputFor(section, finding.key)?.inputType === 'string'"
                v-model="state[section.name].details[finding.key]"
                :disabled="state[section.name]?.mode !== 'abnormal'"
                class="w-full max-w-xs rounded-lg border border-default bg-default px-2 py-1 text-sm"
                placeholder="Details"
              >
              <select
                v-else
                v-model="state[section.name].values[finding.key]"
                :disabled="state[section.name]?.mode !== 'abnormal'"
                class="w-24 rounded-lg border border-default bg-default px-2 py-1 text-sm"
              >
                <option value="">
                  Pilih
                </option>
                <option value="YES">
                  Yes
                </option>
                <option value="NO">
                  No
                </option>
              </select>
            </div>
            <input
              v-if="finding.detail && inputFor(section, finding.key)?.inputType !== 'string' && state[section.name].values[finding.key] === 'YES'"
              v-model="state[section.name].details[finding.key]"
              :disabled="state[section.name]?.mode !== 'abnormal'"
              class="mt-2 w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
              placeholder="Details / specify (optional)"
            >
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
        <p class="text-xs text-muted">
          Submit hanya aktif setelah semua {{ sections.length }} bagian memiliki checklist.
        </p><UButton
          color="primary"
          icon="i-lucide-send"
          :disabled="!completed"
          :loading="saving"
          @click="confirmed = true"
        >
          Submit pemeriksaan
        </UButton>
      </div>
    </div>
  </UCard>
  <UModal
    v-model:open="confirmed"
    :dismissible="false"
    :close="false"
    title="Konfirmasi pemeriksaan fisik"
  >
    <template #body>
      <p class="text-sm text-highlighted">
        Apakah Anda sudah yakin untuk mengakhiri pemeriksaan fisik?
      </p><p class="mt-2 text-xs text-muted">
        Setelah submit, hasil akan tersimpan sebagai hasil pemeriksaan dokter.
      </p>
    </template><template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="confirmed = false">
          Tidak, kembali
        </UButton><UButton color="primary" :loading="saving" @click="submit">
          Ya, submit sukses
        </UButton>
      </div>
    </template>
  </UModal>
</template>
