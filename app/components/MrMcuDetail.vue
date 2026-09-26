<script setup lang="ts">
import type { DoctorResultResponse, DoctorResultDepartment, DoctorResultItem, DoctorResultGroup } from '~/types/doctor-result'
import type { MedicalReportDetail } from '~/types/medical-report'
import { buildMrPrintHtml } from '~/composables/mr/useMrPrintHtml'

const props = defineProps<{
  reportId: string
}>()

const api = useApi()
const toast = useToast()

type CompanyHistory = { company: string | null, position: string | null, isCurrent: boolean } | null

type McuDetail = {
  medicalReport: MedicalReportDetail
  doctorResult: DoctorResultResponse | null
  companyHistory: CompanyHistory
  doctorName: string | null
  patientPhotoUrl: string | null
  branchName: string | null
}

type HistoryRow = {
  id: string
  regNumber: string | null
  examDate: string | null
  createdAt: string | null
  status: string
  finalGrade: string | null
  fitnessLevel: string | null
  finalComment: string | null
}

const loading = ref(true)
const detail = ref<McuDetail | null>(null)
const history = ref<HistoryRow[]>([])

const TABS = [
  { key: 'summary', label: 'Ringkasan' },
  { key: 'exam', label: 'Pemeriksaan' },
  { key: 'lab', label: 'Laboratorium' },
  { key: 'support', label: 'Penunjang' },
  { key: 'doctor', label: 'Dokter' },
  { key: 'conclusion', label: 'Kesimpulan' }
] as const

const activeTab = ref<string>('summary')

const mr = computed(() => detail.value?.medicalReport ?? null)
const dr = computed(() => detail.value?.doctorResult ?? null)
const FINAL_STATUSES = ['MR_VERIFIED', 'READY_TO_RELEASE', 'RELEASED']
const isReportFinal = computed(() => FINAL_STATUSES.includes(mr.value?.status ?? ''))
const departments = computed<DoctorResultDepartment[]>(() => dr.value?.departments ?? [])

function deptByCode(pattern: RegExp) {
  return departments.value.filter(d => pattern.test(d.departmentCode))
}

const nurseDept = computed(() => deptByCode(/NURSE/i))
const dokDept = computed(() => deptByCode(/^DOK/i))
const labDept = computed(() => deptByCode(/LAB/i))
const supportDept = computed(() =>
  departments.value.filter(d => !/NURSE|^DOK|LAB/i.test(d.departmentCode))
)

const vitalItems = computed<DoctorResultItem[]>(() =>
  nurseDept.value.flatMap(d => d.groups.flatMap(g => g.items))
)
const dokGroups = computed<DoctorResultGroup[]>(() => dokDept.value.flatMap(d => d.groups))
const physicalGroup = computed<DoctorResultGroup | null>(() =>
  dokGroups.value.find(g => g.items.length > 0) ?? dokGroups.value[0] ?? null
)
const physicalItems = computed<DoctorResultItem[]>(() =>
  dokGroups.value.flatMap(g => g.items)
)

type DeptSummary = {
  id: string
  name: string
  itemCount: number
  abnormalCount: number
  grade: string | null
}
const deptSummaries = computed<DeptSummary[]>(() =>
  departments.value.map((d) => {
    const items = d.groups.flatMap(g => g.items)
    const abnormalCount = d.groups.reduce((n, g) => n + (g.abnormalCount ?? 0), 0)
    const grade
      = d.groups.find(g => g.grade)?.grade
        ?? d.groups.find(g => g.defaultGrade)?.defaultGrade
        ?? null
    return {
      id: d.departmentId,
      name: d.departmentName,
      itemCount: items.length,
      abnormalCount,
      grade
    }
  })
)

type AbnormalFinding = {
  key: string
  deptName: string
  groupName: string
  label: string
  value: string
  range: string
}
const abnormalFindings = computed<AbnormalFinding[]>(() => {
  const out: AbnormalFinding[] = []
  for (const d of departments.value) {
    for (const g of d.groups) {
      for (const item of g.items) {
        if (String(item.flag || 'normal').toLowerCase() === 'normal') continue
        out.push({
          key: `${d.departmentId}:${item.inputanId}`,
          deptName: d.departmentName,
          groupName: g.groupName,
          label: item.inputanLabel,
          value: resultText(item),
          range: normalRange(item)
        })
      }
    }
  }
  return out
})

