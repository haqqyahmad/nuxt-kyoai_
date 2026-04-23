<script setup lang="ts">
import * as z from "zod";
import { handleError, handleSuccess } from "~/utils/handlers";

const api = useApi();
const toast = useToast();

const emit = defineEmits<{
  (e: "created"): void;
}>();

// ✅ schema tetap di sini
const schema = z.object({
  branchId: z.number(),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]),
  idType: z.enum(["KTP", "PASSPORT", "SIM"]),
  idNumber: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().min(1),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED"]).optional(),
  phone: z.string().optional(),
});

const state = reactive({
  branchId: 1,
  firstName: "",
  middleName: "",
  lastName: "",
  gender: undefined,
  idType: undefined,
  idNumber: "",
  email: "",
  dob: "",
  maritalStatus: undefined,
  phone: "",
});

const genderOptions = [
  { label: "Laki-laki", value: "MALE" },
  { label: "Perempuan", value: "FEMALE" },
];

const idTypeOptions = [
  { label: "KTP", value: "KTP" },
  { label: "Passport", value: "PASSPORT" },
  { label: "SIM", value: "SIM" },
];

const maritalOptions = [
  { label: "Belum Menikah", value: "SINGLE" },
  { label: "Menikah", value: "MARRIED" },
  { label: "Cerai", value: "DIVORCED" },
];

// ✅ submit dipisah (ini yang dipanggil BaseFormModal)
async function submit(data: any) {
  try {
    await api.post("/patient", {
      ...data,
      email: data.email || undefined,
    });

    handleSuccess(toast, data.firstName);
    emit("created");
  } catch (err: any) {
    handleError(toast, err);
    throw err; // 🔥 penting biar Base tau error
  }
}
</script>

<template>
  <BaseFormModal
    title="Tambah Pasien"
    description="Isi data pasien"
    :schema="schema"
    :state="state"
    :submit="submit"
    @success="$emit('created')"
  >
    <!-- 🔥 Trigger -->
    <template #trigger>
      <UButton label="Tambah Pasien" icon="i-lucide-user-plus" />
    </template>

    <!-- 🔥 FORM ISI -->
    <!-- Branch ID (hidden / auto) -->
    <input type="hidden" :value="state.branchId" />

    <!-- Nama -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <UFormField label="First Name" name="firstName" required>
        <UInput v-model="state.firstName" placeholder="Budi" class="w-full" />
      </UFormField>

      <UFormField label="Middle Name" name="middleName">
        <UInput
          v-model="state.middleName"
          placeholder="Santoso"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Last Name" name="lastName" required>
        <UInput v-model="state.lastName" placeholder="Wijaya" class="w-full" />
      </UFormField>
    </div>

    <!-- Gender & Marital -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <UFormField label="Gender" name="gender">
        <USelect
          v-model="state.gender"
          :items="genderOptions"
          placeholder="Pilih gender"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Status Pernikahan" name="maritalStatus">
        <USelect
          v-model="state.maritalStatus"
          :items="maritalOptions"
          placeholder="Pilih status"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- ID Type & ID Number -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <UFormField label="Jenis ID" name="idType">
        <USelect
          v-model="state.idType"
          :items="idTypeOptions"
          placeholder="Pilih jenis"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Nomor Identitas"
        name="idNumber"
        required
        class="sm:col-span-2"
      >
        <UInput
          v-model="state.idNumber"
          placeholder="3201234567890001"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- DOB -->
    <UFormField label="Tanggal Lahir" name="dob" required>
      <UInput v-model="state.dob" type="date" class="w-full" />
    </UFormField>

    <!-- Kontak -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <UFormField label="No. HP" name="phone">
        <UInput
          v-model="state.phone"
          placeholder="081234567890"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Email" name="email">
        <UInput
          v-model="state.email"
          placeholder="budi@email.com"
          class="w-full"
        />
      </UFormField>
    </div>
  </BaseFormModal>
</template>
