<script setup lang="ts">
import { computed } from 'vue'
import { buildGradeMeta, normalizeDentalGrades, type DentalGradeConfig } from '~/types/dental'

const props = defineProps<{
  data: {
    status?: string | null
    submittedAt?: string | null
    doctorComment?: string | null
    // Grade terpilih (finals saja + legacy; suggest tak ditampilkan sebagai grade).
    finalGrades?: string[] | null
    finalGrade?: string | null
    gradeConfig?: DentalGradeConfig | null
  } | null
  examId: string
  examItemId?: string | null
}>()

const router = useRouter()

const config = computed(() => props.data?.gradeConfig ?? {})
const meta = computed(() => buildGradeMeta(config.value))

const finalGrades = computed(() =>
  normalizeDentalGrades(props.data?.finalGrades?.length ? props.data.finalGrades : (props.data?.finalGrade ? [props.data.finalGrade] : []), meta.value)
)

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
            Grade &amp; result are managed directly by the dental doctor
          </p>
        </div>
      </div>
      <UBadge
        :label="data.status === 'SUBMITTED' ? 'Submitted' : data.status === 'DRAFT' ? 'Draft' : data.status || '-'"
        :color="data.status === 'SUBMITTED' ? 'success' : data.status === 'DRAFT' ? 'warning' : 'neutral'"
        variant="soft"
      />
    </div>

    <div v-if="finalGrades.length" class="flex flex-wrap gap-1.5">
      <UBadge
        v-for="g in finalGrades"
        :key="g"
        color="primary"
        variant="soft"
        :label="config[g]?.label ? `${g} — ${config[g]?.label}` : g"
      />
    </div>

    <div v-if="data.submittedAt">
      <p class="text-xs text-muted">
        Submitted
      </p>
      <p class="font-medium text-highlighted">
        {{ formatDate(data.submittedAt) }}
      </p>
    </div>

    <div v-if="data.doctorComment">
      <p class="text-xs text-muted">
        Conclusion
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
      View dental detail
    </UButton>
  </div>
</template>
