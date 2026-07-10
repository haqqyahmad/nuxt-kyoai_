<script setup lang="ts">
import ItemExamTemplate from '~/components/item/ItemExamTemplate.vue'
import ItemSampleManager from '~/components/item/itemSampleManager.vue'

const route = useRoute()
const api = useApi()
const toast = useToast()

const itemId = computed(() => String(route.params.id || ''))
const activeTab = ref<'overview' | 'template' | 'sample'>('overview')

type ItemGroup = {
  id: string
  name: string
  code?: string | null
  parent?: {
    id: string
    name: string
    code?: string | null
    parent?: {
      id: string
      name: string
      code?: string | null
    } | null
  } | null
}

type ItemInputan = {
  id: string
  label: string
  inputType: string
  uom?: string | null
  sortOrder: number
  allowBlank: boolean
  opsis?: Array<{ id: string; label: string; value: string; sortOrder: number }>
  formula?: { id: string; formula: string } | null
  nilaiNormalNum?: Array<{
    id: string
    sex?: 'MALE' | 'FEMALE' | null
    ageMin?: number | null
    minValue?: number | null
    maxValue?: number | null
  }>
  nilaiNormalSel?: Array<{
    id: string
    sex?: 'MALE' | 'FEMALE' | null
    ageMin?: number | null
    opsiId?: string | null
    opsi?: {
      id: string
      label: string
      value: string
      sortOrder: number
    } | null
  }>
}

type ItemDetail = {
  id: string
  code: string
  name: string
  isActive: boolean
  description?: string | null
  createdAt?: string
  updatedAt?: string
  department?: {
    id: string
    code: string
    name: string
  } | null
  group?: ItemGroup | null
  inputans?: ItemInputan[]
  sampleTypes?: Array<{
    id: string
    isPrimary: boolean
    sortOrder: number
    sampleType: {
      id: string
      code: string
      name: string
    }
  }>
}

const { data: item, pending, refresh } = await useAsyncData(
  `item-detail-${itemId.value}`,
  async () => {
    if (!itemId.value) return null
    const res = await api.get(`/mcu/items/${itemId.value}`)
    return res.data?.data ?? null
  },
  {
    watch: [itemId]
  }
)

const groupBreadcrumb = computed(() => {
  const current = item.value?.group
  if (!current) return '-'

  const parts: string[] = []
  if (current.parent?.parent?.name) parts.push(current.parent.parent.name)
  if (current.parent?.name) parts.push(current.parent.name)
  if (current.name) parts.push(current.name)
  return parts.join(' > ')
})

const inputTypeLabel: Record<string, string> = {
  number: 'Number',
  string: 'Char',
  selected: 'Selected',
  calculated: 'Calculated'
}

const inputTypeColor: Record<string, string> = {
  number: 'info',
  string: 'neutral',
  selected: 'secondary',
  calculated: 'warning'
}

function formatSex(sex?: 'MALE' | 'FEMALE' | null) {
  if (sex === 'MALE') return 'Laki-laki'
  if (sex === 'FEMALE') return 'Perempuan'
  return 'Semua gender'
}

function formatAgeMin(ageMin?: number | null) {
  if (!ageMin || ageMin <= 0) return 'Semua usia'
  return `Usia >= ${ageMin}`
}

function formatRangeValue(minValue?: number | null, maxValue?: number | null) {
  const hasMin = minValue !== null && minValue !== undefined
  const hasMax = maxValue !== null && maxValue !== undefined

  if (hasMin && hasMax) return `${minValue} - ${maxValue}`
  if (hasMin) return `>= ${minValue}`
  if (hasMax) return `<= ${maxValue}`
  return 'Belum diisi'
}

function formatNormalRangeItem(normal: NonNullable<ItemInputan['nilaiNormalNum']>[number]) {
  return [formatSex(normal.sex), formatAgeMin(normal.ageMin), formatRangeValue(normal.minValue, normal.maxValue)]
    .filter(Boolean)
    .join(' · ')
}

function formatNormalSelectedItem(normal: NonNullable<ItemInputan['nilaiNormalSel']>[number]) {
  const opsiLabel = normal.opsi?.label || normal.opsi?.value || normal.opsiId || 'Opsi belum dipilih'
  return [formatSex(normal.sex), formatAgeMin(normal.ageMin), opsiLabel]
    .filter(Boolean)
    .join(' · ')
}

function hasRangeNormal(inputan: ItemInputan) {
  return (inputan.nilaiNormalNum?.length ?? 0) > 0
}

function getNormalRules(inputan: ItemInputan) {
  if (hasRangeNormal(inputan)) {
    return inputan.nilaiNormalNum ?? []
  }

  return inputan.nilaiNormalSel ?? []
}

