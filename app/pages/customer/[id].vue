<script setup lang="ts">
const route = useRoute();
const api = useApi();
const toast = useToast();

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

type Contact = {
  id: number;
  value: string;
  type: "EMAIL" | "PHONE";
  isPrimary: boolean;
  parentId: number;
  modelType: string;
};

type Customer = {
  customerName: string;
  CustomerType?: string;
  addresses: Address[];
  contacts: Contact[];
};

const { data: rawData, refresh } = await useAsyncData(
  `customer-${route.params.id}`,
  () => api.get(`/customer/${route.params.id}`).then((res) => res.data.data),
);

const customer = computed<Customer | null>(() => {
  const raw = rawData.value;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
});

/* =========================
   EDIT CUSTOMER
========================= */
const isEditing = ref(false);
const editForm = ref<Partial<Customer>>({ customerName: "", CustomerType: "" });

const startEditing = () => {
  if (!customer.value) return;
  editForm.value = {
    customerName: customer.value.customerName,
    CustomerType: customer.value.CustomerType,
  };
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  editForm.value = {};
};

const saveChanges = async () => {
  if (!customer.value) return;
  try {
    await api.put(`/customer/${route.params.id}`, editForm.value);
    await refresh();
    cancelEditing();
    toast.add({ title: "Berhasil", description: "Data customer berhasil diperbarui", color: "success" });
  } catch {
    toast.add({ title: "Gagal", description: "Gagal memperbarui data customer", color: "error" });
  }
};

/* =========================
   HELPERS
========================= */
function getInitials(name: string) {
  return name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() ?? "?";
}

function getPrimaryContact(type: "EMAIL" | "PHONE") {
  const list = customer.value?.contacts?.filter(c => c.type === type) ?? [];

  return list.find(c => c.isPrimary)?.value 
      ?? list[0]?.value 
      ?? "-";
}

const customerTypeColor: Record<string, "info" | "success" | "neutral"> = {
  PT: "info",
  CV: "success",
  PERSONAL: "neutral",
};

/* =========================
   CONTACT
========================= */
const isContactModalOpen = ref(false);
const editingContact = ref<Partial<Contact> | null>(null);
const isContactLoading = ref(false);

const contactTypeOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Telepon" },
];

const defaultContactForm = (): Partial<Contact> => ({
  type: "EMAIL",
  value: "",
  isPrimary: 0,
});

const openAddContact = () => {
  editingContact.value = defaultContactForm();
  isContactModalOpen.value = true;
};

const openEditContact = (contact: Contact) => {
  editingContact.value = { ...contact };
  isContactModalOpen.value = true;
};

const closeContactModal = () => {
  isContactModalOpen.value = false;
  editingContact.value = null;
};

const saveContact = async () => {
  if (!editingContact.value) return;
  isContactLoading.value = true;
  const isUpdate = !!editingContact.value.id;

  try {
    if (isUpdate) {
      await api.put(
        `/customer/${route.params.id}/contact/${editingContact.value.id}`,
        editingContact.value =
          {
            ...editingContact.value,
            parentId: Number(route.params.id),
            modelType: "Customer"
          }

        )
    } else {
      await api.post(
        `/contact`,
        editingContact.value =  {
            ...editingContact.value,
            parentId: Number(route.params.id),
            modelType: "Customer",
            isPrimary: false
          },
      );
    }
    await refresh();
    closeContactModal();
    toast.add({
      title: "Berhasil",
      description: isUpdate ? "Kontak berhasil diperbarui" : "Kontak berhasil ditambahkan",
      color: "success",
    });
  } catch {
    toast.add({ title: "Gagal", description: "Gagal menyimpan kontak", color: "error" });
  } finally {
    isContactLoading.value = false;
  }
};

const deleteContact = async (id: number) => {
  try {
    await api.delete(`/customer/${route.params.id}/contact/${id}`);
    await refresh();
    toast.add({ title: "Berhasil", description: "Kontak berhasil dihapus", color: "success" });
  } catch {
    toast.add({ title: "Gagal", description: "Gagal menghapus kontak", color: "error" });
  }
};

const setPrimaryContact = async (contact: Contact) => {
  const parentId = Number(contact.parentId);
  try {
    console.log('data contact',parentId);
    await api.put(`/contact/isDefault/${parentId}`, {
      ...contact,
      modelType: "Customer",
      isPrimary: true,
    });
    await refresh();
    toast.add({ title: "Berhasil", description: "Kontak utama diperbarui", color: "success" });
  } catch {
    toast.add({ title: "Gagal", description: "Gagal mengatur kontak utama", color: "error" });
  }
};

