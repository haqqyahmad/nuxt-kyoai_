<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import { useRoomSession } from "~/composables/useRoomSession";
import { useToast } from "~/composables/useToast";

type SampleUser = { id: number; name: string; email?: string | null };
type SampleCollectionRow = {
  id: string;
  status: string;
  tubeCount?: number | null;
  barcode?: string | null;
  collectedAt?: string | null;
  receivedAt?: string | null;
  rescheduledAt?: string | null;
  rejectReason?: string | null;
  takenBy?: number | null;
  sampleType?: { id: string; name?: string | null } | null;
  collectedByUser?: SampleUser | null;
  receivedByUser?: SampleUser | null;
  takenByUser?: SampleUser | null;
  queueEntry?: {
    id: string;
    queueCode?: string | null;
    registration?: {
      id: number;
      id_reg?: string | null;
      patient?: {
        id: number;
        PatientId?: string | null;
        firstName?: string | null;
        middleName?: string | null;
        lastName?: string | null;
        gender?: string | null;
        dob?: string | null;
      } | null;
    } | null;
  } | null;
  items?: Array<{
    id: string;
    item?: { id: string; code?: string | null; name?: string | null } | null;
  }>;
};

const route = useRoute();
const router = useRouter();
const api = useApi();
const toast = useToast();
const { session: roomSession } = await useRoomSession();

const roomTypeId = computed(() => roomSession.value?.roomTypeId ?? null);

const queueEntryId = computed(() => route.params.id as string);
const loading = ref(false);
const samples = ref<SampleCollectionRow[]>([]);
const error = ref<string | null>(null);
const collecting = ref<Record<string, boolean>>({});

function formatPatient(p?: SampleCollectionRow["queueEntry"]): string {
  const pt = p?.registration?.patient;
  if (!pt) return "-";
  return (
    [pt.firstName, pt.middleName, pt.lastName].filter(Boolean).join(" ") || "-"
  );
}

function formatDateTime(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function statusLabel(status: string) {
  if (status === "PENDING") return "Belum diambil";
  if (status === "COLLECTED") return "Sudah diambil";
  if (status === "RECEIVED") return "Diterima Lab";
  if (status === "REJECTED") return "Ditolak";
  if (status === "RESCHEDULED") return "Reschedule";
  return status;
}

function statusColor(status: string) {
  if (status === "RECEIVED") return "success";
  if (status === "COLLECTED") return "info";
  if (status === "REJECTED") return "error";
  if (status === "RESCHEDULED") return "warning";
  return "warning";
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const params: Record<string, unknown> = {
      queueEntryId: queueEntryId.value,
      limit: 200,
      page: 1,
      _: Date.now(),
    };
    if (roomTypeId.value) params.roomTypeId = roomTypeId.value;

    const res = await api.get("/medical/exams/queue/samples", { params });
    const payload = res.data;
    const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
    samples.value = list as SampleCollectionRow[];
  } catch {
    error.value = "Gagal memuat detail sample collection.";
  } finally {
    loading.value = false;
  }
}

async function startCollection() {
  if (!samples.value.length) return;

  const pendingSamples = samples.value.filter((s) => s.status === "PENDING");
  if (!pendingSamples.length) {
    toast.add({ title: "Semua sample sudah diambil", color: "info" });
    return;
  }

  try {
    for (const sample of pendingSamples) {
      collecting.value = { ...collecting.value, [sample.id]: true };
      try {
        await api.patch(`/medical/exams/queue/samples/${sample.id}/collect`, {
          tubeCount: sample.tubeCount ?? 1,
        });
      } catch (e) {
        console.error(`Gagal collect sample ${sample.id}:`, e);
        throw e;
      } finally {
        collecting.value = { ...collecting.value, [sample.id]: false };
      }
    }
    toast.add({ title: "Semua sample berhasil diambil", color: "success" });
    await router.push("/rooms/sample-collection");
  } catch {
    toast.add({ title: "Gagal mengambil sample", color: "error" });
  }
}

function goBack() {
  router.push("/rooms/sample-collection");
}

onMounted(() => {
  load();
});
</script>

<template>
  <UDashboardPanel id="sample-collection-detail">
    <template #header>
      <UDashboardNavbar title="Detail Pengambilan Sample">
        <template #right>
          <UButton
            variant="soft"
            color="neutral"
            icon="i-lucide-arrow-left"
            @click="goBack"
          >
            Kembali
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="samples.length"
          color="info"
          variant="soft"
          icon="i-lucide-info"
          :title="`Pasien: ${formatPatient(samples[0].queueEntry)}`"
          :description="`Queue: ${samples[0].queueEntry?.queueCode || '-'}`"
        />

        <div
          v-if="loading"
          class="flex items-center justify-center py-10 text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-5" />
          <span class="ml-2 text-sm">Memuat data…</span>
        </div>

        <div v-else-if="error" class="py-8 text-center text-sm text-muted">
          {{ error }}
        </div>

        <div
          v-else-if="!samples.length"
          class="py-10 text-center text-sm text-muted"
        >
          Tidak ada data sample collection untuk pasien ini.
        </div>

        <div v-else class="space-y-3">
          <UCard
            v-for="row in samples"
            :key="row.id"
            class="overflow-hidden"
            :class="row.status === 'PENDING' ? 'border-warning/30' : ''"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-highlighted">
                  {{ row.sampleType?.name || "Sample" }}
                </p>
                <p class="text-xs text-muted">
                  Queue {{ row.queueEntry?.queueCode || "-" }}
                </p>
                <p v-if="row.items?.length" class="mt-1 text-xs text-muted">
                  Item:
                  <span
                    v-for="it in row.items"
                    :key="it.id"
                    class="mr-1 inline-block rounded bg-muted/40 px-1.5 py-0.5"
                    >{{ it.item?.name || it.item?.code || "Item" }}</span
                  >
                </p>
              </div>
              <div class="flex items-center gap-3">
                <UBadge :color="statusColor(row.status)">
                  {{ statusLabel(row.status) }}
                </UBadge>
              </div>
            </div>

            <div
              class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4"
            >
              <div>
                <p class="text-xs text-muted">Diambil (COLLECT)</p>
                <p class="text-highlighted">
                  {{ row.collectedByUser?.name || "-" }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDateTime(row.collectedAt) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted">Diterima (RECEIVE)</p>
                <p class="text-highlighted">
                  {{ row.receivedByUser?.name || "-" }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDateTime(row.receivedAt) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted">Lock petugas</p>
                <p class="text-highlighted">
                  {{ row.takenByUser?.name || "Bebas" }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted">Tabung / Barcode</p>
                <p class="text-highlighted">
                  {{ row.tubeCount ?? 1 }} / {{ row.barcode || "-" }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Action button: Start Collection (only if there are PENDING samples) -->
        <div
          v-if="samples.some((s) => s.status === 'PENDING')"
          class="pt-4 border-t border-default"
        >
          <UButton
            color="primary"
            size="lg"
            class="w-full"
            icon="i-lucide-play-circle"
            :loading="Object.values(collecting).some((v) => v)"
            @click="startCollection"
          >
            Mulai Ambil Sample
          </UButton>
          <p class="mt-2 text-xs text-muted text-center">
            Akan mengambil semua sample PENDING ({{
              samples.filter((s) => s.status === "PENDING").length
            }}
            sample) untuk pasien ini sekaligus.
          </p>
        </div>

        <div v-else class="pt-4 text-center text-sm text-muted">
          Semua sample untuk pasien ini sudah diambil.
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
