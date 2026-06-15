<!-- app/components/hris/national-holidays/HolidayDetailForm.vue -->

<script setup lang="ts">
type NationalHoliday = {
  id: number
  date: string
  name: string
  description: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const props = defineProps<{
  holiday: NationalHoliday | null
}>()

const emit = defineEmits<{
  refresh: []
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const deleting = ref(false)

const form = reactive({
  id: null as number | null,
  date: '',
  name: '',
  description: '',
  is_active: true
})

watch(
  () => props.holiday,
  (holiday) => {
    if (!holiday) {
      Object.assign(form, {
        id: null,
        date: '',
        name: '',
        description: '',
        is_active: true
      })

      return
    }

    Object.assign(form, {
      id: holiday.id,
      date: holiday.date,
      name: holiday.name,
      description: holiday.description || '',
      is_active: holiday.is_active
    })
  },
  { immediate: true, deep: true }
)

function validateForm() {
  if (!form.name.trim()) {
    toast.add({
      title: 'Validasi',
      description: 'Nama holiday wajib diisi.',
      color: 'warning'
    })

    return false
  }

  if (!form.date) {
    toast.add({
      title: 'Validasi',
      description: 'Tanggal holiday wajib diisi.',
      color: 'warning'
    })

    return false
  }

  return true
}

async function saveChanges() {
  if (!form.id) return
  if (loading.value) return
  if (!validateForm()) return

  loading.value = true

  try {
    const payload = {
      date: form.date,
      name: form.name,
      description: form.description,
      is_active: form.is_active
    }

    await api(`/hris/national-holidays/${form.id}`, {
      method: 'PATCH',
      data: payload
    })

    toast.add({
      title: 'Berhasil',
      description: 'National holiday berhasil diperbarui.',
      color: 'success'
    })

    emit('refresh')
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'National holiday gagal diperbarui.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function deleteHoliday() {
  if (!form.id) return
  if (deleting.value) return

  const confirmed = confirm('Yakin ingin menghapus holiday ini?')

  if (!confirmed) return

  deleting.value = true

  try {
    await api(`/hris/national-holidays/${form.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Berhasil',
      description: 'National holiday berhasil dihapus.',
      color: 'success'
    })

    emit('refresh')
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'National holiday gagal dihapus.',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="font-semibold text-highlighted">
            Holiday Details
          </h3>

          <p class="mt-1 text-sm text-muted">
            Configure national holiday information.
          </p>
        </div>

        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <UButton
            color="error"
            variant="outline"
            icon="i-lucide-trash-2"
            class="justify-center"
            :loading="deleting"
            :disabled="!form.id || loading || deleting"
            @click="deleteHoliday"
          >
            Delete
          </UButton>

          <UButton
            icon="i-lucide-save"
            class="justify-center"
            :loading="loading"
            :disabled="!form.id || loading || deleting"
            @click="saveChanges"
          >
            Save Changes
          </UButton>
        </div>
      </div>
    </template>

    <div
      v-if="!holiday"
      class="rounded-xl border border-dashed border-default p-8 text-center"
    >
      <p class="font-medium text-highlighted">
        Belum ada holiday dipilih
      </p>

      <p class="mt-1 text-sm text-muted">
        Pilih holiday dari daftar sebelah kiri.
      </p>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Holiday Name">
          <UInput
            v-model="form.name"
            placeholder="Tahun Baru Masehi"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Holiday Date">
          <UInput
            v-model="form.date"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Status">
          <div class="flex h-10 items-center gap-3 rounded-md border border-default px-3">
            <USwitch v-model="form.is_active" />

            <span class="text-sm text-highlighted">
              {{ form.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </UFormField>

        <UFormField
          label="Description"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="form.description"
            placeholder="Keterangan holiday"
            :rows="4"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="rounded-xl border border-default bg-muted/30 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            variant="soft"
          >
            National Holiday
          </UBadge>

          <UBadge
            :color="form.is_active ? 'success' : 'neutral'"
            variant="soft"
          >
            {{ form.is_active ? 'active' : 'inactive' }}
          </UBadge>
        </div>

        <p class="mt-3 text-sm text-muted">
          Data ini bisa digunakan untuk perhitungan attendance, shift schedule,
          payroll, dan leave management.
        </p>
      </div>
    </div>
  </UCard>
</template>