const patientName = computed(() => dr.value?.patient?.name || mr.value?.patient?.name || '-')
const patientCode = computed(() => dr.value?.patient?.patientId || mr.value?.patient?.PatientId || '-')
const genderLabel = computed(() => {
  const g = dr.value?.patient?.gender || mr.value?.patient?.gender
  return g === 'MALE' ? 'Laki-laki' : g === 'FEMALE' ? 'Perempuan' : '-'
})
const patientAge = computed(() => {
  const age = dr.value?.patient?.age
  if (age != null && age !== '') return `${age} tahun`
  const dob = mr.value?.patient?.dob
  if (!dob) return '-'
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return '-'
  const now = new Date()
  let a = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a -= 1
  return `${a} tahun`
})

const examDate = computed(() => dr.value?.patient?.examDate || mr.value?.examDate || null)
const companyName = computed(() =>
  detail.value?.companyHistory?.company || dr.value?.patient?.company || mr.value?.companyName || '-'
)
const positionName = computed(() => detail.value?.companyHistory?.position || '-')
const packageName = computed(() => dr.value?.patient?.package || '-')

const finalGrade = computed(() => mr.value?.meta?.finalGrade || dr.value?.submission?.finalGrade || '-')
const fitnessLevel = computed(() => mr.value?.meta?.fitnessLevel || dr.value?.submission?.fitnessLevel || '-')
const finalComment = computed(() => mr.value?.meta?.finalComment || dr.value?.submission?.finalComment || '-')

const fitTone = computed(() => {
  const f = String(fitnessLevel.value).toLowerCase()
  if (f.includes('unfit')) return 'tone-danger'
  if (f.includes('follow') || f.includes('restriction')) return 'tone-warning'
  return 'tone-success'
})

const initials = computed(() =>
  patientName.value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
)

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function normalRange(item: DoctorResultItem) {
  if (item.normalMin == null && item.normalMax == null) return '-'
  if (item.normalMin != null && item.normalMax != null) return `${item.normalMin} – ${item.normalMax}`
  if (item.normalMin != null) return `≥ ${item.normalMin}`
  return `≤ ${item.normalMax}`
}

function resultText(item: DoctorResultItem) {
  const value = item.displayValue ?? item.resultValue ?? '-'
  return item.uom ? `${value} ${item.uom}` : String(value)
}

function flagClass(flag?: string | null) {
  const f = String(flag || 'normal').toLowerCase()
  if (f === 'normal') return 'is-normal'
  if (f === 'increase') return 'is-high'
  if (f === 'decrease') return 'is-low'
  return 'is-qual'
}

function flagLabel(flag?: string | null) {
  const f = String(flag || 'normal').toLowerCase()
  if (f === 'normal') return 'Normal'
  if (f === 'increase') return '↑'
  if (f === 'decrease') return '↓'
  return '±'
}

