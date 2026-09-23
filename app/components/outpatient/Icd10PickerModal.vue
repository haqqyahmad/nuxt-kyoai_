<script setup lang="ts">
import type { Icd10 } from '~/types/outpatient'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ select: [items: Icd10[]] }>()

const props = withDefaults(defineProps<{ exclude?: string[] }>(), {
  exclude: () => []
})

const api = useApi()

const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const rows = ref<Icd10[]>([])
const total = ref(0)
const loading = ref(false)
const selected = ref<Icd10[]>([])

let debounce: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  selected.value = []
  try {
    const res = await api.get('/outpatient/icd10', {
      params: { search: search.value, page: page.value, limit: pageSize.value }
    })
    rows.value = res.data.data ?? []
    total.value = Number(res.data.meta?.total ?? rows.value.length)
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

watch(page, load)
watch(pageSize, () => {
  page.value = 1
  load()
})
watch(open, (value) => {
  if (value) {
    page.value = 1
    load()
  }
})

function isExcluded(icd: Icd10) {
  return props.exclude.includes(icd.code)
}

function isSelected(icd: Icd10) {
  return selected.value.some(s => s.id === icd.id)
}

function toggle(icd: Icd10) {
  if (isExcluded(icd)) return
  const index = selected.value.findIndex(s => s.id === icd.id)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push(icd)
}

function remove(icd: Icd10) {
  selected.value = selected.value.filter(s => s.id !== icd.id)
}

function confirmSelect() {
  if (!selected.value.length) return
  emit('select', [...selected.value])
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Pilih Diagnosis ICD10"
    description="Pilih satu atau beberapa diagnosis, lalu klik Selesai."
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-3">
        <div class="rounded-sm border border-default bg-elevated/50 p-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-muted">Dipilih ({{ selected.length }})</span>
            <UButton
              v-if="selected.length"
              label="Bersihkan"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="selected = []"
            />
          </div>
          <div v-if="selected.length" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="icd in selected"
              :key="icd.id"
              class="inline-flex items-center gap-1 rounded-sm bg-[#E2E7FF] px-2 py-0.5 text-xs text-[#00355F] dark:bg-white/10 dark:text-[#BFD6FF]"
            >
              <b>{{ icd.code }}</b>
              <button
                type="button"
                class="text-muted transition hover:text-error"
                :title="`Hapus ${icd.code}`"
                @click="remove(icd)"
              >
                <UIcon name="i-lucide-x" class="size-3" />
              </button>
            </span>
          </div>
          <p v-else class="mt-1 text-xs text-muted">
            Belum ada yang dipilih. Klik baris untuk memilih.
          </p>
        </div>

        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari kode / nama (mis. J06 atau ISPA)"
          class="w-full"
          autofocus
        />

        <div class="overflow-hidden rounded-sm border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated text-left">
              <tr>
                <th class="px-3 py-2 font-semibold">
                  Kode
                </th>
                <th class="px-3 py-2 font-semibold">
                  Diagnosis (EN)
                </th>
                <th class="px-3 py-2 font-semibold">
                  Diagnosis (ID)
                </th>
                <th class="px-3 py-2 text-right font-semibold">
                  Pilih
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="px-3 py-8 text-center text-muted">
                  <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
                </td>
              </tr>
              <tr v-else-if="!rows.length">
                <td colspan="4" class="px-3 py-8 text-center text-muted">
                  Tidak ada hasil.
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="icd in rows"
                  :key="icd.id"
                  class="border-t border-default"
                  :class="isExcluded(icd)
                    ? 'cursor-not-allowed opacity-50'
                    : isSelected(icd)
                      ? 'cursor-pointer bg-[#E2E7FF] dark:bg-white/10'
                      : 'cursor-pointer hover:bg-elevated/60'"
                  @click="toggle(icd)"
                >
                  <td class="px-3 py-2 font-semibold text-highlighted">
                    {{ icd.code }}
                  </td>
                  <td class="px-3 py-2">
                    {{ icd.descriptionEng }}
                  </td>
                  <td class="px-3 py-2 text-muted">
                    {{ icd.descriptionInd || '-' }}
                  </td>
                  <td class="px-3 py-2 text-right">
                    <UBadge
                      v-if="isExcluded(icd)"
                      label="Sudah ada"
                      color="neutral"
                      variant="subtle"
                    />
                    <UIcon
                      v-else
                      :name="isSelected(icd) ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                      class="size-5"
                      :class="isSelected(icd) ? 'text-primary' : 'text-muted'"
                    />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-xs text-muted">{{ total }} diagnosis ditemukan</span>
          <div class="flex items-center gap-2">
            <USelect
              v-model="pageSize"
              :items="[{ label: '10', value: 10 }, { label: '25', value: 25 }, { label: '50', value: 50 }]"
              class="w-24"
            />
            <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="min-w-0 truncate text-xs text-muted">
          {{ selected.length }} diagnosis dipilih
        </span>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            label="Tutup"
            @click="open = false"
          />
          <UButton
            icon="i-lucide-check"
            :label="selected.length ? `Selesai (${selected.length})` : 'Selesai'"
            :disabled="!selected.length"
            @click="confirmSelect"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
