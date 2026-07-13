<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { handleError } from '~/utils/handlers'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

type DepartmentType = 'office' | 'medical'

type Department = {
  id: string
  code: string
  type: DepartmentType
  name: string
  createdAt: string
  updatedAt: string
}

const departmentSchema = z.object({
  code: z.string().min(1, 'Code wajib diisi'),
  type: z.enum(['office', 'medical'], {
    message: 'Type wajib dipilih'
  }),
  name: z.string().min(2, 'Nama department minimal 2 karakter')
})

type DepartmentForm = z.output<typeof departmentSchema>

const department = reactive<Partial<DepartmentForm>>({
  code: '',
  type: 'medical',
  name: ''
})

const id = computed(() => String(route.params.id))

const {
  data: departmentData,
  pending,
  error
} = await useAsyncData(`department-${id.value}`, async () => {
  const res = await api.get(`/medical/departments/${id.value}`)
  return res.data.data as Department
})

watchEffect(() => {
  if (!departmentData.value) return

  department.code = departmentData.value.code
  department.type = departmentData.value.type
  department.name = departmentData.value.name
})

const saving = ref(false)
const errorMessage = computed(() => {
  if (!error.value) return 'Data department gagal dimuat.'

  const err = error.value as {
    data?: { message?: string }
    response?: { data?: { message?: string } }
    message?: string
  }

  return (
    err.data?.message
    || err.response?.data?.message
    || err.message
    || 'Data department gagal dimuat.'
  )
})

const typeOptions = [
  { label: 'Office', value: 'office' },
  { label: 'Medical', value: 'medical' }
]

async function onSubmit(event: FormSubmitEvent<DepartmentForm>) {
  if (saving.value) return

  saving.value = true

  try {
    await api.put(`/medical/departments/${id.value}`, {
      code: event.data.code,
      type: event.data.type,
      name: event.data.name
    })

    toast.add({
      title: 'Berhasil',
      description: 'Department berhasil diperbarui',
      color: 'success'
    })

    await router.push('/departments')
  } catch (err: unknown) {
    handleError(toast, err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="department-edit">
    <template #header>
      <UDashboardNavbar title="Edit Department">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="pending"
        title="Memuat data department"
        description="Sedang mengambil detail department."
        color="info"
      />

      <UAlert
        v-else-if="error"
        title="Department tidak ditemukan"
        :description="errorMessage"
        color="error"
      />

      <UForm
        v-else
        :schema="departmentSchema"
        :state="department"
        class="max-w-2xl space-y-4"
        @submit="onSubmit"
      >
        <UPageCard
          title="Department Detail"
          description="Perbarui kode, type, dan nama department."
          variant="subtle"
        >
          <template #footer>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                label="Back"
                color="neutral"
                variant="soft"
                icon="i-lucide-arrow-left"
                to="/departments"
              />

              <UButton
                label="Save changes"
                color="primary"
                type="submit"
                :loading="saving"
                icon="i-lucide-save"
              />
            </div>
          </template>

          <div class="grid gap-4">
            <UFormField name="code" label="Code" required>
              <UInput v-model="department.code" class="w-full" />
            </UFormField>

            <UFormField name="type" label="Type" required>
              <USelect
                v-model="department.type"
                :items="typeOptions"
                placeholder="Pilih type"
                class="w-full"
              />
            </UFormField>

            <UFormField name="name" label="Name" required>
              <UInput v-model="department.name" class="w-full" />
            </UFormField>
          </div>
        </UPageCard>
      </UForm>
    </template>
  </UDashboardPanel>
</template>
