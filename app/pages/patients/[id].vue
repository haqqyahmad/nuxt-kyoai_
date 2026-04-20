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
  createdAt: string;
  addresses: Address[];
  histories: CompanyHistory[];
};

const { data: patient } = await useAsyncData(
  `patient-${route.params.id}`,
  () => api.get(`/patient/${route.params.id}`).then((res) => res.data.data)
);

const fullName = computed(() => {
  if (!patient.value) return "-";
  return [patient.value.firstName, patient.value.middleName, patient.value.lastName]
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

const genderLabel = (g: string) => g === "MALE" ? "Laki-laki" : "Perempuan";

const maritalLabel: Record<string, string> = {
  SINGLE: "Belum Menikah",
  MARRIED: "Menikah",
  DIVORCED: "Cerai",
};
</script>

<template>
  <UDashboardPanel :id="`patient-${route.params.id}`">
    <UDashboardNavbar :title="fullName">
      <template #leading>
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          to="/patients"
        />
      </template>
    </UDashboardNavbar>

    <div v-if="!patient" class="flex justify-center items-center h-64">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
    </div>

    <div v-else class="p-6 space-y-6 max-w-4xl mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-4 p-4 rounded-xl border border-accented bg-elevated">
        <div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-user" class="text-primary text-2xl" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">{{ fullName }}</h2>
          <p class="text-sm text-muted">{{ patient.PatientId }}</p>
        </div>
        <div class="ml-auto flex gap-2">
          <UBadge
            :label="genderLabel(patient.gender)"
            :color="patient.gender === 'MALE' ? 'primary' : 'info'"
            variant="subtle"
          />
          <UBadge
            v-if="patient.maritalStatus"
            :label="maritalLabel[patient.maritalStatus] ?? patient.maritalStatus"
            color="neutral"
            variant="subtle"
          />
        </div>
      </div>

      <!-- Data Diri -->
      <div class="rounded-xl border border-accented overflow-hidden">
        <div class="px-4 py-3 bg-elevated border-b border-accented">
          <h3 class="text-sm font-medium flex items-center gap-2">
            <UIcon name="i-lucide-id-card" />
            Data Diri
          </h3>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-accented">
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">Tanggal Lahir</p>
            <p class="text-sm">{{ formatDate(patient.dob) }}</p>
          </div>
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">No. Identitas ({{ patient.idType }})</p>
            <p class="text-sm font-mono">{{ patient.idNumber }}</p>
          </div>
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">No. HP</p>
            <p class="text-sm">{{ patient.phone ?? "-" }}</p>
          </div>
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">Email</p>
            <p class="text-sm">{{ patient.email ?? "-" }}</p>
          </div>
          <div class="bg-background p-4">
            <p class="text-xs text-muted mb-1">Terdaftar</p>
            <p class="text-sm">{{ formatDate(patient.createdAt) }}</p>
          </div>
        </div>
      </div>

      <!-- Alamat -->
      <div class="rounded-xl border border-accented overflow-hidden">
        <div class="px-4 py-3 bg-elevated border-b border-accented flex items-center justify-between">
          <h3 class="text-sm font-medium flex items-center gap-2">
            <UIcon name="i-lucide-map-pin" />
            Alamat
          </h3>
          <UBadge :label="`${patient.addresses?.length ?? 0} alamat`" color="neutral" variant="subtle" size="xs" />
        </div>

        <div v-if="!patient.addresses?.length" class="p-6 text-sm text-muted text-center">
          Belum ada alamat.
        </div>

        <div v-else class="divide-y divide-accented">
          <div
            v-for="address in patient.addresses"
            :key="address.id"
            class="p-4 space-y-1"
          >
            <div class="flex items-center gap-2">
              <UBadge :label="address.type" color="neutral" variant="outline" size="xs" />
            </div>
            <p class="text-sm">{{ address.detail }}</p>
            <p class="text-xs text-muted">
              {{ [address.district, address.city, address.province, address.country].join(", ") }}
            </p>
            <p v-if="address.note" class="text-xs text-muted italic">{{ address.note }}</p>
          </div>
        </div>
      </div>

      <!-- Riwayat Perusahaan -->
      <div class="rounded-xl border border-accented overflow-hidden">
        <div class="px-4 py-3 bg-elevated border-b border-accented flex items-center justify-between">
          <h3 class="text-sm font-medium flex items-center gap-2">
            <UIcon name="i-lucide-briefcase" />
            Riwayat Perusahaan
          </h3>
          <UBadge :label="`${patient.histories?.length ?? 0} riwayat`" color="neutral" variant="subtle" size="xs" />
        </div>

        <div v-if="!patient.histories?.length" class="p-6 text-sm text-muted text-center">
          Belum ada riwayat perusahaan.
        </div>

        <div v-else class="divide-y divide-accented">
          <div
            v-for="history in patient.histories"
            :key="history.id"
            class="p-4 flex items-start gap-3"
          >
            <div class="w-8 h-8 rounded-lg bg-elevated border border-accented flex items-center justify-center shrink-0 mt-0.5">
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
              <p v-if="history.position" class="text-xs text-muted">{{ history.position }}</p>
              <p class="text-xs text-muted mt-1">
                {{ formatDate(history.startDate) }}
                {{ history.endDate ? `— ${formatDate(history.endDate)}` : history.isCurrent ? "— Sekarang" : "" }}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </UDashboardPanel>
</template>