/* =========================
   ADDRESS
========================= */
const isAddressModalOpen = ref(false);
const editingAddress = ref<Partial<Address> | null>(null);
const isAddressLoading = ref(false);

const addressTypeOptions = [
  { value: "HOME", label: "Rumah" },
  { value: "OFFICE", label: "Office" },
  { value: "OTHER", label: "Lainnya" },
  { value: "CUSTOMER", label: "Customer" },
];

const addressTypeLabel: Record<string, string> = {
  HOME: "Rumah",
  OFFICE: "Office",
  OTHER: "Lainnya",
  CUSTOMER: "Customer",
};

const addressTypeIcon: Record<string, string> = {
  HOME: "i-lucide-home",
  OFFICE: "i-lucide-building-2",
  OTHER: "i-lucide-map-pin",
  CUSTOMER: "i-lucide-user",
};

const defaultAddressForm = (): Partial<Address> => ({
  type: "OFFICE",
  detail: "",
  country: "Indonesia",
  province: "",
  city: "",
  district: "",
  note: "",
});

const openAddAddress = () => {
  editingAddress.value = defaultAddressForm();
  isAddressModalOpen.value = true;
};

const openEditAddress = (addr: Address) => {
  editingAddress.value = { ...addr };
  isAddressModalOpen.value = true;
};

const closeAddressModal = () => {
  isAddressModalOpen.value = false;
  editingAddress.value = null;
};

const saveAddress = async () => {
  if (!editingAddress.value) return;
  isAddressLoading.value = true;
  const isUpdate = !!editingAddress.value.id;

  try {
    if (isUpdate) {
      await api.post(
        `/customer/${route.params.id}/address?addressId=${editingAddress.value.id}`,
        editingAddress.value,
      );
    } else {
      await api.post(`/customer/${route.params.id}/address`, editingAddress.value);
    }
    await refresh();
    closeAddressModal();
    toast.add({
      title: "Berhasil",
      description: isUpdate ? "Alamat berhasil diperbarui" : "Alamat berhasil ditambahkan",
      color: "success",
    });
  } catch {
    toast.add({ title: "Gagal", description: "Gagal menyimpan alamat", color: "error" });
  } finally {
    isAddressLoading.value = false;
  }
};

const deleteAddress = async (id: string) => {
  try {
    await api.delete(`/customer/${route.params.id}/address/${id}`);
    await refresh();
    toast.add({ title: "Berhasil", description: "Alamat berhasil dihapus", color: "success" });
  } catch {
    toast.add({ title: "Gagal", description: "Gagal menghapus alamat", color: "error" });
  }
};
</script>

