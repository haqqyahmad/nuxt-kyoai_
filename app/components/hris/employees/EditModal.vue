<script setup lang="ts">
type Education = { id?: number, employee_id?: number, education_level_id?: number, nama_sekolah: string, jurusan?: string, tahun_masuk?: number, tahun_lulus?: number, ipk?: number | null }
type EmergencyContact = { id?: number, employee_id?: number, nama: string, hubungan: string, telepon: string, alamat?: string }
type Child = { id?: number, employee_id?: number, nama: string, jenis_kelamin: string, tempat_lahir?: string, tanggal_lahir?: string, pendidikan?: string, pekerjaan?: string }
type Position = { id?: number, employee_id?: number, department_id?: number, section_id?: number, company_id?: number, branch_id?: number, position_id?: number, golongan_id?: number, grade_id?: number, tanggal_mulai?: string, tanggal_selesai?: string | null, is_primary?: boolean }

const props = defineProps<{ employeeId: number | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()
const api = useApi()
const toast = useToast()
const open = defineModel<boolean>('open', { default: false })

const loading = ref(false)
const activeTab = ref('basic')
const employee = ref<any>(null)

// Form states
const basicForm = reactive({ nama: '', email: '', no_telp: '', no_hp: '', status: 'active', company_id: null as number | null, employee_type_id: null as number | null, tgl_masuk: '', tgl_resign: '', photo: '' })
const personalForm = reactive({ no_ktp: '', no_kk: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: '', nama_ibu_kandung: '', alamat_ktp: '', alamat_domisili: '', tanggal_abis_ktp: '', agama_id: null as number | null, blood_type_id: null as number | null, marital_status_id: null as number | null })
const educations = ref<Education[]>([])
const emergencyContacts = ref<EmergencyContact[]>([])
const children = ref<Child[]>([])
const positions = ref<Position[]>([])
const documentForm = reactive({ no_npwp: '', no_asuransi: '', no_jamsostek: '', no_bpjs_kesehatan: '', no_bpjs_ketenagakerjaan: '', no_dplk: '' })
const healthForm = reactive({ tinggi_badan: 0, berat_badan: 0, kacamata: false, alergi: '', cacat_bicara: false, cacat_pendengaran: false, cacat_penglihatan: false, cacat_anggota_badan: false, cacat_lain: false, cacat_penjelasan: '' })
const leaveBalances = ref<any[]>([])
const linkedUser = ref<{ id: number, name: string, email: string } | null>(null)
const unlinkedUsers = ref<{ id: number, name: string, email: string }[]>([])
const selectedUserId = ref<number | null>(null)
const departments = ref<{ id: number, nama: string }[]>([])
const sections = ref<{ id: number, nama: string }[]>([])

// Master data lookups
const educationLevels = ref<{ id: number, kode: string, nama: string }[]>([])
const religions = ref<{ id: number, nama_agama: string }[]>([])
const bloodTypes = ref<{ id: number, kode: string }[]>([])
const maritalStatuses = ref<{ id: number, kode: string, nama: string }[]>([])

function toDateStr(val: any): string {
  if (!val) return ''
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10)
  try { return new Date(val).toISOString().slice(0, 10) } catch { return '' }
}

const tabs = [
  { id: 'basic', label: 'Basic', icon: 'i-lucide-user' },
  { id: 'user', label: 'User', icon: 'i-lucide-user-circle' },
  { id: 'personal', label: 'Personal', icon: 'i-lucide-id-card' },
  { id: 'education', label: 'Education', icon: 'i-lucide-graduation-cap' },
  { id: 'contact', label: 'Emergency', icon: 'i-lucide-phone-call' },
  { id: 'children', label: 'Children', icon: 'i-lucide-users' },
  { id: 'position', label: 'Position', icon: 'i-lucide-briefcase' },
  { id: 'document', label: 'Document', icon: 'i-lucide-file-text' },
  { id: 'health', label: 'Health', icon: 'i-lucide-heart-pulse' },
  { id: 'leave', label: 'Leave Balance', icon: 'i-lucide-coins' },
]

