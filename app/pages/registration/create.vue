<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const api = useApi();
const toast = useToast();
const router = useRouter();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Branch = { id: string; branchId: string; nameBranch: string };
// Tambah field di type Patient
type Patient = {
  id: string;
  PatientId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "MALE" | "FEMALE";
  idType: string;
  idNumber: string;
  phone?: string;
  email?: string;
  dob?: string;
  // tambah ini
  histories?: {
    id: string;
    companyName: string;
    position?: string;
    startDate?: string;
    endDate?: string | null;
  }[];
};
// setelah fullName()
const activeCompany = computed(() => {
  if (!selectedPatient.value?.histories?.length) return null;
  // ambil yang endDate null (masih aktif) atau yang paling terakhir
  return (
    selectedPatient.value.histories.find((h) => !h.endDate) ??
    selectedPatient.value.histories.at(-1) ??
    null
  );
});
type Company = { id: number; codeCostumer: string; customerName: string };

const SERVICE_TYPES = [
  {
    value: "Laboratorium",
    label: "Laboratorium",
    icon: "i-lucide-flask-conical",
  },
  {
    value: "DoctorConsultation",
    label: "Konsultasi Dokter",
    icon: "i-lucide-stethoscope",
  },
  { value: "MCU", label: "MCU", icon: "i-lucide-clipboard-list" },
  { value: "Vaccine", label: "Vaksin", icon: "i-lucide-syringe" },
  { value: "Antigen", label: "Antigen", icon: "i-lucide-microscope" },
  { value: "PCR", label: "PCR", icon: "i-lucide-dna" },
  {
    value: "VitaminInjection",
    label: "Vitamin Injection",
    icon: "i-lucide-pill",
  },
  { value: "Pharmacy", label: "Farmasi", icon: "i-lucide-tablets" },
  { value: "Dental", label: "Gigi", icon: "i-lucide-smile" },
];

const PAYMENT_TYPES = [
  { value: "Personal", label: "Personal" },
  { value: "Insurance", label: "Asuransi" },
  { value: "BillToCompany", label: "Bill to Company" },
];
const PRIORITY_TYPES = [
  { value: "Normal", label: "Normal" },
  { value: "VIP", label: "VIP" },
  { value: "Emegency", label: "Emergency" },
];

// ─────────────────────────────────────────────
// Branch
// ─────────────────────────────────────────────
const branchSearch = ref("");
const selectedBranch = ref<Branch | null>(null);
const branchOpen = ref(false);

const { data: branches, pending: branchPending } = await useAsyncData(
  "branches",
  () => api.get("/branch").then((r) => r.data.data as Branch[]),
);

const filteredBranches = computed(() =>
  (branches.value ?? []).filter(
    (b) =>
      b.nameBranch.toLowerCase().includes(branchSearch.value.toLowerCase()) ||
      b.branchId.toLowerCase().includes(branchSearch.value.toLowerCase()),
  ),
);

function selectBranch(b: Branch) {
  selectedBranch.value = b;
  branchSearch.value = b.nameBranch;
  branchOpen.value = false;
}

// ─────────────────────────────────────────────
// Patient
// ─────────────────────────────────────────────
const patientSearch = ref("");
const patientResults = ref<Patient[]>([]);
const patientPending = ref(false);
const selectedPatient = ref<Patient | null>(null);
const isNewPatient = ref(false);

const newPatient = ref({
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "MALE" as "MALE" | "FEMALE",
  idType: "KTP",
  idNumber: "",
  phone: "",
  email: "",
  dob: "",
});

let debounce: ReturnType<typeof setTimeout>;
watch(patientSearch, (val) => {
  clearTimeout(debounce);
  if (selectedPatient.value) return;
  if (!val || val.length < 2) {
    patientResults.value = [];
    return;
  }
  patientPending.value = true;
  debounce = setTimeout(async () => {
    try {
      const r = await api.get("/patient", { params: { search: val } });
      console.log("pasien", r.data);
      patientResults.value = r.data.data ?? [];
    } catch {
      patientResults.value = [];
    } finally {
      patientPending.value = false;
    }
  }, 350);
});

function selectPatient(p: Patient) {
  selectedPatient.value = p;
  isNewPatient.value = false;
  patientSearch.value = fullName(p);
  patientResults.value = [];
}