function getNormalRulesLabel(inputan: ItemInputan) {
  const count = getNormalRules(inputan).length
  if (!count) return ''
  return hasRangeNormal(inputan)
    ? `${count} aturan range`
    : `${count} aturan selected`
}

const summaryCards = computed(() => [
  {
    label: 'Department',
    value: item.value?.department?.name ?? '-'
  },
  {
    label: 'Group',
    value: item.value?.group?.name ?? '-'
  },
  {
    label: 'Inputan',
    value: String(item.value?.inputans?.length ?? 0)
  },
  {
    label: 'Sample',
    value: String(item.value?.sampleTypes?.length ?? 0)
  }
])

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openTemplateTab() {
  activeTab.value = 'template'
}

watch(item, (val) => {
  if (!val) return
  if (val.inputans?.length) {
    activeTab.value = 'overview'
  }
})

async function handleReload() {
  try {
    await refresh()
    toast.add({
      title: 'Berhasil',
      description: 'Data item diperbarui',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Gagal',
      description: 'Gagal memuat ulang data item',
      color: 'error'
    })
  }
}
</script>

<template>
  <UDashboardPanel :id="`item-detail-${itemId}`">
    <template #header>
      <UDashboardNavbar title="Detail Item">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <div class="flex items-center gap-2">
            <UButton
              to="/items/mcu"
              color="neutral"
              variant="soft"
              icon="i-lucide-arrow-left"
            >
              Kembali
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-refresh-cw"
              @click="handleReload"
            >
              Refresh
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="pending" class="flex items-center justify-center py-16">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else-if="!item" class="py-16 text-center">
        <UIcon name="i-lucide-circle-alert" class="size-10 text-muted mx-auto mb-3" />
        <p class="font-medium">Item tidak ditemukan</p>
        <p class="text-sm text-muted mt-1">Data item yang diminta tidak tersedia.</p>
      </div>

      <div v-else class="space-y-6">
        <UCard>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :label="item.isActive ? 'Active' : 'Inactive'"
                  :color="item.isActive ? 'success' : 'neutral'"
                  variant="subtle"
                />
                <UBadge
                  v-if="item.department?.code"
                  :label="item.department.code"
                  color="primary"
                  variant="subtle"
                />
              </div>

              <div>
                <p class="text-sm text-muted">
                  {{ item.code }}
                </p>
                <h1 class="text-2xl font-semibold leading-tight">
                  {{ item.name }}
                </h1>
                <p class="text-sm text-muted mt-1">
                  {{ groupBreadcrumb }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[28rem]">
              <div
                v-for="card in summaryCards"
                :key="card.label"
                class="rounded-xl border border-default bg-elevated/30 px-4 py-3"
              >
                <p class="text-xs text-muted">{{ card.label }}</p>
                <p class="mt-1 text-sm font-semibold">{{ card.value }}</p>
              </div>
            </div>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-default bg-background px-4 py-3">
              <p class="text-xs text-muted">Department</p>
              <p class="mt-1 text-sm font-medium">
                {{ item.department?.name ?? '-' }}
              </p>
            </div>
            <div class="rounded-xl border border-default bg-background px-4 py-3">
              <p class="text-xs text-muted">Group / Subgroup</p>
              <p class="mt-1 text-sm font-medium">
                {{ groupBreadcrumb }}
              </p>
            </div>
            <div class="rounded-xl border border-default bg-background px-4 py-3">
              <p class="text-xs text-muted">Created</p>
              <p class="mt-1 text-sm font-medium">
                {{ formatDate(item.createdAt) }}
              </p>
            </div>
            <div class="rounded-xl border border-default bg-background px-4 py-3">
              <p class="text-xs text-muted">Updated</p>
              <p class="mt-1 text-sm font-medium">
                {{ formatDate(item.updatedAt) }}
              </p>
            </div>
          </div>

          <div v-if="item.description" class="mt-5 rounded-xl border border-default bg-background p-4">
            <p class="text-xs uppercase tracking-wide text-muted">Description</p>
            <p class="mt-2 text-sm leading-6 text-default">
              {{ item.description }}
            </p>
          </div>
        </UCard>

        <UCard>
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default pb-4">
            <div>
              <h2 class="text-base font-semibold">Detail Konfigurasi</h2>
              <p class="text-sm text-muted">
                Inputan, template exam, dan sample requirement untuk item ini.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                :variant="activeTab === 'overview' ? 'solid' : 'soft'"
                color="primary"
                size="sm"
                @click="activeTab = 'overview'"
              >
                Overview
              </UButton>
              <UButton
                :variant="activeTab === 'template' ? 'solid' : 'soft'"
                color="primary"
                size="sm"
                @click="openTemplateTab"
              >
                Template
              </UButton>
              <UButton
                :variant="activeTab === 'sample' ? 'solid' : 'soft'"
                color="primary"
                size="sm"
                @click="activeTab = 'sample'"
              >
                Sample
              </UButton>
            </div>
          </div>

          <div class="pt-5">
            <div v-if="activeTab === 'overview'" class="space-y-5">
              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-xl border border-default bg-elevated/20 p-4">
                  <p class="text-sm font-medium mb-3">Inputan</p>
                  <div v-if="!item.inputans?.length" class="text-sm text-muted">
                    Belum ada inputan.
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="inputan in item.inputans"
                      :key="inputan.id"
                      class="rounded-xl border border-default bg-background px-4 py-3 shadow-sm transition-colors hover:border-primary/40"
                    >
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-sm font-semibold leading-5">{{ inputan.label }}</p>
                          <p class="text-xs text-muted mt-1">
                            Urutan {{ inputan.sortOrder }} · {{ inputTypeLabel[inputan.inputType] ?? inputan.inputType }}
                          </p>
                        </div>
                        <UBadge
                          :label="inputTypeLabel[inputan.inputType] ?? inputan.inputType"
                          :color="inputTypeColor[inputan.inputType] ?? 'neutral'"
                          variant="subtle"
                          size="xs"
                        />
                      </div>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <UBadge
                          v-if="inputan.uom"
                          :label="`UoM: ${inputan.uom}`"
                          color="primary"
                          variant="soft"
                          size="xs"
                        />
                        <UBadge
                          v-if="inputan.allowBlank"
                          label="Allow blank"
                          color="neutral"
                          variant="soft"
                          size="xs"
                        />
                        <UBadge
                          v-if="inputan.opsis?.length"
                          :label="`${inputan.opsis.length} opsi`"
                          color="secondary"
                          variant="soft"
                          size="xs"
                        />
                        <UBadge
                          v-if="inputan.formula"
                          label="Formula"
                          color="warning"
                          variant="soft"
                          size="xs"
                        />
                      </div>

                      <div class="mt-3 rounded-lg border border-default bg-elevated/30 p-3">
                        <div class="flex items-center justify-between gap-3">
                          <p class="text-xs font-medium uppercase tracking-wide text-muted">
                            Normal value
                          </p>
                          <UBadge
                            v-if="getNormalRules(inputan).length"
                            :label="getNormalRulesLabel(inputan)"
                            color="success"
                            variant="soft"
                            size="xs"
                          />
                        </div>

                        <template v-if="hasRangeNormal(inputan)">
                          <div
                            v-for="normal in getNormalRules(inputan).slice(0, 3)"
                            :key="normal.id"
                            class="mt-2 rounded-md bg-background px-3 py-2 text-xs text-default"
                          >
                            {{ formatNormalRangeItem(normal) }}
                          </div>
                          <p v-if="getNormalRules(inputan).length > 3" class="mt-2 text-xs text-muted">
                            +{{ getNormalRules(inputan).length - 3 }} aturan lainnya
                          </p>
                        </template>

                        <template v-else-if="getNormalRules(inputan).length">
                          <div
                            v-for="normal in getNormalRules(inputan).slice(0, 3)"
                            :key="normal.id"
                            class="mt-2 rounded-md bg-background px-3 py-2 text-xs text-default"
                          >
                            {{ formatNormalSelectedItem(normal) }}
                          </div>
                          <p v-if="getNormalRules(inputan).length > 3" class="mt-2 text-xs text-muted">
                            +{{ getNormalRules(inputan).length - 3 }} aturan lainnya
                          </p>
                        </template>

                        <p v-else class="mt-2 text-xs text-muted">
                          Belum ada aturan normal
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border border-default bg-elevated/20 p-4">
                  <p class="text-sm font-medium mb-3">Sample Requirement</p>
                  <div v-if="!item.sampleTypes?.length" class="text-sm text-muted">
                    Belum ada sample type.
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="sample in item.sampleTypes"
                      :key="sample.id"
                      class="rounded-lg border border-default bg-background px-3 py-2"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-sm font-medium">
                          {{ sample.sampleType.name }}
                        </p>
                        <UBadge
                          :label="sample.isPrimary ? 'Primary' : 'Secondary'"
                          color="neutral"
                          variant="subtle"
                          size="xs"
                        />
                      </div>
                      <p class="text-xs text-muted mt-1">
                        Sort {{ sample.sortOrder }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
                <UButton color="primary" @click="openTemplateTab">
                  Buka Template
                </UButton>
              </div>
            </div>

            <div v-else-if="activeTab === 'template'">
              <ItemExamTemplate :item-id="item.id" />
            </div>

            <div v-else>
              <ItemSampleManager :item-id="item.id" />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
