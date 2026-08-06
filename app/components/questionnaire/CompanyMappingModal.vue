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
  questionnaireId: z.string().min(1, 'Questionnaire wajib dipilih'),
  isActive: z.boolean()
})

type Schema = z.output<typeof schema>

const editingId = ref<string | null>(null)
const state = reactive<Schema>({
  companyId: '',
  branchId: '',
  questionnaireId: '',
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

const columns: TableColumn<Mapping>[] = [
  { accessorKey: 'company_name', header: 'Company' },
  { accessorKey: 'branchId', header: 'Branch' },
  { accessorKey: 'questionnaire_name', header: 'Questionnaire' },
  { accessorKey: 'isActive', header: 'Status' },
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
    state.questionnaireId = m.questionnaire_id
    state.isActive = m.isActive
  } else {
    editingId.value = null
    state.companyId = ''
    state.branchId = ''
    state.questionnaireId = ''
    state.isActive = true
  }
  mode.value = 'form'
}

function backToList() {
  mode.value = 'list'
}

async function submit(event: FormSubmitEvent<Schema>) {
  const data = event.data

  try {
    const payload = {
      companyId: data.companyId,
      branchId: data.branchId || null,
      questionnaireId: data.questionnaireId,
      isActive: data.isActive
    }

    if (editingId.value) {
      await api.put(`/settings/company-questionnaires/${editingId.value}`, payload)
      handleSuccess(toast, 'Mapping berhasil diperbarui')
    } else {
      await api.post('/settings/company-questionnaires', payload)
      handleSuccess(toast, 'Mapping berhasil dibuat')
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
            :data="mappings"
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

            <template #questionnaire_name-cell="{ row }">
              <span>{{ row.original.questionnaire_name }}</span>
            </template>

            <template #isActive-cell="{ row }">
              <UBadge
                :color="row.original.isActive ? 'success' : 'neutral'"
                variant="soft"
                :label="row.original.isActive ? 'Aktif' : 'Nonaktif'"
              />
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="openForm(row.original)"
                />
                <UButton
                  icon="i-lucide-trash"
                  color="error"
                  variant="ghost"
                  size="sm"
                  @click="deletingId = row.original.id"
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

          <UFormField label="Questionnaire" name="questionnaireId" required>
            <USelect
              v-model="state.questionnaireId"
              :items="questionnaireItems"
              value-key="value"
              label-key="label"
              placeholder="Pilih questionnaire"
              class="w-full"
            />
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
