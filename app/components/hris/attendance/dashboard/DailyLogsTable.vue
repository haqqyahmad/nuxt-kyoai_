<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'

type AttendanceStatus = 'Present' | 'Late' | 'Leave' | 'Absent' | 'Overtime'

type AttendanceRow = {
  id: number
  name: string
  department: string
  date: string
  clockIn: string
  clockOut: string
  status: AttendanceStatus
  totalHours: string
}

const page = ref(1)

const rows: AttendanceRow[] = [
  {
    id: 1,
    name: 'Alex Rivera',
    department: 'Eng - Frontend',
    date: 'Oct 26, 2023',
    clockIn: '08:54 AM',
    clockOut: '05:42 PM',
    status: 'Present',
    totalHours: '8h 48m'
  },
  {
    id: 2,
    name: 'Sarah Chen',
    department: 'Marketing - Lead',
    date: 'Oct 26, 2023',
    clockIn: '09:32 AM',
    clockOut: '06:00 PM',
    status: 'Late',
    totalHours: '8h 28m'
  },
  {
    id: 3,
    name: 'Jordan Smith',
    department: 'Sales - Director',
    date: 'Oct 26, 2023',
    clockIn: '--',
    clockOut: '--',
    status: 'Leave',
    totalHours: '0h 0m'
  },
  {
    id: 4,
    name: 'Michael Tan',
    department: 'Eng - Backend',
    date: 'Oct 26, 2023',
    clockIn: '--',
    clockOut: '--',
    status: 'Absent',
    totalHours: '0h 0m'
  },
  {
    id: 5,
    name: 'Emily Watson',
    department: 'Ops - Manager',
    date: 'Oct 26, 2023',
    clockIn: '08:00 AM',
    clockOut: '07:30 PM',
    status: 'Overtime',
    totalHours: '11h 30m'
  }
]

const statusConfig: Record<AttendanceStatus, {
  color: BadgeProps['color']
  icon: string
}> = {
  Present: {
    color: 'success',
    icon: 'i-lucide-check-circle'
  },
  Late: {
    color: 'warning',
    icon: 'i-lucide-clock'
  },
  Leave: {
    color: 'primary',
    icon: 'i-lucide-calendar-minus'
  },
  Absent: {
    color: 'error',
    icon: 'i-lucide-x-circle'
  },
  Overtime: {
    color: 'warning',
    icon: 'i-lucide-clock-plus'
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(item => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
</script>

<template>
  <UCard>
    <div class="overflow-hidden rounded-lg border border-default">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[920px] text-left text-sm">
          <thead class="bg-muted/60">
            <tr class="border-b border-default">
              <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Employee Name
              </th>
              <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Date
              </th>
              <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Clock In
              </th>
              <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Clock Out
              </th>
              <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Status
              </th>
              <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Total Hours
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                Actions
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-default bg-default">
            <tr
              v-for="row in rows"
              :key="row.id"
              class="transition-colors hover:bg-muted/40"
            >
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :text="getInitials(row.name)"
                    size="md"
                    class="ring-1 ring-default"
                  />

                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">
                      {{ row.name }}
                    </p>

                    <p class="truncate text-xs text-muted">
                      {{ row.department }}
                    </p>
                  </div>
                </div>
              </td>

              <td class="whitespace-nowrap px-4 py-4 text-highlighted">
                {{ row.date }}
              </td>

              <td
                class="whitespace-nowrap px-4 py-4 font-medium"
                :class="row.status === 'Late' ? 'text-warning' : 'text-highlighted'"
              >
                {{ row.clockIn }}
              </td>

              <td class="whitespace-nowrap px-4 py-4 text-highlighted">
                {{ row.clockOut }}
              </td>

              <td class="whitespace-nowrap px-4 py-4">
                <UBadge
                  :color="statusConfig[row.status].color"
                  :icon="statusConfig[row.status].icon"
                  variant="soft"
                  size="sm"
                >
                  {{ row.status }}
                </UBadge>
              </td>

              <td class="whitespace-nowrap px-4 py-4 font-medium text-highlighted">
                {{ row.totalHours }}
              </td>

              <td class="whitespace-nowrap px-4 py-4 text-right">
                <UDropdownMenu
                  :items="[
                    [
                      {
                        label: 'View Detail',
                        icon: 'i-lucide-eye'
                      },
                      {
                        label: 'Edit Record',
                        icon: 'i-lucide-edit'
                      },
                      {
                        label: 'Delete',
                        icon: 'i-lucide-trash',
                        color: 'error'
                      }
                    ]
                  ]"
                >
                  <UButton
                    icon="i-lucide-ellipsis-vertical"
                    color="neutral"
                    variant="ghost"
                    square
                    size="sm"
                  />
                </UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">
          Showing 1 to 5 of 1,248 entries
        </p>

        <UPagination
          v-model:page="page"
          :total="1248"
          :items-per-page="5"
        />
      </div>
    </template>
  </UCard>
</template>