async function loadMasterData() {
  try {
    const [eduRes, relRes, bloodRes, maritalRes] = await Promise.all([
      api.get('/hris/education-level'),
      api.get('/master/religions'),
      api.get('/master/blood-types'),
      api.get('/master/marital-statuses'),
    ])
    educationLevels.value = eduRes.data.data ?? []
    religions.value = relRes.data.data ?? []
    bloodTypes.value = bloodRes.data.data ?? []
    maritalStatuses.value = maritalRes.data.data ?? []

    const [deptRes, sectRes] = await Promise.all([
      api.get('/master/departments').catch(() => ({ data: { data: [] } })),
      api.get('/master/sections').catch(() => ({ data: { data: [] } })),
    ])
    departments.value = deptRes.data.data ?? []
    sections.value = sectRes.data.data ?? []
  } catch { /* silent */ }
}

async function loadEmployee() {
  if (!props.employeeId) return
  loading.value = true
  try {
    await loadMasterData()
    const res = await api.get(`/hris/employees/${props.employeeId}`)
    const e = res.data.data ?? res.data
    employee.value = e
    basicForm.nama = e.nama ?? ''
    basicForm.email = e.email ?? ''
    basicForm.no_telp = e.no_telp ?? ''
    basicForm.no_hp = e.no_hp ?? ''
    basicForm.status = e.status ?? 'active'
    basicForm.company_id = e.company_id ?? null
    basicForm.employee_type_id = e.employee_type_id ?? null
    basicForm.tgl_masuk = toDateStr(e.tgl_masuk)
    basicForm.tgl_resign = toDateStr(e.tgl_resign)
    basicForm.photo = e.photo ?? ''

    const p = e.employeePersonal?.[0]
    if (p) {
      personalForm.no_ktp = p.no_ktp ?? ''
      personalForm.no_kk = p.no_kk ?? ''
      personalForm.tempat_lahir = p.tempat_lahir ?? ''
      personalForm.tanggal_lahir = toDateStr(p.tanggal_lahir)
      personalForm.jenis_kelamin = p.jenis_kelamin ?? ''
      personalForm.nama_ibu_kandung = p.nama_ibu_kandung ?? ''
      personalForm.alamat_ktp = p.alamat_ktp ?? ''
      personalForm.alamat_domisili = p.alamat_domisili ?? ''
      personalForm.tanggal_abis_ktp = toDateStr(p.tanggal_abis_ktp)
      personalForm.agama_id = p.agama_id ?? null
      personalForm.blood_type_id = p.blood_type_id ?? null
      personalForm.marital_status_id = p.marital_status_id ?? null
    }
    educations.value = e.educations ?? []
    emergencyContacts.value = e.employee_emergency_contacts ?? []
    children.value = (e.empleyeeChild ?? []).map((c: any) => ({ ...c, tanggal_lahir: toDateStr(c.tanggal_lahir) }))
    positions.value = (e.employeePosition ?? []).map((p: any) => ({ ...p, tanggal_mulai: toDateStr(p.tanggal_mulai), tanggal_selesai: toDateStr(p.tanggal_selesai) }))

    const doc = e.employeeDocument?.[0]
    if (doc) {
      documentForm.no_npwp = doc.no_npwp ?? ''
      documentForm.no_asuransi = doc.no_asuransi ?? ''
      documentForm.no_jamsostek = doc.no_jamsostek ?? ''
      documentForm.no_bpjs_kesehatan = doc.no_bpjs_kesehatan ?? ''
      documentForm.no_bpjs_ketenagakerjaan = doc.no_bpjs_ketenagakerjaan ?? ''
      documentForm.no_dplk = doc.no_dplk ?? ''
    }
    const h = e.employeeHealth?.[0]
    if (h) {
      healthForm.tinggi_badan = h.tinggi_badan ?? 0
      healthForm.berat_badan = h.berat_badan ?? 0
      healthForm.kacamata = h.kacamata ?? false
      healthForm.alergi = h.alergi ?? ''
      healthForm.cacat_bicara = h.cacat_bicara ?? false
      healthForm.cacat_pendengaran = h.cacat_pendengaran ?? false
      healthForm.cacat_penglihatan = h.cacat_penglihatan ?? false
      healthForm.cacat_anggota_badan = h.cacat_anggota_badan ?? false
      healthForm.cacat_lain = h.cacat_lain ?? false
      healthForm.cacat_penjelasan = h.cacat_penjelasan ?? ''
    }

    try {
      const lbRes = await api.get(`/hris/employee-leave-balance?employee_id=${props.employeeId}`)
      leaveBalances.value = lbRes.data.data ?? []
    } catch { leaveBalances.value = [] }

    try {
      const userRes = await api.get(`/hris/employees/${props.employeeId}/user`)
      linkedUser.value = userRes.data.data ?? null
    } catch { linkedUser.value = null }

    try {
      const ulRes = await api.get('/hris/employees/users/unlinked')
      unlinkedUsers.value = ulRes.data.data ?? []
    } catch { unlinkedUsers.value = [] }
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal memuat data employee', color: 'error' })
  } finally { loading.value = false }
}

