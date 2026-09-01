<!-- app/components/hris/attendance/configuration/MonthlyShiftDetailForm.vue -->

<script setup lang="ts">
type ShiftStatus = 'active' | 'inactive'

type ShiftTemplate = {
  id: number
  name: string
  description?: string | null
}

type MonthTemplateWeek = {
  id?: number
  month_template_id?: number
  week_number: number
  shift_template_id?: number
  shiftTemplateId?: number
  shiftTemplate?: ShiftTemplate
}

type MonthTemplate = {
  id: number
  name: string
  description: string | null
  status: ShiftStatus
  weeks: MonthTemplateWeek[]
}

type ShiftOption = {
  label: string
  value: string
  description?: string | null
}

type WeekForm = {
  weekNumber: number
  shiftTemplateId: string | undefined
  shiftName?: string
  shiftDescription?: string | null
}

const props = defineProps<{
  template: MonthTemplate | null
}>()

const emit = defineEmits<{
  refresh: []
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const loadingShift = ref(false)

const shiftOptions = ref<ShiftOption[]>([])

const form = reactive({
  id: null as number | null,
  name: '',
  description: '',
  status: 'active' as ShiftStatus,
  weeks: [] as WeekForm[]
})

const canSave = computed(() => {
  return Boolean(
    form.id
    && form.name.trim()
    && form.weeks.length
    && form.weeks.every(week => week.shiftTemplateId)
  )
})

function getSelectedShift(shiftTemplateId?: string) {
  return shiftOptions.value.find(item => item.value === shiftTemplateId)
}

function getShiftLabel(week: WeekForm) {
  return (
    getSelectedShift(week.shiftTemplateId)?.label
    || week.shiftName
    || 'Belum pilih shift'
  )
}

function getShiftDescription(week: WeekForm) {
  return (
    getSelectedShift(week.shiftTemplateId)?.description
    || week.shiftDescription
    || ''
  )
}

function addWeek() {
  form.weeks.push({
    weekNumber: form.weeks.length + 1,
    shiftTemplateId: undefined,
    shiftName: '',
    shiftDescription: ''
  })
}

function removeWeek(index: number) {
  form.weeks.splice(index, 1)

  form.weeks.forEach((week, weekIndex) => {
    week.weekNumber = weekIndex + 1
  })
}

function clearWeeks() {
  form.weeks.forEach((week) => {
    week.shiftTemplateId = undefined
    week.shiftName = ''
    week.shiftDescription = ''
  })
}

function applyRotation() {
  if (!shiftOptions.value.length || !form.weeks.length) return

  form.weeks.forEach((week, index) => {
    const selectedShift = shiftOptions.value[index % shiftOptions.value.length]

    week.shiftTemplateId = selectedShift?.value
    week.shiftName = selectedShift?.label
    week.shiftDescription = selectedShift?.description || ''
  })
}

function setDefaultWeeks() {
  form.weeks = Array.from({ length: 4 }, (_, index) => ({
    weekNumber: index + 1,
    shiftTemplateId: undefined,
    shiftName: '',
    shiftDescription: ''
  }))
}

function syncWeekLabelFromOption(week: WeekForm) {
  const selectedShift = getSelectedShift(week.shiftTemplateId)

  if (!selectedShift) return

  week.shiftName = selectedShift.label
  week.shiftDescription = selectedShift.description || ''
}

async function loadShiftTemplates() {
  loadingShift.value = true

  try {
    const response = await api.get<{
      data: {
        id: number
        name: string
        description?: string | null
        status: string
      }[]
    }>('/hris/shift/templates')

    shiftOptions.value = response.data.data
      .filter(item => item.status === 'active')
      .map(item => ({
        label: item.name,
        value: String(item.id),
        description: item.description || ''
      }))

    form.weeks.forEach(syncWeekLabelFromOption)
  } catch (error) {
    console.error(error)
    shiftOptions.value = []
  } finally {
    loadingShift.value = false
  }
}

async function saveChanges() {
  if (loading.value) return

  if (!canSave.value) {
    toast.add({
      title: 'Validasi',
      description: 'Nama template dan semua shift mingguan wajib diisi.',
      color: 'warning'
    })

    return
  }

  loading.value = true

  const payload = {
    name: form.name.trim(),
    description: form.description?.trim() || null,
    status: form.status,
    weeks: form.weeks.map(week => ({
      week_number: Number(week.weekNumber),
      shift_template_id: Number(week.shiftTemplateId)
    }))
  }

  try {
    await api.patch(`/hris/shift/month-templates/${form.id}`, payload)

    toast.add({
      title: 'Berhasil',
      description: 'Monthly shift template berhasil diperbarui.',
      color: 'success'
    })

    emit('refresh')
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Monthly shift template gagal diperbarui.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(
  () => props.template,
  (template) => {
    if (!template) {
      Object.assign(form, {
        id: null,
        name: '',
        description: '',
        status: 'active',
        weeks: []
      })

      return
    }

    Object.assign(form, {
      id: template.id,
      name: template.name,
      description: template.description || '',
      status: template.status,
      weeks: [...(template.weeks || [])]
        .sort((a, b) => a.week_number - b.week_number)
        .map(week => ({
          weekNumber: week.week_number,
          shiftTemplateId: String(
            week.shiftTemplate?.id
            ?? week.shiftTemplateId
            ?? week.shift_template_id
          ),
          shiftName: week.shiftTemplate?.name || '',
          shiftDescription: week.shiftTemplate?.description || ''
        }))
    })

    if (!form.weeks.length) {
      setDefaultWeeks()
    }

    form.weeks.forEach(syncWeekLabelFromOption)
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  loadShiftTemplates()
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="font-semibold text-highlighted">
            Monthly Shift Template
          </h3>

          <p class="mt-1 text-sm text-muted">
            Configure weekly shift rotation template.
          </p>
        </div>

        <UButton
          icon="i-lucide-save"
          class="justify-center"
          :loading="loading"
          :disabled="!canSave || loading"
          @click="saveChanges"
        >
          Save Changes
        </UButton>
      </div>
    </template>

    <div
      v-if="!template"
      class="rounded-xl border border-dashed border-default p-8 text-center"
    >
      <p class="font-medium text-highlighted">
        Belum ada monthly template dipilih
      </p>

      <p class="mt-1 text-sm text-muted">
        Pilih monthly shift template dari daftar sebelah kiri.
      </p>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Shift Name">
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="form.status"
            :items="[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' }
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Description"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="form.description"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 class="text-sm font-semibold text-highlighted">
                Weekly Shift Rotation
              </h4>

              <p class="mt-1 text-xs text-muted">
                Pilih template shift berbeda untuk setiap minggu.
              </p>
            </div>

            <UButton
              type="button"
              size="sm"
              variant="outline"
              icon="i-lucide-plus"
              @click="addWeek"
            >
              Add Week
            </UButton>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              type="button"
              size="xs"
              variant="soft"
              icon="i-lucide-repeat"
              @click="applyRotation"
            >
              Auto Rotation
            </UButton>

            <UButton
              type="button"
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              @click="clearWeeks"
            >
              Clear Shift
            </UButton>
          </div>

          <div class="space-y-3">
            <div
              v-for="(week, index) in form.weeks"
              :key="index"
              class="space-y-4 rounded-xl border border-default bg-muted/30 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-highlighted">
                    Minggu {{ index + 1 }}
                  </p>

                  <p class="mt-1 text-xs text-muted">
                    {{ getShiftLabel(week) }}
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <UBadge
                    :color="week.shiftTemplateId ? 'success' : 'neutral'"
                    variant="soft"
                  >
                    {{ week.shiftTemplateId ? 'Selected' : 'Pending' }}
                  </UBadge>

                  <UButton
                    type="button"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    square
                    @click="removeWeek(index)"
                  />
                </div>
              </div>

              <UFormField label="Shift Template" required>
                <USelect
                  v-model="week.shiftTemplateId"
                  :items="shiftOptions"
                  :loading="loadingShift"
                  label-key="label"
                  value-key="value"
                  placeholder="Pilih shift untuk minggu ini"
                  class="w-full"
                  @update:model-value="syncWeekLabelFromOption(week)"
                />
              </UFormField>

              <div
                v-if="week.shiftTemplateId"
                class="rounded-xl border border-default bg-default p-4"
              >
                <p class="text-sm font-semibold text-highlighted">
                  {{ getShiftLabel(week) }}
                </p>

                <p
                  v-if="getShiftDescription(week)"
                  class="mt-1 text-sm text-muted"
                >
                  {{ getShiftDescription(week) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="sticky top-0 space-y-3">
            <div>
              <h4 class="text-sm font-semibold text-highlighted">
                Preview Rotation
              </h4>

              <p class="mt-1 text-xs text-muted">
                Preview template rotasi mingguan.
              </p>
            </div>

            <div class="overflow-hidden rounded-xl border border-default">
              <div
                v-for="week in form.weeks"
                :key="week.weekNumber"
                class="border-b border-default px-4 py-3 text-sm last:border-b-0"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-highlighted">
                      Minggu {{ week.weekNumber }}
                    </p>

                    <p class="mt-1 text-xs text-muted">
                      {{ getShiftLabel(week) }}
                    </p>

                    <p
                      v-if="getShiftDescription(week)"
                      class="mt-1 text-xs text-muted"
                    >
                      {{ getShiftDescription(week) }}
                    </p>
                  </div>

                  <UBadge
                    :color="week.shiftTemplateId ? 'success' : 'neutral'"
                    variant="soft"
                  >
                    {{ week.shiftTemplateId ? 'Ready' : 'Empty' }}
                  </UBadge>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-default bg-muted/30 p-4">
              <p class="text-xs font-semibold text-highlighted">
                Total Week
              </p>

              <p class="mt-1 text-2xl font-bold text-highlighted">
                {{ form.weeks.length }}
              </p>

              <p class="mt-1 text-xs text-muted">
                minggu dalam template
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
