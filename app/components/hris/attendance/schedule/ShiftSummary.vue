<template>
  <aside class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-highlighted">
            Period Summary
          </h3>

          <UIcon name="i-lucide-chart-no-axes-combined" class="size-5 text-muted" />
        </div>
      </template>

      <div class="space-y-5">
        <div class="flex items-end justify-between">
          <div>
            <p class="text-xs font-semibold uppercase text-muted">
              Total Scheduled Hours
            </p>

            <p class="text-3xl font-bold text-primary">
              1,248.5
            </p>
          </div>

          <div class="text-right">
            <p class="text-sm font-semibold text-success">
              +4.2%
            </p>

            <p class="text-xs text-muted">
              vs last week
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="mb-1 flex justify-between text-sm">
              <span>Morning Shift</span>
              <strong>480h</strong>
            </div>
            <UProgress :model-value="40" color="success" />
          </div>

          <div>
            <div class="mb-1 flex justify-between text-sm">
              <span>Evening Shift</span>
              <strong>412h</strong>
            </div>
            <UProgress :model-value="33" color="warning" />
          </div>

          <div>
            <div class="mb-1 flex justify-between text-sm">
              <span>Night Shift</span>
              <strong>356.5h</strong>
            </div>
            <UProgress :model-value="27" color="primary" />
          </div>
        </div>
      </div>
    </UCard>

    <HrisAttendanceShiftCoverageCard />
  </aside>
</template>
