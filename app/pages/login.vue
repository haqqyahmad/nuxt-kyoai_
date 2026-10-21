<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const api = useApi()
const route = useRoute()
const { setToken } = useAuth()
const toast = useToast()

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const loading = ref(false)

const fields = computed<AuthFormField[]>(() => [
  {
    'name': 'email',
    'type': 'email',
    'label': 'Email',
    'placeholder': 'Enter your email',
    'required': true,
    'autofocus': true,
    'modelValue': loginState.email,
    'onUpdate:modelValue': (val: string) => { loginState.email = val }
  },
  {
    'name': 'password',
    'label': 'Password',
    'type': 'password',
    'placeholder': 'Enter your password',
    'required': true,
    'modelValue': loginState.password,
    'onUpdate:modelValue': (val: string) => { loginState.password = val }
  },
  {
    'name': 'remember',
    'label': 'Remember me',
    'type': 'checkbox',
    'modelValue': loginState.remember,
    'onUpdate:modelValue': (val: boolean) => { loginState.remember = val }
  }
])

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z
    .string()
    .min(1, 'Password is required')
})

type Schema = z.infer<typeof schema>

function safeRedirect(value: unknown): string | null {
  const path = Array.isArray(value) ? String(value[0] ?? '') : typeof value === 'string' ? value : ''
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) return null
  return path
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (loading.value) return
  loading.value = true

  try {
    const res = await api.post('/auth/login', {
      email: payload.data.email.trim().toLowerCase(),
      password: payload.data.password,
      remember: loginState.remember
    })
    setToken(res.data.data.token, loginState.remember)

    toast.add({
      title: 'Login berhasil',
      color: 'success'
    })

    const roles: string[] = res.data.data.roles ?? []
    const externalRole = 'dokter-external'
    const isExternalDoctor = Boolean(res.data.data.isExternal) || roles.includes(externalRole)
    const frontOfficeRole = 'front-office'
    const queueSearchRole = 'queue-search'
    const medicalRecordRole = 'medical-record'
    const staffRoles = ['petugas-lab', 'petugas-radiologi', 'dokter', 'nurse', 'dokter-gigi']

    const roleTarget = isExternalDoctor
      ? '/result/exam-results'
      : roles.includes(queueSearchRole)
        ? '/queue-search'
        : roles.includes(frontOfficeRole)
          ? '/front-office/registration-temp'
          : roles.includes(medicalRecordRole)
            ? '/result/mr-review'
            : roles.some(r => staffRoles.includes(r))
              ? '/rooms/assignments'
              : '/'

    const redirectQuery = route.query.redirect
      ?? (import.meta.client ? new URLSearchParams(window.location.search).get('redirect') : null)
    await navigateTo(safeRedirect(redirectQuery) ?? roleTarget)
  } catch (err: unknown) {
    const response = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { status?: number, data?: { message?: string } } }).response
      : undefined
    let message = response?.data?.message
    if (response?.status === 401) {
      message = 'Email atau password salah. Periksa kembali data Anda.'
    } else if (response?.status === 429) {
      message = message || 'Terlalu banyak percobaan login. Coba lagi beberapa saat.'
    } else if (!response) {
      message = 'Tidak dapat terhubung ke server. Periksa jaringan Anda.'
    }
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
          src="/logo-login.png"
          alt="Kyoai Medical Services"
          class="h-auto w-[150px] mx-auto"
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

        <p class="mt-0 text-center text-sm text-muted">
          Lupa password? Hubungi admin/IT.
        </p>
      </UPageCard>
    </div>
  </div>
</template>
