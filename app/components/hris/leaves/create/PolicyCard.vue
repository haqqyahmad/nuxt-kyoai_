<!-- app/components/hris/leaves/create/PolicyCard.vue -->

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-info"
          class="size-5 text-primary"
        />

        <h2 class="font-semibold text-highlighted">
          Informasi Penting
        </h2>
      </div>
    </template>

    <ul class="space-y-4 text-sm text-muted">
      <li class="flex gap-3">
        <UIcon
          name="i-lucide-check-circle"
          class="mt-0.5 size-4 shrink-0 text-primary"
        />
        <span>
          Pengajuan cuti minimal dilakukan 3 hari kerja sebelum tanggal pelaksanaan.
        </span>
      </li>

      <li class="flex gap-3">
        <UIcon
          name="i-lucide-check-circle"
          class="mt-0.5 size-4 shrink-0 text-primary"
        />
        <span>
          Pastikan delegasi pekerjaan telah disepakati dengan rekan tim terkait.
        </span>
      </li>

      <li class="flex gap-3">
        <UIcon
          name="i-lucide-check-circle"
          class="mt-0.5 size-4 shrink-0 text-primary"
        />
        <span>
          Persetujuan akan dilakukan oleh atasan langsung atau HR.
        </span>
      </li>
    </ul>
  </UCard>
</template>
