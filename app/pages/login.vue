<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const api = useApi()
const { setToken } = useAuth()
const toast = useToast()

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const loading = ref(false)

const fields = computed<AuthFormField[]>(() => [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true,
    autofocus: true,
    'modelValue': loginState.email,
    'onUpdate:modelValue': (val: string) => { loginState.email = val }
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true,
    'modelValue': loginState.password,
    'onUpdate:modelValue': (val: string) => { loginState.password = val }
  },
  {
    name: 'remember',
    label: 'Remember me',
    type: 'checkbox',
    'modelValue': loginState.remember,
    'onUpdate:modelValue': (val: boolean) => { loginState.remember = val }
  }
])

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Must be at least 8 characters')
})

type Schema = z.infer<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (loading.value) return
  loading.value = true

  try {
    const res = await api.post('/auth/login', {
      email: payload.data.email,
      password: payload.data.password,
      remember: loginState.remember
    })
    setToken(res.data.data.token, loginState.remember)

    toast.add({
      title: 'Login berhasil',
      color: 'success'
    })

    const roles: string[] = res.data.data.roles ?? []
    const redirectRoles = ['petugas-lab', 'petugas-radiologi', 'dokter']
    const target = roles.some(r => redirectRoles.includes(r))
      ? '/rooms/assignments'
      : '/'

    await navigateTo(target)
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Koneksi gagal. Periksa jaringan Anda.'
    toast.add({
      title: 'Login gagal',
      description: message || 'Terjadi kesalahan',
      color: 'error'
    })
  } finally {
    loading.value = false
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
      <div class="text-center mb-6">
        <img
          src="/logo.png"
          alt="Kyoai Medical Services"
          class="h-40 w-auto mx-auto"
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
            size: 'lg',
            loading: loading
          }"
          @submit="onSubmit"
        />
      </UPageCard>
    </div>
  </div>
</template>
