<!-- app/components/hris/national-holidays/HolidayList.vue -->

<script setup lang="ts">
type NationalHoliday = {
  id: number
  date: string
  name: string
  description: string | null
  is_active: boolean | number
  created_at?: string
  updated_at?: string
}

const props = defineProps<{
  holidays: NationalHoliday[]
  loading?: boolean
}>()

const selected = defineModel<number | null>({
  default: null
})

const sortedHolidays = computed(() => {
  return [...props.holidays].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
})

function formatDate(date: string) {
  if (!date) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date))
}

function getDayName(date: string) {
  if (!date) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long'
  }).format(new Date(date))
}

function getMonthLabel(date: string) {
  if (!date) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    month: 'short'
  }).format(new Date(date))
}

function getDayNumber(date: string) {
  if (!date) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit'
  }).format(new Date(date))
}

function isSelected(id: number) {
  return selected.value === id
}

function selectHoliday(id: number) {
  selected.value = id
}
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-semibold text-highlighted">
            National Holidays
          </h3>

          <p class="mt-1 text-sm text-muted">
            Daftar hari libur nasional aktif.
          </p>
        </div>

        <UBadge
          color="primary"
          variant="soft"
          class="shrink-0"
        >
          {{ holidays.length }} Active
        </UBadge>
      </div>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <USkeleton
        v-for="item in 4"
        :key="item"
        class="h-20 w-full rounded-xl"
      />
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <div
        v-if="!sortedHolidays.length"
        class="rounded-xl border border-dashed border-default p-8 text-center"
      >
        <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <UIcon
            name="i-lucide-calendar-x"
            class="size-6 text-muted"
          />
        </div>

        <p class="mt-4 text-sm font-medium text-highlighted">
          Belum ada national holiday
        </p>

        <p class="mt-1 text-xs text-muted">
          Klik New Holiday untuk membuat data libur nasional.
        </p>
      </div>

      <button
        v-for="holiday in sortedHolidays"
        :key="holiday.id"
        type="button"
        class="group w-full rounded-2xl border p-4 text-left transition"
        :class="isSelected(holiday.id)
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-default bg-default hover:border-primary/40 hover:bg-muted/40'"
        @click="selectHoliday(holiday.id)"
      >
        <div class="flex items-start gap-4">
          <div
            class="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center"
            :class="isSelected(holiday.id)
              ? 'border-primary bg-primary text-inverted'
              : 'border-default bg-muted text-highlighted group-hover:border-primary/40'"
          >
            <span class="text-lg font-bold leading-none">
              {{ getDayNumber(holiday.date) }}
            </span>

            <span class="mt-1 text-[10px] font-semibold uppercase leading-none">
              {{ getMonthLabel(holiday.date) }}
            </span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-semibold text-highlighted">
                  {{ holiday.name }}
                </p>

                <p class="mt-1 text-sm text-muted">
                  {{ getDayName(holiday.date) }},
                  {{ formatDate(holiday.date) }}
                </p>
              </div>

              <UIcon
                v-if="isSelected(holiday.id)"
                name="i-lucide-circle-check"
                class="size-5 shrink-0 text-primary"
              />
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <UBadge
                color="primary"
                variant="soft"
                size="xs"
              >
                National Holiday
              </UBadge>

              <UBadge
                color="success"
                variant="soft"
                size="xs"
              >
                Active
              </UBadge>
            </div>

            <p
              v-if="holiday.description"
              class="mt-3 line-clamp-2 text-xs text-muted"
            >
              {{ holiday.description }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </UCard>
</template>
