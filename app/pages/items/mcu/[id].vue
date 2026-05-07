<script setup lang="ts">
const route = useRoute()
const api = useApi()
const toast = useToast()

type Item = {
  id: string
  name: string
  code: string
  department: string
  isActive?: boolean
  inputan: Inputan[]
  createdAt: string
}

type Inputan = {
  id: string
  itemId: string
  label: string
  inputType: string
  uom: string
  sortOrder: number
  allowBlank: boolean
  opsis: Option[]
  formula: Formula[]
  nilaiNormalNums: NilaiNormalNum[]
  nilaiNormalSel: NilaiNormalSel[]
  createdAt: string
}

type Option = {
  id: string
  inputanId: string
  label: string
  value: string
  sortOrder: number
  createdAt: string
}

type Formula = {
  id: string
  inputanId: string
  formula: string
  createdAt: string
}

type NilaiNormalNum = {
  id: string
  inputanId: string
  sex: 'MALE' | 'FEMALE'
  ageMin: number
  minValue: number
  maxValue: number
  createdAt: string
}

type NilaiNormalSel = {
  id: string
  inputanId: string
  sex: 'MALE' | 'FEMALE'
  ageMin: number
  opsiId: string
  createdAt: string
}

const { data: items, refresh } = await useAsyncData(
  `items-${route.params.id}`,
  () => api.get(`/mcu/items/${route.params.id}`).then(res => res.data.data)
)

// State untuk edit mode
const isEditing = ref(false)
const selectedPhotoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const editForm = ref<Partial<Item>>({
  gender: '',
  maritalStatus: '',
  idType: '',
  bloodGroup: ''
})

