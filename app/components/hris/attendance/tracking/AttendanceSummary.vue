<!-- app/components/hris/attendance/dashboard/AttendanceSummary.vue -->

<template>
  <UCard>
    <div class="grid gap-4 md:grid-cols-3">
      <div>
        <p class="text-xs font-semibold uppercase text-muted">
          Total Attendance
        </p>
        <p class="mt-1 text-xl font-bold text-primary">
          18 Hari
        </p>
      </div>

      <div>
        <p class="text-xs font-semibold uppercase text-muted">
          Total Late
        </p>
        <p class="mt-1 text-xl font-bold text-error">
          45 Menit
        </p>
      </div>

      <div>
        <p class="text-xs font-semibold uppercase text-muted">
          Total Early
        </p>
        <p class="mt-1 text-xl font-bold text-error">
          12 Menit
        </p>
      </div>
    </div>
  </UCard>
</template>
