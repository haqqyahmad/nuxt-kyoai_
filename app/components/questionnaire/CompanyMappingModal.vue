<!-- app/components/questionnaire/CompanyMappingModal.vue -->
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import { handleError, handleSuccess } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

const open = ref(false)
const mode = ref<'list' | 'form'>('list')
const loading = ref(false)
const deletingId = ref<string | null>(null)

type Mapping = {
  id: string
  companyId: string
  company_name: string
  branchId: string | null
  questionnaire_id: string
  questionnaire_name: string
  questionnaire_code: string | null
  isActive: boolean
}

type CompanyOption = { id: number, codeCostumer: string, customerName: string }
type BranchOption = { id: string, branchId: string, nameBranch: string }
type QuestionOption = {
  questionnaire_id: string
  questionnaire_code: string
  questionnaire_name: string
  portalKey: string | null
}

const mappings = ref<Mapping[]>([])
const companies = ref<CompanyOption[]>([])
const branches = ref<BranchOption[]>([])
const questionnaires = ref<QuestionOption[]>([])

const schema = z.object({
  companyId: z.string().min(1, 'Company wajib dipilih'),
  branchId: z.string().optional(),
  questionnaireIds: z.array(z.string()).min(1, 'Pilih minimal satu questionnaire'),
  isActive: z.boolean()
})

type Schema = z.output<typeof schema>

const editingId = ref<string | null>(null)
const state = reactive<Schema>({
  companyId: '',
  branchId: '',
  questionnaireIds: [],
  isActive: true
})

const companyItems = computed(() =>
  companies.value.map(c => ({
    label: `${c.codeCostumer} - ${c.customerName}`,
    value: String(c.id)
  }))
)

const branchItems = computed(() =>
  branches.value.map(b => ({
    label: `${b.branchId} - ${b.nameBranch}`,
    value: b.branchId
  }))
)

const questionnaireItems = computed(() =>
  questionnaires.value
    .filter(q => q.portalKey !== 'MCU')
    .map(q => ({
      label: `${q.questionnaire_code} - ${q.questionnaire_name}`,
      value: q.questionnaire_id
    }))
)

const selectedQuestionnaireNames = computed(() =>
  state.questionnaireIds
    .map(id =>
      questionnaires.value.find(q => q.questionnaire_id === id)?.questionnaire_name
    )
    .filter(Boolean) as string[]
)

type MappingGroup = {
  key: string
  companyId: string
  company_name: string
  branchId: string | null
  items: Mapping[]
}

const groupedMappings = computed<MappingGroup[]>(() => {
  const map = new Map<string, MappingGroup>()
  for (const m of mappings.value) {
    const key = `${m.companyId}|${m.branchId ?? ''}`
    const group = map.get(key)
    if (group) {
      group.items.push(m)
    } else {
      map.set(key, {
        key,
        companyId: String(m.companyId),
        company_name: m.company_name,
        branchId: m.branchId ?? null,
        items: [m]
      })
    }
  }
  return [...map.values()]
})

function allActive(g: MappingGroup) {
  return g.items.every(i => i.isActive)
}

const columns: TableColumn<MappingGroup>[] = [
  { accessorKey: 'company_name', header: 'Company' },
  { accessorKey: 'branchId', header: 'Branch' },
  { id: 'questionnaires', header: 'Questionnaire' },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: '' }
]

watch(open, (v) => {
  if (v) load()
})

async function load() {
  loading.value = true
  try {
    const [m, c, b, q] = await Promise.all([
      api.get('/settings/company-questionnaires').then(r => r.data.data ?? []),
      api.get('/customer').then(r => r.data.data ?? []),
      api.get('/branch?limit=100').then(r => r.data.data ?? []),
      api.get('/questionnaire').then(r => r.data.data ?? [])
    ])
    mappings.value = m
    companies.value = c
    branches.value = b
    questionnaires.value = q
  } catch (err) {
    handleError(toast, err)
  } finally {
    loading.value = false
  }
}

function openForm(m?: Mapping) {
  if (m) {
    editingId.value = m.id
    state.companyId = String(m.companyId)
    state.branchId = m.branchId || ''
    state.questionnaireIds = m.questionnaire_id ? [m.questionnaire_id] : []
    state.isActive = m.isActive
  } else {
    editingId.value = null
    state.companyId = ''
    state.branchId = ''
    state.questionnaireIds = []
    state.isActive = true
  }
  mode.value = 'form'
}

function backToList() {
  mode.value = 'list'
}

function openAddToGroup(g: MappingGroup) {
  editingId.value = null
  state.companyId = g.companyId
  state.branchId = g.branchId || ''
  state.questionnaireIds = g.items.map(i => i.questionnaire_id)
  state.isActive = true
  mode.value = 'form'
}

