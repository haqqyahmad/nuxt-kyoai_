<!-- app/components/branches/AddModal.vue -->
<script setup lang="ts">
import * as z from 'zod'
import { handleError } from '~/utils/handlers'

const api = useApi()
const toast = useToast()

const emit = defineEmits<{
  (e: 'created'): void
}>()

const schema = z.object({
  branchId: z.string().min(1, 'ID wajib diisi'),
  nameBranch: z.string().min(2, 'Nama branch minimal 2 karakter'),
  addressBranch: z.string().min(2, 'Alamat minimal 2 karakter')
})

const state = reactive({
  branchId: '',
  nameBranch: '',
  addressBranch: ''
})

async function submit(data: typeof state) {
  try {
    data.message = 'Branch'
    data.name = data.nameBranch

    await api.post('/branch', {
      branchId: data.branchId,
      nameBranch: data.nameBranch,
      addressBranch: data.addressBranch
    })

    // console.log('Branch created')
    emit('created')
  } catch (err: any) {
    handleError(toast, err)
    throw err
  }
}
</script>

<template>
  <BaseFormModal
    title="New Branch"
    description="Add a new branch to the database"
    :schema="schema"
    :state="state"
    :submit="submit"
    @success="$emit('created')"
  >
    <template #trigger>
      <UButton label="New Branch" icon="i-lucide-building" />
    </template>

    <UFormField label="ID" name="branchId">
      <UInput v-model="state.branchId" autofocus class="w-full" />
    </UFormField>

    <UFormField label="Name" name="nameBranch">
      <UInput v-model="state.nameBranch" class="w-full" />
    </UFormField>

    <UFormField label="Address" name="addressBranch">
      <UTextarea v-model="state.addressBranch" class="w-full" />
    </UFormField>
  </BaseFormModal>
</template>
