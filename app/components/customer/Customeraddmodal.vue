<script setup lang="ts">
const emit = defineEmits<{
  created: [];
}>();

const api = useApi();
const toast = useToast();

const isOpen = ref(false);
const isLoading = ref(false);

type CustomerForm = {
  customerName: string;
  CustomerType: string;
  // Contact
  contactType: "EMAIL" | "PHONE";
  contactValue: string;
  // Address
  addressType: string;
  addressDetail: string;
  addressCountry: string;
  addressProvince: string;
  addressCity: string;
  addressDistrict: string;
  addressNote: string;
};

const defaultForm = (): CustomerForm => ({
  customerName: "",
  CustomerType: "PT",
  contactType: "EMAIL",
  contactValue: "",
  addressType: "OFFICE",
  addressDetail: "",
  addressCountry: "Indonesia",
  addressProvince: "",
  addressCity: "",
  addressDistrict: "",
  addressNote: "",
});

const form = ref<CustomerForm>(defaultForm());

const customerTypeOptions = [
  { label: "PT", value: "PT" },
  { label: "CV", value: "CV" },
  { label: "PERSONAL", value: "PERSONAL" },
];

const contactTypeOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Telepon" },
];

const addressTypeOptions = [
  { value: "HOME", label: "Rumah" },
  { value: "OFFICE", label: "Office" },
  { value: "OTHER", label: "Lainnya" },
  { value: "CUSTOMER", label: "Customer" },
];

const open = () => {
  form.value = defaultForm();
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const submit = async () => {
  if (!form.value.customerName.trim()) {
    toast.add({ title: "Validasi", description: "Nama customer wajib diisi", color: "error" });
    return;
  }

  isLoading.value = true;
  try {
    // 1. Create customer
    const customerRes = await api.post("/customer", {
      customerName: form.value.customerName,
      CustomerType: form.value.CustomerType,
    });

    const customerId =
      customerRes.data?.data?.id ??
      customerRes.data?.id;

    // 2. Optionally add contact
    if (form.value.contactValue.trim() && customerId) {
      await api.post("/contact", {
        parentId: Number(customerId),
        modelType: "Customer",
        type: form.value.contactType,
        value: form.value.contactValue.trim(),
        isPrimary: true,
      });
    }

    // 3. Optionally add address
    if (form.value.addressDetail.trim() && customerId) {
      await api.post(`/customer/${customerId}/address`, {
        type: form.value.addressType,
        detail: form.value.addressDetail.trim(),
        country: form.value.addressCountry,
        province: form.value.addressProvince,
        city: form.value.addressCity,
        district: form.value.addressDistrict,
        note: form.value.addressNote,
      });
    }

    toast.add({
      title: "Berhasil",
      description: "Customer berhasil ditambahkan",
      color: "success",
    });

    emit("created");
    close();
  } catch {
    toast.add({
      title: "Gagal",
      description: "Gagal menambahkan customer",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <!-- Trigger Button -->
  <UButton
    label="Tambah Customer"
    icon="i-lucide-plus"
    color="primary"
    @click="open"
  />

  <!-- Modal -->
  <UModal
    v-model:open="isOpen"
    title="Tambah Customer"
    description="Isi informasi customer baru. Kontak dan alamat bersifat opsional."
    :ui="{ container: 'max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-6">

        <!-- ── Informasi Utama ── -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Informasi Utama
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Nama Customer" required class="sm:col-span-2">
              <UInput
                v-model="form.customerName"
                placeholder="PT Maju Bersama"
                autofocus
                class="w-full"
              />
            </UFormField>

            <UFormField label="Tipe Customer">
              <USelect
                v-model="form.CustomerType"
                :items="customerTypeOptions"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- ── Kontak ── -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UIcon name="i-lucide-contact" class="w-3.5 h-3.5" />
            Kontak
            <UBadge label="Opsional" color="neutral" variant="subtle" size="xs" />
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Tipe">
              <USelect
                v-model="form.contactType"
                :items="contactTypeOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Nilai" class="sm:col-span-2">
              <UInput
                v-model="form.contactValue"
                :placeholder="form.contactType === 'EMAIL' ? 'contoh@email.com' : '08xxxxxxxxxx'"
                :type="form.contactType === 'EMAIL' ? 'email' : 'tel'"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- ── Alamat ── -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5" />
            Alamat
            <UBadge label="Opsional" color="neutral" variant="subtle" size="xs" />
          </p>
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField label="Tipe Alamat">
                <USelect
                  v-model="form.addressType"
                  :items="addressTypeOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Alamat Lengkap" class="sm:col-span-2">
                <UTextarea
                  v-model="form.addressDetail"
                  placeholder="Jl. Contoh No. 123, RT 01/RW 02"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <UFormField label="Kecamatan">
                <UInput v-model="form.addressDistrict" placeholder="Kecamatan" class="w-full" />
              </UFormField>
              <UFormField label="Kota">
                <UInput v-model="form.addressCity" placeholder="Kota" class="w-full" />
              </UFormField>
              <UFormField label="Provinsi">
                <UInput v-model="form.addressProvince" placeholder="Provinsi" class="w-full" />
              </UFormField>
              <UFormField label="Negara">
                <UInput v-model="form.addressCountry" placeholder="Negara" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Catatan">
              <UInput v-model="form.addressNote" placeholder="Catatan tambahan" class="w-full" />
            </UFormField>
          </div>
        </div>

      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="isLoading" @click="close">
          Batal
        </UButton>
        <UButton color="primary" icon="i-lucide-user-plus" :loading="isLoading" @click="submit">
          Tambah Customer
        </UButton>
      </div>
    </template>
  </UModal>
</template>