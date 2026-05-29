<!-- app/pages/settings/security.vue -->
<script setup lang="ts">
import * as z from 'zod'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const api = useApi()
const toast = useToast()

const loading = ref(false)

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)

const passwordSchema = z.object({
  current: z.string().min(8, 'Must be at least 8 characters'),
  new: z.string().min(8, 'Must be at least 8 characters')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: '',
  new: ''
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []

  if (state.current && state.new && state.current === state.new) {
    errors.push({
      name: 'new',
      message: 'Password baru tidak boleh sama dengan password lama'
    })
  }

  return errors
}

async function onSubmit(event: FormSubmitEvent<PasswordSchema>) {
  if (loading.value) return

  loading.value = true

  try {
    console.log(typeof api.put)
    await api.put('/auth/change-password', {
      currentPassword: event.data.current,
      newPassword: event.data.new
    })

    toast.add({
      title: 'Berhasil',
      description: 'Password berhasil diubah',
      color: 'success'
    })

    password.current = ''
    password.new = ''
  } catch (error: any) {
    toast.add({
      title: 'Gagal',
      description: error?.data?.message || 'Password gagal diubah',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UPageCard
    title="Password"
    description="Confirm your current password before setting a new one."
    variant="subtle"
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      class="flex flex-col gap-4 max-w-xs"
      @submit="onSubmit"
    >
      <UFormField
        label="Current Password"
        name="current"
      >
        <UInput
          v-model="password.current"
          :type="showCurrentPassword ? 'text' : 'password'"
          placeholder="Current password"
          class="w-full"
          autocomplete="current-password"
        >
          <template #trailing>
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              :icon="
                showCurrentPassword
                  ? 'i-lucide-eye-off'
                  : 'i-lucide-eye'
              "
              @click="showCurrentPassword = !showCurrentPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UFormField
        label="New Password"
        name="new"
      >
        <UInput
          v-model="password.new"
          :type="showNewPassword ? 'text' : 'password'"
          placeholder="New password"
          class="w-full"
          autocomplete="new-password"
        >
          <template #trailing>
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              :icon="
                showNewPassword
                  ? 'i-lucide-eye-off'
                  : 'i-lucide-eye'
              "
              @click="showNewPassword = !showNewPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UButton
        label="Update"
        class="w-fit"
        type="submit"
        :loading="loading"
      />
    </UForm>
  </UPageCard>

  <UPageCard
    title="Account"
    description="No longer want to use our service? You can delete your account here. This action is not reversible. All information related to this account will be deleted permanently."
    class="bg-linear-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton label="Delete account" color="error" />
    </template>
  </UPageCard>
</template>
