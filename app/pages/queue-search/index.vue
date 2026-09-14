<script setup lang="ts">
const api = useApi()
const toast = useToast()

definePageMeta({
  layout: false,
  middleware: 'auth'
})

const serviceNumber = ref('')
const loading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// Detect HID barcode scan: characters arrive very fast, then stop.
// Manual typing is slower so it does not trigger auto-submit.
const SCAN_KEY_GAP_MS = 80
const SCAN_IDLE_MS = 120
const SCAN_MIN_CHARS = 3

let lastSubmitAt = 0
let lastKeyAt = 0
let fastChars = 0
let idleTimer: ReturnType<typeof setTimeout> | null = null

function focusInput() {
  nextTick(() => inputRef.value?.focus())
}

async function onSubmit() {
  const value = serviceNumber.value.trim()
  if (!value) {
    focusInput()
    return
  }

  const now = Date.now()
  if (now - lastSubmitAt < 300) return
  lastSubmitAt = now

  if (idleTimer) clearTimeout(idleTimer)
  fastChars = 0

  if (loading.value) return
  loading.value = true

  try {
    const res = await api.get(`/registration/by-service-number/${encodeURIComponent(value)}`)
    const idReg = res.data?.data?.id_reg
    if (!idReg) throw new Error('Service No not found')
    await navigateTo(`/queue-search/${idReg}`)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({
      title: status === 404
        ? 'Service No not found'
        : status === 409
          ? 'Service No registered more than once'
          : 'Failed to search Service No',
      description: message || 'Try scanning again or contact staff.',
      color: 'error'
    })
    serviceNumber.value = ''
    focusInput()
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    onSubmit()
    return
  }

  const now = Date.now()
  const gap = lastKeyAt ? now - lastKeyAt : Infinity
  lastKeyAt = now
  fastChars = gap < SCAN_KEY_GAP_MS ? fastChars + 1 : 1

  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (fastChars >= SCAN_MIN_CHARS) onSubmit()
  }, SCAN_IDLE_MS)
}

onMounted(focusInput)
onBeforeUnmount(() => {
  if (idleTimer) clearTimeout(idleTimer)
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-elevated flex items-center justify-center px-6" @click="focusInput">
    <div class="w-full max-w-xl flex flex-col items-center gap-8">
      <div class="text-center space-y-2">
        <img src="/logo.png" alt="Kyoai Medical Services" class="h-28 w-auto mx-auto">
        <h1 class="text-4xl font-bold">
          Find Patient
        </h1>
        <p class="text-lg text-muted">
          Scan the barcode or type the Service No (Locker No)
        </p>
      </div>

      <form class="w-full" @submit.prevent="onSubmit">
        <div class="flex gap-3">
          <input
            ref="inputRef"
            v-model="serviceNumber"
            type="text"
            inputmode="text"
            autocomplete="off"
            autofocus
            placeholder="Service No"
            class="flex-1 h-16 px-5 text-2xl text-center tracking-widest rounded-xl border border-default bg-default outline-none focus:border-primary"
            @keydown="onKeydown"
          >
          <UButton
            type="submit"
            size="xl"
            square
            color="secondary"
            icon="i-lucide-search"
            aria-label="Search"
            :loading="loading"
            class="h-16 w-16 shrink-0 flex items-center justify-center p-0"
          />
        </div>
      </form>

      <p class="text-sm text-muted text-center">
        Today's patient locker number. The screen returns automatically after a few seconds.
      </p>
    </div>
  </div>
</template>
