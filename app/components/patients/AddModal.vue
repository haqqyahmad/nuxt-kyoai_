<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const schema = z.object({
  branchId: z.number({ required_error: "Branch ID wajib diisi" }),
  firstName: z.string().min(1, "First name wajib diisi"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name wajib diisi"),
  gender: z.enum(["MALE", "FEMALE"], { required_error: "Gender wajib dipilih" }),
  idType: z.enum(["KTP", "PASSPORT", "SIM"], { required_error: "Jenis ID wajib dipilih" }),
  idNumber: z.string().min(1, "Nomor identitas wajib diisi"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  dob: z.string().min(1, "Tanggal lahir wajib diisi"),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED"]).optional(),
  phone: z.string().optional(),
});

type Schema = z.output<typeof schema>;

const emit = defineEmits<{
  (e: "created"): void;
}>();

const api = useApi();
const toast = useToast();

const open = ref(false);
const loading = ref(false);

const state = reactive<Partial<Schema>>({
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

function resetForm() {
  state.branchId = 1;
  state.firstName = "";
  state.middleName = "";
  state.lastName = "";
  state.gender = undefined;
  state.idType = undefined;
  state.idNumber = "";
  state.email = "";
  state.dob = "";
  state.maritalStatus = undefined;
  state.phone = "";
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (loading.value) return;
  loading.value = true;

  try {
    await api.post("/patient", {
      ...event.data,
      email: event.data.email || undefined,
    });

    toast.add({ title: "Pasien berhasil ditambahkan", color: "success" });
    resetForm();
    open.value = false;
    emit("created");
  } catch (err: any) {
    toast.add({
      title: "Gagal menambahkan pasien",
      description: err?.response?.data?.message ?? "Terjadi kesalahan",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Tambah Pasien"
    description="Isi data diri pasien baru"
    :ui="{ width: 'sm:max-w-2xl' }"
  >
    <UButton
      label="Tambah Pasien"
      icon="i-lucide-user-plus"
      color="primary"
    />

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <!-- Branch ID (hidden / auto) -->
        <input type="hidden" :value="state.branchId" />

        <!-- Nama -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UFormField label="First Name" name="firstName" required>
            <UInput v-model="state.firstName" placeholder="Budi" class="w-full" />
          </UFormField>
          <UFormField label="Middle Name" name="middleName">
            <UInput v-model="state.middleName" placeholder="Santoso" class="w-full" />
          </UFormField>
          <UFormField label="Last Name" name="lastName" required>
            <UInput v-model="state.lastName" placeholder="Wijaya" class="w-full" />
          </UFormField>
        </div>

        <!-- Gender & Marital -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="Gender" name="gender" required>
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
          <UFormField label="Jenis ID" name="idType" required>
            <USelect
              v-model="state.idType"
              :items="idTypeOptions"
              placeholder="Pilih jenis"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Nomor Identitas" name="idNumber" required class="sm:col-span-2">
            <UInput v-model="state.idNumber" placeholder="3201234567890001" class="w-full" />
          </UFormField>
        </div>

        <!-- DOB -->
        <UFormField label="Tanggal Lahir" name="dob" required>
          <UInput v-model="state.dob" type="date" class="w-full" />
        </UFormField>

        <!-- Kontak -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="No. HP" name="phone">
            <UInput v-model="state.phone" placeholder="081234567890" class="w-full" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="state.email" placeholder="budi@email.com" class="w-full" />
          </UFormField>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-2 border-t border-accented">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Simpan"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>

      </UForm>
    </template>
  </UModal>
</template>