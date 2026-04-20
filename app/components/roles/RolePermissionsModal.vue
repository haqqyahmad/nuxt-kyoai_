<script setup lang="ts">
type Permission = {
  id: number;
  name: string;
  description?: string;
};

type RolePermission = {
  roleId: number;
  permissionId: number;
  permission: Permission;
};

type Role = {
  id: number;
  name: string;
  permissions: RolePermission[];
};

const props = defineProps<{
  role: Role;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
}>();

const api = useApi();
const toast = useToast();

const open = ref(false);
const loading = ref(false);
const loadingData = ref(false);

const allPermissions = ref<Permission[]>([]);
const selectedPermissionIds = ref<number[]>([]);
const search = ref("");

const filteredPermissions = computed(() => {
  if (!search.value) return allPermissions.value;
  return allPermissions.value.filter((p) =>
    p.name.toLowerCase().includes(search.value.toLowerCase()),
  );
});

async function fetchPermissions() {
  loadingData.value = true;
  try {
    const res = await api.get("/settings/permissions");
    allPermissions.value = res.data.data ?? res.data ?? [];
  } catch {
    toast.add({ title: "Gagal memuat permissions", color: "error" });
  } finally {
    loadingData.value = false;
  }
}

function onOpen() {
  open.value = true;
  search.value = "";
  // set permission yang sudah dimiliki role
  selectedPermissionIds.value = props.role.permissions.map(
    (rp) => rp.permissionId,
  );
  fetchPermissions();
}

function togglePermission(permissionId: number) {
  if (selectedPermissionIds.value.includes(permissionId)) {
    selectedPermissionIds.value = selectedPermissionIds.value.filter(
      (id) => id !== permissionId,
    );
  } else {
    selectedPermissionIds.value = [
      ...selectedPermissionIds.value,
      permissionId,
    ];
  }
}

function selectAll() {
  selectedPermissionIds.value = allPermissions.value.map((p) => p.id);
}

function clearAll() {
  selectedPermissionIds.value = [];
}

async function savePermissions() {
  loading.value = true;
  try {
    await api.post(`/settings/roles/${props.role.id}/permissions`, {
      permissionIds: selectedPermissionIds.value,
    });
    toast.add({ title: "Permissions berhasil disimpan", color: "success" });
    open.value = false;
    emit("updated");
  } catch (err: any) {
    toast.add({
      title: "Gagal menyimpan permissions",
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
    :title="`Edit Permissions — ${role.name}`"
    description="Centang permission yang ingin diberikan ke role ini"
    
  >
    <!-- Trigger -->
    <UButton
      icon="i-lucide-shield-check"
      label="Edit Permissions"
      color="neutral"
      variant="outline"
      size="xs"
      @click="onOpen"
    />

    <template #body>
      <!-- Loading -->
      <div v-if="loadingData" class="flex justify-center py-8">
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin text-2xl text-muted"
        />
      </div>

      <div v-else class="space-y-3">
        <!-- Search & select all -->
        <div class="flex items-center gap-2">
          <UInput
            v-model="search"
            placeholder="Cari permission..."
            icon="i-lucide-search"
            class="flex-1"
            size="sm"
          />
          <UButton
            label="Semua"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="selectAll"
          />
          <UButton
            label="Hapus"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="clearAll"
          />
        </div>

        <!-- Counter -->
        <p class="text-xs text-muted">
          {{ selectedPermissionIds.length }} dari
          {{ allPermissions.length }} permission dipilih
        </p>

        <!-- Permission list -->
        <div class="max-h-80 overflow-y-auto space-y-1.5 pr-1">
          <div
            v-if="filteredPermissions.length === 0"
            class="text-sm text-muted py-4 text-center"
          >
            Tidak ada permission ditemukan.
          </div>

          <div
            v-for="permission in filteredPermissions"
            :key="permission.id"
            class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors"
            :class="
              selectedPermissionIds.includes(permission.id)
                ? 'border-primary bg-primary/5'
                : 'border-accented hover:border-primary/50 hover:bg-elevated'
            "
            @click="togglePermission(permission.id)"
          >
            <!-- Checkbox -->
            <div
              class="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors"
              :class="
                selectedPermissionIds.includes(permission.id)
                  ? 'border-primary bg-primary'
                  : 'border-muted'
              "
            >
              <UIcon
                v-if="selectedPermissionIds.includes(permission.id)"
                name="i-lucide-check"
                class="text-white w-3 h-3"
              />
            </div>

            <!-- Permission info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">{{ permission.name }}</p>
              <p v-if="permission.description" class="text-xs text-muted">
                {{ permission.description }}
              </p>
            </div>
          </div>
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
            :loading="loading"
            @click="savePermissions"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
