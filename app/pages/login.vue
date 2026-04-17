<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import type { AxiosInstance } from 'axios'

const api = useApi()
const { setToken } = useAuth()

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})
const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
}, {
  name: 'remember',
  label: 'Remember me',
  type: 'checkbox'
}]

const providers = [{
 
}]

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const res = await api.post('/auth/login', {
      email: payload.data.email,
      password: payload.data.password
    })
    setToken(res.data.data.token)

    toast.add({
      title: 'Login berhasil',
      color: 'success'
    })

    await navigateTo('/')
  } catch (err: any) {
    toast.add({
      title: 'Login gagal',
      description: err.response?.data?.message || 'Terjadi kesalahan',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4 mt-5">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        title="Login"
        description="Enter your credentials to access your account."
        icon="i-lucide-user"
        :fields="fields"
        :submit="{
    label: 'Masuk',
    color: 'secondary',
    size: 'lg',
    loading: false
  }"
        @submit="onSubmit"
      />
    </UPageCard>
  </div>
</template>

