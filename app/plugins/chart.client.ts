import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale
} from 'chart.js'

export default defineNuxtPlugin(() => {
  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,
    LineElement,
    ArcElement,
    PointElement,
    CategoryScale,
    LinearScale
  )
})