function clearPatient() {
  selectedPatient.value = null;
  isNewPatient.value = false;
  patientSearch.value = "";
  patientResults.value = [];
}

function useNewPatient() {
  isNewPatient.value = true;
  selectedPatient.value = null;
  patientResults.value = [];
}

function fullName(p: Patient) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────
// Service & reg data
// ─────────────────────────────────────────────
const selectedService = ref("");

const { data: companies, pending: companiesPending } = await useAsyncData(
  "companies",
  () => api.get("/customer").then((r) => r.data.data as Company[]),
);

const regForm = ref({
  companyId: "",
  paymentType: "Personal",
  priorityRegist: "Normal",
  examDate: new Date().toISOString().slice(0, 10),
  scheduleDateExam: new Date().toISOString().slice(0, 10),
});

// ─────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────
const submitting = ref(false);

const canSubmit = computed(
  () =>
    !!selectedBranch.value &&
    (!!selectedPatient.value ||
      (isNewPatient.value &&
        !!newPatient.value.firstName &&
        !!newPatient.value.idNumber)) &&
    !!selectedService.value &&
    !!regForm.value.companyId &&
    !!regForm.value.examDate &&
    !!regForm.value.scheduleDateExam,
);

async function submit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    let patientId = selectedPatient.value?.id;
    if (isNewPatient.value) {
      const r = await api.post("/patient", { ...newPatient.value });
      patientId = r.data.data.id;
    }
    await api.post("/registration", {
      patientId,
      branchId: selectedBranch.value!.branchId,
      companyId: String(regForm.value.companyId),
      serviceType: selectedService.value,
      paymentType: regForm.value.paymentType,
      priorityRegist: regForm.value.priorityRegist,
      examDate: regForm.value.examDate,
      scheduleDateExam: regForm.value.scheduleDateExam,
    });
    toast.add({
      title: "Berhasil",
      description: "Registrasi berhasil dibuat",
      color: "success",
    });
    router.push("/registration");
  } catch (err: any) {
    toast.add({
      title: "Gagal",
      description: err?.response?.data?.message ?? "Terjadi kesalahan",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="registration-create">
    <template #header>
      <UDashboardNavbar title="Buat Registrasi Baru">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/registration"
          />
        </template>
        <template #right>
          <UButton
            color="primary"
            icon="i-lucide-check"
            :loading="submitting"
            :disabled="!canSubmit || submitting"
            @click="submit"
          >
            Simpan
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-5xl mx-auto py-6 px-4 space-y-5">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- ══ KIRI ══ -->
          <div class="space-y-5">
            <!-- ── Cabang ── -->
            <div class="rounded-xl border border-default overflow-visible">
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-building-2"
                    class="text-primary text-xs"
                  />
                </div>
                <h3 class="text-sm font-semibold">Cabang</h3>
                <UBadge
                  v-if="selectedBranch"
                  :label="selectedBranch.branchId"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>
              <div class="p-4 relative">
                <UInput
                  v-model="branchSearch"
                  icon="i-lucide-search"
                  :loading="branchPending"
                  placeholder="Cari nama atau kode cabang..."
                  @input="
                    () => {
                      selectedBranch = null;
                      branchOpen = true;
                    }
                  "
                  @focus="branchOpen = true"
                  @blur="setTimeout(() => (branchOpen = false), 150)"
                />

                <div
                  v-if="branchOpen && filteredBranches.length"
                  class="absolute z-30 left-4 right-4 mt-1 rounded-xl border border-default bg-background shadow-xl overflow-hidden"
                >
                  <button
                    v-for="b in filteredBranches"
                    :key="b.branchId"
                    class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-elevated transition-colors text-left border-b border-default last:border-0"
                    @mousedown.prevent="selectBranch(b)"
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
                    >
                      <UIcon
                        name="i-lucide-building-2"
                        class="text-primary text-sm"
                      />
                    </div>
                    <div>
                      <p class="text-sm font-medium">{{ b.nameBranch }}</p>
                      <p class="text-xs text-muted">{{ b.branchId }}</p>
                    </div>
                    <UIcon
                      v-if="selectedBranch?.branchId === b.branchId"
                      name="i-lucide-check"
                      class="text-primary ml-auto"
                    />
                  </button>
                </div>

                <div
                  v-if="selectedBranch"
                  class="mt-2.5 flex items-center gap-2 text-xs text-muted bg-primary/5 rounded-lg px-3 py-2"
                >
                  <UIcon
                    name="i-lucide-map-pin"
                    class="text-primary flex-shrink-0"
                  />
                  <span class="flex-1 truncate"
                    >{{ selectedBranch.nameBranch }} ·
                    {{ selectedBranch.branchId }}</span
                  >
                  <button
                    @click="
                      selectedBranch = null;
                      branchSearch = '';
                    "
                  >
                    <UIcon
                      name="i-lucide-x"
                      class="hover:text-default transition-colors"
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ── Pasien ── -->
            <div class="rounded-xl border border-default">
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="text-primary text-xs" />
                </div>
                <h3 class="text-sm font-semibold">Pasien</h3>
                <UBadge
                  v-if="isNewPatient"
                  label="Baru"
                  color="warning"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
                <UBadge
                  v-else-if="selectedPatient"
                  label="Terpilih"
                  color="success"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>
              <div class="p-4 space-y-3">
                <!-- Search (hidden when new patient form open) -->
                <div v-if="!isNewPatient" class="relative">
                  <UInput
                    v-model="patientSearch"
                    icon="i-lucide-search"
                    :loading="patientPending"
                    :disabled="!!selectedPatient"
                    placeholder="Cari nama, nomor ID, atau kode pasien..."
                  />

                  <!-- Dropdown results -->
                  <div
                    v-if="patientResults.length && !selectedPatient"
                    class="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-default bg-background shadow-xl overflow-hidden"
                  >
                    <button
                      v-for="p in patientResults.slice(0, 5)"
                      :key="p.id"
                      class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-elevated transition-colors text-left border-b border-default last:border-0"
                      @click="selectPatient(p)"
                    >
                      <div
                        class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-xs"
                      >
                        {{ p.firstName.charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">
                          {{ fullName(p) }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ p.idType }}: {{ p.idNumber }}
                        </p>
                      </div>
                      <UBadge
                        :label="p.PatientId"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      />
                    </button>
                    <div class="px-3 py-2 border-t border-default">
                      <button
                        class="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        @click="useNewPatient"
                      >
                        <UIcon name="i-lucide-user-plus" /> Pasien tidak ada?
                        Tambah baru
                      </button>
                    </div>
                  </div>

                  <!-- No result -->
                  <div
                    v-else-if="
                      patientSearch.length >= 2 &&
                      !patientPending &&
                      !patientResults.length &&
                      !selectedPatient
                    "
                    class="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-default bg-background shadow-xl"
                  >
                    <p class="px-3 py-2.5 text-xs text-muted">
                      Tidak ditemukan untuk "<span class="text-default">{{
                        patientSearch
                      }}</span
                      >"
                    </p>
                    <div class="px-3 py-2 border-t border-default">
                      <button
                        class="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        @click="useNewPatient"
                      >
                        <UIcon name="i-lucide-user-plus" /> Tambah sebagai
                        pasien baru
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Selected card -->
                <!-- Selected card -->
                <!-- Selected card → form disabled -->
                <div
                  v-if="selectedPatient"
                  class="rounded-lg border border-primary/20 overflow-hidden"
                >
                  <div
                    class="px-3 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2"
                  >
                    <div
                      class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0"
                    >
                      {{ selectedPatient.firstName.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold leading-none">
                        {{ fullName(selectedPatient) }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ selectedPatient.PatientId }}
                      </p>
                    </div>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      label="Ganti"
                      class="ml-auto"
                      @click="clearPatient"
                    />
                  </div>

                  <div class="p-3 space-y-2">
                    <div class="grid grid-cols-3 gap-2">
                      <UFormField label="First Name">
                        <UInput
                          :model-value="selectedPatient.firstName"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Middle Name">
                        <UInput
                          :model-value="selectedPatient.middleName ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Last Name">
                        <UInput
                          :model-value="selectedPatient.lastName"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <UFormField label="Gender">
                        <UInput
                          :model-value="
                            selectedPatient.gender === 'MALE'
                              ? 'Laki-laki'
                              : 'Perempuan'
                          "
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Tgl Lahir">
                        <UInput
                          :model-value="
                            selectedPatient.dob
                              ? selectedPatient.dob.slice(0, 10)
                              : '-'
                          "
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Tipe ID">
                        <UInput
                          :model-value="selectedPatient.idType"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Nomor ID">
                        <UInput
                          :model-value="selectedPatient.idNumber"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="No. HP">
                        <UInput
                          :model-value="selectedPatient.phone ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Email">
                        <UInput
                          :model-value="selectedPatient.email ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                    </div>
                  </div>
                </div>
                <!-- Enterprise card — terpisah, di bawah selected card -->
                <div
                  v-if="selectedPatient"
                  class="rounded-lg border border-default overflow-hidden"
                >
                  <div
                    class="px-3 py-2 bg-elevated border-b border-default flex items-center gap-2"
                  >
                    <div
                      class="w-5 h-5 rounded bg-primary/10 flex items-center justify-center"
                    >
                      <UIcon
                        name="i-lucide-building"
                        class="text-primary text-xs"
                      />
                    </div>
                    <p class="text-xs font-semibold">Informasi Perusahaan</p>
                    <UBadge
                      v-if="activeCompany"
                      label="Aktif"
                      color="success"
                      variant="subtle"
                      size="xs"
                      class="ml-auto"
                    />
                    <UBadge
                      v-else
                      label="Tidak ada data"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                      class="ml-auto"
                    />
                  </div>
                  <div class="p-3 space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                      <UFormField label="Nama Perusahaan">
                        <UInput
                          :model-value="activeCompany?.companyName ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Jabatan">
                        <UInput
                          :model-value="activeCompany?.position ?? '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Mulai Bekerja">
                        <UInput
                          :model-value="
                            activeCompany?.startDate
                              ? activeCompany.startDate.slice(0, 10)
                              : '-'
                          "
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                      <UFormField label="Status">
                        <UInput
                          :model-value="
                            activeCompany?.endDate
                              ? 'Tidak aktif'
                              : 'Masih bekerja'
                          "
                          size="sm"
                          disabled
                          class="w-full opacity-60"
                        />
                      </UFormField>
                    </div>
                    <p
                      v-if="!activeCompany"
                      class="text-xs text-muted text-center py-1"
                    >
                      Pasien belum memiliki riwayat perusahaan.
                    </p>
                    <p class="text-xs text-muted flex items-center gap-1">
                      <UIcon name="i-lucide-info" class="flex-shrink-0" />
                      Data perusahaan diambil dari profil pasien dan tidak dapat
                      diubah di sini.
                    </p>
                  </div>
                </div>

                <!-- New patient form -->
                <div
                  v-if="isNewPatient"
                  class="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
                >
                  <div class="flex items-center justify-between">
                    <p
                      class="text-xs font-semibold text-warning flex items-center gap-1.5"
                    >
                      <UIcon name="i-lucide-user-plus" /> Pasien Baru
                    </p>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      label="Batal"
                      @click="
                        isNewPatient = false;
                        patientSearch = '';
                      "
                    />
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <UFormField label="First Name *">
                      <UInput
                        v-model="newPatient.firstName"
                        size="sm"
                        placeholder="Budi"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Middle">
                      <UInput
                        v-model="newPatient.middleName"
                        size="sm"
                        placeholder="-"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Last Name">
                      <UInput
                        v-model="newPatient.lastName"
                        size="sm"
                        placeholder="Santoso"
                        class="w-full"
                      />
                    </UFormField>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <UFormField label="Gender">
                      <USelect
                        v-model="newPatient.gender"
                        size="sm"
                        :items="[
                          { label: 'Laki-laki', value: 'MALE' },
                          { label: 'Perempuan', value: 'FEMALE' },
                        ]"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Tgl Lahir">
                      <UInput
                        v-model="newPatient.dob"
                        type="date"
                        size="sm"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Tipe ID">
                      <USelect
                        v-model="newPatient.idType"
                        size="sm"
                        :items="
                          ['KTP', 'PASSPORT', 'SIM', 'KITAS'].map((v) => ({
                            label: v,
                            value: v,
                          }))
                        "
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Nomor ID *">
                      <UInput
                        v-model="newPatient.idNumber"
                        size="sm"
                        placeholder="Nomor identitas"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="No. HP">
                      <UInput
                        v-model="newPatient.phone"
                        size="sm"
                        placeholder="08xxx"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Email">
                      <UInput
                        v-model="newPatient.email"
                        type="email"
                        size="sm"
                        placeholder="email@..."
                        class="w-full"
                      />
                    </UFormField>
                  </div>
                </div>

                <!-- Shortcut tambah baru -->
                <div
                  v-if="!selectedPatient && !isNewPatient && !patientSearch"
                  class="text-center"
                >
                  <button
                    class="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                    @click="useNewPatient"
                  >
                    <UIcon name="i-lucide-user-plus" /> Tambah pasien baru tanpa
                    pencarian
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ══ KANAN ══ -->
          <div class="space-y-5">
            <!-- ── Layanan ── -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-stethoscope"
                    class="text-primary text-xs"
                  />
                </div>
                <h3 class="text-sm font-semibold">Jenis Layanan</h3>
                <UBadge
                  v-if="selectedService"
                  :label="
                    SERVICE_TYPES.find((s) => s.value === selectedService)
                      ?.label ?? ''
                  "
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                />
              </div>
              <div class="p-4">
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="svc in SERVICE_TYPES"
                    :key="svc.value"
                    class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all"
                    :class="
                      selectedService === svc.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-default bg-elevated hover:border-primary/40'
                    "
                    @click="selectedService = svc.value"
                  >
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center"
                      :class="
                        selectedService === svc.value
                          ? 'bg-primary text-white'
                          : 'bg-accented text-muted'
                      "
                    >
                      <UIcon :name="svc.icon" class="text-sm" />
                    </div>
                    <span
                      class="text-xs font-medium text-center leading-tight"
                      >{{ svc.label }}</span
                    >
                  </button>
                </div>
              </div>
            </div>

            <!-- ── Data Registrasi ── -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div
                class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2"
              >
                <div
                  class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-clipboard"
                    class="text-primary text-xs"
                  />
                </div>
                <h3 class="text-sm font-semibold">Data Registrasi</h3>
              </div>
              <div class="p-4 space-y-4">
                <UFormField label="Perusahaan / Pembayar *">
                  <USelect
                    v-model="regForm.companyId"
                    :loading="companiesPending"
                    :items="
                      (companies ?? []).map((c) => ({
                        label: `${c.codeCostumer} – ${c.customerName}`,
                        value: String(c.id),
                      }))
                    "
                    placeholder="Pilih perusahaan..."
                    class="w-full"
                  />
                </UFormField>

                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Tipe Pembayaran">
                    <USelect
                      v-model="regForm.paymentType"
                      :items="PAYMENT_TYPES"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Prioritas">
                    <USelect
                      v-model="regForm.priorityRegist"
                      :items="PRIORITY_TYPES"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Tanggal Periksa *">
                    <UInput
                      v-model="regForm.examDate"
                      type="date"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Jadwal Periksa *">
                    <UInput
                      v-model="regForm.scheduleDateExam"
                      type="date"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Bottom bar ── -->
        <div
          class="sticky bottom-0 -mx-4 px-4 py-3 border-t border-default bg-background/90 backdrop-blur flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2 flex-wrap text-xs text-muted">
            <span
              v-if="selectedBranch"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{ selectedBranch.nameBranch }}
            </span>
            <span
              v-if="selectedPatient || isNewPatient"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{ isNewPatient ? "Pasien baru" : fullName(selectedPatient!) }}
            </span>
            <span
              v-if="selectedService"
              class="flex items-center gap-1 text-success"
            >
              <UIcon name="i-lucide-check-circle-2" />
              {{
                SERVICE_TYPES.find((s) => s.value === selectedService)?.label
              }}
            </span>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <UButton color="neutral" variant="outline" to="/registration"
              >Batal</UButton
            >
            <UButton
              color="primary"
              icon="i-lucide-check"
              :loading="submitting"
              :disabled="!canSubmit || submitting"
              @click="submit"
            >
              Simpan Registrasi
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
