<script setup lang="ts">
const props = defineProps<{
  data: {
    status?: string | null
    submittedAt?: string | null
    doctorComment?: string | null
  } | null
  examId: string
  examItemId?: string | null
}>()

const router = useRouter()

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function goToDentalDetail() {
  if (props.examItemId) {
    router.push(`/result/exam-results/${props.examItemId}?department=dental&examId=${props.examId}`)
  }
}
</script>

<template>
  <div v-if="data" class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex size-8 items-center justify-center rounded-lg bg-teal-500/10">
          <UIcon name="i-lucide-stethoscope" class="size-4 text-teal-600" />
        </div>
        <div>
          <h4 class="text-sm font-semibold text-highlighted">
            Dental Examination
          </h4>
          <p class="text-xs text-muted">
            Grade &amp; hasil dikelola langsung oleh dokter dental
          </p>
        </div>
      </div>
      <UBadge
        :label="data.status === 'SUBMITTED' ? 'Submitted' : data.status === 'DRAFT' ? 'Draft' : data.status || '-'"
        :color="data.status === 'SUBMITTED' ? 'success' : data.status === 'DRAFT' ? 'warning' : 'neutral'"
        variant="soft"
      />
    </div>

    <div v-if="data.submittedAt">
      <p class="text-xs text-muted">
        Disubmit
      </p>
      <p class="font-medium text-highlighted">
        {{ formatDate(data.submittedAt) }}
      </p>
    </div>

    <div v-if="data.doctorComment">
      <p class="text-xs text-muted">
        Kesimpulan
      </p>
      <p class="mt-0.5 text-sm text-highlighted line-clamp-3">
        {{ data.doctorComment }}
      </p>
    </div>

    <UButton
      v-if="examItemId"
      color="primary"
      variant="soft"
      icon="i-lucide-arrow-right"
      size="sm"
      @click="goToDentalDetail"
    >
      Lihat detail dental
    </UButton>
  </div>
</template>
