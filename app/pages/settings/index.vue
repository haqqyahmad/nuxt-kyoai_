<!-- app/pages/settings/index.vue -->
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const api = useApi()
const toast = useToast()
const fileRef = ref<HTMLInputElement>()

const userId = ref<number | string | null>(null)

const profileSchema = z.object({
  name: z.string().min(2, 'Too short'),
  email: z.string().email('Invalid email'),
  avatar: z.string().optional(),
  bio: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<Partial<ProfileSchema>>({
  name: '',
  email: '',
  username: '',
  avatar: undefined,
  bio: undefined
})

const pending = ref(false)
const error = ref<any>(null)

async function fetchProfile() {
  pending.value = true
  error.value = null

  try {
    // ambil profile user login
    const res = await api.get('/users/auth')

    const data = res.data.data

    console.log('PROFILE LOGIN:', data)

    // simpan id user login
    userId.value = data.id

    // isi form
    profile.name = data.name ?? ''
    profile.email = data.email ?? ''
    profile.username = data.username ?? ''
    profile.avatar = data.avatar ?? undefined
    profile.bio = data.bio ?? undefined
  } catch (err) {
    console.error(err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(async () => {
  await fetchProfile()
})

const saving = ref(false)

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  console.log('SUBMIT DATA:', event.data)
  console.log('USER ID:', userId.value)

  if (!userId.value || saving.value) return

  saving.value = true

  try {
    await api.put(`/users/${userId.value}`, {
      name: event.data.name,
      email: event.data.email,
      avatar: event.data.avatar,
      bio: event.data.bio
    })

    toast.add({
      title: 'Success',
      description: 'Profile berhasil diperbarui.',
      icon: 'i-lucide-check',
      color: 'success'
    })

    await fetchProfile()
  } catch (err) {
    console.error(err)

    toast.add({
      title: 'Error',
      description: 'Gagal memperbarui profile.',
      icon: 'i-lucide-x',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) return

  profile.avatar = URL.createObjectURL(input.files[0]!)
}

function onFileClick() {
  fileRef.value?.click()
}
</script>

<template>
  <div>
    <UPageCard
      v-if="pending"
      title="Loading..."
      description="Sedang mengambil data profile."
      variant="subtle"
    />

    <UAlert
      v-else-if="error"
      title="Gagal mengambil data"
      description="Data profile tidak ditemukan atau terjadi kesalahan."
      color="error"
      icon="i-lucide-alert-circle"
    />

    <UAlert
      v-else-if="!userId"
      title="User belum login"
      description="Silakan login terlebih dahulu."
      color="warning"
      icon="i-lucide-alert-triangle"
    />

    <UForm
      v-else
      id="settings"
      :schema="profileSchema"
      :state="profile"
      @submit="onSubmit"
    >
      <UPageCard
        title="Profile"
        description="These informations will be displayed publicly."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      >
        <UButton
          form="settings"
          label="Save changes"
          color="neutral"
          type="submit"
          :loading="saving"
          class="w-fit lg:ms-auto"
        />
      </UPageCard>

      <UPageCard variant="subtle">
        <UFormField
          name="name"
          label="Name"
          description="Will appear on receipts, invoices, and other communication."
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput v-model="profile.name" autocomplete="off" />
        </UFormField>

        <USeparator />

        <UFormField
          name="email"
          label="Email"
          description="Used to sign in, for email receipts and product updates."
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput v-model="profile.email" type="email" autocomplete="off" />
        </UFormField>

        <USeparator />

        <UFormField
          name="avatar"
          label="Avatar"
          description="JPG, GIF or PNG. 1MB Max."
          class="flex max-sm:flex-col justify-between sm:items-center gap-4"
        >
          <div class="flex flex-wrap items-center gap-3">
            <UAvatar
              :src="profile.avatar"
              :alt="profile.name"
              size="lg"
            />

            <UButton
              label="Choose"
              color="neutral"
              type="button"
              @click="onFileClick"
            />

            <input
              ref="fileRef"
              type="file"
              class="hidden"
              accept=".jpg, .jpeg, .png, .gif"
              @change="onFileChange"
            >
          </div>
        </UFormField>

        <USeparator />

        <UFormField
          name="bio"
          label="Bio"
          description="Brief description for your profile. URLs are hyperlinked."
          class="flex max-sm:flex-col justify-between items-start gap-4"
          :ui="{ container: 'w-full' }"
        >
          <UTextarea
            v-model="profile.bio"
            :rows="5"
            autoresize
            class="w-full"
          />
        </UFormField>
      </UPageCard>
    </UForm>
  </div>
</template>
