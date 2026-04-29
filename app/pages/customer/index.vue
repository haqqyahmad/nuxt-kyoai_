<script setup lang="ts">
import { h, resolveComponent } from "vue";
import { upperFirst } from "scule";
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import type { Row } from "@tanstack/table-core";
import Customeraddmodal from "~/components/customer/Customeraddmodal.vue";

const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const api = useApi();
const toast = useToast();

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const { data: customers, refresh } = await useAsyncData("customers", () =>
  api.get("/customer").then((res) => res.data.data),
);

const data = computed(() => customers.value?.data ?? customers.value ?? []);

/* ─────────────────────────────────────────
   TABLE STATE
───────────────────────────────────────── */
const table = ref();
const searchQuery = ref("");
const currentPageSize = ref(10);
const columnFilters = ref([{ id: "customerName", value: "" }]);
const columnVisibility = ref();
const rowSelection = ref({});

// Sync search input → column filter
watch(searchQuery, (val) => {
  columnFilters.value = [{ id: "customerName", value: val }];
});

// Sync page size → table
watch(currentPageSize, (val) => {
  table.value?.tableApi?.setPageSize(val);
});

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
type Customer = {
  id: number;
  codeCostumer: string;
  customerName: string;
  CustomerType: string;
  is_active: string;
  contacts?: any[];
  addresses?: any[];
};

function getPrimaryContact(row: Customer, type: "EMAIL" | "PHONE") {
  return (
    row.contacts?.find((c: any) => c.type === type && c.isPrimary)?.value ?? "-"
  );
}

function getPrimaryAddress(row: Customer) {
  const addr = row.addresses?.[0];
  if (!addr) return "-";
  return [addr.detail, addr.city, addr.province].filter(Boolean).join(", ");
}

/* ─────────────────────────────────────────
   DELETE
───────────────────────────────────────── */
const isDeleteModalOpen = ref(false);
const selectedDeleteId = ref<number | null>(null);

async function deleteCustomer(id: number) {
  try {
    await api.delete(`/customer/${id}`);
    toast.add({ title: "Berhasil", description: "Customer berhasil dihapus", color: "success" });
    await refresh();
  } catch {
    toast.add({ title: "Gagal", description: "Gagal menghapus customer", color: "error" });
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return;
  await deleteCustomer(selectedDeleteId.value);
  selectedDeleteId.value = null;
}

async function deleteSelectedCustomers() {
  const selectedRows = table.value?.tableApi?.getFilteredSelectedRowModel().rows ?? [];
  if (!selectedRows.length) return;

  try {
    await Promise.all(
      selectedRows.map((row: any) => api.delete(`/customer/${row.original.id}`)),
    );
    toast.add({ title: "Berhasil", description: "Customer terpilih berhasil dihapus", color: "success" });
    table.value?.tableApi?.resetRowSelection();
    await refresh();
  } catch {
    toast.add({ title: "Gagal", description: "Gagal menghapus customer", color: "error" });
  }
}

/* ─────────────────────────────────────────
   COLUMNS
───────────────────────────────────────── */
const customerTypeColor: Record<string, string> = {
  PT: "text-blue-600 dark:text-blue-400",
  CV: "text-green-600 dark:text-green-400",
  Personal: "text-purple-600 dark:text-purple-400",
};

const columns: TableColumn<Customer>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(!!value),
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          row.toggleSelected(!!value),
      }),
  },

  {
    accessorKey: "codeCostumer",
    header: "Kode",
    cell: ({ row }) =>
      h("span", { class: "font-mono text-xs text-muted" }, row.original.codeCostumer),
  },

  {
    accessorKey: "customerName",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        label: "Nama Customer",
        variant: "ghost",
        icon: isSorted
          ? isSorted === "asc" ? "i-lucide-arrow-up" : "i-lucide-arrow-down"
          : "i-lucide-arrow-up-down",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      const c = row.original;
      return h("div", [
        h("p", { class: "font-medium" }, c.customerName),
        h(
          "p",
          { class: `text-xs ${customerTypeColor[c.CustomerType] ?? "text-muted"}` },
          c.CustomerType,
        ),
      ]);
    },
  },

  {
    id: "email",
    header: "Email",
    cell: ({ row }) => getPrimaryContact(row.original, "EMAIL"),
  },

  {
    id: "phone",
    header: "Telepon",
    cell: ({ row }) => getPrimaryContact(row.original, "PHONE"),
  },

  {
    id: "address",
    header: "Alamat",
    cell: ({ row }) => h("span", { class: "text-sm truncate max-w-[200px] block" }, getPrimaryAddress(row.original)),
  },

  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) =>
      h("span", {
        class: row.original.is_active === "active"
          ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      }, row.original.is_active === "active" ? "Aktif" : "Nonaktif"),
  },

  {
    id: "actions",
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        {
          items: [
            {
              label: "Lihat Detail",
              icon: "i-lucide-eye",
              to: `/customer/${row.original.id}`,
            },
            {
              type: "separator",
            },
            {
              label: "Hapus",
              icon: "i-lucide-trash-2",
              color: "error",
              onSelect() {
                selectedDeleteId.value = row.original.id;
                isDeleteModalOpen.value = true;
              },
            },
          ],
        },
        () => h(UButton, { icon: "i-lucide-ellipsis-vertical", variant: "ghost", color: "neutral" }),
      ),
  },
];
</script>

<template>
  <UDashboardPanel id="customers">
    <template #header>
      <UDashboardNavbar title="Customer">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <Customeraddmodal @created="refresh" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Cari nama customer..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <!-- Bulk delete -->
          <BaseDeleteModal
            v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="customer"
            @confirm="deleteSelectedCustomers"
          >
            <UButton label="Hapus" color="error" variant="subtle" icon="i-lucide-trash">
              <template #trailing>
                <UKbd>{{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}</UKbd>
              </template>
            </UButton>
          </BaseDeleteModal>

          <!-- Column visibility -->
          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked);
                  },
                  onSelect(e?: Event) { e?.preventDefault(); },
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton label="Tampilan" color="neutral" variant="outline" trailing-icon="i-lucide-settings-2" />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Table -->
      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        sticky
        class="w-full"
        :data="data"
        :columns="columns"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0',
        }"
      />

      <!-- Pagination -->
      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }}
          dari
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} baris dipilih.
        </div>

        <div class="flex items-center gap-1.5">
          <USelect
            v-model="currentPageSize"
            :items="[
              { label: '10 item', value: 10 },
              { label: '20 item', value: 20 },
              { label: '50 item', value: 50 },
              { label: 'Semua', value: 1000 },
            ]"
            class="w-32"
          />
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>

      <!-- Delete single modal -->
      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="customer"
        @confirm="handleDeleteById"
      />
    </template>
  </UDashboardPanel>
</template>