<!-- app/components/hris/employees/EditModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})

const form = reactive({
  name: 'Andi Saputra',
  email: 'andi.saputra@perusahaan.com',
  department: 'Teknologi',
  position: 'Senior Engineer',
  status: 'Aktif',
  joinedAt: '2021-01-12'
})

function submit() {
  console.log(form)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="Edit Data Karyawan">
    <template #body>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Nama Lengkap">
          <UInput v-model="form.name" />
        </UFormField>

        <UFormField label="Alamat Email">
          <UInput v-model="form.email" type="email" />
        </UFormField>

        <UFormField label="Departemen">
          <USelect
            v-model="form.department"
            :items="['Teknologi', 'Pemasaran', 'SDM', 'Keuangan', 'Operasional']"
          />
        </UFormField>

        <UFormField label="Posisi / Jabatan">
          <UInput v-model="form.position" />
        </UFormField>

        <UFormField label="Status Kerja">
          <USelect
            v-model="form.status"
            :items="['Aktif', 'Kontrak', 'Percobaan', 'Cuti']"
          />
        </UFormField>

        <UFormField label="Tanggal Bergabung">
          <UInput v-model="form.joinedAt" type="date" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="open = false">
          Batal
        </UButton>

        <UButton @click="submit">
          Simpan Perubahan
        </UButton>
      </div>
    </template>
  </UModal>
</template>
