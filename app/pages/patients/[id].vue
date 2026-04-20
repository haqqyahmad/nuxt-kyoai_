<script setup lang="ts">
const route = useRoute();
const api = useApi();

type Address = {
  id: string;
  type: string;
  detail: string;
  country: string;
  province: string;
  city: string;
  district: string;
  note?: string;
};

type CompanyHistory = {
  id: string;
  company: string;
  position?: string;
  isCurrent: boolean;
  startDate?: string;
  endDate?: string;
};

type Patient = {
  id: string;
  PatientId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "MALE" | "FEMALE";
  idType: string;
  idNumber: string;
  email?: string;
  dob: string;
  maritalStatus?: string;
  phone?: string;
  bloodGroup?: string;
  createdAt: string;
  addresses: Address[];
  histories: CompanyHistory[];
  photoUrl?: string;
};

const { data: patient, refresh } = await useAsyncData(
  `patient-${route.params.id}`,
  () => api.get(`/patient/${route.params.id}`).then((res) => res.data.data),
);

// State untuk edit mode
const isEditing = ref(false);
const selectedPhotoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const editForm = ref<Partial<Patient>>({
  gender: "",
  maritalStatus: "",
  idType: "",
  bloodGroup: "",
});

const fullName = computed(() => {
  if (!patient.value) return "-";
  return [
    patient.value.firstName,
    patient.value.middleName,
    patient.value.lastName,
  ]
    .filter(Boolean)
    .join(" ");
});

const formatDate = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatDateForInput = (date?: string) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

const genderLabel = (g: string) => (g === "MALE" ? "Laki-laki" : "Perempuan");

const maritalLabel: Record<string, string> = {
  SINGLE: "Belum Menikah",
  MARRIED: "Menikah",
  DIVORCED: "Cerai",
};

const bloodGroupOptions = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "AB", label: "AB" },
  { value: "O", label: "O" },
];
const genderOptions = [
  { value: "MALE", label: "Laki-laki" },
  { value: "FEMALE", label: "Perempuan" },
];
const maritalOptions = [
  { value: "SINGLE", label: "Belum Menikah" },
  { value: "MARRIED", label: "Menikah" },
  { value: "DIVORCED", label: "Cerai" },
];
const idTypeOptions = [
  { value: "KTP", label: "KTP" },
  { value: "SIM", label: "SIM" },
  { value: "PASSPORT", label: "Passport" },
  { value: "KITAS", label: "KITAS" },
];

const defaultPhotoUrl =
  "https://ui-avatars.com/api/?background=0D8F81&color=fff&bold=true";

// Fungsi untuk memulai edit
const normalizeValue = (val?: string) => val?.toUpperCase() || "";

const startEditing = () => {
  if (patient.value) {
    editForm.value = {
      ...patient.value,
      gender: normalizeValue(patient.value.gender),
      maritalStatus: normalizeValue(patient.value.maritalStatus),
      idType: normalizeValue(patient.value.idType),
      bloodGroup: normalizeValue(patient.value.bloodGroup),
      dob: formatDateForInput(patient.value.dob),
    };

    photoPreview.value = patient.value.photoUrl || null;
    selectedPhotoFile.value = null;
    isEditing.value = true;
  }
};

// Fungsi untuk membatalkan edit
const cancelEditing = () => {
  isEditing.value = false;
  editForm.value = {};
  selectedPhotoFile.value = null;
  photoPreview.value = null;
};

// Fungsi untuk handle klik foto profil
const handlePhotoClick = () => {
  if (isEditing.value && fileInputRef.value) {
    fileInputRef.value.click();
  }
};

// Fungsi untuk handle upload foto
const handlePhotoUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedPhotoFile.value = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }
};

