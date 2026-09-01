<script setup lang="ts">
const emit = defineEmits<{
  detail: []
}>()

const anomalies = [
  {
    name: 'Elena Rodriguez',
    uid: '10425',
    department: 'Operations',
    type: 'Frequent Lateness',
    frequency: '8 / 30 Days',
    lastIncident: 'Today, 09:45 AM'
  },
  {
    name: 'Marcus Sterling',
    uid: '10892',
    department: 'Engineering',
    type: 'Missing Logs',
    frequency: '4 / 30 Days',
    lastIncident: 'Oct 24, 2023'
  },
  {
    name: 'Sarah Jenkins',
    uid: '10551',
    department: 'Marketing',
    type: 'Frequent Lateness',
    frequency: '6 / 30 Days',
    lastIncident: 'Oct 26, 2023'
  }
]

function getTypeColor(type: string) {
  if (type === 'Frequent Lateness') return 'error'
  return 'success'
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-highlighted">
            Attendance Anomalies
          </h3>

          <p class="text-sm text-muted">
            Action required for consistent outliers.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
        >
          Export Report
        </UButton>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="border-b border-default bg-muted text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold uppercase">
              Employee Name
            </th>
            <th class="px-4 py-3 font-semibold uppercase">
              Department
            </th>
            <th class="px-4 py-3 font-semibold uppercase">
              Anomaly Type
            </th>
            <th class="px-4 py-3 font-semibold uppercase">
              Frequency
            </th>
            <th class="px-4 py-3 font-semibold uppercase">
              Last Incident
            </th>
            <th class="px-4 py-3 text-right font-semibold uppercase">
              Actions
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-default">
          <tr
            v-for="item in anomalies"
            :key="item.uid"
            class="hover:bg-muted/50"
          >
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <UAvatar
                  :text="item.name.split(' ').map(name => name[0]).join('')"
                  size="sm"
                />

                <div>
                  <p class="font-medium text-highlighted">
                    {{ item.name }}
                  </p>

                  <p class="text-xs text-muted">
                    UID: {{ item.uid }}
                  </p>
                </div>
              </div>
            </td>

            <td class="px-4 py-4 text-muted">
              {{ item.department }}
            </td>

            <td class="px-4 py-4">
              <UBadge
                :color="getTypeColor(item.type)"
                variant="soft"
              >
                {{ item.type }}
              </UBadge>
            </td>

            <td class="px-4 py-4 text-highlighted">
              {{ item.frequency }}
            </td>

            <td class="px-4 py-4 text-muted">
              {{ item.lastIncident }}
            </td>

            <td class="px-4 py-4 text-right">
              <UButton
                color="primary"
                variant="outline"
                size="sm"
                @click="emit('detail')"
              >
                View Details
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="flex items-center justify-between text-sm text-muted">
        <p>Showing 3 of 12 anomalies detected</p>

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="sm"
            square
          />

          <span class="font-medium text-highlighted">
            Page 1 of 4
          </span>

          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="sm"
            square
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