const fullName = computed(() => {
  if (!items.value) return '-'
  return [
    items.value.firstName,
    items.value.middleName,
    items.value.lastName
  ]
    .filter(Boolean)
    .join(' ')
})

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const formatDateForInput = (date?: string) => {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

const genderLabel = (g: string) => (g === 'MALE' ? 'Laki-laki' : 'Perempuan')

const maritalLabel: Record<string, string> = {
  SINGLE: 'Belum Menikah',
  MARRIED: 'Menikah',
  DIVORCED: 'Cerai'
}

const defaultPhotoUrl
  = 'https://ui-avatars.com/api/?background=0D8F81&color=fff&bold=true'

// Fungsi untuk memulai edit
const normalizeValue = (val?: string) => val?.toUpperCase() || ''

const startEditing = () => {
  if (items.value) {
    editForm.value = {
      ...items.value,
      gender: normalizeValue(items.value.gender),
      maritalStatus: normalizeValue(items.value.maritalStatus),
      idType: normalizeValue(items.value.idType),
      bloodGroup: normalizeValue(items.value.bloodGroup),
      dob: formatDateForInput(items.value.dob)
    }

    photoPreview.value = items.value.photoUrl || null
    selectedPhotoFile.value = null
    isEditing.value = true
  }
}

// Fungsi untuk membatalkan edit
const cancelEditing = () => {
  isEditing.value = false
  editForm.value = {}
  selectedPhotoFile.value = null
  photoPreview.value = null
}

// Fungsi untuk handle klik foto profil
const handlePhotoClick = () => {
  if (isEditing.value && fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// Fungsi untuk handle upload foto
const handlePhotoUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    selectedPhotoFile.value = input.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      photoPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(input.files[0])
  }
}

// Fungsi untuk menyimpan perubahan
const saveChanges = async () => {
  if (!items.value) return

  try {
    // Upload foto jika ada
    if (selectedPhotoFile.value) {
      const formData = new FormData()
      formData.append('photo', selectedPhotoFile.value)
      const photoResponse = await api.post(
        `/patient/${items.value.id}/upload-photo`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )
      editForm.value.photoUrl = photoResponse.data.data.url
    }

    // Update data pasien
    const updateData = { ...editForm.value }
    delete updateData.id
    delete updateData.PatientId
    delete updateData.createdAt
    delete updateData.addresses
    delete updateData.histories

    await api.patch(`/patient/${items.value.id}`, updateData)
    await refresh()
    cancelEditing()

    // Tampilkan notifikasi sukses
    add({
      title: 'Berhasil',
      description: 'Data pasien berhasil diperbarui',
      color: 'success'
    })
  } catch (error) {
    console.error('Error saving patient data:', error)
    add({
      title: 'Gagal',
      description: 'Gagal memperbarui data pasien',
      color: 'error'
    })
  }
}

const getPhotoUrl = () => {
  if (isEditing.value && photoPreview.value) {
    return photoPreview.value
  }
  if (!items.value) return defaultPhotoUrl
  return (
    items.value.photoUrl
    || `${defaultPhotoUrl}&name=${encodeURIComponent(fullName.value)}`
  )
}

const isAddressModalOpen = ref(false)
const editingAddress = ref<Partial<Address> | null>(null)
const isAddressLoading = ref(false)

const addressTypeOptions = [
  { value: 'HOME', label: 'Rumah' },
  { value: 'WORK', label: 'Kantor' },
  { value: 'OTHER', label: 'Lainnya' }
]

const addressTypeLabel: Record<string, string> = {
  HOME: 'Rumah',
  WORK: 'Kantor',
  OTHER: 'Lainnya'
}

const defaultAddressForm = (): Partial<Address> => ({
  type: 'HOME',
  detail: '',
  country: 'Indonesia',
  province: '',
  city: '',
  district: '',
  note: ''
})

// Buka modal untuk tambah address baru
const openAddAddress = () => {
  editingAddress.value = defaultAddressForm()
  isAddressModalOpen.value = true
}

// Buka modal untuk edit address yang ada
const openEditAddress = (address: Address) => {
  editingAddress.value = { ...address }
  isAddressModalOpen.value = true
}

// Tutup modal
const closeAddressModal = () => {
  isAddressModalOpen.value = false
  editingAddress.value = null
}

// Simpan address (tambah atau update)
const saveAddress = async () => {
  if (!items.value || !editingAddress.value) return
  isAddressLoading.value = true

  // Simpan dulu sebelum di-null-kan oleh closeAddressModal()
  const isUpdate = !!editingAddress.value.id

  try {
    if (isUpdate) {
      await api.post(
        `/patient/${items.value.id}/address?addressId=${editingAddress.value.id}`,
        editingAddress.value
      )
    } else {
      await api.post(
        `/patient/${items.value.id}/address`,
        editingAddress.value
      )
    }

    await refresh()
    closeAddressModal()

    toast.add({
      title: 'Berhasil',
      description: isUpdate
        ? 'Alamat berhasil diperbarui'
        : 'Alamat berhasil ditambahkan',
      color: 'success'
    })
  } catch (error) {
    console.error('Error saving address:', error)
    toast.add({
      title: 'Gagal',
      description: 'Gagal menyimpan alamat',
      color: 'error'
    })
  } finally {
    isAddressLoading.value = false
  }
}

// Hapus address
const deleteAddress = async (addressId: string) => {
  if (!items.value) return

  try {
    await api.delete(`/patient/${items.value.id}/address/${addressId}`)
    await refresh()

    add({
      title: 'Berhasil',
      description: 'Alamat berhasil dihapus',
      color: 'success'
    })
  } catch (error) {
    console.error('Error deleting address:', error)
    add({
      title: 'Gagal',
      description: 'Gagal menghapus alamat',
      color: 'error'
    })
  }
}
</script>

<template>
  <UDashboardPanel
    :id="`patient-${route.params.id}`"
    class="h-screen flex flex-col overflow-y-auto"
  >
    <UDashboardNavbar
      :title="fullName"
      class="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-accented"
    >
      <template #leading>
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          to="/patients"
        />
      </template>
      <template #trailing>
        <UButton
          v-if="!isEditing"
          icon="i-lucide-pencil"
          color="primary"
          variant="ghost"
          @click="startEditing"
        >
          Edit Data
        </UButton>
        <div v-else class="flex gap-2">
          <UButton
            color="error"
            variant="outline"
            icon="i-lucide-clipboard-x"
            @click="cancelEditing"
          >
            Batal
          </UButton>
          <UButton color="primary" icon="i-lucide-save" @click="saveChanges">
            Simpan
          </UButton>
        </div>
      </template>
    </UDashboardNavbar>

    <div v-if="!patient" class="flex justify-center items-center h-64">
      <UIcon
        name="i-lucide-loader-circle"
        class="animate-spin text-2xl text-muted"
      />
    </div>

    <div v-else class="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <!-- Header dengan foto di kiri -->
      <div
        class="flex flex-col md:flex-row items-start gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 rounded-xl border border-accented bg-elevated"
      >
        <!-- Foto Profil -->
        <div class="relative flex-shrink-0 mx-auto md:mx-0">
          <img
            :src="getPhotoUrl()"
            :alt="fullName"
            class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-2 border-primary shadow-md"
            :class="{
              'cursor-pointer hover:opacity-80 transition-opacity': isEditing
            }"
            @click="handlePhotoClick"
          >
          <input
            v-if="isEditing"
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handlePhotoUpload"
          >
          <div
            v-if="isEditing"
            class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <UIcon
              name="i-lucide-camera"
              class="text-white text-lg sm:text-xl"
            />
          </div>
        </div>

        <!-- Informasi Utama -->
        <div class="flex-1 min-w-0 w-full">
          <!-- Baris Nama dan Badge - sekarang center di mobile -->
          <div
            class="flex flex-col items-center sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
          >
            <div class="flex-1 min-w-0 text-center sm:text-left">
              <!-- Nama - Edit mode -->
              <div v-if="isEditing" class="space-y-2">
                <div class="grid grid-cols-1 xs:grid-cols-3 gap-2">
                  <div>
                    <label class="text-xs text-muted block mb-1">First Name *</label>
                    <UInput
                      v-model="editForm.firstName"
                      size="sm"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-muted block mb-1">Middle Name</label>
                    <UInput
                      v-model="editForm.middleName"
                      size="sm"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-muted block mb-1">Last Name</label>
                    <UInput
                      v-model="editForm.lastName"
                      size="sm"
                      class="w-full"
                    />
                  </div>
                </div>
              </div>
              <!-- Nama - View mode -->
              <div v-else>
                <h2
                  class="text-lg sm:text-xl lg:text-2xl font-semibold break-words"
                >
                  {{ fullName }}
                </h2>
                <p class="text-xs sm:text-sm text-muted mt-0.5 break-all">
                  {{ patient.PatientId }}
                </p>
              </div>
            </div>

            <!-- Badges - sekarang center di mobile -->
            <div class="flex gap-2 flex-shrink-0 justify-center sm:justify-end">
              <UBadge
                :label="genderLabel(patient.gender)"
                :color="patient.gender === 'MALE' ? 'primary' : 'info'"
                variant="subtle"
                class="text-xs sm:text-sm"
              />
              <UBadge
                v-if="patient.maritalStatus"
                :label="
                  maritalLabel[patient.maritalStatus] ?? patient.maritalStatus
                "
                color="neutral"
                variant="subtle"
                class="text-xs sm:text-sm"
              />
            </div>
          </div>

          <!-- Informasi Singkat di bawah nama -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-accented"
          >
            <!-- Tanggal Lahir -->
            <div class="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <UIcon
                name="i-lucide-calendar"
                class="text-muted flex-shrink-0 text-sm"
              />
              <span class="text-muted flex-shrink-0">Tanggal Lahir:</span>
              <span v-if="!isEditing" class="truncate">{{
                formatDate(patient.dob)
              }}</span>
              <UInput
                v-else
                v-model="editForm.dob"
                type="date"
                size="sm"
                class="flex-1 min-w-0"
              />
            </div>

            <!-- No HP -->
            <div class="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <UIcon
                name="i-lucide-phone"
                class="text-muted flex-shrink-0 text-sm"
              />
              <span class="text-muted flex-shrink-0">No. HP:</span>
              <span v-if="!isEditing" class="truncate">{{
                patient.phone ?? "-"
              }}</span>
              <UInput
                v-else
                v-model="editForm.phone"
                size="sm"
                class="flex-1 min-w-0"
              />
            </div>

            <!-- Email -->
            <div class="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <UIcon
                name="i-lucide-mail"
                class="text-muted flex-shrink-0 text-sm"
              />
              <span class="text-muted flex-shrink-0">Email:</span>
              <span v-if="!isEditing" class="truncate">{{
                patient.email ?? "-"
              }}</span>
              <UInput
                v-else
                v-model="editForm.email"
                type="email"
                size="sm"
                class="flex-1 min-w-0"
              />
            </div>

            <!-- Identitas -->
            <!-- <div
              class="flex flex-col xs:flex-row items-start xs:items-center gap-2 text-xs sm:text-sm min-w-0 col-span-1 sm:col-span-2"
            > -->
            <div class="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <UIcon
                name="i-lucide-id-card"
                class="text-muted flex-shrink-0 text-sm"
              />
              <span class="text-muted whitespace-nowrap">Identitas:</span>
              <!-- </div> -->

              <div v-if="isEditing" class="flex flex-1 flex-wrap gap-2">
                <USelect
                  v-model="editForm.idType"
                  :items="[
                    { label: 'KTP', value: 'KTP' },
                    { label: 'SIM', value: 'SIM' },
                    { label: 'PASSPORT', value: 'PASSPORT' },
                    { label: 'KITAS', value: 'KITAS' }
                  ]"
                  size="sm"
                  class="w-20 sm:w-24"
                />
                <UInput
                  v-model="editForm.idNumber"
                  size="sm"
                  class="flex-1 min-w-[120px]"
                  placeholder="Nomor Identitas"
                />
              </div>

              <div v-else class="flex flex-1 flex-wrap items-center gap-x-2">
                <span class="text-muted">{{ patient.idType }}:</span>
                <span class="font-mono break-all">{{ patient.idNumber }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Diri -->
      <div class="rounded-xl border border-accented overflow-hidden">
        <div class="px-4 py-3 bg-elevated border-b border-accented">
          <h3 class="text-sm font-medium flex items-center gap-2">
            <UIcon name="i-lucide-user-circle" />
            Detail Pasien
          </h3>
        </div>
        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 bg-accented"
        >
          <!-- Usia -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">
              Usia
            </p>
            <p v-if="!isEditing" class="text-sm">
              {{
                patient.dob
                  ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} tahun`
                  : "-"
              }}
            </p>
            <p v-else class="text-sm text-muted">
              Akan dihitung otomatis
            </p>
          </div>

          <!-- Status -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">
              Status
            </p>
            <div v-if="!isEditing">
              <p class="text-sm">
                {{
                  maritalLabel[patient.maritalStatus]
                    ?? patient.maritalStatus
                    ?? "-"
                }}
              </p>
            </div>
            <div v-else>
              <USelect
                v-model="editForm.maritalStatus"
                :items="[
                  { label: 'Belum Menikah', value: 'SINGLE' },
                  { label: 'Menikah', value: 'MARRIED' },
                  { label: 'Cerai', value: 'DIVORCED' }
                ]"
                class="w-32"
              />
            </div>
          </div>

          <!-- Golongan Darah -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">
              Golongan Darah
            </p>
            <div v-if="!isEditing">
              <p class="text-sm">
                {{ patient.bloodGroup ?? "-" }}
              </p>
            </div>
            <div v-else>
              <USelect
                v-model="editForm.bloodGroup"
                :items="[
                  { label: 'A', value: 'A' },
                  { label: 'B', value: 'B' },
                  { label: 'AB', value: 'AB' },
                  { label: 'O', value: 'O' }
                ]"
                class="w-32"
              />
            </div>
          </div>

          <!-- Jenis Kelamin -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">
              Jenis Kelamin
            </p>
            <div v-if="!isEditing">
              <p class="text-sm">
                {{ genderLabel(patient.gender) }}
              </p>
            </div>
            <div v-else>
              <USelect
                v-model="editForm.gender"
                :items="[
                  { label: 'Laki-laki', value: 'MALE' },
                  { label: 'Perempuan', value: 'FEMALE' }
                ]"
                class="w-32"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Alamat -->
      <UCollapsible
        :default-open="true"
        class="rounded-xl border border-accented overflow-hidden"
      >
        <template #default="{ open }">
          <div
            class="px-4 py-3 bg-elevated border-b border-accented flex items-center justify-between cursor-pointer"
          >
            <h3 class="text-sm font-medium flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" />
              Alamat
            </h3>
            <div class="flex items-center gap-2">
              <UBadge
                :label="`${patient.addresses?.length ?? 0} alamat`"
                color="neutral"
                variant="subtle"
                size="xs"
              />
              <UButton
                icon="i-lucide-plus"
                size="xs"
                color="primary"
                variant="ghost"
                label="Tambah"
                @click.stop="openAddAddress"
              />
              <UIcon
                name="i-lucide-chevron-down"
                class="transition-transform"
                :class="{ 'rotate-180': open }"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div
            v-if="!patient.addresses?.length"
            class="p-6 text-sm text-muted text-center"
          >
            Belum ada alamat.
          </div>

          <div v-else class="divide-y divide-accented">
            <div
              v-for="address in patient.addresses"
              :key="address.id"
              class="p-4 flex items-start gap-3 group"
            >
              <div class="flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <UBadge
                    :label="addressTypeLabel[address.type] ?? address.type"
                    color="neutral"
                    variant="outline"
                    size="xs"
                  />
                </div>
                <p class="text-sm">
                  {{ address.detail }}
                </p>
                <p class="text-xs text-muted">
                  {{
                    [
                      address.district,
                      address.city,
                      address.province,
                      address.country
                    ]
                      .filter(Boolean)
                      .join(", ")
                  }}
                </p>
                <p v-if="address.note" class="text-xs text-muted italic">
                  {{ address.note }}
                </p>
              </div>

              <!-- Tombol aksi (muncul saat hover) -->
              <div
                class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <UButton
                  icon="i-lucide-pencil"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="openEditAddress(address)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="deleteAddress(address.id)"
                />
              </div>
            </div>
          </div>
        </template>
      </UCollapsible>

      <!-- Modal Tambah / Edit Address -->
      <UModal
        v-model:open="isAddressModalOpen"
        :title="editingAddress?.id ? 'Edit Alamat' : 'Tambah Alamat'"
      >
        <template #body>
          <div v-if="editingAddress" class="space-y-4">
            <!-- Tipe Alamat -->
            <UFormField label="Tipe Alamat">
              <USelect
                v-model="editingAddress.type"
                :items="addressTypeOptions"
                class="w-full"
              />
            </UFormField>

            <!-- Detail Alamat -->
            <UFormField label="Alamat Lengkap">
              <UTextarea
                v-model="editingAddress.detail"
                placeholder="Jl. Contoh No. 123, RT 01/RW 02"
                :rows="3"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <!-- Kelurahan / Kecamatan -->
              <UFormField label="Kecamatan / Kelurahan">
                <UInput
                  v-model="editingAddress.district"
                  placeholder="Kecamatan"
                  class="w-full"
                />
              </UFormField>

              <!-- Kota -->
              <UFormField label="Kota / Kabupaten">
                <UInput
                  v-model="editingAddress.city"
                  placeholder="Kota"
                  class="w-full"
                />
              </UFormField>

              <!-- Provinsi -->
              <UFormField label="Provinsi">
                <UInput
                  v-model="editingAddress.province"
                  placeholder="Provinsi"
                  class="w-full"
                />
              </UFormField>

              <!-- Negara -->
              <UFormField label="Negara">
                <UInput
                  v-model="editingAddress.country"
                  placeholder="Negara"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- Catatan -->
            <UFormField label="Catatan (opsional)">
              <UInput
                v-model="editingAddress.note"
                placeholder="Patokan atau informasi tambahan..."
                class="w-full"
              />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="closeAddressModal">
              Batal
            </UButton>
            <UButton
              color="primary"
              :loading="isAddressLoading"
              @click="saveAddress"
            >
              {{ editingAddress?.id ? "Simpan Perubahan" : "Tambah Alamat" }}
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Riwayat Perusahaan -->
      <div class="rounded-xl border border-accented overflow-hidden">
        <div
          class="px-4 py-3 bg-elevated border-b border-accented flex items-center justify-between"
        >
          <h3 class="text-sm font-medium flex items-center gap-2">
            <UIcon name="i-lucide-briefcase" />
            Riwayat Perusahaan
          </h3>
          <UBadge
            :label="`${patient.histories?.length ?? 0} riwayat`"
            color="neutral"
            variant="subtle"
            size="xs"
          />
        </div>

        <div
          v-if="!patient.histories?.length"
          class="p-6 text-sm text-muted text-center"
        >
          Belum ada riwayat perusahaan.
        </div>

        <div v-else class="divide-y divide-accented">
          <div
            v-for="history in patient.histories"
            :key="history.id"
            class="p-4 flex items-start gap-3"
          >
            <div
              class="w-8 h-8 rounded-lg bg-elevated border border-accented flex items-center justify-center shrink-0 mt-0.5"
            >
              <UIcon name="i-lucide-building-2" class="text-muted text-sm" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium">
                  {{ history.company }}
                </p>
                <UBadge
                  v-if="history.isCurrent"
                  label="Aktif"
                  color="success"
                  variant="subtle"
                  size="xs"
                />
              </div>
              <p v-if="history.position" class="text-xs text-muted">
                {{ history.position }}
              </p>
              <p class="text-xs text-muted mt-1">
                {{ formatDate(history.startDate) }}
                {{
                  history.endDate
                    ? `— ${formatDate(history.endDate)}`
                    : history.isCurrent
                      ? "— Sekarang"
                      : ""
                }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UDashboardPanel>
</template>
