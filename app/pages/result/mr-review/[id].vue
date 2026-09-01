<script setup lang="ts">
import { computed, ref } from 'vue'
import { MR_STATUS_COLOR, MR_STATUS_LABEL } from '~/types/medical-report'
import type { DoctorResultResponse, DoctorResultItem, DoctorResultGroup } from '~/types/doctor-result'

definePageMeta({ title: 'MR Review Detail' })

const route = useRoute()
const router = useRouter()
const reportId = String(route.params.id)
const api = useApi()
const toast = useToast()

const {
  detail,
  loading,
  submitting,
  loadDetail,
  verify,
  doReturn,
  release
} = useMedicalReport()

const doctorResult = ref<DoctorResultResponse | null>(null)
const doctorResultLoading = ref(false)

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusColor(status?: string) {
  return MR_STATUS_COLOR[status ?? ''] ?? 'neutral'
}
function statusLabel(status?: string) {
  return MR_STATUS_LABEL[status ?? ''] ?? status ?? '-'
}

const canVerify = computed(() => {
  const s = detail.value?.status
  return s === 'DOCTOR_APPROVED' || s === 'MR_REVIEW'
})
const canReturn = computed(() => {
  const s = detail.value?.status ?? ''
  return ['DOCTOR_APPROVED', 'MR_REVIEW', 'MR_VERIFIED', 'READY_TO_RELEASE'].includes(s)
})
const canRelease = computed(() => {
  const s = detail.value?.status
  return s === 'MR_VERIFIED' || s === 'READY_TO_RELEASE'
})

const showReturnModal = ref(false)
const returnReason = ref('')
const returnLoading = ref(false)

const returnItems = ref<{ inputanId: string; label: string; note: string; checked: boolean }[]>([])

function populateReturnItems() {
  const items = allItems.value
    .filter(i => i.gradable)
    .map(i => ({ inputanId: i.inputanId, label: i.inputanLabel, note: '', checked: false }))
  returnItems.value = items
}

function openReturnModal() {
  populateReturnItems()
  showReturnModal.value = true
}

function removeReturnItem(idx: number) {
  returnItems.value.splice(idx, 1)
}

const selectedReturnItems = computed(() => returnItems.value.filter(r => r.checked))

const departments = computed(() => doctorResult.value?.departments ?? [])
const allItems = computed<DoctorResultItem[]>(() => departments.value.flatMap(d => d.groups.flatMap(g => g.items ?? [])))
const totalGradable = computed(() => allItems.value.filter(i => i.gradable).length)
const gradedCount = computed(() => allItems.value.filter(i => i.gradable && i.grade).length)
const abnormalCount = computed(() => allItems.value.filter(i => ['increase', 'decrease', 'qualitative'].includes(String(i.flag || '').toLowerCase())).length)

function flagColor(flag?: string) {
  const f = String(flag || 'normal').toLowerCase()
  if (f === 'normal') return 'success'
  if (f === 'increase' || f === 'decrease') return 'error'
  return 'warning'
}

function flagLabel(flag?: string) {
  const f = String(flag || 'normal')
  return f.charAt(0).toUpperCase() + f.slice(1)
}

function displayResult(item: DoctorResultItem) {
  const value = item.displayValue ?? item.resultValue ?? '-'
  return item.uom ? `${value} ${item.uom}` : String(value)
}

function groupGrade(group: DoctorResultGroup) {
  return group.grade ?? group.defaultGrade ?? (group.isAbnormal ? '-' : 'A')
}

async function loadDoctorResult(examId: string) {
  doctorResultLoading.value = true
  try {
    const res = await api.get(`/mcu/exams/${examId}/doctor-result`)
    doctorResult.value = res.data?.data ?? res.data
  } catch (err) {
    const e = err as { response?: { data?: { message?: string } }, message?: string }
    toast.add({ title: 'Gagal memuat detail hasil dokter', description: e?.response?.data?.message || e?.message || 'Gagal memuat doctor result', color: 'error' })
  } finally {
    doctorResultLoading.value = false
  }
}

async function loadAll() {
  await loadDetail(reportId)
  if (detail.value?.examId) await loadDoctorResult(detail.value.examId)
}

async function handleVerify() {
  if (!detail.value) return
  const ok = await verify(detail.value.id)
  if (ok) await loadAll()
}

async function handleReturn() {
  if (!returnReason.value.trim()) return
  returnLoading.value = true
  const payload: any = {
    reason: returnReason.value.trim(),
    items: selectedReturnItems.value.map(r => ({
      inputanId: r.inputanId,
      note: r.note.trim()
    }))
  }
  const ok = await doReturn(reportId, payload)
  returnLoading.value = false
  if (ok) {
    showReturnModal.value = false
    returnReason.value = ''
    populateReturnItems()
    await loadAll()
  }
}

