<script setup lang="ts">
import type { ApiError } from '~/types/outpatient'

const props = defineProps<{
  patientId?: string
  allergyNotes?: string | null
  diseaseNotes?: string | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ saved: [] }>()

const api = useApi()
const toast = useToast()
const saving = ref(false)
const form = reactive({ allergyNotes: '', diseaseNotes: '' })

watch(open, (value) => {
  if (value) {
    form.allergyNotes = props.allergyNotes ?? ''
    form.diseaseNotes = props.diseaseNotes ?? ''
  }
})

async function save() {
  if (!props.patientId) return
  saving.value = true
  try {
    await api.patch(`/patient/${props.patientId}`, {
      allergyNotes: form.allergyNotes,
      diseaseNotes: form.diseaseNotes
    })
    toast.add({ title: 'Berhasil', description: 'Catatan medis tersimpan', color: 'success' })
    emit('saved')
    open.value = false
  } catch (err) {
    toast.add({ title: 'Gagal', description: (err as ApiError)?.response?.data?.message || 'Gagal', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Catatan Medis Pasien">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Catatan Alergi">
          <UTextarea
            v-model="form.allergyNotes"
            :rows="3"
            class="w-full"
            placeholder="cth. Alergi penisilin, seafood"
          />
        </UFormField>
        <UFormField label="Catatan Penyakit">
          <UTextarea
            v-model="form.diseaseNotes"
            :rows="3"
            class="w-full"
            placeholder="cth. Riwayat hipertensi, diabetes"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Batal"
          @click="open = false"
        />
        <UButton
          color="primary"
          label="Simpan"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