async function submit(event: FormSubmitEvent<Schema>) {
  const data = event.data

  try {
    const basePayload = {
      companyId: data.companyId,
      branchId: data.branchId || null,
      isActive: data.isActive
    }

    if (editingId.value) {
      await api.put(`/settings/company-questionnaires/${editingId.value}`, {
        ...basePayload,
        questionnaireId: data.questionnaireIds[0]
      })
      handleSuccess(toast, 'Mapping berhasil diperbarui')
    } else {
      const mappedIds = new Set(
        mappings.value
          .filter(m => String(m.companyId) === String(data.companyId) && (m.branchId ?? '') === (data.branchId || ''))
          .map(m => m.questionnaire_id)
      )

      const toCreate = data.questionnaireIds.filter(id => !mappedIds.has(id))

      if (toCreate.length === 0) {
        handleSuccess(toast, 'Questionnaire yang dipilih sudah ter-mapping untuk company ini')
      } else {
        for (const qid of toCreate) {
          await api.post('/settings/company-questionnaires', {
            ...basePayload,
            questionnaireId: qid
          })
        }
        handleSuccess(toast, `${toCreate.length} mapping berhasil dibuat`)
      }
    }

    mode.value = 'list'
    await load()
  } catch (err) {
    handleError(toast, err)
  }
}

async function confirmDelete() {
  if (!deletingId.value) return

  try {
    await api.delete(`/settings/company-questionnaires/${deletingId.value}`)
    handleSuccess(toast, 'Mapping berhasil dihapus')
    await load()
  } catch (err) {
    handleError(toast, err)
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Mapping Questionnaire per Company"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <UButton label="Mapping Per Company" icon="i-lucide-building-2" />

    <template #body>
      <div class="min-h-[320px]">
        <!-- ═══════ LIST VIEW ═══════ -->
        <template v-if="mode === 'list'">
          <div class="flex items-center justify-between gap-3 mb-3">
            <p class="text-sm text-muted">
              Questionnaire MCU default selalu muncul di portal, ditambah mapping
              berikut sesuai company/branch yang dipilih pasien.
            </p>
            <UButton
              label="Tambah Mapping"
              icon="i-lucide-plus"
              color="primary"
              class="shrink-0"
              @click="openForm()"
            />
          </div>

          <div v-if="loading" class="py-10 text-center text-sm text-muted">
            Memuat data...
          </div>

          <UTable
            v-else
            :data="groupedMappings"
            :columns="columns"
            class="w-full"
          >
            <template #company_name-cell="{ row }">
              <span class="font-medium">{{ row.original.company_name }}</span>
            </template>

            <template #branchId-cell="{ row }">
              <span v-if="row.original.branchId" class="text-muted">{{ row.original.branchId }}</span>
              <UBadge
                v-else
                color="neutral"
                variant="soft"
                size="sm"
                label="Semua Branch"
              />
            </template>

            <template #questionnaires-cell="{ row }">
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="m in row.original.items"
                  :key="m.id"
                  class="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {{ m.questionnaire_name }}
                  <button
                    type="button"
                    class="text-primary hover:text-red-500 leading-none"
                    title="Hapus mapping"
                    @click="deletingId = m.id"
                  >
                    ×
                  </button>
                </span>
              </div>
            </template>

            <template #status-cell="{ row }">
              <UBadge
                :color="allActive(row.original) ? 'success' : 'neutral'"
                variant="soft"
                :label="allActive(row.original) ? 'Aktif' : 'Nonaktif'"
              />
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton
                  label="Tambah"
                  icon="i-lucide-plus"
                  color="primary"
                  variant="soft"
                  size="sm"
                  @click="openAddToGroup(row.original)"
                />
              </div>
            </template>
          </UTable>

          <p v-if="!loading && mappings.length === 0" class="py-10 text-center text-sm text-muted">
            Belum ada mapping. Tambahkan mapping questionnaire untuk company/branch tertentu.
          </p>
        </template>

        <!-- ═══════ FORM VIEW ═══════ -->
        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="submit"
        >
          <UFormField label="Company" name="companyId" required>
            <USelect
              v-model="state.companyId"
              :items="companyItems"
              value-key="value"
              label-key="label"
              placeholder="Pilih company"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Branch (opsional)"
            name="branchId"
            description="Kosongkan untuk berlaku di semua branch"
          >
            <USelect
              v-model="state.branchId"
              :items="branchItems"
              value-key="value"
              label-key="label"
              placeholder="Semua Branch"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Questionnaire" name="questionnaireIds" required>
            <USelect
              v-model="state.questionnaireIds"
              :items="questionnaireItems"
              value-key="value"
              label-key="label"
              multiple
              placeholder="Pilih satu atau lebih questionnaire"
              class="w-full"
            >
              <template #default>
                <template v-if="state.questionnaireIds.length">
                  <div class="flex flex-wrap gap-1 pr-6">
                    <UBadge
                      v-for="(name, i) in selectedQuestionnaireNames"
                      :key="i"
                      color="primary"
                      variant="soft"
                      size="sm"
                    >
                      {{ name }}
                    </UBadge>
                  </div>
                </template>
                <template v-else>
                  <span class="text-muted">Pilih satu atau lebih questionnaire</span>
                </template>
              </template>
            </USelect>
          </UFormField>

          <UFormField label="Status" name="isActive">
            <div class="flex items-center justify-between w-full">
              <span class="text-sm text-muted">
                {{ state.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
              <USwitch v-model="state.isActive" />
            </div>
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Kembali"
              color="neutral"
              variant="subtle"
              @click="backToList"
            />
            <UButton label="Simpan" color="primary" type="submit" />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>

  <BaseDeleteModal
    :open="!!deletingId"
    :count="1"
    entity="mapping"
    :loading="false"
    @update:open="deletingId = null"
    @confirm="confirmDelete"
  />
</template>
