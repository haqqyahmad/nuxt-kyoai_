<script setup lang="ts">
import * as z from 'zod'
import { handleError, handleSuccess } from '~/utils/handlers'

const { registerUser } = useUser()
const toast = useToast()

const emit = defineEmits<{
  (e: 'created'): void
}>()

// ✅ schema tetap di sini
const schema = z
  .object({
    name: z.string().min(2, 'Too short'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Must be at least 8 characters')
  })
  .refine(data => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password']
  })

// ✅ state tetap di sini
const state = reactive({
  name: '',
  email: '',
  password: '',
  confirm_password: ''
})

// ✅ submit dipisah (dipanggil BaseFormModal)
async function submit(data: any) {
  try {
    await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      confirm_password: data.confirm_password
    })

    handleSuccess(toast, data.name)
    emit('created')
  } catch (err: any) {
    handleError(toast, err)
    throw err // 🔥 wajib
  }
}
</script>

<template>
  <BaseFormModal
    title="New User"
    description="Add a new user to the database"
    :schema="schema"
    :state="state"
    :submit="submit"
    @success="$emit('created')"
  >
    <!-- 🔥 Trigger -->
    <template #trigger>
      <UButton label="New User" icon="i-lucide-plus" />
    </template>

    <!-- 🔥 FORM -->
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" autofocus class="w-full" />
    </UFormField>

    <UFormField label="Email" name="email">
      <UInput v-model="state.email" class="w-full" />
    </UFormField>

    <UFormField label="Password" name="password">
      <UInput v-model="state.password" type="password" class="w-full" />
    </UFormField>

    <UFormField label="Confirm Password" name="confirm_password">
      <UInput v-model="state.confirm_password" type="password" class="w-full" />
    </UFormField>
  </BaseFormModal>
</template>