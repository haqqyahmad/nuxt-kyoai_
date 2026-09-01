<script setup lang="ts">
import { Line } from 'vue-chartjs'

const chartData = {
  labels: [
    'Oct 01',
    'Oct 04',
    'Oct 08',
    'Oct 12',
    'Oct 16',
    'Oct 20',
    'Oct 24',
    'Oct 28',
    'Oct 31'
  ],
  datasets: [
    {
      label: 'On Time',
      data: [60, 65, 55, 80, 75, 90, 85, 70, 95],

      borderColor: '#3b82f6',
      backgroundColor: '#3b82f6',
      pointBackgroundColor: '#3b82f6',
      pointRadius: 4,
      borderWidth: 3,
      tension: 0.4
    },
    {
      label: 'Late',
      data: [12, 10, 15, 8, 9, 6, 14, 11, 7],

      borderColor: '#ef4444',
      backgroundColor: '#ef4444',
      pointBackgroundColor: '#ef4444',
      pointRadius: 4,
      borderWidth: 3,
      tension: 0.4
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,

  plugins: {
    legend: {
      position: 'top'
    }
  },

  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(120,120,120,.15)'
      }
    },

    x: {
      grid: {
        display: false
      }
    }
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h3 class="font-semibold text-highlighted">
          Monthly Attendance Trends
        </h3>

        <p class="text-sm text-muted">
          Volume of check-ins vs late arrivals per day.
        </p>
      </div>
    </template>

    <ClientOnly>
      <div class="h-72">
        <Line
          :data="chartData"
          :options="chartOptions"
        />
      </div>
    </ClientOnly>
  </UCard>
</template>
