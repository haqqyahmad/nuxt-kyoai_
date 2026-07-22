<script setup lang="ts">
import * as z from 'zod'
import { handleError, handleSuccess } from '~/utils/handlers'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const userId = computed(() => Number(route.params.id))

const schema = z.object({
  name: z.string().min(2, 'Too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters').optional().or(z.literal(''))
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  password: ''
})

const loading = ref(false)
const pending = ref(true)
const error = ref<unknown>(null)

async function fetchUser() {
  pending.value = true
  error.value = null
  try {
    const res = await api.get(`/users/${userId.value}`)
    const data = res.data?.data ?? res.data
    state.name = data.name ?? ''
    state.email = data.email ?? ''
    state.password = ''
  } catch (err) {
    error.value = err
  } finally {
    pending.value = false
  }
}

async function onSubmit(event: { data: Schema }) {
  if (loading.value) return
  loading.value = true
  try {
    const payload: Record<string, unknown> = {
      name: event.data.name,
      email: event.data.email
    }
    if (event.data.password) {
      payload.password = event.data.password
    }

    await api.put(`/users/${userId.value}`, payload)
    handleSuccess(toast, state.name || 'User')
    router.push('/users')
  } catch (err: unknown) {
    handleError(toast, err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchUser)
</script>

<template>
  <UDashboardPanel id="user-edit">
    <template #header>
      <UDashboardNavbar :title="`Edit User #${userId}`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Back"
            color="neutral"
            variant="subtle"
            icon="i-lucide-arrow-left"
            @click="router.push('/users')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-xl py-6">
        <UPageCard
          v-if="pending"
          title="Loading..."
          description="Sedang mengambil data user."
          variant="subtle"
        />
        <UAlert
          v-else-if="error"
          title="Gagal mengambil data"
          description="User tidak ditemukan."
          color="error"
          icon="i-lucide-alert-circle"
        />

        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField label="Name" name="name" required>
            <UInput v-model="state.name" class="w-full" />
          </UFormField>

          <UFormField label="Email" name="email" required>
            <UInput v-model="state.email" type="email" class="w-full" />
          </UFormField>

          <UFormField
            label="New Password"
            name="password"
            description="Kosongkan jika tidak ingin mengubah password."
          >
            <UInput v-model="state.password" type="password" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="subtle"
              @click="router.push('/users')"
            />
            <UButton
              label="Save"
              type="submit"
              :loading="loading"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UDashboardPanel>
</template>
