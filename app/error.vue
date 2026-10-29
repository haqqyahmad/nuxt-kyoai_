<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isForbidden = computed(() => Number(props.error?.statusCode) === 403)

const backPath = computed(() => {
  const data = props.error?.data as { redirect?: string } | undefined
  return data?.redirect || '/'
})

useSeoMeta({
  title: () => isForbidden.value ? 'Akses ditolak' : 'Page not found',
  description: () => isForbidden.value
    ? 'Anda tidak punya akses ke halaman ini.'
    : 'We are sorry but this page could not be found.'
})

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})

function goBack() {
  clearError({ redirect: backPath.value })
}
</script>

<template>
  <UApp>
    <UError v-if="!isForbidden" :error="error" />
    <div v-else class="flex min-h-screen items-center justify-center bg-default p-6">
      <UCard class="w-full max-w-md text-center">
        <UIcon name="i-lucide-lock" class="mx-auto mb-3 size-12 text-warning" />
        <p class="text-sm font-semibold text-muted">
          403
        </p>
        <h1 class="mt-1 text-xl font-semibold text-highlighted">
          Akses ditolak
        </h1>
        <p class="mt-2 text-sm text-muted">
          Anda tidak punya akses ke halaman ini.
        </p>
        <UButton
          class="mt-6"
          icon="i-lucide-arrow-left"
          @click="goBack"
        >
          Kembali
        </UButton>
      </UCard>
    </div>
  </UApp>
</template>
