<script setup lang="ts">
import * as z from 'zod'
import { handleError } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

defineEmits<{
  (e: 'created'): void
}>()

const schema = z.object({
  code: z.string().min(1, 'Code wajib diisi'),
  type: z.enum(['office', 'medical'], {
    message: 'Type wajib dipilih'
  }),
  name: z.string().min(2, 'Nama department minimal 2 karakter')
})

const typeOptions = [
  { label: 'Office', value: 'office' },
  { label: 'Medical', value: 'medical' }
]

const state = reactive({
  code: '',
  type: '' as '' | 'office' | 'medical',
  name: ''
})

async function submit(data: typeof state) {
  try {
    await api.post('/medical/departments', {
      code: data.code,
      type: data.type,
      name: data.name
    })
  } catch (err: unknown) {
    handleError(toast, err)
    throw err
  }
}
</script>

<template>
  <BaseFormModal
    title="New Department"
    description="Add a new medical department"
    :schema="schema"
    :state="state"
    :submit="submit"
    @success="$emit('created')"
  >
    <template #trigger>
      <UButton label="New Department" icon="i-lucide-plus" />
    </template>

    <UFormField label="Code" name="code" required>
      <UInput v-model="state.code" autofocus class="w-full" />
    </UFormField>

    <UFormField label="Type" name="type" required>
      <USelect
        v-model="state.type"
        :items="typeOptions"
        placeholder="Pilih type"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" class="w-full" />
    </UFormField>
  </BaseFormModal>
</template>
