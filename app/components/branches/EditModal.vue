<script setup lang="ts">
import * as z from 'zod'
import { handleError } from '~/utils/handlers'

type Branch = {
  id: string
  branchId: string
  nameBranch: string
  addressBranch: string
}

const props = defineProps<{
  branch: Branch | null
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
  branchId: z.string().min(1, 'ID wajib diisi'),
  nameBranch: z.string().min(2, 'Nama branch minimal 2 karakter'),
  addressBranch: z.string().min(2, 'Alamat minimal 2 karakter')
})

type BranchForm = z.output<typeof schema>

const form = reactive<BranchForm>({
  branchId: '',
  nameBranch: '',
  addressBranch: ''
})

const loading = ref(false)

function resetForm() {
  if (!props.branch) {
    form.branchId = ''
    form.nameBranch = ''
    form.addressBranch = ''
    return
  }

  form.branchId = props.branch.branchId
  form.nameBranch = props.branch.nameBranch
  form.addressBranch = props.branch.addressBranch
}

watch(
  () => [props.branch, open.value],
  ([branch, isOpen]) => {
    if (isOpen && branch) {
      resetForm()
    }
    if (!isOpen) {
      resetForm()
    }
  },
  { immediate: true }
)

async function submit() {
  if (!props.branch?.id || loading.value) return

  const parsed = schema.safeParse({
    branchId: form.branchId.trim(),
    nameBranch: form.nameBranch.trim(),
    addressBranch: form.addressBranch.trim()
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
    await api.put(`/branch/${props.branch.id}`, {
      branchId: parsed.data.branchId,
      nameBranch: parsed.data.nameBranch,
      addressBranch: parsed.data.addressBranch
    })

    toast.add({
      title: 'Berhasil',
      description: 'Branch berhasil diperbarui',
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
                Edit Branch
              </h2>
              <p class="text-sm text-muted">
                Perbarui ID, nama, dan alamat branch
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
              <UFormField label="ID" required>
                <UInput
                  v-model="form.branchId"
                  class="w-full"
                  autofocus
                />
              </UFormField>

              <UFormField label="Name" required>
                <UInput
                  v-model="form.nameBranch"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Address" required>
                <UTextarea
                  v-model="form.addressBranch"
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
