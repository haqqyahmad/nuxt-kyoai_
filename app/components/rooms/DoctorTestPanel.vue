<script setup lang="ts">
type TestOption = { value: string, label: string, description?: string }
type TestFinding = { code: string, name: string, value?: boolean, grade?: string, detail?: string }
type TestConfig = { code: string, name: string, inputType: 'SINGLE_SELECT' | 'NORMAL_ABNORMAL' | 'RECTAL_FINDINGS', normalLabel?: string, options?: TestOption[], defaultValue?: { findings?: TestFinding[] } }
type TestData = { value?: string, normal?: boolean, detail?: string | null, findings?: TestFinding[] }
const props = defineProps<{ examId: string, examItemId: string, disabled?: boolean }>()
const emit = defineEmits<{ saved: [], submitted: [] }>()
const api = useApi()
const toast = useToast()
const data = ref<TestData>({})
const config = ref<TestConfig | null>(null)
const status = ref('DRAFT')
const saving = ref(false)
const load = async () => {
  const res = await api.get(`/mcu/exams/${props.examId}/doctor-exams/${props.examItemId}`)
  const payload = res.data?.data ?? res.data
  data.value = payload.data ?? {}
  config.value = payload.rendererConfig
  status.value = payload.status ?? 'DRAFT'
}
const editable = computed(() => !props.disabled && status.value !== 'SUBMITTED')
const save = async (submit = false) => {
  saving.value = true
  try {
    const body = { rendererKey: config.value?.code, data: data.value, physicianComment: null }
    await api.post(`/mcu/exams/${props.examId}/doctor-exams/${props.examItemId}`, body)
    if (submit) {
      const res = await api.post(`/mcu/exams/${props.examId}/doctor-exams/${props.examItemId}/submit`, body)
      status.value = res.data?.data?.status ?? 'SUBMITTED'
      emit('submitted')
    } else {
      emit('saved')
    }
    toast.add({ title: submit ? 'Pemeriksaan disubmit' : 'Draft tersimpan', color: 'success' })
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Data tidak dapat disimpan'
    toast.add({ title: 'Gagal', description: message, color: 'error' })
  } finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold">
            {{ config?.name || 'Doctor Examination' }}
          </h3>
          <p class="text-xs text-muted">
            Pemeriksaan item dokter
          </p>
        </div>
        <UBadge :label="status" color="success" variant="soft" />
      </div>
    </template>

    <div v-if="config?.inputType === 'SINGLE_SELECT'" class="space-y-2">
      <label v-for="option in config.options" :key="option.value" class="flex gap-3 rounded-lg border border-default p-3">
        <input
          v-model="data.value"
          type="radio"
          :value="option.value"
          :disabled="!editable"
        >
        <span><strong>{{ option.label }}</strong><small class="block text-muted">{{ option.description }}</small></span>
      </label>
      <UInput
        v-if="data.value === 'UNDEFINED'"
        v-model="data.detail"
        :disabled="!editable"
        placeholder="Detail wajib"
      />
    </div>

    <div v-else-if="config?.inputType === 'NORMAL_ABNORMAL'" class="space-y-3">
      <div class="flex gap-2">
        <UButton :disabled="!editable" :color="data.normal ? 'success' : 'neutral'" @click="data.normal = true; data.detail = null">
          {{ config.normalLabel }}
        </UButton>
        <UButton :disabled="!editable" :color="data.normal === false ? 'warning' : 'neutral'" @click="data.normal = false">
          Abnormality found
        </UButton>
      </div>
      <UInput
        v-if="data.normal === false"
        v-model="data.detail"
        :disabled="!editable"
        placeholder="Details wajib"
      />
    </div>

    <div v-else-if="config?.inputType === 'RECTAL_FINDINGS'" class="space-y-3">
      <div class="flex gap-2">
        <UButton :disabled="!editable" :color="data.normal ? 'success' : 'neutral'" @click="data.normal = true">
          No abnormality
        </UButton>
        <UButton :disabled="!editable" :color="data.normal === false ? 'warning' : 'neutral'" @click="data.normal = false">
          Abnormality found
        </UButton>
      </div>
      <template v-if="data.normal === false">
        <div
          v-for="finding in (data.findings || config.defaultValue.findings)"
          :key="finding.code"
          class="rounded-lg border border-default p-3"
        >
          <UCheckbox v-model="finding.value" :disabled="!editable" :label="finding.name" />
          <USelect
            v-if="finding.code === 'HEMORRHOID' && finding.value"
            v-model="finding.grade"
            :disabled="!editable"
            :items="['GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4']"
            placeholder="Grade wajib"
          />
          <UInput
            v-if="finding.code === 'OTHERS' && finding.value"
            v-model="finding.detail"
            :disabled="!editable"
            placeholder="Details"
          />
        </div>
      </template>
    </div>

    <div v-if="editable" class="mt-4 flex justify-end gap-2 border-t border-default pt-4">
      <UButton variant="outline" :loading="saving" @click="save(false)">
        Save Draft
      </UButton>
      <UButton :loading="saving" @click="save(true)">
        Selesaikan Pemeriksaan
      </UButton>
    </div>
  </UCard>
</template>
