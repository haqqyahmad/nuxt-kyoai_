<script setup lang="ts">
import { upperFirst } from "scule";
import type { TableColumn } from "@nuxt/ui";

const api = useApi();

type Patient = {
  id: string;
  PatientId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "MALE" | "FEMALE";
  idType: "KTP" | "PASSPORT" | "SIM";
  idNumber: string;
  email?: string;
  dob: string;
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED";
  phone?: string;
  createdAt: string;
};

const { data: patients, refresh } = await useAsyncData(
  "patients",
  () => api.get("/patient").then((res) => res.data.data)
);

const data = computed(() => patients.value?.data ?? patients.value ?? []);

const columns: TableColumn<Patient>[] = [
  {
    accessorKey: "PatientId",
    header: "Patient ID",
    cell: ({ row }) => row.getValue("PatientId"),
  },
  {
    accessorKey: "firstName",
    header: "Nama",
    cell: ({ row }) => {
      const p = row.original;
      return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
    },
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) =>
      row.getValue("gender") === "MALE" ? "Laki-laki" : "Perempuan",
  },
  {
    accessorKey: "idNumber",
    header: "No. Identitas",
    cell: ({ row }) => row.getValue("idNumber"),
  },
  {
    accessorKey: "phone",
    header: "No. HP",
    cell: ({ row }) => row.getValue("phone") ?? "-",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.getValue("email") ?? "-",
  },
  {
    accessorKey: "createdAt",
    header: "Terdaftar",
    cell: ({ row }) => {
      return new Date(row.getValue("createdAt")).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
  {
    id: "actions",
    header: "",
  },
];

const table = useTemplateRef("table");
</script>

<template>
  <UDashboardPanel id="patients" :ui="{ body: 'lg:py-12' }">
    <UDashboardNavbar title="Patients">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #right>
        <PatientsAddModal @created="refresh" />
      </template>
    </UDashboardNavbar>

    <div class="flex flex-col h-[calc(100vh-64px)] divide-y divide-accented w-full">
      <div class="flex items-center gap-2 px-4 py-3.5 overflow-x-auto">
        <UInput
          :model-value="table?.tableApi?.getColumn('idNumber')?.getFilterValue() as string"
          class="max-w-sm min-w-[12ch]"
          placeholder="Cari nama / no. identitas..."
          @update:model-value="table?.tableApi?.getColumn('idNumber')?.setFilterValue($event)"
        />

        <UDropdownMenu
          :items="table?.tableApi?.getAllColumns().filter(column => column.getCanHide()).map(column => ({
            label: upperFirst(column.id),
            type: 'checkbox' as const,
            checked: column.getIsVisible(),
            onUpdateChecked(checked: boolean) {
              table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
            },
            onSelect(e: Event) {
              e.preventDefault()
            }
          }))"
          :content="{ align: 'end' }"
        >
          <UButton
            label="Columns"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-down"
            class="ml-auto"
            aria-label="Columns select dropdown"
          />
        </UDropdownMenu>
      </div>

      <UTable ref="table" :data="data" :columns="columns" sticky class="h-full">
        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-eye"
            color="neutral"
            variant="ghost"
            size="xs"
            label="Detail"
            :to="`/patients/${row.original.id}`"
          />
        </template>
      </UTable>

      <div class="px-4 py-3.5 text-sm text-muted">
        {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
        {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
      </div>
    </div>
  </UDashboardPanel>
</template>