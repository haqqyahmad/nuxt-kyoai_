<script setup lang="ts">
import * as z from 'zod'
import { handleError, handleSuccess } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

const emit = defineEmits<{
  (e: 'created'): void
}>()

// Schema
const schema = z.object({
  questionnaire_id: z.number(),
  questionnaire_code: z.string().min(1, 'Code is required'),
  questionnaire_name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  isActive: z.boolean()
})

// Infer type dari schema
type Schema = z.output<typeof schema>

// State
const state = reactive<Schema>({
  questionnaire_id: 1,
  questionnaire_code: '',
  questionnaire_name: '',
  description: '',
  version: '',
  isActive: true
})

// Submit
async function submit(data: Schema) {
  try {
    await api.post('/questionnaire', data)

    handleSuccess(
      toast,
      'Questionnaire "${data.questionnaire_name}" created successfully'
    )

    emit('created')
  } catch (err: any) {
    handleError(toast, err)
    throw err
  }
}
</script>

<template>
  <BaseFormModal
    title="Tambah Template Questionnaire"
    description="Lengkapi data dibawah ini"
    :schema="schema"
    :state="state"
    :submit="submit"
    @success="$emit('created')"
  >
    <!-- 🔥 Trigger -->
    <template #trigger>
      <UButton label="Tambah Template" icon="i-lucide-layout-template" />
    </template>

    <!-- 🔥 FORM ISI -->
    <!-- Branch ID (hidden / auto) -->
    <input type="hidden" :value="state.questionnaire_id">

    <!-- Code Template -->
    <UFormField
      label="Template Code"
      name="questionnaire_code"
      required
      class="sm:col-span-2"
    >
      <UInput
        v-model="state.questionnaire_code"
        placeholder="QST-xxx-xxxx"
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
      <UTextarea
        v-model="state.description"
        placeholder="MCU Umum"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- Version -->
      <UFormField
        label="Version"
        name="version"
        required
      >
        <UInput
          v-model="state.version"
          placeholder="1.0"
        />
      </UFormField>

      <!-- Active -->
      <UFormField
        label="Active?"
        name="isActive"
        required
      >
        <div class="flex items-center justify-between w-full">
          <span class="text-sm text-muted">
            Status {{ state.isActive ? 'Active' : 'Inactive' }}
          </span>

          <USwitch v-model="state.isActive" />
        </div>
      </UFormField>
    </div>
  </BaseFormModal>
</template>
