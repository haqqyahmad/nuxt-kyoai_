<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  title: string
  description?: string
  schema: any
  state: any
  submit: (data: any) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'success'): void
}>()

const open = ref(false)
const loading = ref(false)

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<any>) {
  if (loading.value) return

  loading.value = true
  try {
    await props.submit(event.data)

    toast.add({
      title: 'Success',
      description: 'Data berhasil disimpan',
      color: 'success'
    })

    open.value = false
    emit('success')
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.message || 'Terjadi kesalahan',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    
    <!-- 🔥 Trigger -->
    <slot name="trigger">
      <UButton label="Add" />
    </slot>

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- 🔥 FORM ISI DINAMIS -->
        <slot />

        <!-- 🔥 ACTION DEFAULT -->
        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Submit"
            color="primary"
            type="submit"
            :loading="loading"
          />
          <!-- <slot name="actions" :loading="loading" /> -->
        </div>
      </UForm>
    </template>
  </UModal>
</template>