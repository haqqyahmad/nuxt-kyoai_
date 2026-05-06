<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const api    = useApi();
const toast  = useToast();
const router = useRouter();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Branch = {
  id: string;
  branchId: string;
  nameBranch: string;
  addressBranch?: string;
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
  phone?: string;
  email?: string;
  dob?: string;
  histories?: {
    id: string;
    companyName: string;
    position?: string;
    startDate?: string;
    endDate?: string | null;
  }[];
};

type Company = {
  id: number;
  codeCostumer: string;
  customerName: string;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const SERVICE_TYPES = [
  { value: "Laboratorium",       label: "Laboratorium",      icon: "i-lucide-flask-conical"  },
  { value: "DoctorConsultation", label: "Konsultasi Dokter", icon: "i-lucide-stethoscope"    },
  { value: "MCU",                label: "MCU",               icon: "i-lucide-clipboard-list" },
  { value: "Vaccine",            label: "Vaksin",            icon: "i-lucide-syringe"        },
  { value: "Antigen",            label: "Antigen",           icon: "i-lucide-microscope"     },
  { value: "PCR",                label: "PCR",               icon: "i-lucide-dna"            },
  { value: "VitaminInjection",   label: "Vitamin Injection", icon: "i-lucide-pill"           },
  { value: "Pharmacy",           label: "Farmasi",           icon: "i-lucide-tablets"        },
  { value: "Dental",             label: "Gigi",              icon: "i-lucide-smile"          },
] as const;

const PAYMENT_TYPES = [
  { value: "Personal",      label: "Personal"        },
  { value: "Insurance",     label: "Asuransi"        },
  { value: "BillToCompany", label: "Bill to Company" },
] as const;

const PRIORITY_TYPES = [
  { value: "Normal",   label: "Normal"    },
  { value: "VIP",      label: "VIP"       },
  { value: "Emegency", label: "Emergency" },
] as const;

// ─────────────────────────────────────────────
// Branch
// ─────────────────────────────────────────────
const selectedBranch  = ref<Branch | null>(null);
const branchModalOpen = ref(false);
const branchSearch    = ref("");

const { data: branches } = await useAsyncData(
  "branches",
  () => api.get("/branch").then((r) => r.data.data as Branch[]),
);

const filteredBranches = computed(() => {
  const q = branchSearch.value.toLowerCase();
  if (!q) return branches.value ?? [];
  return (branches.value ?? []).filter(
    (b) =>
      b.nameBranch.toLowerCase().includes(q) ||
      b.branchId.toLowerCase().includes(q),
  );
});

function openBranchModal() {
  branchSearch.value    = "";
  branchModalOpen.value = true;
}

function selectBranch(b: Branch) {
  selectedBranch.value  = b;
  branchModalOpen.value = false;
}

// ─────────────────────────────────────────────
// Patient
// ─────────────────────────────────────────────
const patientSearch   = ref("");
const patientResults  = ref<Patient[]>([]);
const patientPending  = ref(false);
const selectedPatient = ref<Patient | null>(null);
const isNewPatient    = ref(false);
const patientDropOpen = ref(false);

const { data: initialPatients } = await useAsyncData(
  "patients-initial",
  () => api.get("/patient", { params: { limit: 6 } }).then((r) => r.data.data as Patient[]),
);

const displayedPatients = computed(() =>
  patientSearch.value.length >= 2
    ? patientResults.value
    : (initialPatients.value ?? []),
);

const newPatient = ref({
  firstName:  "",
  middleName: "",
  lastName:   "",
  gender:     "MALE" as "MALE" | "FEMALE",
  idType:     "KTP",
  idNumber:   "",
  phone:      "",
  email:      "",
  dob:        "",
});

let debounce:  ReturnType<typeof setTimeout>;
let requestId = 0;

watch(patientSearch, (val) => {
  clearTimeout(debounce);

  if (selectedPatient.value || !val || val.length < 2) {
    patientResults.value = [];
    patientPending.value = false;
    return;
  }

  const currentId      = ++requestId;
  patientPending.value = true;

  debounce = setTimeout(async () => {
    try {
      const res = await api.get("/patient", { params: { search: val } });
      if (currentId === requestId) patientResults.value = res.data.data ?? [];
    } catch {
      if (currentId === requestId) patientResults.value = [];
    } finally {
      if (currentId === requestId) patientPending.value = false;
    }
  }, 350);
});

function fullName(p: Patient) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function selectPatient(p: Patient) {
  selectedPatient.value = p;
  isNewPatient.value    = false;
  patientSearch.value   = fullName(p);
  patientResults.value  = [];
  patientDropOpen.value = false;
}

function clearPatient() {
  selectedPatient.value = null;
  isNewPatient.value    = false;
  patientSearch.value   = "";
  patientResults.value  = [];
}

function useNewPatient() {
  isNewPatient.value    = true;
  selectedPatient.value = null;
  patientResults.value  = [];
  patientDropOpen.value = false;
}

const activeCompany = computed(() => {
  if (!selectedPatient.value?.histories?.length) return null;
  return (
    selectedPatient.value.histories.find((h) => !h.endDate) ??
    selectedPatient.value.histories.at(-1) ??
    null
  );
});

// ─────────────────────────────────────────────
// Registration Form
// ─────────────────────────────────────────────
const selectedService = ref("");

const { data: companies, pending: companiesPending } = await useAsyncData(
  "companies",
  () => api.get("/customer").then((r) => r.data.data as Company[]),
);

const regForm = ref({
  companyId:        "",
  paymentType:      "Personal",
  priorityRegist:   "Normal",
  examDate:         new Date().toISOString().slice(0, 10),
  scheduleDateExam: new Date().toISOString().slice(0, 10),
});

// ─────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────
const submitting = ref(false);

const canSubmit = computed(() => {
  const hasPatient =
    !!selectedPatient.value ||
    (isNewPatient.value && !!newPatient.value.firstName && !!newPatient.value.idNumber);

  return (
    !!selectedBranch.value &&
    hasPatient &&
    !!selectedService.value &&
    !!regForm.value.companyId &&
    !!regForm.value.examDate
  );
});

async function submit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;

  try {
    let patientId = selectedPatient.value?.id;

    if (isNewPatient.value) {
      const res = await api.post("/patient", { ...newPatient.value });
      patientId  = res.data.data.id;
    }

    await api.post("/registration", {
      patientId,
      branchId:         selectedBranch.value!.branchId,
      companyId:        String(regForm.value.companyId),
      serviceType:      selectedService.value,
      paymentType:      regForm.value.paymentType,
      priorityRegist:   regForm.value.priorityRegist,
      examDate:         regForm.value.examDate,
      scheduleDateExam: regForm.value.scheduleDateExam,
    });

    toast.add({ title: "Berhasil", description: "Registrasi berhasil dibuat", color: "success" });
    router.push("/front-office/registration-patient");
  } catch (err: any) {
    toast.add({
      title:       "Gagal",
      description: err?.response?.data?.message ?? "Terjadi kesalahan",
      color:       "error",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="registration-create">

    <!-- ── Header ── -->
    <template #header>
      <UDashboardNavbar title="Buat Registrasi Baru">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/front-office/registration-patient"
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

    <!-- ── Body ── -->
    <template #body>
      <div class="max-w-5xl mx-auto py-6 px-4 space-y-5">

        <!--
          Grid 2 kolom — pakai minmax(0, 1fr) agar lebar kolom tidak
          terpengaruh oleh konten di dalamnya (mencegah layout shift)
        -->
        <div class="grid gap-5" style="grid-template-columns: repeat(2, minmax(0, 1fr));">

          <!-- ══════════════════════════════
               KOLOM KIRI
          ══════════════════════════════ -->
          <div class="space-y-5 min-w-0">

            <!-- ── Cabang ── -->
            <div class="rounded-xl border border-default">
              <div class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <UIcon name="i-lucide-building-2" class="text-primary text-xs" />
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

              <div class="p-4">
                <!-- Belum dipilih -->
                <button
                  v-if="!selectedBranch"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-default hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  @click="openBranchModal"
                >
                  <div class="w-9 h-9 rounded-lg bg-accented flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <UIcon name="i-lucide-building-2" class="text-muted group-hover:text-primary transition-colors" />
                  </div>
                  <div class="text-left flex-1">
                    <p class="text-sm font-medium">Pilih Cabang</p>
                    <p class="text-xs text-muted">Klik untuk memilih cabang tujuan</p>
                  </div>
                  <UIcon name="i-lucide-chevron-right" class="text-muted group-hover:text-primary transition-colors" />
                </button>

                <!-- Sudah dipilih -->
                <div
                  v-else
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div class="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <UIcon name="i-lucide-building-2" class="text-primary" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate">{{ selectedBranch.nameBranch }}</p>
                    <p class="text-xs text-muted flex items-center gap-1">
                      <UIcon name="i-lucide-map-pin" class="text-xs" />
                      {{ selectedBranch.branchId }}
                    </p>
                  </div>
                  <UButton
                    size="xs"
                    color="primary"
                    variant="subtle"
                    icon="i-lucide-pencil"
                    label="Ganti"
                    @click="openBranchModal"
                  />
                </div>
              </div>
            </div>

            <!-- ── Pasien ── -->
            <div class="rounded-xl border border-default">
              <div class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <UIcon name="i-lucide-user" class="text-primary text-xs" />
                </div>
                <h3 class="text-sm font-semibold">Pasien</h3>
                <UBadge v-if="isNewPatient"        label="Baru"     color="warning" variant="subtle" size="xs" class="ml-auto" />
                <UBadge v-else-if="selectedPatient" label="Terpilih" color="success" variant="subtle" size="xs" class="ml-auto" />
              </div>

              <div class="p-4 space-y-3">

                <!-- Search box -->
                <div v-if="!isNewPatient" class="relative">
                  <UInput
                    v-model="patientSearch"
                    icon="i-lucide-search"
                    :loading="patientPending"
                    :disabled="!!selectedPatient"
                    placeholder="Cari nama, nomor ID, atau kode pasien..."
                    @focus="patientDropOpen = true"
                    @blur="setTimeout(() => (patientDropOpen = false), 200)"
                  />

                  <!-- Dropdown: pasien terbaru / hasil pencarian -->
                  <div
                    v-if="patientDropOpen && !selectedPatient && displayedPatients.length"
                    class="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-default bg-background shadow-xl overflow-hidden"
                  >
                    <div class="px-3 py-1.5 border-b border-default bg-elevated flex items-center gap-1.5">
                      <UIcon name="i-lucide-users" class="text-muted text-xs" />
                      <span class="text-xs text-muted">
                        {{ patientSearch.length >= 2 ? "Hasil pencarian" : "Pasien terbaru" }}
                      </span>
                    </div>

                    <button
                      v-for="p in displayedPatients.slice(0, 6)"
                      :key="p.id"
                      class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-elevated transition-colors text-left border-b border-default last:border-0"
                      @mousedown.prevent="selectPatient(p)"
                    >
                      <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-xs">
                        {{ p.firstName.charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ fullName(p) }}</p>
                        <p class="text-xs text-muted">{{ p.idType }}: {{ p.idNumber }}</p>
                      </div>
                      <UBadge :label="p.PatientId" color="neutral" variant="subtle" size="xs" />
                    </button>

                    <div class="px-3 py-2 border-t border-default">
                      <button
                        class="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        @mousedown.prevent="useNewPatient"
                      >
                        <UIcon name="i-lucide-user-plus" />
                        Pasien tidak ada? Tambah baru
                      </button>
                    </div>
                  </div>

                  <!-- Tidak ditemukan -->
                  <div
                    v-else-if="patientDropOpen && patientSearch.length >= 2 && !patientPending && !patientResults.length && !selectedPatient"
                    class="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-default bg-background shadow-xl"
                  >
                    <p class="px-3 py-2.5 text-xs text-muted">
                      Tidak ditemukan untuk "<span class="text-default">{{ patientSearch }}</span>"
                    </p>
                    <div class="px-3 py-2 border-t border-default">
                      <button
                        class="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        @mousedown.prevent="useNewPatient"
                      >
                        <UIcon name="i-lucide-user-plus" />
                        Tambah sebagai pasien baru
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Card pasien terpilih -->
                <div v-if="selectedPatient" class="rounded-lg border border-primary/20 overflow-hidden">
                  <div class="px-3 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {{ selectedPatient.firstName.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold leading-none">{{ fullName(selectedPatient) }}</p>
                      <p class="text-xs text-muted">{{ selectedPatient.PatientId }}</p>
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
                        <UInput :model-value="selectedPatient.firstName" size="sm" disabled class="w-full opacity-90" />
                      </UFormField>
                      <UFormField label="Middle Name">
                        <UInput :model-value="selectedPatient.middleName ?? '-'" size="sm" disabled class="w-full opacity-90" />
                      </UFormField>
                      <UFormField label="Last Name">
                        <UInput :model-value="selectedPatient.lastName" size="sm" disabled class="w-full opacity-90" />
                      </UFormField>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <UFormField label="Gender">
                        <UInput
                          :model-value="selectedPatient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'"
                          size="sm"
                          disabled
                          class="w-full opacity-90"
                        />
                      </UFormField>
                      <UFormField label="Tgl Lahir">
                        <UInput
                          :model-value="selectedPatient.dob ? selectedPatient.dob.slice(0, 10) : '-'"
                          size="sm"
                          disabled
                          class="w-full opacity-90"
                        />
                      </UFormField>
                      <UFormField label="Tipe ID">
                        <UInput :model-value="selectedPatient.idType" size="sm" disabled class="w-full opacity-90" />
                      </UFormField>
                      <UFormField label="Nomor ID">
                        <UInput :model-value="selectedPatient.idNumber" size="sm" disabled class="w-full opacity-90" />
                      </UFormField>
                      <UFormField label="No. HP">
                        <UInput :model-value="selectedPatient.phone ?? '-'" size="sm" disabled class="w-full opacity-90" />
                      </UFormField>
                      <UFormField label="Email">
                        <UInput :model-value="selectedPatient.email ?? '-'" size="sm" disabled class="w-full opacity-90" />
                      </UFormField>
                    </div>
                  </div>
                </div>

                <!-- Form pasien baru -->
                <div v-if="isNewPatient" class="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold text-warning flex items-center gap-1.5">
                      <UIcon name="i-lucide-user-plus" />
                      Pasien Baru
                    </p>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      label="Batal"
                      @click="isNewPatient = false; patientSearch = ''"
                    />
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <UFormField label="First Name *">
                      <UInput v-model="newPatient.firstName" size="sm" placeholder="Budi" class="w-full" />
                    </UFormField>
                    <UFormField label="Middle">
                      <UInput v-model="newPatient.middleName" size="sm" placeholder="-" class="w-full" />
                    </UFormField>
                    <UFormField label="Last Name">
                      <UInput v-model="newPatient.lastName" size="sm" placeholder="Santoso" class="w-full" />
                    </UFormField>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <UFormField label="Gender">
                      <USelect
                        v-model="newPatient.gender"
                        size="sm"
                        :items="[
                          { label: 'Laki-laki', value: 'MALE'   },
                          { label: 'Perempuan', value: 'FEMALE' },
                        ]"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Tgl Lahir">
                      <UInput v-model="newPatient.dob" type="date" size="sm" class="w-full" />
                    </UFormField>
                    <UFormField label="Tipe ID">
                      <USelect
                        v-model="newPatient.idType"
                        size="sm"
                        :items="['KTP', 'PASSPORT', 'SIM', 'KITAS'].map((v) => ({ label: v, value: v }))"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Nomor ID *">
                      <UInput v-model="newPatient.idNumber" size="sm" placeholder="Nomor identitas" class="w-full" />
                    </UFormField>
                    <UFormField label="No. HP">
                      <UInput v-model="newPatient.phone" size="sm" placeholder="08xxx" class="w-full" />
                    </UFormField>
                    <UFormField label="Email">
                      <UInput v-model="newPatient.email" type="email" size="sm" placeholder="email@..." class="w-full" />
                    </UFormField>
                  </div>
                </div>

                <!-- Shortcut tambah pasien baru -->
                <div v-if="!selectedPatient && !isNewPatient && !patientSearch" class="text-center">
                  <button
                    class="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                    @click="useNewPatient"
                  >
                    <UIcon name="i-lucide-user-plus" />
                    Tambah pasien baru tanpa pencarian
                  </button>
                </div>

              </div>
            </div>
          </div>

          <!-- ══════════════════════════════
               KOLOM KANAN
          ══════════════════════════════ -->
          <div class="space-y-5 min-w-0">

            <!-- ── Jenis Layanan ── -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <UIcon name="i-lucide-stethoscope" class="text-primary text-xs" />
                </div>
                <h3 class="text-sm font-semibold">Jenis Layanan</h3>
                <UBadge
                  v-if="selectedService"
                  :label="SERVICE_TYPES.find((s) => s.value === selectedService)?.label ?? ''"
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
                      :class="selectedService === svc.value ? 'bg-primary text-white' : 'bg-accented text-muted'"
                    >
                      <UIcon :name="svc.icon" class="text-sm" />
                    </div>
                    <span class="text-xs font-medium text-center leading-tight">{{ svc.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- ── Data Registrasi ── -->
            <div class="rounded-xl border border-default overflow-hidden">
              <div class="px-4 py-3 bg-elevated border-b border-default flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <UIcon name="i-lucide-clipboard" class="text-primary text-xs" />
                </div>
                <h3 class="text-sm font-semibold">Data Registrasi</h3>
              </div>

              <div class="p-4 space-y-4">
                <UFormField label="Perusahaan / Pembayar *">
                  <USelect
                    v-model="regForm.companyId"
                    :loading="companiesPending"
                    :items="(companies ?? []).map((c) => ({
                      label: `${c.codeCostumer} – ${c.customerName}`,
                      value: String(c.id),
                    }))"
                    placeholder="Pilih perusahaan..."
                    class="w-full"
                  />
                </UFormField>

                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Tipe Pembayaran">
                    <USelect v-model="regForm.paymentType" :items="PAYMENT_TYPES" class="w-full" />
                  </UFormField>
                  <UFormField label="Prioritas">
                    <USelect v-model="regForm.priorityRegist" :items="PRIORITY_TYPES" class="w-full" />
                  </UFormField>
                </div>

                <UFormField label="Tanggal Periksa *">
                  <UInput v-model="regForm.examDate" type="date" class="w-full" />
                </UFormField>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Bottom bar ── -->
        <div class="sticky bottom-0 -mx-4 px-4 py-3 border-t border-default bg-background/90 backdrop-blur flex items-center justify-between gap-3">
          <!-- Checklist status -->
          <div class="flex items-center gap-2 flex-wrap text-xs text-muted">
            <span v-if="selectedBranch" class="flex items-center gap-1 text-success">
              <UIcon name="i-lucide-check-circle-2" />
              {{ selectedBranch.nameBranch }}
            </span>
            <span v-if="selectedPatient || isNewPatient" class="flex items-center gap-1 text-success">
              <UIcon name="i-lucide-check-circle-2" />
              {{ isNewPatient ? "Pasien baru" : fullName(selectedPatient!) }}
            </span>
            <span v-if="selectedService" class="flex items-center gap-1 text-success">
              <UIcon name="i-lucide-check-circle-2" />
              {{ SERVICE_TYPES.find((s) => s.value === selectedService)?.label }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <UButton color="neutral" variant="outline" to="/front-office/registration-patient">
              Batal
            </UButton>
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

  <!-- ════════════════════════════════════════════
       MODAL PILIH CABANG
  ════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="branchModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="backdrop-filter: blur(8px) saturate(150%); background: rgba(0,0,0,0.10);"
        @click.self="branchModalOpen = false"
      >
        <Transition name="modal-pop">
          <div
            v-if="branchModalOpen"
            class="w-full max-w-sm bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden"
            style="box-shadow: 0 32px 64px -12px rgba(0,0,0,0.30), 0 0 0 1px rgba(128,128,128,0.12);"
          >
            <!-- Header -->
            <div class="px-5 pt-5 pb-3">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h2 class="text-[15px] font-semibold tracking-tight leading-snug">Pilih Cabang</h2>
                  <p class="text-xs text-muted mt-0.5">Cabang tujuan registrasi pasien</p>
                </div>
                <button
                  class="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-default hover:bg-elevated transition-all"
                  @click="branchModalOpen = false"
                >
                  <UIcon name="i-lucide-x" class="text-xs" />
                </button>
              </div>

              <!-- Search -->
              <div class="relative">
                <UIcon
                  name="i-lucide-search"
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                  style="font-size: 13px"
                />
                <input
                  v-model="branchSearch"
                  type="text"
                  placeholder="Ketik nama atau kode cabang..."
                  autofocus
                  class="w-full pl-8 pr-3 py-1.5 text-sm bg-elevated rounded-lg outline-none border border-transparent focus:border-primary/40 focus:bg-background transition-all placeholder:text-muted/60"
                />
              </div>
            </div>

            <div class="h-px bg-default/60 mx-4" />

            <!-- List cabang -->
            <div class="overflow-y-auto py-1.5" style="max-height: 260px;">
              <template v-if="filteredBranches.length">
                <button
                  v-for="(b, i) in filteredBranches"
                  :key="b.branchId"
                  class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/10 transition-colors text-left"
                  :class="selectedBranch?.branchId === b.branchId ? 'bg-primary/5' : ''"
                  @click="selectBranch(b)"
                >
                  <span
                    class="text-[10px] font-semibold w-5 h-5 rounded flex items-center justify-center flex-shrink-0 tabular-nums transition-colors"
                    :class="selectedBranch?.branchId === b.branchId ? 'bg-primary text-white' : 'bg-elevated text-muted'"
                  >
                    {{ i + 1 }}
                  </span>

                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm font-medium leading-snug truncate"
                      :class="selectedBranch?.branchId === b.branchId ? 'text-primary' : 'text-default'"
                    >
                      {{ b.nameBranch }}
                    </p>
                    <p class="text-[11px] text-muted truncate leading-tight mt-px">
                      {{ b.branchId }}
                      <template v-if="b.addressBranch">&middot; {{ b.addressBranch }}</template>
                    </p>
                  </div>

                  <UIcon
                    v-if="selectedBranch?.branchId === b.branchId"
                    name="i-lucide-check"
                    class="text-primary flex-shrink-0 text-sm"
                  />
                </button>
              </template>

              <!-- Empty state -->
              <div v-else class="py-8 text-center">
                <p class="text-sm text-muted">Tidak ada hasil</p>
                <p class="text-xs text-muted/50 mt-1">Coba kata kunci lain</p>
              </div>
            </div>

            <div class="h-px bg-default/60 mx-4" />

            <!-- Footer -->
            <div class="px-5 py-3 flex items-center justify-between">
              <p class="text-[11px] text-muted/60">{{ filteredBranches.length }} cabang tersedia</p>
              <button
                class="text-xs text-muted hover:text-default transition-colors"
                @click="branchModalOpen = false"
              >
                Tutup
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to     { opacity: 0; }

/* ── Modal card ── */
.modal-pop-enter-active { transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-pop-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.modal-pop-enter-from   { opacity: 0; transform: scale(0.96) translateY(6px); }
.modal-pop-leave-to     { opacity: 0; transform: scale(0.98) translateY(3px); }
</style>