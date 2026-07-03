<!-- app/pages/hris/leaves/create.vue -->

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

const router = useRouter()
const api = useApi()
const toast = useToast()

const loading = ref(false)

const form = reactive<CreateLeavePayload>({
  employee_id: 2,
  leave_type: null,
  start_date: '',
  end_date: '',
  special_reason: '',
  notes: '',
  deduct_balance: true,
  attachment: null
})

const annualBalance = ref({
  entitlement_days: 14,
  used_days: 2,
  remaining_days: 12
})

async function submitLeave() {
  if (!form.employee_id || !form.leave_type || !form.start_date || !form.end_date) {
    toast.add({
      title: 'Form belum lengkap',
      description: 'Tipe cuti, tanggal mulai, dan tanggal selesai wajib diisi.',
      color: 'warning'
    })

    return
  }

  if (form.leave_type === 'SPECIAL' && !form.special_reason) {
    toast.add({
      title: 'Alasan khusus wajib diisi',
      description: 'Isi alasan khusus untuk pengajuan izin khusus.',
      color: 'warning'
    })

    return
  }

  loading.value = true

  try {
    const payload = new FormData()

    payload.append('employee_id', String(form.employee_id))
    payload.append('leave_type', form.leave_type)
    payload.append('start_date', form.start_date)
    payload.append('end_date', form.end_date)
    payload.append('deduct_balance', String(form.deduct_balance))

    if (form.special_reason) {
      payload.append('special_reason', form.special_reason)
    }

    if (form.notes) {
      payload.append('notes', form.notes)
    }

    if (form.attachment) {
      payload.append('attachment', form.attachment)
    }

    await api.post('/hris/leave/requests', payload, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    toast.add({
      title: 'Pengajuan berhasil dikirim',
      description: 'Permohonan cuti berhasil dibuat.',
      color: 'success'
    })

    router.push('/hris/leaves')
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal mengirim pengajuan',
      description: 'Terjadi kesalahan saat membuat permohonan cuti.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function saveDraft() {
  toast.add({
    title: 'Draft disimpan',
    description: 'Draft pengajuan cuti berhasil disimpan sementara.',
    color: 'success'
  })
}
</script>

<template>
  <UDashboardPanel id="create-leave-request">
    <template #header>
      <UDashboardNavbar title="Pengajuan Cuti Baru">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            @click="router.push('/hris/leaves')"
          >
            Kembali
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-6xl space-y-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="mb-2 flex items-center gap-2 text-sm text-muted">
              <span>Leave Management</span>
              <UIcon name="i-lucide-chevron-right" />
              <span class="font-medium text-primary">New Leave Request</span>
            </div>

            <h1 class="text-2xl font-bold tracking-tight text-highlighted">
              Pengajuan Cuti Baru
            </h1>

            <p class="text-sm text-muted">
              Isi detail di bawah untuk mengajukan permohonan cuti Anda.
            </p>
          </div>

          <HrisLeavesCreateBalanceCard :balance="annualBalance" />
        </div>

        <div class="grid gap-6 xl:grid-cols-12">
          <div class="xl:col-span-8">
            <HrisLeavesCreateRequestForm
              v-model="form"
              :loading="loading"
              @submit="submitLeave"
              @save-draft="saveDraft"
            />
          </div>

          <div class="space-y-6 xl:col-span-4">
            <HrisLeavesCreatePolicyCard />
            <HrisLeavesCreateBannerCard />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