// Fungsi untuk menyimpan perubahan
const saveChanges = async () => {
  if (!patient.value) return;

  try {
    // Upload foto jika ada
    if (selectedPhotoFile.value) {
      const formData = new FormData();
      formData.append("photo", selectedPhotoFile.value);
      const photoResponse = await api.post(
        `/patient/${patient.value.id}/upload-photo`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      editForm.value.photoUrl = photoResponse.data.data.url;
    }

    // Update data pasien
    const updateData = { ...editForm.value };
    delete updateData.id;
    delete updateData.PatientId;
    delete updateData.createdAt;
    delete updateData.addresses;
    delete updateData.histories;

    await api.patch(`/patient/${patient.value.id}`, updateData);
    await refresh();
    cancelEditing();

    // Tampilkan notifikasi sukses
    useToast().add({
      title: "Berhasil",
      description: "Data pasien berhasil diperbarui",
      color: "success",
    });
  } catch (error) {
    console.error("Error saving patient data:", error);
    useToast().add({
      title: "Gagal",
      description: "Gagal memperbarui data pasien",
      color: "error",
    });
  }
};

const getPhotoUrl = () => {
  if (isEditing.value && photoPreview.value) {
    return photoPreview.value;
  }
  if (!patient.value) return defaultPhotoUrl;
  return (
    patient.value.photoUrl ||
    `${defaultPhotoUrl}&name=${encodeURIComponent(fullName.value)}`
  );
};
</script>

<template>
  <UDashboardPanel :id="`patient-${route.params.id}`" >
    <UDashboardNavbar :title="fullName">
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
          <UButton color="neutral" variant="ghost" @click="cancelEditing">
            Batal
          </UButton>
          <UButton color="primary" @click="saveChanges"> Simpan </UButton>
        </div>
      </template>
    </UDashboardNavbar>

    <div v-if="!patient" class="flex justify-center items-center h-64">
      <UIcon
        name="i-lucide-loader-circle"
        class="animate-spin text-2xl text-muted"
      />
    </div>

    <div v-else class="p-6 space-y-6 max-w-7xl">
      <!-- Header dengan foto di kiri -->
      <div
        class="flex items-start gap-6 p-6 rounded-xl border border-accented bg-elevated"
      >
        <!-- Foto Profil -->
        <div class="relative flex-shrink-0">
          <img
            :src="getPhotoUrl()"
            :alt="fullName"
            class="w-32 h-32 rounded-full object-cover border-2 border-primary shadow-md"
            :class="{
              'cursor-pointer hover:opacity-80 transition-opacity': isEditing,
            }"
            @click="handlePhotoClick"
          />
          <input
            v-if="isEditing"
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handlePhotoUpload"
          />
          <div
            v-if="isEditing"
            class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            <UIcon name="i-lucide-camera" class="text-white text-xl" />
          </div>
        </div>

        <!-- Informasi Utama -->
        <div class="flex-1">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex-1">
              <!-- Nama - Edit mode -->
              <div v-if="isEditing" class="space-y-2">
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-xs text-muted">First Name *</label>
                    <UInput v-model="editForm.firstName" size="sm" />
                  </div>
                  <div>
                    <label class="text-xs text-muted">Middle Name</label>
                    <UInput v-model="editForm.middleName" size="sm" />
                  </div>
                  <div>
                    <label class="text-xs text-muted">Last Name</label>
                    <UInput v-model="editForm.lastName" size="sm" />
                  </div>
                </div>
              </div>
              <!-- Nama - View mode -->
              <div v-else>
                <h2 class="text-xl font-semibold">{{ fullName }}</h2>
                <p class="text-sm text-muted mt-0.5">{{ patient.PatientId }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <UBadge
                :label="genderLabel(patient.gender)"
                :color="patient.gender === 'MALE' ? 'primary' : 'info'"
                variant="subtle"
              />
              <UBadge
                v-if="patient.maritalStatus"
                :label="
                  maritalLabel[patient.maritalStatus] ?? patient.maritalStatus
                "
                color="neutral"
                variant="subtle"
              />
            </div>
          </div>

          <!-- Informasi Singkat di bawah nama -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-4 pt-4 border-t border-accented"
          >
            <!-- Tanggal Lahir -->
            <div v-if="!isEditing" class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-calendar" class="text-muted text-sm" />
              <span class="text-muted">Tanggal Lahir:</span>
              <span>{{ formatDate(patient.dob) }}</span>
            </div>
            <div v-else class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-calendar" class="text-muted text-sm" />
              <span class="text-muted">Tanggal Lahir:</span>
              <UInput
                type="date"
                v-model="editForm.dob"
                size="sm"
                class="flex-1"
              />
            </div>

            <!-- No HP -->
            <div v-if="!isEditing" class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-phone" class="text-muted text-sm" />
              <span class="text-muted">No. HP:</span>
              <span>{{ patient.phone ?? "-" }}</span>
            </div>
            <div v-else class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-phone" class="text-muted text-sm" />
              <span class="text-muted">No. HP:</span>
              <UInput v-model="editForm.phone" size="sm" class="flex-1" />
            </div>

            <!-- Email -->
            <div v-if="!isEditing" class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-mail" class="text-muted text-sm" />
              <span class="text-muted">Email:</span>
              <span class="truncate">{{ patient.email ?? "-" }}</span>
            </div>
            <div v-else class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-mail" class="text-muted text-sm" />
              <span class="text-muted">Email:</span>
              <UInput
                v-model="editForm.email"
                type="email"
                size="sm"
                class="flex-1"
              />
            </div>

            <!-- Identitas -->
            <div v-if="!isEditing" class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-id-card" class="text-muted text-sm" />
              <span class="text-muted">{{ patient.idType }}:</span>
              <span class="font-mono">{{ patient.idNumber }}</span>
            </div>
            <div v-else class="flex items-center gap-2 text-sm col-span-2">
              <UIcon name="i-lucide-id-card" class="text-muted text-sm" />
              <USelect
                v-model="editForm.idType"
                :items="[
                  { label: 'KTP', value: 'KTP' },
                  { label: 'SIM', value: 'SIM' },
                  { label: 'PASSPORT', value: 'PASSPORT' },
                  { label: 'KITAS', value: 'KITAS' },
                ]"
                class="w-32"
              />
              <UInput
                v-model="editForm.idNumber"
                size="sm"
                class="flex-1"
                placeholder="Nomor Identitas"
              />
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-accented">
          <!-- Usia -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">Usia</p>
            <p v-if="!isEditing" class="text-sm">
              {{
                patient.dob
                  ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} tahun`
                  : "-"
              }}
            </p>
            <p v-else class="text-sm text-muted">Akan dihitung otomatis</p>
          </div>

          <!-- Status -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">Status</p>
            <div v-if="!isEditing">
              <p class="text-sm">
                {{
                  maritalLabel[patient.maritalStatus] ??
                  patient.maritalStatus ??
                  "-"
                }}
              </p>
            </div>
            <div v-else>
              <USelect
                v-model="editForm.maritalStatus"
                :items="[
                  { label: 'Belum Menikah', value: 'SINGLE' },
                  { label: 'Menikah', value: 'MARRIED' },
                  { label: 'Cerai', value: 'DIVORCED' },
                ]"
                class="w-32"
              />
            </div>
          </div>

          <!-- Golongan Darah -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">Golongan Darah</p>
            <div v-if="!isEditing">
              <p class="text-sm">{{ patient.bloodGroup ?? "-" }}</p>
            </div>
            <div v-else>
              <USelect
                v-model="editForm.bloodGroup"
                :items="[
                  { label: 'A', value: 'A' },
                  { label: 'B', value: 'B' },
                  { label: 'AB', value: 'AB' },
                  { label: 'O', value: 'O' },
                ]"
                class="w-32"
              />
            </div>
          </div>

          <!-- Jenis Kelamin -->
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">Jenis Kelamin</p>
            <div v-if="!isEditing">
              <p class="text-sm">{{ genderLabel(patient.gender) }}</p>
            </div>
            <div v-else>
              <USelect
                v-model="editForm.gender"
                :items="[
                  { label: 'Laki-laki', value: 'MALE' },
                  { label: 'Perempuan', value: 'FEMALE' },
                ]"
                class="w-32"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Alamat -->

      <UCollapsible :default-open="true" class="rounded-xl border border-accented overflow-hidden">
        <!-- HEADER (trigger) -->
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
              <UIcon
                name="i-lucide-chevron-down"
                class="transition-transform"
                :class="{ 'rotate-180': open }"
              />
            </div>
          </div>
        </template>

        <!-- CONTENT -->
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
              class="p-4 space-y-1"
            >
              <div class="flex items-center gap-2">
                <UBadge
                  :label="address.type"
                  color="neutral"
                  variant="outline"
                  size="xs"
                />
              </div>

              <p class="text-sm">{{ address.detail }}</p>

              <p class="text-xs text-muted">
                {{
                  [
                    address.district,
                    address.city,
                    address.province,
                    address.country,
                  ].join(", ")
                }}
              </p>

              <p v-if="address.note" class="text-xs text-muted italic">
                {{ address.note }}
              </p>
            </div>
          </div>
        </template>
      </UCollapsible>

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
                <p class="text-sm font-medium">{{ history.company }}</p>
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
