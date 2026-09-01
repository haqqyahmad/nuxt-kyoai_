<!-- app/components/hris/leaves/PageHeader.vue -->

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <UIcon
          name="i-lucide-calendar-days"
          class="size-6 text-primary"
        />
      </div>

      <div>
        <UBadge
          color="primary"
          variant="soft"
          size="sm"
          class="mb-1"
        >
          HRIS Module
        </UBadge>

        <h1 class="text-3xl font-bold tracking-tight text-highlighted">
          Manajemen Cuti & Izin
        </h1>
      </div>
    </div>

    <p class="max-w-3xl text-sm leading-6 text-muted">
      Kelola permohonan cuti, izin khusus, cuti sakit, serta proses persetujuan
      karyawan secara terpusat.
    </p>
  </div>
</template>
