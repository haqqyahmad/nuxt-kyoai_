import type { Ref } from "vue";

type DiffAuditEntry = {
  id: number;
  entity: string;
  entityId: string;
  actorId: number | null;
  actorRole: string | null;
  action: string;
  payloadBefore: Record<string, { from: unknown; to: unknown }> | null;
  payloadAfter: Record<string, { from: unknown; to: unknown }> | null;
  notes: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export const useAudit = () => {
  const api = useApi();

  const loading = ref(false);
  const entries = ref<DiffAuditEntry[]>([]);

  const fetchAudit = async (entity: string, entityId: string | number) => {
    loading.value = true;
    try {
      const { data } = await api.get(`/audit/${entity}/${entityId}`);
      entries.value = data?.data ?? [];
    } catch {
      entries.value = [];
    } finally {
      loading.value = false;
    }
  };

  const resetAudit = () => {
    entries.value = [];
  };

  return { loading: loading as Ref<boolean>, entries, fetchAudit, resetAudit };
};