watch(open, (val) => { if (val) loadEmployee() })

async function saveBasic() {
  if (!employee.value) return
  try {
    await api.put(`/hris/employees/update/${employee.value.id}`, {
      nama: basicForm.nama,
      email: basicForm.email,
      no_telp: basicForm.no_telp,
      no_hp: basicForm.no_hp,
      status: basicForm.status,
      company_id: basicForm.company_id ?? undefined,
      employee_type_id: basicForm.employee_type_id ?? undefined,
      tgl_masuk: basicForm.tgl_masuk || undefined,
      tgl_resign: basicForm.tgl_resign || undefined,
      photo: basicForm.photo || undefined,
    })
    toast.add({ title: 'Berhasil', description: 'Data dasar diperbarui', color: 'success' })
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan', color: 'error' }) }
}

async function savePersonal() {
  if (!employee.value) return
  try {
    const existing = employee.value.employeePersonal?.[0]
    const payload = { employee_id: employee.value.id, ...personalForm, agama_id: personalForm.agama_id ?? undefined, blood_type_id: personalForm.blood_type_id ?? undefined, marital_status_id: personalForm.marital_status_id ?? undefined }
    if (existing?.id) {
      await api.put(`/hris/employee-personal/${existing.id}`, payload)
    } else {
      await api.post('/hris/employee-personal', payload)
    }
    toast.add({ title: 'Berhasil', description: 'Data personal diperbarui', color: 'success' })
    await loadEmployee()
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan data personal', color: 'error' }) }
}

async function saveEducation() {
  if (!employee.value) return
  try {
    for (const edu of educations.value) {
      const payload = { employee_id: employee.value.id, education_level_id: Number(edu.education_level_id), nama_sekolah: edu.nama_sekolah, jurusan: edu.jurusan, tahun_masuk: Number(edu.tahun_masuk), tahun_lulus: edu.tahun_lulus ? Number(edu.tahun_lulus) : undefined, ipk: edu.ipk ? Number(edu.ipk) : null }
      if (edu.id) {
        await api.put(`/hris/employee-education/${edu.id}`, payload)
      } else {
        await api.post('/hris/employee-education', payload)
      }
    }
    toast.add({ title: 'Berhasil', description: 'Data pendidikan diperbarui', color: 'success' })
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan data pendidikan', color: 'error' }) }
}

async function saveEmergencyContacts() {
  if (!employee.value) return
  try {
    for (const c of emergencyContacts.value) {
      const payload = { employee_id: employee.value.id, nama: c.nama, hubungan: c.hubungan, telepon: c.telepon, alamat: c.alamat }
      if (c.id) {
        await api.put(`/hris/employee-emergency-contact/${c.id}`, payload)
      } else {
        await api.post('/hris/employee-emergency-contact', payload)
      }
    }
    toast.add({ title: 'Berhasil', description: 'Kontak darurat diperbarui', color: 'success' })
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan kontak darurat', color: 'error' }) }
}

async function saveDocument() {
  if (!employee.value) return
  try {
    const existing = employee.value.employeeDocument?.[0]
    const payload = { employee_id: employee.value.id, ...documentForm }
    if (existing?.id) {
      await api.put(`/hris/employee-documents/${existing.id}`, payload)
    } else {
      await api.post('/hris/employee-documents', payload)
    }
    toast.add({ title: 'Berhasil', description: 'Data dokumen diperbarui', color: 'success' })
    await loadEmployee()
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan data dokumen', color: 'error' }) }
}

async function saveHealth() {
  if (!employee.value) return
  try {
    const existing = employee.value.employeeHealth?.[0]
    const payload = { employee_id: employee.value.id, ...healthForm, tinggi_badan: Number(healthForm.tinggi_badan), berat_badan: Number(healthForm.berat_badan) }
    if (existing?.id) {
      await api.put(`/hris/employee-health/${existing.id}`, payload)
    } else {
      await api.post('/hris/employee-health', payload)
    }
    toast.add({ title: 'Berhasil', description: 'Data kesehatan diperbarui', color: 'success' })
    await loadEmployee()
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan data kesehatan', color: 'error' }) }
}

async function saveLeaveBalances() {
  if (!employee.value) return
  try {
    for (const lb of leaveBalances.value) {
      if (lb.id) {
        await api.put(`/hris/employee-leave-balance/${lb.id}`, {
          jatah_cuti_baru: Number(lb.jatah_cuti_baru),
          jatah_cuti_lama: Number(lb.jatah_cuti_lama) || undefined,
        })
      } else {
        await api.post('/hris/employee-leave-balance', {
          employee_id: employee.value.id,
          tahun: Number(lb.tahun) || new Date().getFullYear(),
          jatah_cuti_baru: Number(lb.jatah_cuti_baru),
          jatah_cuti_lama: Number(lb.jatah_cuti_lama) || undefined,
        })
      }
    }
    toast.add({ title: 'Berhasil', description: 'Saldo cuti diperbarui', color: 'success' })
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan saldo cuti', color: 'error' }) }
}

async function linkToUser() {
  if (!employee.value) return
  try {
    await api.post(`/hris/employees/${employee.value.id}/link-user`, { userId: selectedUserId.value || null })
    toast.add({ title: 'Berhasil', description: 'User berhasil di-link', color: 'success' })
    await loadEmployee()
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal link user', color: 'error' }) }
}

async function unlinkUser() {
  if (!employee.value) return
  try {
    await api.post(`/hris/employees/${employee.value.id}/link-user`, { userId: null })
    toast.add({ title: 'Berhasil', description: 'User berhasil di-unlink', color: 'success' })
    linkedUser.value = null
    await loadEmployee()
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal unlink user', color: 'error' }) }
}

async function savePositions() {
  if (!employee.value) return
  try {
    for (const pos of positions.value) {
      const payload = {
        employee_id: employee.value.id,
        company_id: Number(pos.company_id),
        branch_id: Number(pos.branch_id),
        department_id: Number(pos.department_id),
        section_id: Number(pos.section_id),
        position_id: Number(pos.position_id),
        golongan_id: pos.golongan_id ? Number(pos.golongan_id) : undefined,
        grade_id: pos.grade_id ? Number(pos.grade_id) : undefined,
        is_primary: pos.is_primary ?? false,
        tanggal_mulai: pos.tanggal_mulai || undefined,
        tanggal_selesai: pos.tanggal_selesai || null,
      }
      if (pos.id) {
        await api.put(`/hris/employee-positions/${pos.id}`, payload)
      } else {
        await api.post('/hris/employee-positions', payload)
      }
    }
    toast.add({ title: 'Berhasil', description: 'Data posisi diperbarui', color: 'success' })
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan data posisi', color: 'error' }) }
}

async function saveChildren() {
  if (!employee.value) return
  try {
    for (const child of children.value) {
      const payload = { employee_id: employee.value.id, nama: child.nama, jenis_kelamin: child.jenis_kelamin, tempat_lahir: child.tempat_lahir, tanggal_lahir: child.tanggal_lahir || null, pendidikan: child.pendidikan, pekerjaan: child.pekerjaan }
      if (child.id) {
        await api.put(`/hris/employee-children/${child.id}`, payload)
      } else {
        await api.post('/hris/employee-children', payload)
      }
    }
    toast.add({ title: 'Berhasil', description: 'Data anak diperbarui', color: 'success' })
    emit('saved')
  } catch { toast.add({ title: 'Gagal', description: 'Gagal menyimpan data anak', color: 'error' }) }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-4xl h-[90dvh] overflow-hidden' }">
    <template #content>
      <div class="flex h-[90dvh] flex-col overflow-hidden rounded-xl border border-default bg-elevated shadow-xl">
        <div class="flex items-start justify-between gap-3 border-b border-default px-6 py-4">
          <div>
            <h2 class="text-lg font-semibold">Edit Employee</h2>
            <p class="text-sm text-muted">{{ employee?.nik }} - {{ employee?.nama }}</p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="open = false" />
        </div>

        <div class="flex min-h-0 flex-1">
          <div class="w-48 shrink-0 border-r border-default p-2 space-y-1">
            <button v-for="tab in tabs" :key="tab.id" type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
              :class="activeTab === tab.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-elevated'"
              @click="activeTab = tab.id">
              <UIcon :name="tab.icon" class="size-4" />
              {{ tab.label }}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="loading" class="flex justify-center py-10">
              <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
            </div>

            <template v-else-if="employee">
              <!-- BASIC -->
              <div v-if="activeTab === 'basic'" class="space-y-6">
                <div>
                  <h3 class="text-base font-semibold">Informasi Dasar</h3>
                  <p class="text-sm text-muted">Data utama employee.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField label="NIK"><UInput :model-value="employee.nik" disabled class="w-full" /></UFormField>
                  <UFormField label="Nama" required><UInput v-model="basicForm.nama" class="w-full" /></UFormField>
                  <UFormField label="Email"><UInput v-model="basicForm.email" type="email" class="w-full" /></UFormField>
                  <UFormField label="No. Telepon"><UInput v-model="basicForm.no_telp" class="w-full" /></UFormField>
                  <UFormField label="No. HP"><UInput v-model="basicForm.no_hp" class="w-full" /></UFormField>
                  <UFormField label="Status">
                    <USelect v-model="basicForm.status" :items="['active', 'inactive']" class="w-full" />
                  </UFormField>
                  <UFormField label="Company ID"><UInput v-model="basicForm.company_id" type="number" class="w-full" /></UFormField>
                  <UFormField label="Employee Type ID"><UInput v-model="basicForm.employee_type_id" type="number" class="w-full" /></UFormField>
                  <UFormField label="Tgl Masuk"><UInput v-model="basicForm.tgl_masuk" type="date" class="w-full" /></UFormField>
                  <UFormField label="Tgl Resign"><UInput v-model="basicForm.tgl_resign" type="date" class="w-full" /></UFormField>
                  <UFormField label="Photo URL" class="md:col-span-2"><UInput v-model="basicForm.photo" class="w-full" placeholder="URL foto" /></UFormField>
                </div>
                <div class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Basic" color="primary" @click="saveBasic" />
                </div>
              </div>

              <!-- USER -->
              <div v-else-if="activeTab === 'user'" class="space-y-6">
                <div>
                  <h3 class="text-base font-semibold">Link User Account</h3>
                  <p class="text-sm text-muted">Hubungkan employee ini dengan user account login.</p>
                </div>

                <div v-if="linkedUser" class="rounded-xl border border-default p-4 space-y-3">
                  <h4 class="font-medium">User Terhubung</h4>
                  <div class="flex items-center gap-3">
                    <UAvatar :text="linkedUser.name.charAt(0)" size="sm" />
                    <div>
                      <p class="font-medium">{{ linkedUser.name }}</p>
                      <p class="text-sm text-muted">{{ linkedUser.email }}</p>
                    </div>
                  </div>
                  <UButton label="Unlink" color="error" variant="soft" size="sm" icon="i-lucide-unlink" @click="unlinkUser" />
                </div>

                <div v-else class="space-y-4">
                  <p class="text-sm text-muted">Belum ada user terhubung. Pilih user untuk di-link:</p>
                  <UFormField label="Pilih User">
                    <USelect v-model="selectedUserId" :items="unlinkedUsers.map(u => ({ label: `${u.name} (${u.email})`, value: u.id }))" value-key="value" label-key="label" placeholder="Pilih user" class="w-full" />
                  </UFormField>
                  <div class="flex justify-end">
                    <UButton icon="i-lucide-link" label="Link User" color="primary" :disabled="!selectedUserId" @click="linkToUser" />
                  </div>
                </div>
              </div>

              <!-- PERSONAL -->
              <div v-else-if="activeTab === 'personal'" class="space-y-6">
                <div>
                  <h3 class="text-base font-semibold">Data Personal</h3>
                  <p class="text-sm text-muted">Informasi pribadi employee.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField label="No. KTP"><UInput v-model="personalForm.no_ktp" class="w-full" /></UFormField>
                  <UFormField label="No. KK"><UInput v-model="personalForm.no_kk" class="w-full" /></UFormField>
                  <UFormField label="Tempat Lahir"><UInput v-model="personalForm.tempat_lahir" class="w-full" /></UFormField>
                  <UFormField label="Tanggal Lahir"><UInput v-model="personalForm.tanggal_lahir" type="date" class="w-full" /></UFormField>
                  <UFormField label="Jenis Kelamin">
                    <USelect v-model="personalForm.jenis_kelamin" :items="['Laki-laki', 'Perempuan']" class="w-full" />
                  </UFormField>
                  <UFormField label="Nama Ibu Kandung"><UInput v-model="personalForm.nama_ibu_kandung" class="w-full" /></UFormField>
                  <UFormField label="Alamat KTP"><UInput v-model="personalForm.alamat_ktp" class="w-full" /></UFormField>
                  <UFormField label="Alamat Domisili"><UInput v-model="personalForm.alamat_domisili" class="w-full" /></UFormField>
                  <UFormField label="Tanggal Abis KTP"><UInput v-model="personalForm.tanggal_abis_ktp" type="date" class="w-full" /></UFormField>
                  <template v-if="personalForm.agama_id !== undefined">
                    <UFormField label="Agama">
                      <USelect v-model="personalForm.agama_id" :items="[{id: null, nama_agama: '-'}, ...religions]" value-key="id" label-key="nama_agama" class="w-full" />
                    </UFormField>
                    <UFormField label="Gol. Darah">
                      <USelect v-model="personalForm.blood_type_id" :items="[{id: null, kode: '-'}, ...bloodTypes]" value-key="id" label-key="kode" class="w-full" />
                    </UFormField>
                    <UFormField label="Status Nikah">
                      <USelect v-model="personalForm.marital_status_id" :items="[{id: null, nama: '-'}, ...maritalStatuses]" value-key="id" label-key="nama" class="w-full" />
                    </UFormField>
                  </template>
                </div>
                <div class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Personal" color="primary" @click="savePersonal" />
                </div>
              </div>

              <!-- EDUCATION -->
              <div v-else-if="activeTab === 'education'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold">Pendidikan</h3>
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" label="Add" @click="educations.push({ education_level_id: undefined as any, nama_sekolah: '', jurusan: '', tahun_masuk: undefined as any, tahun_lulus: undefined as any, ipk: null })" />
                </div>
                <template v-for="(edu, i) in educations" :key="i">
                  <div v-if="i > 0" class="border-t border-default my-2" />
                  <div class="rounded-xl border border-default p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                      <UFormField label="Jenjang">
                        <USelect v-model="edu.education_level_id" :items="educationLevels" value-key="id" label-key="nama" placeholder="Pilih jenjang" class="w-full" />
                      </UFormField>
                      <UFormField label="Sekolah"><UInput v-model="edu.nama_sekolah" class="w-full" /></UFormField>
                      <UFormField label="Jurusan"><UInput v-model="edu.jurusan" class="w-full" /></UFormField>
                      <UFormField label="Tahun Masuk"><UInput v-model="edu.tahun_masuk" type="number" class="w-full" /></UFormField>
                      <UFormField label="Tahun Lulus"><UInput v-model="edu.tahun_lulus" type="number" class="w-full" /></UFormField>
                      <UFormField label="IPK"><UInput v-model="edu.ipk" type="number" step="0.01" class="w-full" /></UFormField>
                    </div>
                  </div>
                </template>
                <p v-if="!educations.length" class="text-sm text-muted">Belum ada data pendidikan. Klik Add untuk menambah.</p>
                <div v-if="educations.length" class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Education" color="primary" @click="saveEducation" />
                </div>
              </div>

              <!-- EMERGENCY -->
              <div v-else-if="activeTab === 'contact'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold">Kontak Darurat</h3>
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" label="Add" @click="emergencyContacts.push({ nama: '', hubungan: '', telepon: '', alamat: '' })" />
                </div>
                <template v-for="(c, i) in emergencyContacts" :key="i">
                  <div v-if="i > 0" class="border-t border-default my-2" />
                  <div class="rounded-xl border border-default p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                      <UFormField label="Nama"><UInput v-model="c.nama" class="w-full" /></UFormField>
                      <UFormField label="Hubungan"><UInput v-model="c.hubungan" class="w-full" /></UFormField>
                      <UFormField label="Telepon"><UInput v-model="c.telepon" class="w-full" /></UFormField>
                      <UFormField label="Alamat"><UInput v-model="c.alamat" class="w-full" /></UFormField>
                    </div>
                  </div>
                </template>
                <p v-if="!emergencyContacts.length" class="text-sm text-muted">Belum ada kontak darurat. Klik Add untuk menambah.</p>
                <div v-if="emergencyContacts.length" class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Emergency" color="primary" @click="saveEmergencyContacts" />
                </div>
              </div>

              <!-- CHILDREN -->
              <div v-else-if="activeTab === 'children'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold">Anak</h3>
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" label="Add" @click="children.push({ nama: '', jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', pendidikan: '', pekerjaan: '' })" />
                </div>
                <template v-for="(child, i) in children" :key="i">
                  <div v-if="i > 0" class="border-t border-default my-2" />
                  <div class="rounded-xl border border-default p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                      <UFormField label="Nama"><UInput v-model="child.nama" class="w-full" /></UFormField>
                      <UFormField label="Jenis Kelamin"><USelect v-model="child.jenis_kelamin" :items="['Laki-laki', 'Perempuan']" class="w-full" /></UFormField>
                      <UFormField label="Tempat Lahir"><UInput v-model="child.tempat_lahir" class="w-full" /></UFormField>
                      <UFormField label="Tanggal Lahir"><UInput v-model="child.tanggal_lahir" type="date" class="w-full" /></UFormField>
                      <UFormField label="Pendidikan"><UInput v-model="child.pendidikan" class="w-full" /></UFormField>
                      <UFormField label="Pekerjaan"><UInput v-model="child.pekerjaan" class="w-full" /></UFormField>
                    </div>
                  </div>
                </template>
                <p v-if="!children.length" class="text-sm text-muted">Belum ada data anak. Klik Add untuk menambah.</p>
                <div v-if="children.length" class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Children" color="primary" @click="saveChildren" />
                </div>
              </div>

              <!-- DOCUMENT -->
              <div v-else-if="activeTab === 'document'" class="space-y-6">
                <div>
                  <h3 class="text-base font-semibold">Dokumen</h3>
                  <p class="text-sm text-muted">Nomor-nomor dokumen employee.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField label="No. NPWP"><UInput v-model="documentForm.no_npwp" class="w-full" /></UFormField>
                  <UFormField label="No. Asuransi"><UInput v-model="documentForm.no_asuransi" class="w-full" /></UFormField>
                  <UFormField label="No. Jamsostek"><UInput v-model="documentForm.no_jamsostek" class="w-full" /></UFormField>
                  <UFormField label="No. BPJS Kesehatan"><UInput v-model="documentForm.no_bpjs_kesehatan" class="w-full" /></UFormField>
                  <UFormField label="No. BPJS Ketenagakerjaan"><UInput v-model="documentForm.no_bpjs_ketenagakerjaan" class="w-full" /></UFormField>
                  <UFormField label="No. DPLK"><UInput v-model="documentForm.no_dplk" class="w-full" /></UFormField>
                </div>
                <div class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Document" color="primary" @click="saveDocument" />
                </div>
              </div>

              <!-- HEALTH -->
              <div v-else-if="activeTab === 'health'" class="space-y-4 max-w-xl">
                <h3 class="text-base font-semibold">Kesehatan</h3>
                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Tinggi Badan (cm)"><UInput v-model="healthForm.tinggi_badan" type="number" class="w-full" /></UFormField>
                  <UFormField label="Berat Badan (kg)"><UInput v-model="healthForm.berat_badan" type="number" class="w-full" /></UFormField>
                </div>
                <UCheckbox v-model="healthForm.kacamata" label="Menggunakan Kacamata" />
                <UFormField label="Alergi"><UInput v-model="healthForm.alergi" class="w-full" /></UFormField>
                <p class="text-sm font-medium">Cacat Fisik</p>
                <div class="grid grid-cols-2 gap-3">
                  <UCheckbox v-model="healthForm.cacat_bicara" label="Bicara" />
                  <UCheckbox v-model="healthForm.cacat_pendengaran" label="Pendengaran" />
                  <UCheckbox v-model="healthForm.cacat_penglihatan" label="Penglihatan" />
                  <UCheckbox v-model="healthForm.cacat_anggota_badan" label="Anggota Badan" />
                  <UCheckbox v-model="healthForm.cacat_lain" label="Lainnya" />
                </div>
                <UFormField label="Penjelasan Cacat"><UInput v-model="healthForm.cacat_penjelasan" class="w-full" /></UFormField>
                <div class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Health" color="primary" @click="saveHealth" />
                </div>
              </div>

              <!-- LEAVE BALANCE -->
              <div v-else-if="activeTab === 'leave'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold">Saldo Cuti</h3>
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" label="Add" @click="leaveBalances.push({ tahun: new Date().getFullYear(), jatah_cuti_baru: 0, jatah_cuti_lama: 0, terpakai_baru: 0, sisa_baru: 0, terpakai_lama: 0, sisa_lama: 0 })" />
                </div>
                <div v-for="(lb, i) in leaveBalances" :key="i" class="rounded-xl border border-default p-4">
                  <div class="grid grid-cols-2 gap-3">
                    <UFormField label="Tahun"><UInput v-model="lb.tahun" type="number" class="w-full" /></UFormField>
                    <UFormField label="Jatah Cuti Baru"><UInput v-model="lb.jatah_cuti_baru" type="number" class="w-full" /></UFormField>
                    <UFormField label="Terpakai Baru"><UInput :model-value="lb.terpakai_baru ?? 0" disabled class="w-full" /></UFormField>
                    <UFormField label="Sisa Baru"><UInput :model-value="lb.sisa_baru ?? 0" disabled class="w-full" /></UFormField>
                    <UFormField label="Jatah Cuti Lama"><UInput v-model="lb.jatah_cuti_lama" type="number" class="w-full" /></UFormField>
                    <UFormField label="Terpakai Lama"><UInput :model-value="lb.terpakai_lama ?? 0" disabled class="w-full" /></UFormField>
                    <UFormField label="Sisa Lama"><UInput :model-value="lb.sisa_lama ?? 0" disabled class="w-full" /></UFormField>
                  </div>
                </div>
                <p v-if="!leaveBalances.length" class="text-sm text-muted">Belum ada data saldo cuti. Klik Add untuk menambah.</p>
                <div v-if="leaveBalances.length" class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Leave Balance" color="primary" @click="saveLeaveBalances" />
                </div>
              </div>

              <!-- POSITION -->
              <div v-else-if="activeTab === 'position'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-semibold">Posisi / Jabatan</h3>
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" label="Add" @click="positions.push({ department_id: undefined as any, section_id: undefined as any, company_id: undefined as any, branch_id: undefined as any, position_id: undefined as any, golongan_id: undefined as any, grade_id: undefined as any, tanggal_mulai: '', tanggal_selesai: null, is_primary: false })" />
                </div>
                <template v-for="(pos, i) in positions" :key="i">
                  <div v-if="i > 0" class="border-t border-default my-2" />
                  <div class="rounded-xl border border-default p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                      <UFormField label="Company ID"><UInput v-model="pos.company_id" type="number" class="w-full" /></UFormField>
                      <UFormField label="Branch ID"><UInput v-model="pos.branch_id" type="number" class="w-full" /></UFormField>
                      <UFormField label="Department">
                        <USelect v-model="pos.department_id" :items="departments" value-key="id" label-key="nama" placeholder="Pilih department" class="w-full" />
                      </UFormField>
                      <UFormField label="Section">
                        <USelect v-model="pos.section_id" :items="sections" value-key="id" label-key="nama" placeholder="Pilih section" class="w-full" />
                      </UFormField>
                      <UFormField label="Position ID"><UInput v-model="pos.position_id" type="number" class="w-full" /></UFormField>
                      <UFormField label="Golongan ID"><UInput v-model="pos.golongan_id" type="number" class="w-full" /></UFormField>
                      <UFormField label="Grade ID"><UInput v-model="pos.grade_id" type="number" class="w-full" /></UFormField>
                      <UFormField label="Tanggal Mulai"><UInput v-model="pos.tanggal_mulai" type="date" class="w-full" /></UFormField>
                      <UFormField label="Tanggal Selesai"><UInput v-model="pos.tanggal_selesai" type="date" class="w-full" /></UFormField>
                    </div>
                    <UCheckbox v-model="pos.is_primary" label="Primary" />
                  </div>
                </template>
                <p v-if="!positions.length" class="text-sm text-muted">Belum ada data posisi. Klik Add untuk menambah.</p>
                <div v-if="positions.length" class="flex justify-end border-t border-default pt-4">
                  <UButton icon="i-lucide-save" label="Save Position" color="primary" @click="savePositions" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-default px-6 py-4">
          <UButton color="neutral" variant="soft" @click="open = false">Close</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
