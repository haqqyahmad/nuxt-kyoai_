<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { handleError } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  patientId?: string | null
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const schema = z.object({
  firstName: z.string().min(1, 'First name wajib diisi'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name wajib diisi'),
  gender: z.enum(['MALE', 'FEMALE']),
  idType: z.enum(['KTP', 'PASSPORT', 'SIM']),
  idNumber: z.string().min(1, 'Nomor identitas wajib diisi'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  dob: z.string().min(1, 'Tanggal lahir wajib diisi'),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED']).optional(),
  phone: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  firstName: '',
  middleName: '',
  lastName: '',
  gender: undefined,
  idType: undefined,
  idNumber: '',
  email: '',
  dob: '',
  maritalStatus: undefined,
  phone: ''
})

const genderOptions = [
  { label: 'Laki-laki', value: 'MALE' },
  { label: 'Perempuan', value: 'FEMALE' }
]

const idTypeOptions = [
  { label: 'KTP', value: 'KTP' },
  { label: 'Passport', value: 'PASSPORT' },
  { label: 'SIM', value: 'SIM' }
]

const maritalOptions = [
  { label: 'Belum Menikah', value: 'SINGLE' },
  { label: 'Menikah', value: 'MARRIED' },
  { label: 'Cerai', value: 'DIVORCED' }
]

const loading = ref(false)
const saving = ref(false)
const formKey = ref(0)

type PatientDetail = {
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: 'MALE' | 'FEMALE' | null
  idType?: 'KTP' | 'PASSPORT' | 'SIM' | null
  idNumber?: string | null
  email?: string | null
  dob?: string | null
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | null
  phone?: string | null
}

function formatDateForInput(date?: string | null) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

function resetForm() {
  state.firstName = ''
  state.middleName = ''
  state.lastName = ''
  state.gender = undefined
  state.idType = undefined
  state.idNumber = ''
  state.email = ''
  state.dob = ''
  state.maritalStatus = undefined
  state.phone = ''
}

function fillForm(patient: PatientDetail) {
  state.firstName = patient.firstName ?? ''
  state.middleName = patient.middleName ?? ''
  state.lastName = patient.lastName ?? ''
  state.gender = patient.gender ?? undefined
  state.idType = patient.idType ?? undefined
  state.idNumber = patient.idNumber ?? ''
  state.email = patient.email ?? ''
  state.dob = formatDateForInput(patient.dob)
  state.maritalStatus = patient.maritalStatus ?? undefined
  state.phone = patient.phone ?? ''
}

async function loadPatient() {
  if (!props.patientId) return

  loading.value = true
  try {
    const res = await api.get(`/patient/${props.patientId}`)
    fillForm(res.data?.data ?? {})
  } catch (err) {
    handleError(toast, err)
    open.value = false
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (!value) return

  formKey.value += 1
  resetForm()
  loadPatient()
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.patientId || saving.value) return

  saving.value = true
  try {
    const data = event.data
    await api.patch(`/patient/${props.patientId}`, {
      ...data,
      middleName: data.middleName || undefined,
      email: data.email || undefined,
      maritalStatus: data.maritalStatus || undefined,
      phone: data.phone || undefined
    })

    toast.add({
      title: 'Berhasil',
      description: 'Data pasien berhasil diperbarui',
      color: 'success'
    })

    open.value = false
    emit('updated')
  } catch (err) {
    handleError(toast, err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Edit Data Pasien"
    description="Perbarui identitas pasien"
  >
    <template #body>
      <UForm
        :key="formKey"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UFormField label="First Name" name="firstName" required>
            <UInput
              v-model="state.firstName"
              :disabled="loading"
              placeholder="Budi"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Middle Name" name="middleName">
            <UInput
              v-model="state.middleName"
              :disabled="loading"
              placeholder="Santoso"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Last Name" name="lastName" required>
            <UInput
              v-model="state.lastName"
              :disabled="loading"
              placeholder="Wijaya"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UFormField label="Gender" name="gender" required>
            <USelect
              v-model="state.gender"
              :items="genderOptions"
              :disabled="loading"
              placeholder="Pilih gender"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Status Pernikahan" name="maritalStatus">
            <USelect
              v-model="state.maritalStatus"
              :items="maritalOptions"
              :disabled="loading"
              placeholder="Pilih status"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UFormField label="Jenis ID" name="idType" required>
            <USelect
              v-model="state.idType"
              :items="idTypeOptions"
              :disabled="loading"
              placeholder="Pilih jenis"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Nomor Identitas"
            name="idNumber"
            required
            class="sm:col-span-2"
          >
            <UInput
              v-model="state.idNumber"
              :disabled="loading"
              placeholder="3201234567890001"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Tanggal Lahir" name="dob" required>
          <UInput
            v-model="state.dob"
            type="date"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UFormField label="No. HP" name="phone">
            <UInput
              v-model="state.phone"
              :disabled="loading"
              placeholder="081234567890"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              :disabled="loading"
              placeholder="budi@email.com"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Simpan"
            color="primary"
            type="submit"
            :loading="saving"
            :disabled="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
