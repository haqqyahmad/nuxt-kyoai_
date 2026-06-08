<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold text-highlighted">
        Shift Coverage
      </h3>
    </template>

    <div class="space-y-4">
      <UAlert
        color="success"
        variant="soft"
        icon="i-lucide-circle-check"
        title="Full Coverage"
        description="24 dari 28 shift sudah terisi optimal untuk minggu ini."
      />

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase text-muted">
          Alerts & Conflicts
        </p>

        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Understaffing"
          description="Oct 24 - Night Shift Engineering."
        />

        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-clock"
          title="Double Shift"
          description="Mark R. terjadwal double shift pada Oct 22."
        />
      </div>

      <div class="rounded-lg bg-muted p-4 text-center">
        <p class="text-xs font-semibold uppercase text-muted">
          Auto-Scheduler Status
        </p>

        <div class="mt-2 flex items-center justify-center gap-2">
          <span class="size-2 rounded-full bg-success animate-pulse" />
          <span class="text-sm font-medium text-highlighted">
            System Optimizing...
          </span>
        </div>
      </div>
    </div>
  </UCard>
</template>
