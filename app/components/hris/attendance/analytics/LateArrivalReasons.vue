<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'

const chartData = {
  labels: [
    'Commute Issues',
    'Medical / Personal',
    'Technical / Log-in'
  ],
  datasets: [
    {
      data: [45, 30, 25],

      backgroundColor: [
        '#3b82f6',
        '#22c55e',
        '#f59e0b'
      ],

      borderWidth: 2
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
  <UCard class="h-full">
    <template #header>
      <h3 class="font-semibold text-highlighted">
        Late Arrival Reasons
      </h3>
    </template>

    <ClientOnly>
      <div class="h-72">
        <Doughnut
          :data="chartData"
          :options="chartOptions"
        />
      </div>
    </ClientOnly>
  </UCard>
</template>
