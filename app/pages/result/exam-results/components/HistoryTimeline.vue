<script setup lang="ts">
import { computed, ref } from 'vue'

type DiffAuditEntry = {
  id?: number
  entity?: string
  action?: string
  actorId?: number | null
  actorRole?: string | null
  notes?: string | null
  createdAt?: string
  payloadAfter?: Record<string, { from: unknown, to: unknown }> | null
}

type WorkHistoryEvent = {
  timestamp?: string
  action?: string
  actor?: string | null
  details?: string | null
}

const props = defineProps<{
  loading: boolean
  entries: DiffAuditEntry[]
  workHistory?: WorkHistoryEvent[]
  queueCode?: string
}>()

// ── Filters ────────────────────────────────────────────────
const searchQuery = ref('')
const typeFilter = ref('')
const expandedIds = ref<Set<number | string>>(new Set())

function toggleExpand(id: number | string) {
  if (expandedIds.value.has(id)) expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

const allExpanded = ref(false)
function toggleAll() {
  allExpanded.value = !allExpanded.value
  if (allExpanded.value) {
    filteredEntries.value.forEach(e => { if (e.id != null) expandedIds.value.add(e.id) })
  } else {
    expandedIds.value.clear()
  }
}

// ── Action config ──────────────────────────────────────────
type ActionDef = { title: string, badge: string, dotColor: string, dotIcon: string, type: string }

const actionDefs: Record<string, ActionDef> = {
  ASSIGN_EXTERNAL:  { title: 'Pemeriksaan ditugaskan ke dokter luar', badge: 'ASSIGN_EXTERNAL', dotColor: 'dot-amber', dotIcon: '+', type: 'status' },
  CANCEL_EXTERNAL:  { title: 'Penugasan dokter luar dibatalkan',     badge: 'CANCEL_EXTERNAL', dotColor: 'dot-gray', dotIcon: '×', type: 'status' },
  START_PROCESSING: { title: 'Dokter luar mulai memproses',           badge: 'START_PROCESSING', dotColor: 'dot-blue', dotIcon: '↻', type: 'status' },
  SUBMIT_EXTERNAL:  { title: 'Hasil eksternal diterima sistem',       badge: 'SUBMIT_EXTERNAL', dotColor: 'dot-blue', dotIcon: '↻', type: 'status' },
  SUBMIT_INPUT:     { title: 'Dokter mengirim hasil pemeriksaan',     badge: 'SUBMIT_INPUT', dotColor: 'dot-green', dotIcon: '✓', type: 'submit' },
  UPDATE_INPUT:     { title: 'Draft inputan diperbarui',              badge: 'UPDATE_INPUT', dotColor: 'dot-pink', dotIcon: '✎', type: 'update' },
}

function getActionDef(action?: string): ActionDef {
  return actionDefs[action ?? ''] ?? { title: action ?? 'Unknown', badge: action ?? '?', dotColor: 'dot-gray', dotIcon: '•', type: 'system' }
}

// ── Derived data ───────────────────────────────────────────
const filteredEntries = computed(() => {
  let list = [...props.entries]
  if (typeFilter.value) {
    list = list.filter(e => getActionDef(e.action).type === typeFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e => {
      const actor = `user #${e.actorId}` + (e.actorRole ? ` ${e.actorRole}` : '')
      const diffText = e.payloadAfter ? JSON.stringify(Object.keys(e.payloadAfter)) : ''
      const valueText = e.payloadAfter
        ? Object.entries(e.payloadAfter).map(([k, v]) => `${k} ${v.from} ${v.to}`).join(' ')
        : ''
      const searchable = [e.action, e.notes, actor, diffText, valueText].join(' ').toLowerCase()
      return searchable.includes(q)
    })
  }
  return list.reverse() // newest first
})

// ── Helpers ────────────────────────────────────────────────
function formatDate(dateString?: string | null) {
  if (!dateString) return { date: '-', time: '-' }
  const d = new Date(dateString)
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

function formatDiffValue(v: unknown) {
  if (v == null) return '—'
  if (typeof v === 'string' && v.includes('T') && v.includes('Z')) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }
  return String(v)
}

function inputCount(entry: DiffAuditEntry) {
  return entry.payloadAfter ? Object.keys(entry.payloadAfter).length : 0
}

function actorInitials(actorId?: number | null, role?: string | null) {
  if (role === 'dokter' || role === 'dokter luar') return 'DL'
  if (actorId != null) return `U${actorId}`
  return 'SY'
}

function isInputAction(action?: string) {
  return action === 'UPDATE_INPUT' || action === 'SUBMIT_INPUT'
}

// ── Status diff helpers ────────────────────────────────────
function getStatusDiffs(entry: DiffAuditEntry) {
  if (!entry.payloadAfter) return []
  return Object.entries(entry.payloadAfter).map(([field, diff]) => ({
    field,
    from: formatDiffValue(diff.from),
    to: formatDiffValue(diff.to),
  }))
}
</script>

<template>
  <div class="ht-wrap">
    <!-- Header -->
    <div class="ht-header">
      <div>
        <div class="ht-eyebrow">Medical Result Review</div>
        <h2 class="ht-title">Riwayat Proses Pemeriksaan</h2>
        <p class="ht-sub">Timeline aktivitas yang lebih mudah dipindai, dengan detail perubahan yang bisa dibuka saat diperlukan.</p>
      </div>
      <div v-if="queueCode" class="ht-queue">{{ queueCode }}</div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ht-empty">
      <span class="ht-spinner" /> Memuat riwayat proses...
    </div>

    <template v-else>
      <!-- Toolbar -->
      <div class="ht-toolbar">
        <label class="ht-search">
          <span class="ht-search-icon">⌕</span>
          <input v-model="searchQuery" placeholder="Cari event, user, parameter, atau nilai..." />
        </label>
        <select v-model="typeFilter" class="ht-select">
          <option value="">Semua aktivitas</option>
          <option value="submit">Submit</option>
          <option value="update">Update</option>
          <option value="status">Status</option>
        </select>
        <button class="ht-btn" @click="toggleAll">
          {{ allExpanded ? 'Tutup semua' : 'Buka semua' }}
        </button>
      </div>

      <!-- Timeline -->
      <div class="ht-history">
        <header class="ht-history-head">
          <div>
            <h3 class="ht-history-title">Audit Trail</h3>
            <p class="ht-history-desc">Urutan terbaru di atas. Klik sebuah aktivitas untuk melihat perubahan detail.</p>
          </div>
        </header>

        <div class="ht-timeline">
          <!-- Entries -->
          <article
            v-for="entry in filteredEntries"
            :key="entry.id ?? entry.createdAt"
            class="ht-event"
          >
            <div class="ht-time">
              <div>{{ formatDate(entry.createdAt).date }}</div>
              <div class="ht-time-bold">{{ formatDate(entry.createdAt).time }}</div>
            </div>

            <div class="ht-dot" :class="getActionDef(entry.action).dotColor">
              {{ getActionDef(entry.action).dotIcon }}
            </div>

            <div class="ht-card" :class="{ open: expandedIds.has(entry.id!) }">
              <div class="ht-card-head" @click="entry.id != null && toggleExpand(entry.id)">
                <div>
                  <div class="ht-title-row">
                    <span class="ht-card-title">{{ getActionDef(entry.action).title }}</span>
                    <span class="ht-badge" :class="isInputAction(entry.action) ? 'ht-badge-green' : 'ht-badge-gray'">
                      {{ getActionDef(entry.action).badge }}
                    </span>
                    <span
                      v-if="isInputAction(entry.action)"
                      class="ht-badge ht-badge-amber"
                    >
                      {{ inputCount(entry) }} parameter
                    </span>
                  </div>
                  <div class="ht-meta">
                    <template v-if="entry.actorId">
                      user #{{ entry.actorId }}
                      <template v-if="entry.actorRole"> • {{ entry.actorRole }}</template>
                    </template>
                    <template v-else>system</template>
                  </div>
                </div>
                <span class="ht-chevron">⌄</span>
              </div>

              <div class="ht-details">
                <!-- Input diffs (label → value) -->
                <template v-if="isInputAction(entry.action) && entry.payloadAfter">
                  <div class="ht-changes">
                    <div v-for="(diff, field) in entry.payloadAfter" :key="field" class="ht-change">
                      <div class="ht-field">{{ field }}</div>
                      <div class="ht-diff">
                        <span class="ht-old">{{ formatDiffValue(diff.from) }}</span>
                        <span class="ht-arrow">→</span>
                        <span class="ht-new">{{ formatDiffValue(diff.to) }}</span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Status diffs -->
                <template v-else-if="entry.payloadAfter">
                  <div class="ht-changes">
                    <div v-for="d in getStatusDiffs(entry)" :key="d.field" class="ht-change">
                      <div class="ht-field">{{ d.field }}</div>
                      <div class="ht-diff">
                        <span class="ht-old">{{ d.from }}</span>
                        <span class="ht-arrow">→</span>
                        <span class="ht-new">{{ d.to }}</span>
                      </div>
                    </div>
                  </div>
                </template>

                <div v-if="entry.notes" class="ht-note">{{ entry.notes }}</div>

                <div class="ht-actor">
                  <span class="ht-avatar">{{ actorInitials(entry.actorId, entry.actorRole) }}</span>
                  <span>
                    <template v-if="entry.actorRole">{{ entry.actorRole }}</template>
                    <template v-else-if="entry.actorId">user #{{ entry.actorId }}</template>
                    <template v-else>system</template>
                  </span>
                </div>
              </div>
            </div>
          </article>

          <!-- workHistory fallback -->
          <article
            v-for="(event, idx) in (workHistory ?? [])"
            :key="'wh-' + idx"
            class="ht-event"
          >
            <div class="ht-time">
              <div>{{ formatDate(event.timestamp).date }}</div>
              <div class="ht-time-bold">{{ formatDate(event.timestamp).time }}</div>
            </div>
            <div class="ht-dot dot-gray">•</div>
            <div class="ht-card" :class="{ open: expandedIds.has('wh-' + idx) }">
              <div class="ht-card-head" @click="toggleExpand('wh-' + idx)">
                <div>
                  <div class="ht-title-row">
                    <span class="ht-card-title">{{ event.action }}</span>
                    <span class="ht-badge ht-badge-gray">LEGACY</span>
                  </div>
                  <div v-if="event.actor" class="ht-meta">{{ event.actor }}</div>
                </div>
                <span class="ht-chevron">⌄</span>
              </div>
              <div class="ht-details">
                <div v-if="event.details" class="ht-note">{{ event.details }}</div>
              </div>
            </div>
          </article>
        </div>

        <div v-if="!filteredEntries.length && !workHistory?.length" class="ht-empty-block">
          Tidak ada riwayat yang cocok dengan filter.
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Root ─────────────────────────────────────────────────── */
.ht-wrap {
  --ht-bg: #0f1111;
  --ht-panel: #171a19;
  --ht-panel2: #1d201f;
  --ht-line: #2b312f;
  --ht-text: #e9efec;
  --ht-muted: #8e9994;
  --ht-green: #18d78e;
  --ht-green-soft: #0f3b2d;
  --ht-pink: #ff4fa8;
  --ht-pink-soft: #431f34;
  --ht-amber: #ffbf47;
  --ht-amber-soft: #3d3017;
  --ht-blue: #66a8ff;
  --ht-red: #ff6b6b;
  --ht-radius: 14px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: var(--ht-text);
  background: var(--ht-panel);
  border: 1px solid var(--ht-line);
  border-radius: var(--ht-radius);
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────── */
.ht-header { padding: 16px 18px; border-bottom: 1px solid var(--ht-line); display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ht-eyebrow { color: var(--ht-green); font-weight: 700; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; }
.ht-title { font-size: 14px; font-weight: 800; margin: 4px 0 0; }
.ht-sub { font-size: 12px; color: var(--ht-muted); margin: 3px 0 0; }
.ht-queue { padding: 6px 10px; border: 1px solid var(--ht-line); border-radius: 8px; background: #141716; color: #cdd5d1; font-size: 11px; white-space: nowrap; }

/* ── Toolbar ──────────────────────────────────────────────── */
.ht-toolbar {
  display: grid; grid-template-columns: 1fr auto auto; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid var(--ht-line);
  background: rgba(23,26,25,.9); backdrop-filter: blur(8px);
  position: sticky; top: 0; z-index: 5;
}
.ht-search { display: flex; align-items: center; gap: 8px; background: #101312; border: 1px solid #303634; border-radius: 8px; padding: 0 10px; }
.ht-search-icon { color: var(--ht-muted); font-size: 14px; }
.ht-search input { width: 100%; height: 34px; background: transparent; border: 0; outline: 0; color: var(--ht-text); font-size: 13px; }
.ht-search input::placeholder { color: var(--ht-muted); }
.ht-select, .ht-btn { height: 36px; border-radius: 8px; border: 1px solid #303634; background: #101312; color: #d8dfdc; padding: 0 12px; font-size: 12px; cursor: pointer; }

/* ── Stats ────────────────────────────────────────────────── */
.ht-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--ht-line); }
.ht-stat { background: var(--ht-panel2); border: 1px solid var(--ht-line); border-radius: 10px; padding: 10px 12px; }
.ht-stat-label { color: var(--ht-muted); font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
.ht-stat-value { font-size: 16px; font-weight: 800; margin-top: 4px; }

/* ── History container ────────────────────────────────────── */
.ht-history-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--ht-line); }
.ht-history-title { font-size: 13px; margin: 0; font-weight: 800; }
.ht-history-desc { font-size: 11px; color: var(--ht-muted); margin: 3px 0 0; }

/* ── Badges ───────────────────────────────────────────────── */
.ht-badge { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap; }
.ht-badge-green { color: #72f4bc; background: #103428; border-color: #1a5b43; }
.ht-badge-amber { color: #ffd47c; background: #382d16; border-color: #5f4c20; }
.ht-badge-pink { color: #ff83c0; background: #351b2a; border-color: #613049; }
.ht-badge-gray { color: #bdc5c1; background: #252927; border-color: #3b413e; }

/* ── Timeline ─────────────────────────────────────────────── */
.ht-timeline { padding: 6px 16px 16px; }
.ht-event { display: grid; grid-template-columns: 110px 28px minmax(0, 1fr); gap: 12px; position: relative; padding: 8px 0; }
.ht-event:not(:last-child)::after { content: ""; position: absolute; left: 123px; top: 40px; bottom: -8px; width: 1px; background: #323936; }
.ht-time { color: #9aa49f; font-size: 11px; text-align: right; padding-top: 9px; }
.ht-time-bold { font-weight: 700; color: var(--ht-text); }
.ht-dot { width: 28px; height: 28px; border-radius: 999px; border: 1px solid #355a4b; background: #10251e; display: grid; place-items: center; color: var(--ht-green); font-size: 12px; margin-top: 2px; z-index: 1; flex-shrink: 0; }
.ht-dot.dot-green { background: #10251e; border-color: #355a4b; color: var(--ht-green); }
.ht-dot.dot-pink { background: #2c1722; border-color: #69314c; color: var(--ht-pink); }
.ht-dot.dot-amber { background: #2f2817; border-color: #5b4d21; color: var(--ht-amber); }
.ht-dot.dot-blue { background: #162234; border-color: #2f4e72; color: var(--ht-blue); }
.ht-dot.dot-gray { background: #1e2220; border-color: #3b413e; color: #78827d; }

/* ── Card ─────────────────────────────────────────────────── */
.ht-card { border: 1px solid #2a302e; background: var(--ht-panel2); border-radius: 12px; overflow: hidden; }
.ht-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 11px 12px; cursor: pointer; transition: background .15s; }
.ht-card-head:hover { background: rgba(255,255,255,.02); }
.ht-title-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ht-card-title { font-weight: 800; font-size: 12px; }
.ht-meta { color: var(--ht-muted); font-size: 11px; margin-top: 3px; }
.ht-chevron { color: #78827d; transition: .2s transform; font-size: 14px; margin-top: 2px; flex-shrink: 0; }
.ht-card.open .ht-chevron { transform: rotate(180deg); }
.ht-details { display: none; border-top: 1px solid var(--ht-line); padding: 10px 12px 12px; }
.ht-card.open .ht-details { display: block; }

/* ── Changes ──────────────────────────────────────────────── */
.ht-changes { display: grid; gap: 6px; }
.ht-change { display: grid; grid-template-columns: minmax(100px, 200px) minmax(0, 1fr); gap: 10px; padding: 7px 8px; background: #151817; border: 1px solid #252b29; border-radius: 8px; }
.ht-field { font-weight: 700; color: #dfe6e2; font-size: 12px; }
.ht-diff { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; word-break: break-word; display: flex; align-items: center; }
.ht-old { color: #ff8585; text-decoration: line-through; opacity: .82; }
.ht-arrow { color: #66706b; padding: 0 6px; }
.ht-new { color: #7beeba; }

/* ── Note ─────────────────────────────────────────────────── */
.ht-note { margin-top: 8px; padding: 8px 10px; border-left: 3px solid var(--ht-green); background: #10231c; color: #bfcec7; border-radius: 0 8px 8px 0; font-size: 12px; }

/* ── Actor ────────────────────────────────────────────────── */
.ht-actor { display: flex; align-items: center; gap: 7px; color: #b7c0bc; font-size: 11px; margin-top: 8px; }
.ht-avatar { width: 22px; height: 22px; border-radius: 999px; background: #26302c; border: 1px solid #3a4540; display: grid; place-items: center; font-weight: 800; font-size: 9px; color: #dce4e0; flex-shrink: 0; }

/* ── Empty / Loading ──────────────────────────────────────── */
.ht-empty { padding: 32px; text-align: center; color: var(--ht-muted); font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ht-empty-block { padding: 32px; text-align: center; color: var(--ht-muted); font-size: 13px; }
.ht-spinner { width: 16px; height: 16px; border: 2px solid var(--ht-line); border-top-color: var(--ht-green); border-radius: 999px; animation: ht-spin .6s linear infinite; }
@keyframes ht-spin { to { transform: rotate(360deg); } }

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 700px) {
  .ht-toolbar { grid-template-columns: 1fr 1fr; }
  .ht-search { grid-column: 1 / -1; }
  .ht-stats { grid-template-columns: 1fr 1fr; }
  .ht-event { grid-template-columns: 24px minmax(0, 1fr); gap: 8px; }
  .ht-event:not(:last-child)::after { left: 11px; }
  .ht-time { grid-column: 2; text-align: left; padding: 0 0 2px; }
  .ht-dot { grid-column: 1; grid-row: 1 / span 2; }
  .ht-change { grid-template-columns: 1fr; }
}
</style>