async function handleRelease() {
  if (!detail.value) return
  const ok = await release(detail.value.id)
  if (ok) await loadAll()
}

onMounted(loadAll)
</script>

<template>
  <UDashboardPanel id="mr-review-detail" class="w-full min-w-0">
    <template #header>
      <UDashboardNavbar :title="`MR Review — ${detail?.examCode ?? '...'}`">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton icon="i-lucide-arrow-left" variant="ghost" @click="router.push('/result/mr-review')" />
        </template>
        <template #right>
          <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="loading || doctorResultLoading" @click="loadAll">
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="loading && !detail" class="flex items-center justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
      </div>

      <div v-else-if="detail" class="flex flex-col gap-6 pb-8">
        <!-- Status bar -->
        <div class="flex items-center justify-between rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <UBadge :label="statusLabel(detail.status)" :color="statusColor(detail.status)" size="lg" variant="subtle" />
            <span class="text-sm text-muted">Exam: <strong class="font-mono">{{ detail.examCode }}</strong></span>
            <span v-if="detail.examStatus" class="text-sm text-muted">Status: {{ detail.examStatus }}</span>
          </div>
          <div class="flex gap-2">
            <UButton v-if="canVerify" label="Verify" icon="i-lucide-check-circle" color="success" :loading="submitting" @click="handleVerify" />
            <UButton v-if="canReturn" label="Return ke Dokter" icon="i-lucide-rotate-ccw" color="warning" variant="outline" :loading="submitting" @click="openReturnModal" />
            <UButton v-if="canRelease" label="Release" icon="i-lucide-send" color="primary" :loading="submitting" @click="handleRelease" />
          </div>
        </div>

        <!-- Patient info -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user" class="size-5 text-primary" />
              <h2 class="text-lg font-semibold">Informasi Pasien</h2>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <div class="text-xs text-muted">Nama</div>
              <div class="font-medium">{{ detail.patient?.name ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Patient ID</div>
              <div class="font-mono text-sm">{{ detail.patient?.PatientId ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Gender</div>
              <div>{{ detail.patient?.gender ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Queue Code</div>
              <div>{{ detail.queueCode ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Perusahaan</div>
              <div>{{ detail.company ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Exam Date</div>
              <div>{{ formatDate(detail.examDate) }}</div>
            </div>
          </div>
        </UCard>

        <!-- Doctor grading meta -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-stethoscope" class="size-5 text-primary" />
              <h2 class="text-lg font-semibold">Grading Dokter</h2>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div class="text-xs text-muted">Final Grade</div>
              <div class="text-xl font-bold">{{ detail.meta?.finalGrade ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Fitness Level</div>
              <div>{{ detail.meta?.fitnessLevel ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Final Comment</div>
              <div class="text-sm">{{ detail.meta?.finalComment ?? '-' }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Internal Note</div>
              <div class="text-sm text-muted">{{ detail.meta?.internalNote ?? '-' }}</div>
            </div>
          </div>
        </UCard>

        <!-- Doctor Result detail: same data as Doctor Result page, read-only for MR -->
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-stethoscope" class="size-5 text-primary" />
                <h2 class="text-lg font-semibold">Detail Doctor Result</h2>
              </div>
              <div class="flex gap-2">
                <UBadge color="info" variant="soft">{{ gradedCount }}/{{ totalGradable }} graded</UBadge>
                <UBadge color="warning" variant="soft">{{ abnormalCount }} abnormal</UBadge>
              </div>
            </div>
          </template>

          <div v-if="doctorResultLoading" class="flex items-center justify-center py-10">
            <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-primary" />
          </div>

          <div v-else-if="doctorResult" class="space-y-6">
            <section v-for="dept in departments" :key="dept.departmentId" class="space-y-4">
              <div class="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 class="font-semibold">{{ dept.departmentName }}</h3>
                  <p class="text-xs text-muted">{{ dept.groups.reduce((n, g) => n + (g.items?.length ?? 0), 0) }} item</p>
                </div>
                <UBadge color="neutral" variant="soft">{{ dept.departmentCode }}</UBadge>
              </div>

              <div v-for="group in dept.groups" :key="group.groupName" class="overflow-hidden rounded-lg border border-default/70">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b bg-elevated/40 px-4 py-3">
                  <div>
                    <h4 class="font-semibold">{{ group.groupName }}</h4>
                    <p class="text-xs text-muted">Grade Group: <strong>{{ groupGrade(group) }}</strong></p>
                    <p v-if="group.comment" class="mt-1 text-sm">{{ group.comment }}</p>
                  </div>
                  <UBadge v-if="group.isAbnormal" color="error" variant="soft">{{ group.abnormalCount }} abnormal</UBadge>
                  <UBadge v-else color="success" variant="soft">Normal</UBadge>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full min-w-[960px] text-sm">
                    <thead class="bg-elevated/40 text-left text-xs uppercase text-muted">
                      <tr>
                        <th class="px-4 py-3">Item</th>
                        <th class="px-4 py-3">Result</th>
                        <th class="px-4 py-3">Normal Range</th>
                        <th class="px-4 py-3">Flag</th>
                        <th class="px-4 py-3">Grade</th>
                        <th class="px-4 py-3">Comment</th>
                        <th class="px-4 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in group.items" :key="item.inputanId" class="border-t border-default align-top">
                        <td class="px-4 py-3">
                          <div class="font-medium">{{ item.inputanLabel }}</div>
                          <div class="text-xs text-muted">{{ item.inputanCode ?? '-' }}</div>
                        </td>
                        <td class="px-4 py-3 font-mono">{{ displayResult(item) }}</td>
                        <td class="px-4 py-3">
                          <span v-if="item.normalMin != null || item.normalMax != null">{{ item.normalMin ?? '-' }} - {{ item.normalMax ?? '-' }}</span>
                          <span v-else>-</span>
                        </td>
                        <td class="px-4 py-3">
                          <UBadge :label="flagLabel(item.flag)" :color="flagColor(item.flag)" variant="subtle" />
                        </td>
                        <td class="px-4 py-3">
                          <UBadge v-if="item.grade" :label="item.grade" color="primary" variant="subtle" />
                          <span v-else class="text-muted">-</span>
                        </td>
                        <td class="px-4 py-3">
                          <div>{{ item.comment ?? '-' }}</div>
                          <div v-if="item.recommendation" class="mt-1 text-xs text-muted">{{ item.recommendation }}</div>
                        </td>
                        <td class="px-4 py-3">
                          <UBadge :label="item.source" :color="item.locked ? 'neutral' : 'info'" variant="subtle" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <div v-else class="py-8 text-center text-sm text-muted">Detail Doctor Result tidak tersedia</div>
        </UCard>

        <!-- Audit trail -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-history" class="size-5 text-primary" />
              <h2 class="text-lg font-semibold">Audit Trail</h2>
            </div>
          </template>
          <div v-if="detail.actions.length === 0" class="text-sm text-muted">Belum ada aksi</div>
          <div v-else class="space-y-2">
            <div v-for="(action, i) in detail.actions" :key="i" class="flex items-start gap-3 rounded border p-3">
              <UBadge :label="action.action" :color="action.action === 'VERIFY' ? 'success' : action.action === 'RETURN' ? 'warning' : action.action === 'RELEASE' ? 'primary' : 'neutral'" variant="subtle" />
              <div class="flex-1">
                <div class="text-sm">{{ action.reason ?? '-' }}</div>
                <div class="mt-1 text-xs text-muted">{{ formatDate(action.createdAt) }} · Actor #{{ action.actorId ?? '?' }}</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Error -->
      <div v-else-if="!loading" class="py-20 text-center text-muted">Data tidak ditemukan</div>

      <!-- Return modal -->
      <UModal v-model:open="showReturnModal" title="Return ke Dokter" description="Alasan wajib diisi. Centang item yang perlu diperbaiki dan beri catatan.">
        <template #body>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-xs font-semibold text-muted">Alasan Return</label>
              <UTextarea v-model="returnReason" placeholder="Tulis alasan return..." :rows="3" class="w-full" />
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold text-muted">Item yang Harus Diperbaiki</label>
              <div v-if="returnItems.length === 0" class="text-sm text-muted">Tidak ada item gradable untuk dipilih.</div>
              <div v-else class="max-h-72 space-y-1.5 overflow-y-auto rounded border p-2">
                <div
                  v-for="(item, idx) in returnItems"
                  :key="item.inputanId"
                  class="flex items-start gap-2 rounded border p-2"
                >
                  <input
                    :id="`ret-${item.inputanId}`"
                    v-model="returnItems[idx].checked"
                    type="checkbox"
                    class="mt-1 size-4"
                  />
                  <div class="min-w-0 flex-1">
                    <label :for="`ret-${item.inputanId}`" class="block cursor-pointer text-sm font-medium">
                      {{ item.label }}
                    </label>
                    <UInput
                      v-if="returnItems[idx].checked"
                      v-model="returnItems[idx].note"
                      placeholder="Catatan untuk item ini (opsional)"
                      size="sm"
                      class="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Batal" variant="outline" @click="showReturnModal = false" />
            <UButton label="Return" color="warning" :loading="returnLoading" :disabled="!returnReason.trim()" @click="handleReturn" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
