<!-- app/components/hris/leaves/detail/EmployeeProfileCard.vue -->

<script setup lang="ts">
import type { EmployeeProfile } from '~/types/hris-leave'

defineProps<{
  employee: EmployeeProfile
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="flex size-10 items-center justify-center rounded-lg bg-primary/10"
        >
          <UIcon
            name="i-lucide-user-round"
            class="size-5 text-primary"
          />
        </div>

        <div>
          <h2 class="font-semibold text-highlighted">
            Informasi Karyawan
          </h2>

          <p class="text-sm text-muted">
            Data karyawan yang mengajukan permohonan cuti.
          </p>
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-5 lg:flex-row">
      <div class="flex items-center gap-4">
        <UAvatar
          :src="employee.avatar || undefined"
          :text="getInitial(employee.name)"
          :alt="employee.name"
          size="3xl"
        />

        <div>
          <h3 class="text-lg font-semibold text-highlighted">
            {{ employee.name }}
          </h3>

          <p class="text-sm text-muted">
            {{ employee.position || '-' }}
          </p>

          <UBadge
            color="primary"
            variant="soft"
            class="mt-2"
          >
            {{ employee.employee_code }}
          </UBadge>
        </div>
      </div>

      <div class="flex-1">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-lg border border-default p-4">
            <div class="mb-2 flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-building-2" />
              <span class="text-xs uppercase tracking-wide">
                Departemen
              </span>
            </div>

            <p class="font-medium text-highlighted">
              {{ employee.department || '-' }}
            </p>
          </div>

          <div class="rounded-lg border border-default p-4">
            <div class="mb-2 flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-mail" />
              <span class="text-xs uppercase tracking-wide">
                Email
              </span>
            </div>

            <p class="break-all font-medium text-highlighted">
              {{ employee.email || '-' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
