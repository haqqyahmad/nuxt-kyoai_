<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { handleError, handleSuccess } from '~/utils/handlers'

const schema = z
  .object({
    name: z.string().min(2, 'Too short'),
    email: z.string().email('Invalid email'),
    password: z
      .string('Password is required')
      .min(8, 'Must be at least 8 characters'),
    confirm_password: z
      .string('Password is required')
      .min(8, 'Must be at least 8 characters')
  })
  .refine(data => data.password === data.confirm_password, {
    message: 'Passwords don\'t match',
    path: ['confirm_password']
  })

const emit = defineEmits<{
  (e: 'created'): void
}>()

const loading = ref(false)
const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  password: '',
  confirm_password: ''
})

const api = useApi()
const { registerUser } = useUser()
const toast = useToast()

function resetForm() {
  state.name = ''
  state.email = ''
  state.password = ''
  state.confirm_password = ''
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (loading.value) return

  loading.value = true

  try {
    await registerUser({
      /**
       * @haqqy, pake event ya pak jangan state, biar data udah di validasi pake zod
       */
      name: event.data.name,
      email: event.data.email,
      password: event.data.password,
      confirm_password: event.data.confirm_password
    })

    handleSuccess(toast, event.data.name)
    resetForm()
    open.value = false
    emit('created')
  } catch (err: any) {
    handleError(toast, err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="New User"
    description="Add a new user to the database"
  >
    <UButton label="New User" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" placeholder="John Doe" name="name">
          <UInput v-model="state.name" autofocus class="w-full" />
        </UFormField>
        <UFormField
          label="Email"
          placeholder="john.doe@example.com"
          name="email"
        >
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <UFormField label="Password" placeholder="John Doe" name="password">
          <UInput v-model="state.password" type="password" class="w-full" />
        </UFormField>
        <UFormField
          label="Confirm Password"
          placeholder="John Doe"
          name="confirm_password"
        >
          <UInput
            v-model="state.confirm_password"
            type="password"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Create User"
            color="primary"
            variant="solid"
            validate-on="input"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
