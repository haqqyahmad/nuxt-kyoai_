<script setup lang="ts">
import * as z from 'zod'
import { handleError, handleSuccess } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

const emit = defineEmits<{
  (e: 'created'): void
}>()

// Schema untuk form
const schema = z.object({
  patientId: z.string().min(1, { message: 'Pasien harus dipilih' }),
  branchId: z.string().min(1, { message: 'Branch harus dipilih' })
})

const state = reactive({
  patientId: '',
  branchId: ''
})

// State untuk selected patient
const selectedPatientData = ref<any>(null)

// State untuk semua data patient
const allPatients = ref<any[]>([])
const isLoadingPatients = ref(false)

// Branch options untuk pendaftaran
const branchIdOptions = [
  { label: 'Jakarta - Wisma Keiai (Main Clinic)', value: '01' },
  { label: 'Ejip - Cikarang', value: '02' },
  { label: 'Bali', value: '03' },
  { label: 'Clinique Suisse Jakarta', value: '04' },
  { label: 'Surya Cipta - Karawang', value: '05' },
  { label: 'KIIC - Karawang', value: '06' },
  { label: 'AXIA - Cikarang', value: '07' },
  { label: 'Delta Mas - Cikarang', value: '08' },
  { label: 'Jakarta - Summitmas', value: '09' },
  { label: 'Jakarta - Kyoai Medical Park (Wisma BNI)', value: '10' }
]

// Options untuk select patient (semua data patient)
const patientOptions = computed(() => {
  if (!allPatients.value || !Array.isArray(allPatients.value) || allPatients.value.length === 0) {
    return []
  }
  console.log('allPatients.value:', allPatients.value)
  return allPatients.value.map(patient => ({
    label: `${patient.firstName || ''} ${patient.middleName || ''} ${patient.lastName || ''}`.trim(),
    value: patient.id,
    description: `${patient.idType}: ${patient.idNumber} | ${patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'} | ${patient.dob || 'Tgl lahir tidak tersedia'}`
  }))
})

// Fetch SEMUA data patient (tanpa filter apapun)
const fetchAllPatients = async () => {
  isLoadingPatients.value = true
  try {
    const response = await api.get('/patient')
    console.log('Response:', response)
    let patientsData = response.data?.data?.data || response.data?.data || []

    if (!Array.isArray(patientsData)) {
      patientsData = []
    }

    allPatients.value = patientsData
    console.log('Total patients fetched:', allPatients.value.length)
  } catch (error) {
    console.error('Error fetching all patients:', error)
    allPatients.value = []
    handleError(toast, error)
  } finally {
    isLoadingPatients.value = false
  }
}

// Handle change patient selection
function onPatientChange(patientId: string) {
  const selectedPatient = allPatients.value.find(p => p.id === patientId)
  selectedPatientData.value = selectedPatient || null
  state.patientId = patientId
}

// Clear selection
function clearSelection() {
  selectedPatientData.value = null
  state.patientId = ''
}

// Submit form
async function submit(data: any) {
  try {
    if (!selectedPatientData.value) {
      throw new Error('Silakan pilih pasien terlebih dahulu')
    }

    await api.post('/registration', {
      patientId: data.id,
      branchId: data.branchId,
      patientData: selectedPatientData.value
    })

    handleSuccess(toast, `Pasien ${selectedPatientData.value.firstName} ${selectedPatientData.value.lastName} berhasil diproses`)
    emit('created')

    // Reset form setelah sukses
    clearSelection()
    state.branchId = ''
  } catch (err: any) {
    handleError(toast, err)
    throw err
  }
}

// Fungsi untuk mendapatkan label branch
function getBranchLabel(branchId: string) {
  const branch = branchIdOptions.find(b => b.value === branchId)
  return branch ? branch.label : `Branch ${branchId}`
}

// Load semua data patient saat modal dibuka
onMounted(() => {
  fetchAllPatients()
})
</script>

<template>
  <BaseFormModal
    title="Pilih Pasien"
    description="Pilih pasien yang akan didaftarkan"
    :schema="schema"
    :state="state"
    :submit="submit"
    @success="fetchAllPatients"
  >
    <!-- Trigger -->
    <template #trigger>
      <UButton label="Pilih Pasien" icon="i-lucide-user-plus" />
    </template>

    <!-- Form Content -->
    <div class="space-y-4">
      <!-- Pilih Patient dari semua data yang ada -->
      <UFormField label="Pilih Pasien" name="patientId" required>
        <USelect
          v-model="state.patientId"
          :items="patientOptions"
          placeholder="Cari dan pilih pasien..."
          searchable
          :loading="isLoadingPatients"
          class="w-full"
          @update:model-value="onPatientChange"
        >
          <template #empty>
            <div class="text-center py-4 text-gray-500">
              <UIcon name="i-lucide-users" class="mx-auto text-2xl mb-1" />
              <p class="text-sm">
                Tidak ada data pasien
              </p>
              <p class="text-xs mt-1">
                Silakan tambah pasien baru terlebih dahulu
              </p>
            </div>
          </template>
        </USelect>
      </UFormField>

      <!-- Detail Pasien yang Dipilih -->
      <div v-if="selectedPatientData" class="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-medium text-blue-900 flex items-center gap-2">
              <UIcon name="i-lucide-user-check" />
              Detail Pasien:
            </div>
            <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span class="font-medium">Nama Lengkap:</span>
                {{ selectedPatientData.firstName }} {{ selectedPatientData.middleName || '' }} {{ selectedPatientData.lastName }}
              </div>
              <div>
                <span class="font-medium">Nomor Identitas:</span>
                {{ selectedPatientData.idType }} - {{ selectedPatientData.idNumber }}
              </div>
              <div>
                <span class="font-medium">Tanggal Lahir:</span>
                {{ selectedPatientData.dob ? selectedPatientData.dob.split('T')[0] : '-' }}
              </div>
              <div>
                <span class="font-medium">Jenis Kelamin:</span>
                {{ selectedPatientData.gender === 'MALE' ? 'Laki-laki' : 'Perempuan' }}
              </div>
              <div>
                <span class="font-medium">Status Pernikahan:</span>
                {{ selectedPatientData.maritalStatus || '-' }}
              </div>
              <div v-if="selectedPatientData.email">
                <span class="font-medium">Email:</span>
                {{ selectedPatientData.email }}
              </div>
              <div v-if="selectedPatientData.phone">
                <span class="font-medium">No. HP:</span>
                {{ selectedPatientData.phone }}
              </div>
              <div>
                <span class="font-medium">Branch Asal:</span>
                {{ getBranchLabel(selectedPatientData.branchId) }}
              </div>
            </div>
          </div>
          <UButton
            size="xs"
            variant="ghost"
            color="red"
            icon="i-lucide-x"
            @click="clearSelection"
          />
        </div>
      </div>

      <!-- Pilih Branch Pendaftaran -->
      <UFormField label="Pilih Branch Pendaftaran" name="branchId" required>
        <USelect
          v-model="state.branchId"
          :items="branchIdOptions"
          placeholder="Pilih branch"
          class="w-full"
        />
      </UFormField>

      <!-- Warning Messages -->
      <div v-if="!selectedPatientData && !isLoadingPatients" class="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
        <UIcon name="i-lucide-alert-triangle" class="inline mr-1" />
        Silakan pilih pasien terlebih dahulu
      </div>

      <div v-if="selectedPatientData && !state.branchId" class="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
        <UIcon name="i-lucide-alert-triangle" class="inline mr-1" />
        Silakan pilih branch pendaftaran untuk melanjutkan
      </div>
    </div>
  </BaseFormModal>
</template>
