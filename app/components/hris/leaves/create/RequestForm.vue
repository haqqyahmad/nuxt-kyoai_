<!-- app/components/hris/leaves/create/RequestForm.vue -->

<script setup lang="ts">
type LeaveType = 'ANNUAL' | 'SICK' | 'SPECIAL' | 'MATERNITY'

type CreateLeavePayload = {
  employee_id: number | null
  leave_type: LeaveType | null
  start_date: string
  end_date: string
  special_reason: string
  notes: string
  deduct_balance: boolean
  attachment: File | null
}

const model = defineModel<CreateLeavePayload>({
  required: true
})

defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  submit: []
  saveDraft: []
}>()

const leaveTypeItems = [
  {
    label: 'Cuti Tahunan',
    value: 'ANNUAL'
  },
  {
    label: 'Sakit',
    value: 'SICK'
  },
  {
    label: 'Izin Khusus',
    value: 'SPECIAL'
  },
  {
    label: 'Cuti Melahirkan',
    value: 'MATERNITY'
  }
]

const totalDays = computed(() => {
  if (!model.value.start_date || !model.value.end_date) return 0

  const start = new Date(model.value.start_date)
  const end = new Date(model.value.end_date)

  if (end < start) return 0

  const diff = end.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
})

const showSpecialReason = computed(() => model.value.leave_type === 'SPECIAL')
const showAttachmentInfo = computed(() => ['SICK', 'MATERNITY'].includes(model.value.leave_type || ''))

watch(
  () => model.value.leave_type,
  (value) => {
    model.value.deduct_balance = value === 'ANNUAL'
  }
)
</script>

<template>
  <UCard>
    <form
      class="space-y-6"
      @submit.prevent="emit('submit')"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          label="Tipe Cuti"
          required
        >
          <USelect
            v-model="model.leave_type"
            :items="leaveTypeItems"
            placeholder="Pilih tipe cuti"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Mengurangi Saldo Cuti">
          <USwitch
            v-model="model.deduct_balance"
            :disabled="model.leave_type !== 'ANNUAL'"
            label="Deduct balance"
          />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          label="Tanggal Mulai"
          required
        >
          <UInput
            v-model="model.start_date"
            type="date"
            icon="i-lucide-calendar"
          />
        </UFormField>

        <UFormField
          label="Tanggal Selesai"
          required
        >
          <UInput
            v-model="model.end_date"
            type="date"
            icon="i-lucide-calendar"
          />
        </UFormField>
      </div>

      <UAlert
        v-if="totalDays"
        color="primary"
        variant="soft"
        icon="i-lucide-calendar-days"
        :title="`${totalDays} hari kalender`"
        description="Perhitungan hari kerja final tetap mengikuti backend."
      />

      <UFormField
        v-if="showSpecialReason"
        label="Alasan Khusus"
        required
      >
        <UInput
          v-model="model.special_reason"
          placeholder="Contoh: Pernikahan saudara"
        />
      </UFormField>

      <UFormField label="Alasan / Catatan">
        <UTextarea
          v-model="model.notes"
          placeholder="Berikan penjelasan singkat untuk keperluan cuti Anda..."
          :rows="4"
          autoresize
        />
      </UFormField>

      <UAlert
        v-if="showAttachmentInfo"
        color="warning"
        variant="soft"
        icon="i-lucide-info"
        title="Lampiran disarankan"
        description="Untuk sakit atau cuti melahirkan, lampiran seperti surat dokter/dokumen pendukung sebaiknya diunggah."
      />

      <HrisLeavesCreateAttachmentUpload v-model="model.attachment" />

      <div class="flex flex-col-reverse gap-3 border-t border-default pt-4 sm:flex-row sm:justify-end">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          icon="i-lucide-save"
          :disabled="loading"
          @click="emit('saveDraft')"
        >
          Simpan Draft
        </UButton>

        <UButton
          type="submit"
          icon="i-lucide-send"
          :loading="loading"
          :disabled="loading"
        >
          Kirim Pengajuan
        </UButton>
      </div>
    </form>
  </UCard>
</template>
