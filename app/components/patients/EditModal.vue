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

type AddressType = 'HOME' | 'OFFICE' | 'BILLING' | 'OTHER'

type PatientAddress = {
  id?: string
  type?: AddressType | null
  detail?: string | null
  country?: string | null
  province?: string | null
  city?: string | null
  district?: string | null
  note?: string | null
}

const addresses = ref<PatientAddress[]>([])
const editingAddressId = ref<string | null>(null)
const addressDeletingId = ref<string | null>(null)
const addressSaving = ref(false)

const addressForm = reactive({
  type: 'HOME' as AddressType,
  detail: '',
  country: 'Indonesia',
  province: '',
  city: '',
  district: '',
  note: ''
})

const isAddressFormValid = computed(() =>
  Boolean(
    addressForm.detail.trim()
    && addressForm.country.trim()
    && addressForm.province.trim()
    && addressForm.city.trim()
    && addressForm.district.trim()
  )
)

const ADDRESS_TYPE_LABEL: Record<AddressType, string> = {
  HOME: 'Rumah',
  OFFICE: 'Kantor',
  BILLING: 'Tagihan',
  OTHER: 'Lainnya'
}

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

const addressTypeOptions = [
  { label: 'Rumah', value: 'HOME' },
  { label: 'Kantor', value: 'OFFICE' },
  { label: 'Tagihan', value: 'BILLING' },
  { label: 'Lainnya', value: 'OTHER' }
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
  addresses?: PatientAddress[]
}

function formatDateForInput(date?: string | null) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

function addressTypeLabel(type?: AddressType | null) {
  return type ? ADDRESS_TYPE_LABEL[type] ?? type : 'Lainnya'
}

function addressLine(item: PatientAddress) {
  return [item.detail, item.city, item.province].filter(Boolean).join(', ')
}

function resetIdentity() {
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

function startNewAddress() {
  editingAddressId.value = null
  addressForm.type = 'HOME'
  addressForm.detail = ''
  addressForm.country = 'Indonesia'
  addressForm.province = ''
  addressForm.city = ''
  addressForm.district = ''
  addressForm.note = ''
}

function editAddress(item: PatientAddress) {
  editingAddressId.value = item.id ?? null
  addressForm.type = item.type ?? 'HOME'
  addressForm.detail = item.detail ?? ''
  addressForm.country = item.country ?? 'Indonesia'
  addressForm.province = item.province ?? ''
  addressForm.city = item.city ?? ''
  addressForm.district = item.district ?? ''
  addressForm.note = item.note ?? ''
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

  addresses.value = patient.addresses ?? []

  const primary = addresses.value.find(item => item.type === 'HOME') ?? addresses.value[0]
  if (primary) editAddress(primary)
  else startNewAddress()
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

async function refreshAddresses() {
  if (!props.patientId) return

  const res = await api.get(`/patient/${props.patientId}`)
  addresses.value = res.data?.data?.addresses ?? []
}

async function saveAddressForm() {
  if (!props.patientId || !isAddressFormValid.value || addressSaving.value) return

  addressSaving.value = true
  try {
    const url = editingAddressId.value
      ? `/patient/${props.patientId}/address?addressId=${editingAddressId.value}`
      : `/patient/${props.patientId}/address`

    const res = await api.post(url, {
      type: addressForm.type,
      detail: addressForm.detail,
      country: addressForm.country,
      province: addressForm.province,
      city: addressForm.city,
      district: addressForm.district,
      note: addressForm.note || undefined
    })

    await refreshAddresses()

    const savedId = res.data?.data?.id ?? editingAddressId.value
    if (savedId) editingAddressId.value = savedId

    toast.add({
      title: 'Berhasil',
      description: 'Alamat berhasil disimpan',
      color: 'success'
    })
    emit('updated')
  } catch (err) {
    handleError(toast, err)
  } finally {
    addressSaving.value = false
  }
}

async function removeAddress(id: string) {
  if (!props.patientId || !id || addressDeletingId.value) return

  addressDeletingId.value = id
  try {
    await api.delete(`/patient/${props.patientId}/address/${id}`)
    await refreshAddresses()

    if (editingAddressId.value === id) startNewAddress()

    toast.add({
      title: 'Berhasil',
      description: 'Alamat berhasil dihapus',
      color: 'success'
    })
    emit('updated')
  } catch (err) {
    handleError(toast, err)
  } finally {
    addressDeletingId.value = null
  }
}

watch(open, (value) => {
  if (!value) return

  formKey.value += 1
  resetIdentity()
  addresses.value = []
  startNewAddress()
  loadPatient()
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.patientId || saving.value) return

  saving.value = true
  try {
    const data = event.data
    await api.patch(`/patient/${props.patientId}`, {
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      gender: data.gender,
      idType: data.idType,
      idNumber: data.idNumber,
      email: data.email || undefined,
      dob: data.dob,
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
    description="Perbarui identitas dan alamat pasien"
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

        <div class="space-y-3 rounded-lg border border-default p-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Alamat</span>
            <UButton
              icon="i-lucide-plus"
              label="Alamat Baru"
              size="xs"
              color="primary"
              variant="soft"
              @click="startNewAddress"
            />
          </div>

          <div v-if="addresses.length" class="space-y-2">
            <div
              v-for="item in addresses"
              :key="item.id"
              class="flex items-start justify-between gap-2 rounded-md border px-2.5 py-2"
              :class="editingAddressId === item.id ? 'border-primary' : 'border-default'"
            >
              <button
                type="button"
                class="flex-1 text-left"
                @click="editAddress(item)"
              >
                <p class="text-sm font-medium">
                  {{ addressTypeLabel(item.type) }}
                </p>
                <p class="text-xs text-muted">
                  {{ addressLine(item) || '-' }}
                </p>
              </button>
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                color="error"
                variant="ghost"
                :loading="addressDeletingId === item.id"
                @click="removeAddress(item.id ?? '')"
              />
            </div>
          </div>
          <p v-else class="text-xs text-muted">
            Belum ada alamat.
          </p>

          <div class="space-y-3 rounded-md bg-elevated/40 p-2.5">
            <p class="text-xs font-medium text-muted">
              {{ editingAddressId ? 'Edit alamat terpilih' : 'Tambah alamat baru' }}
            </p>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <UFormField label="Tipe">
                <USelect
                  v-model="addressForm.type"
                  :items="addressTypeOptions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Detail" class="sm:col-span-3">
                <UInput
                  v-model="addressForm.detail"
                  placeholder="Jl. Merdeka No. 1, RT 01"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UFormField label="Kota">
                <UInput
                  v-model="addressForm.city"
                  placeholder="Jakarta"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Provinsi">
                <UInput
                  v-model="addressForm.province"
                  placeholder="DKI Jakarta"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UFormField label="Kecamatan">
                <UInput
                  v-model="addressForm.district"
                  placeholder="Menteng"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Negara">
                <UInput
                  v-model="addressForm.country"
                  placeholder="Indonesia"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Catatan">
              <UInput
                v-model="addressForm.note"
                placeholder="Opsional"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-muted">
                Detail, Kota, Provinsi, Kecamatan, Negara wajib diisi.
              </p>
              <div class="flex gap-2">
                <UButton
                  v-if="editingAddressId"
                  label="Batal"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="startNewAddress"
                />
                <UButton
                  label="Simpan Alamat"
                  size="xs"
                  color="primary"
                  :loading="addressSaving"
                  :disabled="!isAddressFormValid"
                  @click="saveAddressForm"
                />
              </div>
            </div>
          </div>
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
