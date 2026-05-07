<script setup lang="ts">
import * as z from 'zod'
import { handleError, handleSuccess } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

const emit = defineEmits<{
  (e: 'created'): void
}>()

// ✅ schema tetap di sini
const schema = z.object({
  branchId: z.number(),
  questionnaire_code: z.string().min(1),
  questionnaire_name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().min(1)
})

const state = reactive({
  branchId: 1,
  questionnaire_code: '',
  questionnaire_name: '',
  description: '',
  version: ''
})

// ✅ submit dipisah (ini yang dipanggil BaseFormModal)
async function submit(data: any) {
  try {
    await api.post('/patient', {
      ...data,
      email: data.email || undefined
    })

    handleSuccess(toast, data.firstName)
    emit('created')
  } catch (err: any) {
    handleError(toast, err)
    throw err // 🔥 penting biar Base tau error
  }
}
</script>

<template>
  <BaseFormModal
    title="Tambah Questionnaire"
    description="Lengkapi data dibawah ini"
    :schema="schema"
    :state="state"
    :submit="submit"
    @success="$emit('created')"
  >
    <!-- 🔥 Trigger -->
    <template #trigger>
      <UButton label="Tambah Template" icon="i-lucide-user-plus" />
    </template>

    <!-- 🔥 FORM ISI -->
    <!-- Branch ID (hidden / auto) -->
    <input type="hidden" :value="state.branchId">

    <!-- Code Template -->
    <UFormField
      label="Template Code"
      name="questionnaire_code"
      required
      class="sm:col-span-2"
    >
      <UInput
        v-model="state.questionnaire_code"
        placeholder="3201234567890001"
        class="w-full"
      />
    </UFormField>

    <!-- Nama -->
    <UFormField
      label="Template Name"
      name="questionnaire_name"
      required
      class="sm:col-span-2"
    >
      <UInput
        v-model="state.questionnaire_name"
        placeholder="MCU"
        class="w-full"
      />
    </UFormField>

    <!-- Description -->
    <UFormField
      label="Description"
      name="description"
      required
      class="sm:col-span-2"
    >
      <UInput
        v-model="state.description"
        placeholder="MCU Umum"
        class="w-full"
      />
    </UFormField>

    <!-- Version -->
    <UFormField
      label="Version"
      name="version"
      required
      class="sm:col-span-2"
    >
      <UInput
        v-model="state.version"
        placeholder="1.0"
        class="w-full"
      />
    </UFormField>
  </BaseFormModal>
</template>
