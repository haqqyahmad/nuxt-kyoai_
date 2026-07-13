<!-- app/pages/items/sample-types/index.vue -->
<script setup lang="ts">
import { h, resolveComponent, computed, ref } from "vue";
import { upperFirst } from "scule";
import type { TableColumn, DropdownMenuItem } from "@nuxt/ui";
import type { Row } from "@tanstack/table-core";
import { getPaginationRowModel } from "@tanstack/table-core";

const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");

const api = useApi();
const toast = useToast();

type SampleType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: any[];
};

const {
  data: samples,
  refresh,
  pending,
} = await useAsyncData("samples", async () => {
  const res = await api.get("/medical/exams/sample-types");
  return res.data.data;
});

const data = computed<SampleType[]>(() => samples.value ?? []);
const isAddModalOpen = ref(false);
const columnFilters = ref([{ id: "name", value: "" }]);
const columnVisibility = ref({});
const rowSelection = ref({});

const table = useTemplateRef("table");

const selectedDeleteId = ref<string | null>(null);
const isDeleteModalOpen = ref(false);

const selectedSample = ref<SampleType | null>(null);
const isViewModalOpen = ref(false);
const isEditModalOpen = ref(false);

function openViewSample(row: Row<SampleType>) {
  selectedSample.value = row.original;
  isViewModalOpen.value = true;
}

function openEditSample(row: Row<SampleType>) {
  selectedSample.value = row.original;
  isEditModalOpen.value = true;
}

async function deleteSample(id: string) {
  try {
    await api.delete(`/medical/exams/sample-types/${id}`);
    toast.add({
      title: "Berhasil",
      description: "Sample berhasil dihapus",
      color: "success",
    });
    await refresh();
  } catch {
    toast.add({
      title: "Gagal",
      description: "Gagal menghapus sample",
      color: "error",
    });
  }
}

async function handleDeleteById() {
  if (!selectedDeleteId.value) return;

  await deleteSample(selectedDeleteId.value);

  selectedDeleteId.value = null;
  isDeleteModalOpen.value = false;
}

async function deleteSelectedSamples() {
  const selectedRows =
    table.value?.tableApi?.getFilteredSelectedRowModel().rows || [];
  if (!selectedRows.length) return;
  try {
    await Promise.all(
      selectedRows.map((row: Row<SampleType>) =>
        api.delete(`/medical/exams/sample-types/${row.original.id}`),
      ),
    );
    toast.add({
      title: "Berhasil",
      description: "Data sample berhasil dihapus",
      color: "success",
    });
    table.value?.tableApi?.resetRowSelection();
    await refresh();
  } catch {
    toast.add({
      title: "Gagal",
      description: "Gagal menghapus data",
      color: "error",
    });
  }
}

function sortableHeader(label: string, column: any) {
  const isSorted = column.getIsSorted();
  return h(UButton, {
    color: "neutral",
    variant: "ghost",
    label,
    class: "-mx-2.5",
    icon: isSorted
      ? isSorted === "asc"
        ? "i-lucide-arrow-up-narrow-wide"
        : "i-lucide-arrow-down-wide-narrow"
      : "i-lucide-arrow-up-down",
    onClick: () => column.toggleSorting(isSorted === "asc"),
  });
}

function getRowSamples(row: Row<SampleType>): DropdownMenuItem[][] {
  return [
    [
      {
        label: "View detail",
        icon: "i-lucide-eye",
        onSelect() {
          openViewSample(row);
        },
      },
      {
        label: "Edit sample",
        icon: "i-lucide-pencil",
        onSelect() {
          openEditSample(row);
        },
      },
    ],
    [
      {
        label: "Delete item",
        icon: "i-lucide-trash",
        color: "error",
        onSelect() {
          selectedDeleteId.value = row.original.id;
          isDeleteModalOpen.value = true;
        },
      },
    ],
  ];
}

const columns: TableColumn<SampleType>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: "Select all",
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          row.toggleSelected(!!value),
        ariaLabel: "Select row",
      }),
  },
  {
    accessorKey: "code",
    header: ({ column }) => sortableHeader("Code", column),
  },
  {
    accessorKey: "name",
    header: ({ column }) => sortableHeader("Name", column),
    cell: ({ row }) =>
      h("div", { class: "flex flex-col" }, [
        h("span", { class: "font-medium text-highlighted" }, row.original.name),
        h("span", { class: "text-xs text-muted" }, row.original.code),
      ]),
  },
  {
    accessorKey: "description",
    header: ({ column }) => sortableHeader("Description", column),
    cell: ({ row }) => row.original.description || "-",
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => sortableHeader("Status", column),
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.isActive ? "Active" : "Inactive",
        color: row.original.isActive ? "success" : "neutral",
        variant: "subtle",
      }),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => sortableHeader("Created At", column),
    cell: ({ row }) => {
      const value = row.getValue("createdAt");
      if (!value) return "-";
      return new Date(value as string).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
  {
    id: "actions",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right" },
        h(
          UDropdownMenu,
          { items: getRowSamples(row), content: { align: "end" } },
          () =>
            h(UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "ghost",
            }),
        ),
      ),
  },
];

const searchQuery = computed<string>({
  get: () =>
    (table.value?.tableApi?.getColumn("name")?.getFilterValue() as string) ||
    "",
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("name")
      ?.setFilterValue(value || undefined);
  },
});

const currentPageSize = computed<number>({
  get: () => table.value?.tableApi?.getState().pagination.pageSize || 10,
  set: (value: number) => {
    table.value?.tableApi?.setPageSize(value);
  },
});
</script>

<template>
  <UDashboardPanel id="sample">
    <template #header>
      <UDashboardNavbar title="Sample Types">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    
    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search item..."
          class="max-w-sm"
        />

        <div class="flex items-center gap-2">
          <UButton
            label="Add Sample Type"
            icon="i-lucide-flask-round"
            @click="isAddModalOpen = true"
          />

          <BaseDeleteModal
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            entity="item"
            @confirm="deleteSelectedSamples"
          >
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
              color="error"
              variant="soft"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>
                  {{
                    table?.tableApi?.getFilteredSelectedRowModel().rows.length
                  }}
                </UKbd>
              </template>
            </UButton>
          </BaseDeleteModal>

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
                    column.toggleVisibility(checked);
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault();
                  },
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :data="data"
        :columns="columns"
        :loading="pending"
        sticky
        class="w-full"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-3 border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-middle',
        }"
      />

      <div
        class="mt-4 flex items-center justify-between border-t border-default pt-4"
      >
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }}
          of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
          row(s) selected
        </div>

        <div class="flex items-center gap-2">
          <USelect
            v-model="currentPageSize"
            class="w-32"
            :items="[
              { label: '10 items', value: 10 },
              { label: '20 items', value: 20 },
              { label: '50 items', value: 50 },
              { label: 'All', value: 1000 },
            ]"
          />

          <UPagination
            :default-page="
              (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
            "
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>

      <!-- Delete single item modal -->
      <BaseDeleteModal
        v-model:open="isDeleteModalOpen"
        :count="1"
        entity="sample"
        @confirm="handleDeleteById"
      />

      <!-- Add item modal -->
      <ItemSampleAddModal v-model:open="isAddModalOpen" @success="refresh()" />

      <!-- View detail modal -->
      <ItemSampleViewModal
        v-model:open="isViewModalOpen"
        :sample="selectedSample"
      />

      <!-- Edit modal -->
      <ItemSampleEditModal
        v-model:open="isEditModalOpen"
        :sample="selectedSample"
        @success="refresh()"
      />
    </template>
  </UDashboardPanel>
</template>
