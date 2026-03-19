// ── state.js ──────────────────────────────────────────────────
// Single source of truth: localStorage key, S object, load/save.
// ──────────────────────────────────────────────────────────────

// Dynamic storage key — set by notebooks.js via setStorageKey() before loading.
let _SK = 'nucleus_v1';
function setStorageKey(key) { _SK = key; }

let S = {
  tasks: [], archived: [], notes: [], folders: [], tags: [],
  collapsed: {}, noteFilter: 'all', activeNoteId: null,
  navHistory: [], blOpen: false, dismissedCtx: [],
  settings: { archiveDelay:7, wordThreshold:50, reviewDay:1, theme:'default', templates:{} },
  session: { lastWeekly:null, agedSnoozedUntil:null, clearedToday:0, clearedDate:null }
};

function normalizeState() {
  if (!S.settings)       S.settings     = { archiveDelay:7, wordThreshold:50, reviewDay:1, theme:'default' };
  if (!S.settings.theme)     S.settings.theme     = 'default';
  if (!S.settings.templates) S.settings.templates = {};
  if (!S.settings.headingStyles) S.settings.headingStyles = {};
  if (!S.settings.fontSize)      S.settings.fontSize      = 'default';
  if (!S.tags) S.tags = [];
  S.notes.forEach(n => { if (!n.tags) n.tags = []; });
  if (!S.session)        S.session      = { lastWeekly:null, agedSnoozedUntil:null, clearedToday:0, clearedDate:null };
  if (!S.dismissedCtx)   S.dismissedCtx = [];
}

function loadSync() {
  try { const r = localStorage.getItem(_SK); if (r) S = { ...S, ...JSON.parse(r) }; } catch(e) {}
  normalizeState();
}

async function loadAsync() {
  loadSync();                          // always load localStorage first (instant fallback)
  if (!fileStore.isActive(NB_ACTIVE_ID)) return;
  const fileData = await fileStore.readFileForNotebook(NB_ACTIVE_ID);
  if (!fileData) return;
  const migrated = applyVersionMigrations(fileData);
  const prevSettings = S.settings;
  S = { ...S, ...migrated };
  S.settings = { ...prevSettings, ...migrated.settings };
  normalizeState();
  save();                              // sync localStorage with what we loaded from file
}

function applyVersionMigrations(data) {
  const v = data.version || 0;
  // v1 is current — nothing to migrate yet.
  // Future: if (v < 2) { /* migrate v1→v2 fields */ }
  void v;
  return data;
}

function save() {
  const data = { version:1, savedAt:new Date().toISOString(), ...S };
  try { localStorage.setItem(_SK, JSON.stringify(S)); } catch(e) {}
  if (fileStore.isActive(NB_ACTIVE_ID)) fileStore.writeFileForNotebook(NB_ACTIVE_ID, data);  // async fire-and-forget
}
