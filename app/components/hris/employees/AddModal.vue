<!-- app/components/hris/employees/AddModal.vue -->

<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})

const form = reactive({
  name: '',
  email: '',
  department: '',
  position: '',
  status: '',
  joinedAt: ''
})

function submit() {
  console.log(form)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="Tambah Karyawan Baru">
    <template #body>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Nama Lengkap">
          <UInput v-model="form.name" placeholder="Andi Saputra" />
        </UFormField>

        <UFormField label="Alamat Email">
          <UInput v-model="form.email" type="email" placeholder="email@perusahaan.com" />
        </UFormField>

        <UFormField label="Departemen">
          <USelect
            v-model="form.department"
            :items="['Teknologi', 'Pemasaran', 'SDM', 'Keuangan', 'Operasional']"
            placeholder="Pilih Departemen"
          />
        </UFormField>

        <UFormField label="Posisi / Jabatan">
          <UInput v-model="form.position" placeholder="Senior Developer" />
        </UFormField>

        <UFormField label="Status Kerja">
          <USelect
            v-model="form.status"
            :items="['Aktif', 'Kontrak', 'Percobaan', 'Cuti']"
            placeholder="Pilih Status"
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
          Simpan Karyawan
        </UButton>
      </div>
    </template>
  </UModal>
</template>
