<script setup lang="ts">
import * as z from 'zod'
import { handleError } from '~/utils/handlers'

type Department = {
  id: string
  code: string
  type: 'office' | 'medical'
  name: string
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  department: Department | null
}>()

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const api = useApi()
const toast = useToast()

const schema = z.object({
  code: z.string().min(1, 'Code wajib diisi'),
  type: z.enum(['office', 'medical'], {
    message: 'Type wajib dipilih'
  }),
  name: z.string().min(2, 'Nama department minimal 2 karakter')
})

type DepartmentForm = z.output<typeof schema>

const form = reactive<DepartmentForm>({
  code: '',
  type: 'medical',
  name: ''
})

const typeOptions = [
  { label: 'Office', value: 'office' },
  { label: 'Medical', value: 'medical' }
]

const loading = ref(false)

function resetForm() {
  if (!props.department) {
    form.code = ''
    form.type = 'medical'
    form.name = ''
    return
  }

  form.code = props.department.code
  form.type = props.department.type
  form.name = props.department.name
}

watch(
  () => [props.department, open.value],
  ([department, isOpen]) => {
    if (isOpen && department) {
      resetForm()
    }
    if (!isOpen) {
      resetForm()
    }
  },
  { immediate: true }
)

async function submit() {
  if (!props.department?.id || loading.value) return

  const parsed = schema.safeParse({
    code: form.code.trim(),
    type: form.type,
    name: form.name.trim()
  })

  if (!parsed.success) {
    toast.add({
      title: 'Validasi',
      description: parsed.error.issues[0]?.message || 'Form tidak valid',
      color: 'error'
    })
    return
  }

  loading.value = true

  try {
    await api.put(`/medical/departments/${props.department.id}`, {
      code: parsed.data.code,
      type: parsed.data.type,
      name: parsed.data.name
    })

    toast.add({
      title: 'Berhasil',
      description: 'Department berhasil diperbarui',
      color: 'success'
    })

    emit('success')
    open.value = false
  } catch (err: unknown) {
    handleError(toast, err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #content>
      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">
                Edit Department
              </h2>
              <p class="text-sm text-muted">
                Perbarui kode, type, dan nama department
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
          </div>
        </template>

        <div class="p-6">
          <form class="space-y-5" @submit.prevent="submit">
            <div class="grid gap-4">
              <UFormField label="Code" required>
                <UInput
                  v-model="form.code"
                  class="w-full"
                  autofocus
                />
              </UFormField>

              <UFormField label="Type" required>
                <USelect
                  v-model="form.type"
                  :items="typeOptions"
                  placeholder="Pilih type"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Name" required>
                <UInput
                  v-model="form.name"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-default pt-4">
              <UButton
                type="button"
                color="neutral"
                variant="soft"
                @click="open = false"
              >
                Cancel
              </UButton>

              <UButton
                type="submit"
                color="primary"
                icon="i-lucide-save"
                :loading="loading"
              >
                Save changes
              </UButton>
            </div>
          </form>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