function printPage() {
  if (!import.meta.client || !detail.value) return

  const html = buildMrPrintHtml({
    medicalReport: detail.value.medicalReport,
    doctorResult: detail.value.doctorResult,
    companyHistory: detail.value.companyHistory,
    doctorName: detail.value.doctorName,
    branchName: detail.value.branchName,
    logoUrl: new URL('/logo.png', window.location.origin).toString()
  })

  const win = window.open('', '_blank')
  if (!win) {
    toast.add({
      title: 'Popup diblokir',
      description: 'Izinkan popup untuk mencetak hasil MCU.',
      color: 'warning'
    })
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  window.setTimeout(() => win.print(), 500)
}

const rootRef = ref<HTMLElement | null>(null)
const tabsRef = ref<HTMLElement | null>(null)
const panelsRef = ref<HTMLElement | null>(null)

function selectTab(key: string) {
  activeTab.value = key
  nextTick(() => {
    const scroller = rootRef.value?.closest('[data-slot="body"]') as HTMLElement | null
    const tabs = tabsRef.value
    const panels = panelsRef.value
    if (!scroller || !tabs || !panels) return
    const gap = 24
    const panelsTop
      = panels.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top
        + scroller.scrollTop
    const target = Math.max(0, panelsTop - tabs.offsetHeight - gap)
    scroller.scrollTo({ top: target, behavior: 'smooth' })
  })
}

function toTime(value?: string | null) {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? null : t
}

function buildHistory(rows: HistoryRow[]): HistoryRow[] {
  const curDate = toTime(mr.value?.examDate ?? null)
  const curCreated = toTime(mr.value?.createdAt ?? null)
  return rows
    .filter(r => r.id !== props.reportId)
    .filter((r) => {
      const rDate = toTime(r.examDate)
      const rCreated = toTime(r.createdAt)
      if (rDate != null && curDate != null && rDate !== curDate) return rDate < curDate
      if (rCreated != null && curCreated != null) return rCreated < curCreated
      return false
    })
    .sort((a, b) => {
      const diff = (toTime(b.examDate) ?? 0) - (toTime(a.examDate) ?? 0)
      return diff !== 0
        ? diff
        : (toTime(b.createdAt) ?? 0) - (toTime(a.createdAt) ?? 0)
    })
}

async function load() {
  loading.value = true
  try {
    const res = await api.get(`/front-office/medical-records/${props.reportId}`)
    detail.value = (res.data?.data ?? null) as McuDetail | null

    const patientId = detail.value?.medicalReport?.patient?.id
    if (patientId) {
      const listRes = await api.get(`/front-office/patients/${patientId}/medical-records`)
      const rows = (listRes.data?.data ?? []) as HistoryRow[]
      history.value = buildHistory(rows)
    }
  } catch {
    toast.add({
      title: 'Failed',
      description: 'Failed to load medical record detail',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(
  () => props.reportId,
  (id) => {
    if (id) {
      void load()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div ref="rootRef" class="mr-doc">
    <div v-if="loading" class="mr-loading">
      <span class="mr-spinner" />
      <span>Memuat medical record...</span>
    </div>

    <div v-else-if="detail && mr">
      <div class="page-head">
        <div class="page-title">
          <div class="title-icon">
            ▣
          </div>
          <div>
            <h1>Medical Record (MR) MCU</h1>
            <div class="mr-code">
              {{ mr.queueCode || '-' }}
            </div>
          </div>
        </div>
        <div class="actions">
          <button
            class="btn primary"
            type="button"
            @click="printPage"
          >
            ⎙ Cetak PDF
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="identity-wrap" :class="{ 'no-result': !isReportFinal }">
            <div class="identity">
              <div class="patient-avatar">
                <img v-if="detail.patientPhotoUrl" :src="detail.patientPhotoUrl" alt="Patient">
                <span v-else>{{ initials || '●' }}</span>
              </div>
              <div class="info-grid">
                <span class="label">No. MR</span><span class="value">{{ patientCode }}</span>
                <span class="label">Nama</span><span class="value">{{ patientName }}</span>
                <span class="label">Jenis Kelamin</span><span class="value">{{ genderLabel }}</span>
                <span class="label">Tanggal Lahir</span><span class="value">{{ formatDate(mr.patient?.dob) }} ({{ patientAge }})</span>
              </div>
              <div class="info-grid">
                <span class="label">Perusahaan</span><span class="value">{{ companyName }}</span>
                <span class="label">Jabatan</span><span class="value">{{ positionName }}</span>
                <span class="label">Paket</span><span class="value">{{ packageName }}</span>
                <span class="label">Tanggal MCU</span><span class="value">{{ formatDate(examDate) }}</span>
              </div>
            </div>
            <div v-if="isReportFinal" class="result-col">
              <div class="result-box" :class="fitTone">
                <div class="result-title">
                  <span class="check">✓</span>{{ fitnessLevel }}
                </div>
                <p>{{ finalComment }}</p>
              </div>
              <div class="grade-box">
                <div class="grade-label">
                  Grade
                </div>
                <div class="grade-value">
                  {{ finalGrade }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref="tabsRef" class="tabs">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="tab"
          :class="{ active: activeTab === t.key }"
          type="button"
          @click="selectTab(t.key)"
        >
          {{ t.label }}
        </button>
      </div>

      <div ref="panelsRef" class="mr-panels">
        <!-- Ringkasan -->
        <div class="tab-panel" :class="{ active: activeTab === 'summary' }">
          <div class="mr-summary">
            <div class="card">
              <div class="card-head">
                Ringkasan Pemeriksaan
              </div>
              <div class="card-body">
                <div v-if="!deptSummaries.length" class="empty">
                  Tidak ada data.
                </div>
                <div v-else class="dept-grid">
                  <div v-for="d in deptSummaries" :key="d.id" class="dept-item">
                    <div class="dept-name">
                      {{ d.name }}
                    </div>
                    <div class="dept-meta">
                      {{ d.itemCount }} item<span v-if="d.grade"> · Grade {{ d.grade }}</span>
                    </div>
                    <span class="status" :class="d.abnormalCount > 0 ? 'is-high' : 'is-normal'">
                      {{ d.abnormalCount }} abnormal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                Temuan Abnormal
              </div>
              <div class="card-body">
                <div v-if="!abnormalFindings.length" class="empty">
                  Tidak ada temuan abnormal.
                </div>
                <table v-else>
                  <thead>
                    <tr><th>Pemeriksaan</th><th>Hasil</th><th>Nilai Normal</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="f in abnormalFindings" :key="f.key">
                      <td>
                        <div>{{ f.label }}</div>
                        <div class="finding-source">
                          {{ f.deptName }} — {{ f.groupName }}
                        </div>
                      </td>
                      <td><span class="status is-high">{{ f.value }}</span></td>
                      <td>{{ f.range }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                Kesimpulan
              </div>
              <div class="card-body">
                <div class="conclusion" :class="fitTone">
                  <div>
                    <strong>✓ {{ fitnessLevel }}</strong><br>
                    <span class="conclusion-sub">{{ finalComment }}</span>
                    <div class="conclusion-grade">
                      Grade {{ finalGrade }}
                    </div>
                  </div>
                  <div class="signature">
                    {{ formatDate(examDate) }}<br>
                    <div class="line">
                      {{ detail.doctorName || '-' }}
                    </div><b>Dokter Pemeriksa</b>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                Riwayat MCU Sebelumnya
              </div>
              <div class="card-body">
                <div v-if="!history.length" class="empty">
                  Tidak ada riwayat MCU sebelumnya.
                </div>
                <table v-else>
                  <thead>
                    <tr><th>Tanggal</th><th>No. Registrasi</th><th>Hasil</th><th>Catatan</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in history" :key="row.id">
                      <td>{{ formatDate(row.examDate) }}</td>
                      <td>{{ row.regNumber || '-' }}</td>
                      <td>{{ row.fitnessLevel || '-' }} ({{ row.finalGrade || '-' }})</td>
                      <td>{{ row.finalComment || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Pemeriksaan -->
        <div class="tab-panel" :class="{ active: activeTab === 'exam' }">
          <div class="card">
            <div class="card-head">
              Vital Sign
            </div>
            <div class="card-body" style="padding: 10px">
              <div v-if="!vitalItems.length" class="empty">
                Tidak ada data.
              </div>
              <div v-else class="vitals">
                <div v-for="item in vitalItems" :key="item.inputanId" class="metric">
                  <span class="name">{{ item.inputanLabel }}</span>
                  <span class="val">{{ resultText(item) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              Pemeriksaan Fisik Lengkap
            </div>
            <div class="card-body">
              <div v-if="!physicalGroup || !physicalItems.length" class="empty">
                Tidak ada data.
              </div>
              <table v-else>
                <thead>
                  <tr><th>Area</th><th>Hasil</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in physicalItems" :key="item.inputanId">
                    <td>{{ item.inputanLabel }}</td>
                    <td>{{ resultText(item) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Laboratorium -->
        <div class="tab-panel" :class="{ active: activeTab === 'lab' }">
          <div class="card">
            <div class="card-head">
              Hasil Laboratorium
            </div>
            <div class="card-body">
              <div v-if="!labDept.length" class="empty">
                Tidak ada data.
              </div>
              <div v-for="dept in labDept" :key="dept.departmentId">
                <div v-for="group in dept.groups" :key="group.groupName">
                  <div class="sub-title">
                    {{ group.groupName }}
                  </div>
                  <table>
                    <thead>
                      <tr><th>Pemeriksaan</th><th>Hasil</th><th>Unit</th><th>Nilai Rujukan</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in group.items" :key="item.inputanId">
                        <td>{{ item.inputanLabel }}</td>
                        <td>{{ item.displayValue ?? item.resultValue ?? '-' }}</td>
                        <td>{{ item.uom || '-' }}</td>
                        <td>{{ normalRange(item) }}</td>
                        <td><span class="status" :class="flagClass(item.flag)">{{ flagLabel(item.flag) }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Penunjang -->
        <div class="tab-panel" :class="{ active: activeTab === 'support' }">
          <div class="card">
            <div class="card-head">
              Pemeriksaan Penunjang
            </div>
            <div class="card-body">
              <div v-if="!supportDept.length" class="empty">
                Tidak ada data.
              </div>
              <div v-for="dept in supportDept" :key="dept.departmentId">
                <div v-for="group in dept.groups" :key="group.groupName">
                  <div class="sub-title">
                    {{ dept.departmentName }} — {{ group.groupName }}
                  </div>
                  <table>
                    <thead>
                      <tr><th>Jenis</th><th>Hasil</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in group.items" :key="item.inputanId">
                        <td>{{ item.inputanLabel }}</td>
                        <td>{{ resultText(item) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Dokter -->
        <div class="tab-panel" :class="{ active: activeTab === 'doctor' }">
          <div class="card">
            <div class="card-head">
              Catatan Dokter
            </div>
            <div class="card-body">
              <div class="note">
                {{ finalComment }}
              </div>
            </div>
          </div>
        </div>

        <!-- Kesimpulan -->
        <div class="tab-panel" :class="{ active: activeTab === 'conclusion' }">
          <div class="card">
            <div class="card-head">
              Kesimpulan Akhir MCU
            </div>
            <div class="card-body">
              <div class="conclusion" :class="fitTone">
                <div>
                  <strong>✓ {{ fitnessLevel }}</strong><br>
                  <span class="conclusion-sub">{{ finalComment }}</span>
                </div>
                <div class="signature">
                  {{ formatDate(examDate) }}<br>
                  <div class="line">
                    {{ detail.doctorName || '-' }}
                  </div><b>Dokter Pemeriksa</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty" style="padding: 40px; text-align: center">
      Medical record tidak ditemukan.
    </div>
  </div>
</template>

<style scoped>
.mr-doc {
  --navy: #173b5c;
  --blue: #1f5f91;
  --green-soft: #eaf8f1;
  --border: var(--ui-border);
  --text: var(--ui-text);
  --muted: var(--ui-text-muted);
  --surface: var(--ui-bg);
  --surface-elev: var(--ui-bg-elevated);
  color: var(--text);
  font-size: 14px;
}
.dark .mr-doc {
  --navy: #a9c9ea;
  --blue: #7cb0dd;
  --green-soft: #10251c;
}

.mr-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: var(--muted);
}
.mr-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: mr-spin 0.8s linear infinite;
}
@keyframes mr-spin {
  to { transform: rotate(360deg); }
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-icon {
  width: 36px;
  height: 36px;
  background: var(--surface-elev);
  color: var(--blue);
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-size: 18px;
}
h1 {
  font-size: 22px;
  margin: 0;
  color: var(--navy);
}
.mr-code {
  font-size: 12px;
  color: var(--muted);
}
.actions {
  display: flex;
  gap: 8px;
}
.btn {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  padding: 9px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
.btn.primary {
  background: #246695;
  color: #fff;
  border-color: #246695;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(20, 50, 80, 0.06);
  margin-bottom: 16px;
}
.card-head {
  background: var(--surface-elev);
  padding: 11px 15px;
  color: var(--blue);
  font-weight: 700;
  border-bottom: 1px solid var(--border);
  border-radius: 8px 8px 0 0;
}
.card-body {
  padding: 15px;
}

.identity-wrap {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
}
.identity-wrap.no-result {
  grid-template-columns: 1fr;
}
.identity {
  display: grid;
  grid-template-columns: 80px 1fr 1fr;
  gap: 12px;
}
.patient-avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--surface-elev);
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 700;
  color: var(--muted);
  overflow: hidden;
}
.patient-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 7px 10px;
  align-content: start;
}
.info-grid .label {
  color: var(--muted);
}
.info-grid .value {
  font-weight: 600;
}
.result-box {
  border: 1px solid #c8eadb;
  background: var(--green-soft);
  border-radius: 8px;
  padding: 18px;
  color: #176c4d;
}
.result-box.tone-warning {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92600a;
}
.result-box.tone-danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}
.result-box .check {
  display: inline-grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #1b9a69;
  color: #fff;
  margin-right: 8px;
}
.tone-warning .check { background: #d97706; }
.tone-danger .check { background: #dc2626; }
.result-title {
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  text-transform: uppercase;
}
.result-box p {
  font-size: 12px;
  line-height: 1.5;
  margin: 10px 0 0;
}
.result-tags {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.tag {
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  padding: 3px 9px;
}
.result-col {
  display: flex;
  flex-direction: row;
  gap: 12px;
}
.result-box {
  flex: 1 1 auto;
}
.grade-box {
  flex: 0 0 auto;
  min-width: 96px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 8px;
  padding: 16px 18px;
  text-align: center;
}
.grade-label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.grade-value {
  margin-top: 4px;
  font-size: 34px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--navy);
}

.tabs {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  gap: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: auto;
  margin-bottom: 16px;
  box-shadow: 0 2px 6px rgba(20, 50, 80, 0.08);
}
.tab {
  border: 0;
  background: transparent;
  padding: 13px 18px;
  color: var(--muted);
  border-bottom: 3px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.tab:hover {
  color: var(--blue);
}
.tab.active {
  color: var(--blue);
  border-bottom-color: var(--blue);
  font-weight: 700;
}

.tab-panel {
  display: none;
}
.tab-panel.active {
  display: block;
}
.mr-panels {
  padding-top: 8px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.vitals {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.metric {
  padding: 12px;
  border: 1px solid var(--border);
  margin: -1px 0 0 -1px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.metric .name {
  color: var(--muted);
}
.metric .val {
  font-weight: 700;
  color: var(--navy);
}
.mr-summary .card {
  margin-bottom: 16px;
}
.dept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.dept-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}
.dept-name {
  font-weight: 700;
  color: var(--navy);
}
.dept-meta {
  font-size: 12px;
  color: var(--muted);
  margin: 4px 0 8px;
}
.finding-source {
  font-size: 11px;
  color: var(--muted);
}
.conclusion-grade {
  font-size: 20px;
  font-weight: 800;
  white-space: nowrap;
  margin-top: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 10px 9px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
  background: var(--surface-elev);
}
td {
  font-size: 13px;
}
.sub-title {
  font-weight: 700;
  color: var(--navy);
  margin: 10px 0 6px;
}
.status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 20px;
  background: #eaf8f1;
  color: #148057;
  font-size: 11px;
  font-weight: 700;
}
.status.is-high {
  background: #fef2f2;
  color: #b91c1c;
}
.status.is-low {
  background: #fffbeb;
  color: #b45309;
}
.status.is-qual {
  background: #eef6fd;
  color: #1d4ed8;
}
.note {
  background: var(--surface-elev);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 13px;
  line-height: 1.55;
}
.conclusion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: #effaf5;
  border: 1px solid #c9e9db;
  border-radius: 8px;
  padding: 18px;
}
.conclusion.tone-warning {
  background: #fffbeb;
  border-color: #fde68a;
}
.conclusion.tone-danger {
  background: #fef2f2;
  border-color: #fecaca;
}
.conclusion strong {
  color: #167650;
  font-size: 19px;
  text-transform: uppercase;
}
.tone-warning strong { color: #b45309; }
.tone-danger strong { color: #b91c1c; }
.conclusion-sub {
  color: #527568;
  font-size: 12px;
}
.signature {
  text-align: right;
  color: var(--muted);
  font-size: 12px;
}
.signature .line {
  font-family: cursive;
  font-size: 24px;
  color: var(--navy);
  margin: 7px 0;
}
.empty {
  color: var(--muted);
  font-size: 13px;
  padding: 6px 0;
}

/* Dark mode: warna status/tonal */
.dark .mr-doc .result-box {
  border-color: #1f4a39;
  background: #10251c;
  color: #8fe0b6;
}
.dark .mr-doc .result-box.tone-warning {
  border-color: #5b4a16;
  background: #2a2110;
  color: #f0c66b;
}
.dark .mr-doc .result-box.tone-danger {
  border-color: #5b2222;
  background: #2a1414;
  color: #f3a1a1;
}
.dark .mr-doc .conclusion {
  background: #0f2620;
  border-color: #1f4a39;
}
.dark .mr-doc .conclusion.tone-warning {
  background: #2a2110;
  border-color: #5b4a16;
}
.dark .mr-doc .conclusion.tone-danger {
  background: #2a1414;
  border-color: #5b2222;
}
.dark .mr-doc .conclusion strong {
  color: #8fe0b6;
}
.dark .mr-doc .tone-warning strong {
  color: #f0c66b;
}
.dark .mr-doc .tone-danger strong {
  color: #f3a1a1;
}
.dark .mr-doc .conclusion-sub {
  color: #9fb8ac;
}
.dark .mr-doc .status {
  background: #10251c;
  color: #8fe0b6;
}
.dark .mr-doc .status.is-high {
  background: #2a1414;
  color: #f3a1a1;
}
.dark .mr-doc .status.is-low {
  background: #2a2110;
  color: #f0c66b;
}
.dark .mr-doc .status.is-qual {
  background: #12233a;
  color: #8fbcff;
}

@media (max-width: 1050px) {
  .identity-wrap {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .identity {
    grid-template-columns: 65px 1fr;
  }
  .identity .info-grid:last-child {
    grid-column: 1 / -1;
  }
  .vitals {
    grid-template-columns: 1fr;
  }
}
</style>
