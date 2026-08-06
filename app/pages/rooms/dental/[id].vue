<script setup lang="ts">
import DentalResultDisplay from '~/components/dental/DentalResultDisplay.vue'
import type { DentalExamData } from '~/types/dental'

definePageMeta({ title: 'Hasil Pemeriksaan Gigi' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const examId = String(route.params.id)

const { data, pending } = await useAsyncData<DentalExamData | null>(
  `dental-result-${examId}`,
  async () => {
    try {
      const res = await api.get(`/mcu/exams/${examId}/dental`)
      return (res.data?.data ?? res.data ?? null) as DentalExamData | null
    } catch {
      return null
    }
  },
  { server: false }
)

function goBack() {
  router.push('/rooms/exam-results')
}
</script>

<template>
  <UDashboardPanel id="dental-result" class="w-full min-w-0">
    <template #body>
      <div class="flex w-full min-w-0 flex-col gap-4 pb-6">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default pb-3">
          <div class="flex min-w-0 items-center gap-3">
            <UButton
              icon="i-lucide-arrow-left"
              variant="ghost"
              size="sm"
              @click="goBack"
            />
            <div class="min-w-0">
              <h1 class="truncate text-2xl font-bold">
                Hasil Pemeriksaan Gigi
              </h1>
              <p class="mt-1 text-sm text-muted">
                Dokumen khusus department Dental — read-only, cetak per department.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton icon="i-lucide-printer" color="primary" @click="router.push(`/rooms/dental/print/${examId}`)">
              Cetak Dokumen
            </UButton>
          </div>
        </div>

        <UCard v-if="pending" class="w-full">
          <div class="space-y-4">
            <USkeleton class="h-24 w-full" />
            <USkeleton class="h-64 w-full" />
          </div>
        </UCard>

        <UAlert
          v-else-if="!data"
          color="warning"
          title="Data dental belum tersedia"
          description="Pemeriksaan gigi untuk exam ini belum diisi atau belum ada department dental pada paket."
        />

        <UCard v-else class="w-full overflow-hidden">
          <DentalResultDisplay :data="data" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
