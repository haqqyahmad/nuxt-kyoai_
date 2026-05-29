<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
// import type { AxiosInstance } from "axios";

const api = useApi()
const { setToken } = useAuth()
const toast = useToast()

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

// const loading = ref(false)
// const open = ref(false)

// =======================
// 🧾 Fields
// =======================

const fields = computed<AuthFormField[]>(() => [
  {
    'name': 'email',
    'type': 'email',
    'label': 'Email',
    'placeholder': 'Enter your email',
    'required': true,
    'autofocus': true,
    'modelValue': loginState.email,
    'onUpdate:modelValue': (val: string) => (loginState.email = val)
  },
  {
    'name': 'password',
    'label': 'Password',
    'type': 'password',
    'placeholder': 'Enter your password',
    'required': true,
    'modelValue': loginState.password,
    'onUpdate:modelValue': (val: string) => (loginState.password = val)
  },
  {
    'name': 'remember',
    'label': 'Remember me',
    'type': 'checkbox',
    'modelValue': loginState.remember,
    'onUpdate:modelValue': (val: boolean) => (loginState.remember = val)
  }
])

// =======================
// ✅ Schema (FIXED)
// =======================
const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Must be at least 8 characters')
})

// type Schema = z.output<typeof schema>;
// type RegSchema = z.output<typeof Regschema>;
type Schema = z.infer<typeof schema>

// =======================
// 🔐 LOGIN
// =======================
async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const res = await api.post('/auth/login', {
      email: payload.data.email,
      password: payload.data.password
    })
    setToken(res.data.data.token, loginState.remember)

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

const loginState = reactive({
  email: '',
  password: '',
  remember: false
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <img
          src="/logo.png"
          alt="Kyoai Medical Services"
          class="h-20 w-auto mx-auto"
        >

        <h1 class="mt-4 text-2xl font-bold">
          Kyoai Medical Services
        </h1>

        <p class="mt-1 text-sm text-muted">
          Medical Examination Management System
        </p>
      </div>

      <!-- Login Card -->
      <UPageCard
        class="shadow-xl border border-default"
      >
        <UAuthForm
          :schema="schema"
          :state="loginState"
          title="Sign In"
          description="Enter your email and password to continue."
          icon="i-lucide-user"
          :fields="fields"
          :submit="{
            label: 'Login',
            color: 'secondary',
            size: 'lg'
          }"
          @submit="onSubmit"
        />
      </UPageCard>
    </div>
  </div>
</template>
