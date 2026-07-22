<script setup lang="ts">
const { permissions } = await useCurrentUser()

const canAccessSampleReceive = computed(() =>
  permissions.value.includes('sample:receive')
)
</script>

<template>
  <UDashboardPanel id="sample-reception">
    <template #header>
      <UDashboardNavbar title="Sample Receive" />
    </template>

    <template #body>
      <UAlert
        v-if="!canAccessSampleReceive"
        color="error"
        variant="soft"
        icon="i-lucide-shield-alert"
        title="Tidak memiliki akses"
        description="Menu Sample Receive hanya dapat diakses oleh role LAB."
      />

      <RoomsSampleReceptionPanel v-else />
    </template>
  </UDashboardPanel>
</template>
