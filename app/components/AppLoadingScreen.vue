<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'Menyiapkan aplikasi',
  description: 'Memuat aset, konfigurasi, dan data awal.'
})

const loadingSteps = [
  'Mengecek sesi',
  'Menyiapkan komponen',
  'Mengambil data awal'
]
</script>

<template>
  <div
    class="fixed inset-0 z-[9999] overflow-hidden"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.24),_transparent_38%),linear-gradient(135deg,_#030712_0%,_#0f172a_50%,_#020617_100%)]" />

    <div class="absolute inset-0 opacity-70">
      <div class="loading-blob loading-blob-one" />
      <div class="loading-blob loading-blob-two" />
      <div class="loading-grid" />
    </div>

    <div class="relative flex min-h-screen items-center justify-center px-6 py-10">
      <div class="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="flex flex-col justify-center text-white">
          <div class="mb-6 flex items-center gap-3">
            <div class="relative flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-2xl shadow-emerald-500/10 backdrop-blur">
              <div class="size-5 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin" />
              <div class="absolute inset-2 rounded-xl border border-white/10" />
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200/80">
                ERP Express
              </p>
              <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
                {{ title }}
              </h1>
            </div>
          </div>

          <p class="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            {{ description }}
          </p>

          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <div
              v-for="step in loadingSteps"
              :key="step"
              class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
            >
              <div class="mb-2 h-2 w-10 rounded-full bg-emerald-400/80" />
              <p class="text-sm font-medium text-white/90">
                {{ step }}
              </p>
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="absolute -inset-6 rounded-[2rem] bg-emerald-500/10 blur-3xl" />

          <div class="relative rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div class="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <div class="h-3 w-24 rounded-full bg-white/15" />
                  <div class="mt-3 h-8 w-48 rounded-full bg-white/10" />
                </div>
                <div class="h-10 w-10 rounded-2xl bg-emerald-400/15" />
              </div>

              <div class="mt-6 space-y-3">
                <div class="h-4 w-2/3 rounded-full bg-white/10" />
                <div class="h-4 w-4/5 rounded-full bg-white/10" />
                <div class="h-4 w-1/2 rounded-full bg-white/10" />
              </div>

              <div class="mt-6 grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="h-3 w-20 rounded-full bg-emerald-300/20" />
                  <div class="mt-4 h-14 rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 loading-shimmer" />
                </div>

                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="h-3 w-24 rounded-full bg-emerald-300/20" />
                  <div class="mt-4 grid gap-2">
                    <div class="h-3 rounded-full bg-white/10" />
                    <div class="h-3 w-5/6 rounded-full bg-white/10" />
                    <div class="h-3 w-2/3 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>

              <div class="mt-6 flex items-center gap-3">
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div class="loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-lime-300" />
                </div>
                <span class="text-xs font-medium uppercase tracking-[0.3em] text-emerald-200/80">
                  Loading
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(0, -18px, 0) scale(1.05);
  }
}

@keyframes sweep {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(320%);
  }
}

.loading-blob {
  position: absolute;
  border-radius: 9999px;
  filter: blur(60px);
  opacity: 0.75;
  animation: float 9s ease-in-out infinite;
}

.loading-blob-one {
  top: 8%;
  left: 12%;
  width: 18rem;
  height: 18rem;
  background: rgba(16, 185, 129, 0.24);
}

.loading-blob-two {
  right: 8%;
  bottom: 6%;
  width: 20rem;
  height: 20rem;
  background: rgba(59, 130, 246, 0.18);
  animation-delay: -3s;
}

.loading-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent 85%);
}

.loading-shimmer {
  position: relative;
  overflow: hidden;
}

.loading-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.16), transparent);
  animation: sweep 1.8s infinite;
}

.loading-bar {
  position: relative;
  overflow: hidden;
  animation: sweep 1.8s ease-in-out infinite;
}
</style>
