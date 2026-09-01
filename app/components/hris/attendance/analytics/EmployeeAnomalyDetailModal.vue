<script setup lang="ts">
const open = defineModel<boolean>('open', {
  default: false
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Employee Anomaly Detail"
    description="Detail anomali attendance karyawan."
  >
    <template #body>
      <div class="space-y-5">
        <div class="flex items-center gap-3">
          <UAvatar text="ER" size="lg" />

          <div>
            <p class="font-semibold text-highlighted">
              Elena Rodriguez
            </p>

            <p class="text-sm text-muted">
              Operations · UID: 10425
            </p>
          </div>
        </div>

        <div>
          <div class="mb-2 flex justify-between text-sm">
            <span class="text-muted">Attendance Score</span>
            <strong class="text-warning">72%</strong>
          </div>

          <UProgress
            :model-value="72"
            color="warning"
          />
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          <UCard>
            <p class="text-xs uppercase text-muted">
              Late Count
            </p>
            <p class="text-2xl font-bold text-error">
              8
            </p>
          </UCard>

          <UCard>
            <p class="text-xs uppercase text-muted">
              Missing Logs
            </p>
            <p class="text-2xl font-bold text-primary">
              1
            </p>
          </UCard>

          <UCard>
            <p class="text-xs uppercase text-muted">
              Period
            </p>
            <p class="text-2xl font-bold text-highlighted">
              30d
            </p>
          </UCard>
        </div>

        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Frequent lateness detected"
          description="Karyawan terlambat 8 kali dalam 30 hari terakhir."
        />

        <UAlert
          color="primary"
          variant="soft"
          icon="i-lucide-lightbulb"
          title="Recommendation"
          description="Pertimbangkan diskusi fleksibilitas jam masuk atau evaluasi kendala commute."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton @click="open = false">
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>