<template>
  <UDashboardPanel
    :id="`customer-${route.params.id}`"
    class="h-screen flex flex-col overflow-y-auto"
  >
    <!-- NAVBAR -->
    <UDashboardNavbar
      :title="customer?.customerName ?? 'Detail Customer'"
      class="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-accented"
    >
      <template #leading>
        <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" to="/customer" />
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
          <UButton color="error" variant="outline" icon="i-lucide-clipboard-x" @click="cancelEditing">
            Batal
          </UButton>
          <UButton color="primary" icon="i-lucide-save" @click="saveChanges">
            Simpan
          </UButton>
        </div>
      </template>
    </UDashboardNavbar>

    <!-- LOADING -->
    <div v-if="!customer" class="flex justify-center items-center h-64">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
    </div>

    <div v-else class="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

      <!-- ===== HEADER CARD ===== -->
      <div class="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl border border-accented bg-elevated">
        <div class="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-200 font-medium text-2xl flex-shrink-0 mx-auto sm:mx-0">
          {{ getInitials(customer.customerName) }}
        </div>

        <div class="flex-1 min-w-0 w-full">
          <!-- View mode -->
          <div v-if="!isEditing">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-xl font-semibold break-words">{{ customer.customerName }}</h2>
              <UBadge
                v-if="customer.CustomerType"
                :label="customer.CustomerType"
                :color="customerTypeColor[customer.CustomerType] ?? 'neutral'"
                variant="subtle"
              />
            </div>
            <p class="text-xs text-muted mt-1">ID: {{ route.params.id }}</p>
          </div>

          <!-- Edit mode -->
          <div v-else class="space-y-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-muted block mb-1">Nama Customer</label>
                <UInput v-model="editForm.customerName" size="sm" class="w-full" />
              </div>
              <div>
                <label class="text-xs text-muted block mb-1">Tipe</label>
                <USelect
                  v-model="editForm.CustomerType"
                  :items="[
                    { label: 'PT', value: 'PT' },
                    { label: 'CV', value: 'CV' },
                    { label: 'PERSONAL', value: 'PERSONAL' },
                  ]"
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- Kontak singkat -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 pt-4 border-t border-accented">
            <div class="flex items-center gap-2 text-sm min-w-0">
              <UIcon name="i-lucide-mail" class="text-muted flex-shrink-0" style="width:15px;height:15px;" />
              <span class="text-muted flex-shrink-0">Email:</span>
              <span class="truncate">{{ getPrimaryContact('EMAIL') }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm min-w-0">
              <UIcon name="i-lucide-phone" class="text-muted flex-shrink-0" style="width:15px;height:15px;" />
              <span class="text-muted flex-shrink-0">Telepon:</span>
              <span class="truncate">{{ getPrimaryContact('PHONE') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== KONTAK ===== -->
      <UCollapsible :default-open="true" class="rounded-xl border border-accented overflow-hidden">
        <template #default="{ open }">
          <div class="px-4 py-3 bg-elevated border-b border-accented flex items-center justify-between cursor-pointer">
            <h3 class="text-sm font-medium flex items-center gap-2">
              <UIcon name="i-lucide-contact" style="width:15px;height:15px;" />
              Kontak
            </h3>
            <div class="flex items-center gap-2">
              <UBadge
                :label="`${customer.contacts?.length ?? 0} kontak`"
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
                @click.stop="openAddContact"
              />
              <UIcon
                name="i-lucide-chevron-down"
                class="transition-transform"
                :class="{ 'rotate-180': open }"
                style="width:15px;height:15px;"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div v-if="!customer.contacts?.length" class="p-6 text-sm text-muted text-center">
            Belum ada kontak.
          </div>

          <div v-else class="divide-y divide-accented">
            <div
              v-for="contact in customer.contacts"
              :key="contact.id"
              class="flex items-center gap-3 px-4 py-3 group"
            >
              <!-- Icon -->
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                :class="contact.type === 'EMAIL'
                  ? 'bg-amber-100 dark:bg-amber-900'
                  : 'bg-teal-100 dark:bg-teal-900'"
              >
                <UIcon
                  :name="contact.type === 'EMAIL' ? 'i-lucide-mail' : 'i-lucide-phone'"
                  :class="contact.type === 'EMAIL'
                    ? 'text-amber-700 dark:text-amber-200'
                    : 'text-teal-700 dark:text-teal-200'"
                  style="width:13px;height:13px;"
                />
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-xs text-muted mb-0.5">
                  {{ contact.type === 'EMAIL' ? 'Email' : 'Telepon' }}
                </p>
                <p class="text-sm truncate">{{ contact.value }}</p>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <UBadge v-if="contact.isPrimary" label="Utama" color="success" variant="subtle" size="xs" />

                <!-- Aksi hover -->
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UTooltip v-if="!contact.isPrimary" text="Jadikan utama">
                    <UButton
                      icon="i-lucide-star"
                      size="xs"
                      color="warning"
                      variant="ghost"
                      @click="setPrimaryContact(contact)"
                    />
                  </UTooltip>
                  <UButton
                    icon="i-lucide-pencil"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="openEditContact(contact)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    size="xs"
                    color="error"
                    variant="ghost"
                    @click="deleteContact(contact.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </UCollapsible>

      <!-- ===== ALAMAT ===== -->
      <UCollapsible :default-open="true" class="rounded-xl border border-accented overflow-hidden">
        <template #default="{ open }">
          <div class="px-4 py-3 bg-elevated border-b border-accented flex items-center justify-between cursor-pointer">
            <h3 class="text-sm font-medium flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" style="width:15px;height:15px;" />
              Alamat
            </h3>
            <div class="flex items-center gap-2">
              <UBadge
                :label="`${customer.addresses?.length ?? 0} alamat`"
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
                style="width:15px;height:15px;"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div v-if="!customer.addresses?.length" class="p-6 text-sm text-muted text-center">
            Belum ada alamat.
          </div>

          <div v-else class="divide-y divide-accented">
            <div
              v-for="addr in customer.addresses"
              :key="addr.id"
              class="p-4 flex items-start gap-3 group"
            >
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                :class="{
                  'bg-blue-100 dark:bg-blue-900': addr.type === 'OFFICE',
                  'bg-green-100 dark:bg-green-900': addr.type === 'HOME',
                  'bg-purple-100 dark:bg-purple-900': addr.type === 'OTHER',
                  'bg-slate-100 dark:bg-slate-800': addr.type === 'CUSTOMER',
                }"
              >
                <UIcon
                  :name="addressTypeIcon[addr.type] ?? 'i-lucide-map-pin'"
                  style="width:15px;height:15px;"
                  :class="{
                    'text-blue-700 dark:text-blue-200': addr.type === 'OFFICE',
                    'text-green-700 dark:text-green-200': addr.type === 'HOME',
                    'text-purple-700 dark:text-purple-200': addr.type === 'OTHER',
                    'text-slate-600 dark:text-slate-300': addr.type === 'CUSTOMER',
                  }"
                />
              </div>

              <div class="flex-1 space-y-1 min-w-0">
                <UBadge :label="addressTypeLabel[addr.type] ?? addr.type" color="neutral" variant="outline" size="xs" />
                <p class="text-sm">{{ addr.detail }}</p>
                <p class="text-xs text-muted">
                  {{ [addr.district, addr.city, addr.province, addr.country].filter(Boolean).join(', ') }}
                </p>
                <p v-if="addr.note" class="text-xs text-muted italic">{{ addr.note }}</p>
              </div>

              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="openEditAddress(addr)" />
                <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="deleteAddress(addr.id)" />
              </div>
            </div>
          </div>
        </template>
      </UCollapsible>

    </div>
  </UDashboardPanel>

  <!-- MODAL KONTAK -->
  <UModal
    v-model:open="isContactModalOpen"
    :title="editingContact?.id ? 'Edit Kontak' : 'Tambah Kontak'"
  >
    <template #body>
      <div v-if="editingContact" class="space-y-4">
        <UFormField label="Tipe Kontak">
          <USelect v-model="editingContact.type" :items="contactTypeOptions" class="w-full" />
        </UFormField>

        <UFormField label="Nilai">
          <UInput
            v-model="editingContact.value"
            :placeholder="editingContact.type === 'EMAIL' ? 'contoh@email.com' : '08xxxxxxxxxx'"
            :type="editingContact.type === 'EMAIL' ? 'email' : 'tel'"
            class="w-full"
          />
        </UFormField>
          <UInput
            :name="'parentId'"
            :model-value="`${route.params.id}`"
            :type="'hidden'"
            class="w-full"
          />
        <UFormField label="Kontak Utama">
          <UToggle
            :model-value="!!editingContact.isPrimary"
            @update:model-value="(val) => editingContact && (editingContact.isPrimary = val ? 1 : 0)"
          />
          <span class="ml-2 text-sm text-muted">
            {{ editingContact.isPrimary ? 'Ya, jadikan kontak utama' : 'Bukan kontak utama' }}
          </span>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="closeContactModal">Batal</UButton>
        <UButton color="primary" :loading="isContactLoading" @click="saveContact">
          {{ editingContact?.id ? 'Simpan Perubahan' : 'Tambah Kontak' }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- MODAL ALAMAT -->
  <UModal
    v-model:open="isAddressModalOpen"
    :title="editingAddress?.id ? 'Edit Alamat' : 'Tambah Alamat'"
  >
    <template #body>
      <div v-if="editingAddress" class="space-y-4">
        <UFormField label="Tipe Alamat">
          <USelect v-model="editingAddress.type" :items="addressTypeOptions" class="w-full" />
        </UFormField>

        <UFormField label="Alamat Lengkap">
          <UTextarea
            v-model="editingAddress.detail"
            placeholder="Jl. Contoh No. 123, RT 01/RW 02"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Kecamatan / Kelurahan">
            <UInput v-model="editingAddress.district" placeholder="Kecamatan" class="w-full" />
          </UFormField>
          <UFormField label="Kota / Kabupaten">
            <UInput v-model="editingAddress.city" placeholder="Kota" class="w-full" />
          </UFormField>
          <UFormField label="Provinsi">
            <UInput v-model="editingAddress.province" placeholder="Provinsi" class="w-full" />
          </UFormField>
          <UFormField label="Negara">
            <UInput v-model="editingAddress.country" placeholder="Negara" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Catatan">
          <UInput v-model="editingAddress.note" placeholder="Catatan tambahan" class="w-full" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="closeAddressModal">Batal</UButton>
        <UButton color="primary" :loading="isAddressLoading" @click="saveAddress">
          {{ editingAddress?.id ? 'Simpan Perubahan' : 'Tambah Alamat' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>