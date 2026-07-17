<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const api = useApi()
const toast = useToast()
const { user: currentUser } = await useCurrentUser()

const { fetchUser } = useUser()
const userId = ref<number | string | null>(null)

const profileSchema = z.object({
  name: z.string().min(2, 'Too short'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  language: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<Partial<ProfileSchema>>({
  name: '',
  email: '',
  phone: '',
  language: 'id'
})

const pending = ref(false)
const error = ref<any>(null)

const employeeBasic = computed(() => (currentUser.value as any)?.employee ?? null)
const employeeData = ref<any>(null)
const leaveBalanceData = ref<any[]>([])
const employeeTab = ref('basic')

const empTabs = [
  { id: 'basic', label: 'Basic', icon: 'i-lucide-user' },
  { id: 'personal', label: 'Personal', icon: 'i-lucide-id-card' },
  { id: 'education', label: 'Education', icon: 'i-lucide-graduation-cap' },
  { id: 'contact', label: 'Emergency', icon: 'i-lucide-phone-call' },
  { id: 'children', label: 'Children', icon: 'i-lucide-users' },
  { id: 'position', label: 'Position', icon: 'i-lucide-briefcase' },
  { id: 'document', label: 'Document', icon: 'i-lucide-file-text' },
  { id: 'health', label: 'Health', icon: 'i-lucide-heart-pulse' },
]

const userRoles = computed(() =>
  currentUser.value?.roles?.map((r: { role?: { name?: string } }) => r.role?.name).filter(Boolean) ?? []
)

function fmtDate(val: any): string {
  if (!val) return '-'
  try {
    const d = new Date(typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val) ? val.slice(0, 10) : val)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return '-' }
}

const languageOptions = [
  { label: 'Bahasa Indonesia', value: 'id' },
  { label: 'English', value: 'en' }
]

async function fetchProfile() {
  pending.value = true
  error.value = null
  try {
    const res = await api.get('/users/auth')
    const data = res.data.data
    userId.value = data.id
    profile.name = data.name ?? ''
    profile.email = data.email ?? ''
    profile.phone = data.phone ?? ''
    profile.language = data.language ?? 'id'
  } catch (err) {
    console.error(err)
    error.value = err
  } finally { pending.value = false }
}

async function loadEmployeeData() {
  if (!employeeBasic.value?.id) return
  try {
    const [empRes, lbRes] = await Promise.all([
      api.get('/users/auth/employee'),
      api.get(`/hris/employee-leave-balance?employee_id=${employeeBasic.value.id}`),
    ])
    employeeData.value = empRes.data.data ?? empRes.data
    leaveBalanceData.value = lbRes.data.data ?? []
  } catch { /* silent */ }
}

onMounted(async () => {
  await fetchProfile()
  await loadEmployeeData()
})

const saving = ref(false)

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  if (!userId.value || saving.value) return
  saving.value = true
  try {
    await api.put('/users/profile', {
      name: event.data.name, email: event.data.email,
      phone: event.data.phone || null, language: event.data.language || 'id',
    })
    await fetchProfile()
    await fetchUser()
    toast.add({ title: 'Success', description: 'Profile berhasil diperbarui.', color: 'success' })
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Error', description: 'Gagal memperbarui profile.', color: 'error' })
  } finally { saving.value = false }
}
</script>

<template>
  <div class="w-full">
    <UPageCard v-if="pending" title="Loading..." description="Sedang mengambil data profile." variant="subtle" />
    <UAlert v-else-if="error" title="Gagal mengambil data" description="Data profile tidak ditemukan." color="error" icon="i-lucide-alert-circle" />

    <template v-else-if="employeeData">
      <div class="mb-6">
        <div class="flex items-start justify-between gap-6">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h1 class="text-2xl font-bold">Profile</h1>
                <p class="text-sm text-muted">Data HR Anda.</p>
              </div>
            </div>

            <div class="flex gap-1 flex-nowrap overflow-x-auto border border-default rounded-xl p-1 bg-elevated/50">
              <button v-for="t in empTabs" :key="t.id" type="button"
                class="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition"
                :class="employeeTab === t.id ? 'bg-background text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
                @click="employeeTab = t.id">
                {{ t.label }}
              </button>
            </div>
          </div>

          <div v-if="leaveBalanceData.length" class="shrink-0 w-56 space-y-3">
            <div v-for="lb in leaveBalanceData" :key="lb.id" class="rounded-xl border border-default bg-elevated/40 p-4">
              <p class="text-xs text-muted">Tahun {{ lb.tahun }}</p>
              <p class="mt-1 text-2xl font-bold text-primary">{{ lb.sisa_baru ?? 0 }}</p>
              <p class="text-xs text-muted mt-1">Sisa dari {{ lb.jatah_cuti_baru }} jatah cuti baru</p>
              <div class="mt-2 h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                <div class="h-full rounded-full bg-primary" :style="`width:${Math.min(100, (lb.sisa_baru / Math.max(lb.jatah_cuti_baru, 1)) * 100)}%`" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <UPageCard variant="subtle">
        <template #header>
          <p class="text-sm text-muted">{{ {'basic':'Informasi dasar employee','personal':'Data pribadi','education':'Riwayat pendidikan','contact':'Kontak darurat','children':'Data anak','position':'Posisi dan jabatan','document':'Nomor dokumen','health':'Data kesehatan','leave':'Saldo cuti tahunan'}[employeeTab] || 'Data employee' }}</p>
        </template>

        <div v-if="employeeTab === 'basic'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">NIK</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.nik || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Nama</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.nama || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Email</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.email || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">No. HP</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.no_hp || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Status</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.status || '-' }}</p></div>
        </div>

        <div v-else-if="employeeTab === 'personal'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">No. KTP</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.no_ktp || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">No. KK</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.no_kk || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Tempat Lahir</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.tempat_lahir || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Tanggal Lahir</p><p class="mt-1 font-medium text-highlighted">{{ fmtDate(employeeData.employeePersonal?.[0]?.tanggal_lahir) }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Jenis Kelamin</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.jenis_kelamin || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Nama Ibu Kandung</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.nama_ibu_kandung || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Alamat KTP</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.alamat_ktp || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Alamat Domisili</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.alamat_domisili || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Tanggal Abis KTP</p><p class="mt-1 font-medium text-highlighted">{{ fmtDate(employeeData.employeePersonal?.[0]?.tanggal_abis_ktp) }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Agama</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.religion?.nama_agama || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Gol. Darah</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.blood_type?.kode || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Status Nikah</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeePersonal?.[0]?.marital_status?.nama || '-' }}</p></div>
        </div>

        <div v-else-if="employeeTab === 'education'" class="space-y-3">
          <p v-if="!employeeData.educations?.length" class="text-sm text-muted">Tidak ada data pendidikan.</p>
          <div v-for="edu in employeeData.educations" :key="edu.id" class="rounded-xl border border-default p-4">
            <p class="font-medium">{{ edu.nama_sekolah }}</p>
            <p class="text-sm text-muted mt-1">{{ edu.jurusan }} — {{ edu.tahun_masuk }}–{{ edu.tahun_lulus }}</p>
          </div>
        </div>

        <div v-else-if="employeeTab === 'contact'" class="space-y-3">
          <p v-if="!employeeData.employee_emergency_contacts?.length" class="text-sm text-muted">Tidak ada kontak darurat.</p>
          <div v-for="c in employeeData.employee_emergency_contacts" :key="c.id" class="rounded-xl border border-default p-4">
            <p class="font-medium">{{ c.nama }}</p>
            <p class="text-sm text-muted mt-1">{{ c.hubungan }} · {{ c.telepon }}</p>
          </div>
        </div>

        <div v-else-if="employeeTab === 'children'" class="space-y-3">
          <p v-if="!employeeData.empleyeeChild?.length" class="text-sm text-muted">Tidak ada data anak.</p>
          <div v-for="child in employeeData.empleyeeChild" :key="child.id" class="rounded-xl border border-default p-4">
            <p class="font-medium">{{ child.nama }}</p>
            <p class="text-sm text-muted mt-1">{{ child.jenis_kelamin }}</p>
            <p class="text-sm text-muted">Tgl Lahir: {{ fmtDate(child.tanggal_lahir) }} | Pendidikan: {{ child.pendidikan || '-' }} | Pekerjaan: {{ child.pekerjaan || '-' }}</p>
          </div>
        </div>

        <div v-else-if="employeeTab === 'position'" class="space-y-3">
          <p v-if="!employeeData.employeePosition?.length" class="text-sm text-muted">Tidak ada data posisi.</p>
          <div v-for="pos in employeeData.employeePosition" :key="pos.id" class="rounded-xl border border-default p-4">
            <p class="font-medium">{{ pos.department?.nama_department || '-' }}</p>
            <p class="text-sm text-muted mt-1">{{ pos.section?.nama || '-' }}</p>
          </div>
        </div>

        <div v-else-if="employeeTab === 'document'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">NPWP</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeDocument?.[0]?.no_npwp || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Asuransi</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeDocument?.[0]?.no_asuransi || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Jamsostek</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeDocument?.[0]?.no_jamsostek || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">BPJS Kesehatan</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeDocument?.[0]?.no_bpjs_kesehatan || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">BPJS Ketenagakerjaan</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeDocument?.[0]?.no_bpjs_ketenagakerjaan || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">DPLK</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeDocument?.[0]?.no_dplk || '-' }}</p></div>
        </div>

        <div v-else-if="employeeTab === 'health'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Tinggi Badan</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.tinggi_badan || '-' }} cm</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Berat Badan</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.berat_badan || '-' }} kg</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Kacamata</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.kacamata ? 'Ya' : 'Tidak' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Alergi</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.alergi || '-' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Cacat Bicara</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.cacat_bicara ? 'Ya' : 'Tidak' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Cacat Pendengaran</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.cacat_pendengaran ? 'Ya' : 'Tidak' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Cacat Penglihatan</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.cacat_penglihatan ? 'Ya' : 'Tidak' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Cacat Anggota Badan</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.cacat_anggota_badan ? 'Ya' : 'Tidak' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Cacat Lainnya</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.cacat_lain ? 'Ya' : 'Tidak' }}</p></div>
          <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Penjelasan Cacat</p><p class="mt-1 font-medium text-highlighted">{{ employeeData.employeeHealth?.[0]?.cacat_penjelasan || '-' }}</p></div>
        </div>

        <div v-else-if="employeeTab === 'leave'" class="space-y-3">
          <p v-if="!leaveBalanceData.length" class="text-sm text-muted">Tidak ada data saldo cuti.</p>
          <div v-for="lb in leaveBalanceData" :key="lb.id" class="rounded-xl border border-default p-4 flex items-center justify-between">
            <div>
              <p class="font-medium">Tahun {{ lb.tahun }}</p>
              <p class="text-sm text-muted">Jatah Baru: {{ lb.jatah_cuti_baru }} | Sisa: {{ lb.sisa_baru }}</p>
            </div>
          </div>
        </div>
      </UPageCard>
    </template>

    <UForm v-else-if="userId" id="settings" :schema="profileSchema" :state="profile" @submit="onSubmit">
      <UPageCard title="Profile" description="Manage your personal information." variant="naked" orientation="horizontal" class="mb-4">
        <UButton form="settings" label="Save changes" color="neutral" type="submit" :loading="saving" class="w-fit lg:ms-auto" />
      </UPageCard>

      <UPageCard variant="subtle">
        <template #header>
          <div><h2 class="text-base font-semibold">Informasi Akun</h2><p class="text-sm text-muted">Data akun Anda.</p></div>
        </template>
        <div class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Staff ID</p><p class="mt-1 font-medium text-highlighted">{{ userId ?? '-' }}</p></div>
            <div class="rounded-xl border border-default bg-elevated/40 p-4"><p class="text-xs text-muted">Role</p><p class="mt-1 font-medium text-highlighted">{{ userRoles.join(', ') || '-' }}</p></div>
          </div>
          <USeparator />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField name="name" label="Name" required><UInput v-model="profile.name" class="w-full" /></UFormField>
            <UFormField name="email" label="Email" required><UInput v-model="profile.email" type="email" class="w-full" /></UFormField>
            <UFormField name="phone" label="Phone"><UInput v-model="profile.phone" placeholder="+62..." class="w-full" /></UFormField>
            <UFormField name="language" label="Language"><USelect v-model="profile.language" :items="languageOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
          </div>
        </div>
      </UPageCard>
    </UForm>
  </div>
</template>
