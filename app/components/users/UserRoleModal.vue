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

type User = {
  id: number;
  name: string;
  email: string;
};

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
}>();

const api = useApi();
const toast = useToast();

const open = ref(false);
const loading = ref(false);
const loadingData = ref(false);

const roles = ref<Role[]>([]);
const selectedRoleIds = ref<number[]>([]);
const viewingRole = ref<Role | null>(null);
const showPermissions = ref(false);

function formatPermission(name: string) {
  return name
    .replace(":", " ")
    .replace("-", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchRoles() {
  loadingData.value = true;
  try {
    const res = await api.get("/settings/roles");
    roles.value = res.data.data ?? res.data ?? [];
  } catch {
    toast.add({ title: "Gagal memuat roles", color: "error" });
  } finally {
    loadingData.value = false;
  }
}

async function fetchUserRoles() {
  try {
    const res = await api.get(`/users/${props.user.id}/role`);
    const data = res.data.data;
    if (Array.isArray(data)) {
      selectedRoleIds.value = data.map((ur: any) => ur.roleId);
    } else if (data?.roleId) {
      selectedRoleIds.value = [data.roleId];
    }
  } catch {
    // user belum punya role
  }
}

async function onOpen() {
  open.value = true;
  showPermissions.value = false;
  viewingRole.value = null;
  selectedRoleIds.value = [];
  await fetchRoles();
  await fetchUserRoles();
}

function toggleRole(roleId: number) {
  if (selectedRoleIds.value.includes(roleId)) {
    selectedRoleIds.value = selectedRoleIds.value.filter((id) => id !== roleId);
  } else {
    selectedRoleIds.value = [...selectedRoleIds.value, roleId];
  }
}

async function assignRole() {
  if (selectedRoleIds.value.length === 0) return;

  loading.value = true;
  try {
    await api.post(`/users/${props.user.id}/role`, {
      roleIds: selectedRoleIds.value,
    });
    toast.add({ title: "Role berhasil diassign", color: "success" });
    open.value = false;
    emit("updated");
  } catch (err: any) {
    toast.add({
      title: "Gagal assign role",
      description: err?.response?.data?.message ?? "Terjadi kesalahan",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function viewPermissions(role: Role) {
  viewingRole.value = role;
  showPermissions.value = true;
}

function backToRoles() {
  showPermissions.value = false;
  viewingRole.value = null;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="
      showPermissions
        ? `Permissions — ${viewingRole?.name}`
        : `Assign Role — ${user.name}`
    "
    :description="
      showPermissions
        ? 'Daftar permission yang dimiliki role ini'
        : 'Pilih satu atau lebih role untuk user ini'
    "
  >
    <!-- Trigger -->
    <UButton
      label="Assign Role"
      icon="i-lucide-shield"
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

      <!-- View Permissions -->
      <div v-else-if="showPermissions && viewingRole">
        <div class="mb-4">
          <UButton
            icon="i-lucide-arrow-left"
            label="Kembali"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="backToRoles"
          />
        </div>

        <div
          v-if="viewingRole.permissions.length === 0"
          class="text-sm text-muted py-4 text-center"
        >
          Role ini tidak memiliki permission.
        </div>

        <div v-else class="grid grid-cols-1 gap-2">
          <div
            v-for="item in viewingRole.permissions"
            :key="item.permissionId"
            class="flex items-start gap-3 p-3 rounded-lg border border-accented bg-elevated"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="text-success mt-0.5 shrink-0"
            />
            <div>
              <p class="text-sm font-medium">
                {{ formatPermission(item.permission.name) }}
              </p>
              <p
                v-if="item.permission.description"
                class="text-xs text-muted mt-0.5"
              >
                {{ formatPermission(item.permission.description) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Select Roles -->
      <div v-else class="space-y-3">
        <div
          v-if="roles.length === 0"
          class="text-sm text-muted py-4 text-center"
        >
          Tidak ada role tersedia.
        </div>

        <div
          v-for="role in roles"
          :key="role.id"
          class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
          :class="
            selectedRoleIds.includes(role.id)
              ? 'border-primary bg-primary/5'
              : 'border-accented hover:border-primary/50 hover:bg-elevated'
          "
          @click="toggleRole(role.id)"
        >
          <!-- Checkbox -->
          <div
            class="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors"
            :class="
              selectedRoleIds.includes(role.id)
                ? 'border-primary bg-primary'
                : 'border-muted'
            "
          >
            <UIcon
              v-if="selectedRoleIds.includes(role.id)"
              name="i-lucide-check"
              class="text-white w-3 h-3"
            />
          </div>

          <!-- Role info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{
                formatPermission(role.name)
              }}</span>
              <UBadge
                :label="`${role.permissions.length} permission`"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>

          <!-- View permissions -->
          <UButton
            icon="i-lucide-eye"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Lihat permissions"
            @click.stop="viewPermissions(role)"
          />
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
            label="Assign Role"
            color="primary"
            :disabled="selectedRoleIds.length === 0"
            :loading="loading"
            @click="assignRole"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
