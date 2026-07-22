<script setup lang="ts">
</script>

<template>
  <UDashboardPanel id="reimbursement">
    <template #header>
      <UDashboardNavbar title="Reimbursement">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center">
        <UIcon name="i-lucide-wallet" class="mb-3 size-10 text-muted" />
        <h3 class="text-base font-semibold text-highlighted">
          Halaman Reimbursement
        </h3>
        <p class="mt-1 max-w-lg text-sm text-muted">
          Halaman ini masih dalam pengembangan.
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
