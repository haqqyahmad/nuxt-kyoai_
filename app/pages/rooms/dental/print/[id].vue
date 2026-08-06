<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DentalResultDisplay from '~/components/dental/DentalResultDisplay.vue'
import type { DentalExamData } from '~/types/dental'

definePageMeta({ layout: false })

useSeoMeta({ title: 'Laporan Pemeriksaan Gigi' })

const route = useRoute()
const api = useApi()
const examId = String(route.params.id)
const data = ref<DentalExamData | null>(null)
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get(`/mcu/exams/${examId}/dental`)
    data.value = (res.data?.data ?? res.data ?? null) as DentalExamData | null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err?.response?.data?.message ?? 'Data dental gagal dimuat.'
  } finally {
    loading.value = false
    setTimeout(() => window.print(), 300)
  }
})
</script>

<template>
  <div class="min-h-screen bg-white p-8 text-slate-900">
    <div v-if="loading" class="text-center text-muted">
      Memuat laporan...
    </div>
    <div v-else-if="error" class="text-center text-error">
      {{ error }}
    </div>
    <template v-else-if="data">
      <div class="mb-6 flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h1 class="text-lg font-bold">
            Laporan Pemeriksaan Gigi (Dental Examination)
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            {{ data.item?.name ?? 'Pemeriksaan Gigi' }} · Departemen Dental
          </p>
        </div>
        <div class="text-right text-sm">
          <p class="text-xs uppercase text-slate-500">
            Exam Code
          </p>
          <p class="font-bold">
            {{ data.examCode }}
          </p>
          <p class="mt-1 text-xs uppercase text-slate-500">
            Queue No.
          </p>
          <p>{{ data.queueCode }}</p>
        </div>
      </div>

      <DentalResultDisplay :data="data" />

      <div class="mt-10 flex items-end justify-between text-sm text-slate-500">
        <span>Dicetak: {{ new Date().toLocaleString('id-ID') }}</span>
        <div class="text-right">
          <span class="mb-10 block">Dokter Gigi,</span>
          <span class="font-semibold text-slate-900">( ______________________ )</span>
        </div>
      </div>
    </template>

    <button
      class="fixed bottom-6 right-6 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg print:hidden"
      @click="window.print()"
    >
      Print / Cetak
    </button>
  </div>
</template>

<style>
@media print {
  body {
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print\:hidden {
    display: none !important;
  }
}
</style>
