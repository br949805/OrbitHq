// ── notebooks.js ──────────────────────────────────────────────
// Notebook registry: create, switch, rename, delete notebooks.
// Each notebook has its own JSON file (via File System Access API).
// ──────────────────────────────────────────────────────────────

const NB_REGISTRY_KEY = 'nucleus_notebooks';
const NB_ACTIVE_KEY   = 'nucleus_active_nb';

let NB_REGISTRY  = [];    // array of { id, name, lsKey, hasFile, fileNameHint, createdAt }
let NB_ACTIVE_ID = null;  // string id of the active notebook

function nbLsKey(id)  { return 'nucleus_nb_' + id; }

// ── Registry persistence ──────────────────────────────────────

function saveRegistry() {
  try { localStorage.setItem(NB_REGISTRY_KEY, JSON.stringify(NB_REGISTRY)); } catch(e) {}
}

function setActiveId(id) {
  NB_ACTIVE_ID = id;
  try { localStorage.setItem(NB_ACTIVE_KEY, id); } catch(e) {}
}

function getActiveNotebook() {
  return NB_REGISTRY.find(nb => nb.id === NB_ACTIVE_ID) || NB_REGISTRY[0] || null;
}

// ── Boot: load registry ───────────────────────────────────────

async function loadRegistry() {
  let raw = null;
  try { raw = localStorage.getItem(NB_REGISTRY_KEY); } catch(e) {}

  if (raw) {
    // Registry already exists — restore it.
    try { NB_REGISTRY = JSON.parse(raw); } catch(e) { NB_REGISTRY = []; }
    const savedActive = localStorage.getItem(NB_ACTIVE_KEY);
    const found = NB_REGISTRY.find(nb => nb.id === savedActive);
    NB_ACTIVE_ID = found ? savedActive : (NB_REGISTRY[0] ? NB_REGISTRY[0].id : null);
    if (!found && NB_REGISTRY[0]) localStorage.setItem(NB_ACTIVE_KEY, NB_ACTIVE_ID);
    if (NB_REGISTRY.length === 0) return;  // empty registry → welcome screen
    return;
  }

  // Check for existing nucleus_v1 data (migration path for existing users).
  let existingData = null;
  try { existingData = localStorage.getItem('nucleus_v1'); } catch(e) {}

  if (existingData) {
    // Existing user — migrate silently to a localStorage-backed "Notebook 1".
    await _bootstrapFirstNotebook('Notebook 1');
    return;
  }

  // Brand new user — leave registry empty; boot will show the welcome screen.
  NB_REGISTRY  = [];
  NB_ACTIVE_ID = null;
}

// Called during migration (existing nucleus_v1 data) or after welcome "Create".
async function _bootstrapFirstNotebook(name) {
  const id    = uid();
  const lsKey = nbLsKey(id);

  // Carry over any existing nucleus_v1 data.
  let existing = null;
  try { existing = localStorage.getItem('nucleus_v1'); } catch(e) {}
  if (existing) {
    try { localStorage.setItem(lsKey, existing); } catch(e) {}
  }

  // Migrate legacy IDB file handle if one exists.
  let hasFile = false;
  let fileNameHint = null;
  try {
    const legacyHandle = await fileStore.migrateLegacyHandle(id);
    if (legacyHandle) {
      hasFile = true;
      fileNameHint = legacyHandle.name || null;
    }
  } catch(e) {}

  NB_REGISTRY = [{
    id, name: name || 'Notebook 1', lsKey, hasFile, fileNameHint,
    createdAt: Date.now()
  }];
  saveRegistry();
  setActiveId(id);
}

// ── Create a new notebook ─────────────────────────────────────
// Call _pickNotebookFile(name) first in the click handler (user gesture),
// then pass the handle here. This preserves the gesture across async calls.

async function _pickNotebookFile(name) {
  const suggested = (name || 'notebook').toLowerCase().replace(/\s+/g, '-') + '.json';

  if (!('showSaveFilePicker' in window)) return 'unsupported';

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: suggested,
      types: [{ description: 'Orbit Hq Notebook', accept: { 'application/json': ['.json'] } }]
    });
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    return perm === 'granted' ? handle : 'error';
  } catch(e) {
    if (e.name === 'AbortError') return 'cancelled';
    if (e.name === 'SecurityError') return 'insecure';
    console.warn('_pickNotebookFile error:', e);
    return 'error';
  }
}

async function createNotebook(name, handle) {
  const id    = uid();
  const lsKey = nbLsKey(id);
  try { localStorage.setItem(lsKey, JSON.stringify({})); } catch(e) {}

  const entry = { id, name: name || 'New Notebook', lsKey, hasFile: false, fileNameHint: null, createdAt: Date.now() };
  NB_REGISTRY.push(entry);
  saveRegistry();

  // If a handle was pre-obtained by the caller, use it directly.
  if (handle && handle !== 'cancelled') {
    await fileStore._saveHandleForNotebook(id, handle);
    entry.hasFile = true;
    entry.fileNameHint = handle.name;
    saveRegistry();
    await fileStore.writeFileForNotebook(id, {
      version:1, savedAt:new Date().toISOString(),
      tasks:[], archived:[], notes:[], folders:[], tags:[],
      collapsed:{}, noteFilter:'all', activeNoteId:null,
      navHistory:[], blOpen:false, dismissedCtx:[],
      settings:{ archiveDelay:7, wordThreshold:50, reviewDay:1, theme:'default', templates:{}, headingStyles:{} },
      session:{ lastWeekly:null, agedSnoozedUntil:null, clearedToday:0, clearedDate:null }
    });
  }

  return entry;
}

// ── Open an existing notebook from a JSON file ────────────────

async function openNotebookFromFile() {
  if (!('showOpenFilePicker' in window)) {
    toast('File picker not supported in this browser');
    return null;
  }
  let handle;
  try {
    [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Orbit Hq Notebook', accept: { 'application/json': ['.json'] } }],
      multiple: false
    });
  } catch(e) {
    if (e.name !== 'AbortError') console.warn('openNotebookFromFile:', e);
    return null;
  }

  const perm = await handle.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') return null;

  // Read data from file.
  let data = null;
  try {
    const file = await handle.getFile();
    data = JSON.parse(await file.text());
  } catch(e) {
    toast('Could not read notebook file');
    return null;
  }

  // Derive name from filename (strip .json).
  const fname = handle.name || 'notebook.json';
  const derivedName = fname.replace(/\.json$/i, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const id    = uid();
  const lsKey = nbLsKey(id);

  // Write data to localStorage slot for this notebook.
  try { localStorage.setItem(lsKey, JSON.stringify(data)); } catch(e) {}

  const entry = { id, name: derivedName, lsKey, hasFile: true, fileNameHint: fname, createdAt: Date.now() };
  NB_REGISTRY.push(entry);
  saveRegistry();

  // Cache the file handle in IndexedDB.
  await fileStore._saveHandleForNotebook(id, handle);

  return entry;
}

// ── Notebook CRUD ─────────────────────────────────────────────

function renameNotebook(id, newName) {
  const nb = NB_REGISTRY.find(n => n.id === id);
  if (!nb || !newName.trim()) return;
  nb.name = newName.trim();
  saveRegistry();
  renderNotebookSwitcher();
  if (id === NB_ACTIVE_ID) document.getElementById('nb-current-name').textContent = nb.name;
}

async function deleteNotebook(id) {
  if (NB_REGISTRY.length <= 1) { toast('Cannot delete the only notebook'); return; }
  if (!confirm(`Delete notebook "${NB_REGISTRY.find(n=>n.id===id)?.name}"? This will permanently remove all its data.`)) return;

  try { localStorage.removeItem(nbLsKey(id)); } catch(e) {}
  fileStore.disconnectNotebook(id);

  NB_REGISTRY = NB_REGISTRY.filter(n => n.id !== id);
  saveRegistry();

  if (id === NB_ACTIVE_ID) {
    await switchNotebook(NB_REGISTRY[0].id);
  } else {
    renderNotebookSwitcher();
  }
}

// ── File connection helpers ───────────────────────────────────

async function connectFileToNotebook(nbId) {
  const handle = await fileStore.connectForNotebook(nbId);
  if (!handle) return false;
  const nb = NB_REGISTRY.find(n => n.id === nbId);
  if (nb) { nb.hasFile = true; nb.fileNameHint = handle.name || null; saveRegistry(); }
  return true;
}

async function createFileForNotebook(nbId, data, suggestedName) {
  const handle = await fileStore.createAndConnectForNotebook(nbId, data, suggestedName);
  if (!handle) return false;
  const nb = NB_REGISTRY.find(n => n.id === nbId);
  if (nb) { nb.hasFile = true; nb.fileNameHint = handle.name || null; saveRegistry(); }
  return true;
}

function disconnectFileFromNotebook(nbId) {
  fileStore.disconnectNotebook(nbId);
  const nb = NB_REGISTRY.find(n => n.id === nbId);
  if (nb) { nb.hasFile = false; nb.fileNameHint = null; saveRegistry(); }
}

// ── Switch notebook ───────────────────────────────────────────

async function switchNotebook(id) {
  if (id === NB_ACTIVE_ID) { closeNotebookDropdown(); return; }

  if (typeof save === 'function') save();

  setActiveId(id);

  const nb = getActiveNotebook();
  if (!nb) return;

  if (typeof setStorageKey === 'function') setStorageKey(nb.lsKey);
  await fileStore.initForNotebook(id);

  if (typeof S !== 'undefined' && typeof loadAsync === 'function') {
    S.tasks = []; S.archived = []; S.notes = []; S.folders = []; S.tags = [];
    S.collapsed = {}; S.noteFilter = 'all'; S.activeNoteId = null;
    S.navHistory = []; S.blOpen = false; S.dismissedCtx = [];
    S.settings = { archiveDelay:7, wordThreshold:50, reviewDay:1, theme:'default', fontSize:'default', templates:{}, headingStyles:{} };
    S.session = { lastWeekly:null, agedSnoozedUntil:null, clearedToday:0, clearedDate:null };
    await loadAsync();
  }

  if (typeof applyTheme    === 'function') applyTheme((S && S.settings && S.settings.theme) || 'default');
  if (typeof applyFontSize === 'function') applyFontSize((S && S.settings && S.settings.fontSize) || 'default');
  if (typeof applyHeadingStyles === 'function') applyHeadingStyles();

  if (typeof S !== 'undefined') S.activeNoteId = null;
  const edWrap  = document.getElementById('ed-wrap');
  const edEmpty = document.getElementById('ed-empty');
  if (edWrap)  edWrap.classList.remove('vis');
  if (edEmpty) edEmpty.style.display = '';

  if (typeof renderTasks      === 'function') renderTasks();
  if (typeof renderNotesList  === 'function') renderNotesList();
  if (typeof renderFolderTree === 'function') renderFolderTree();
  if (typeof renderTagsSidebar=== 'function') renderTagsSidebar();
  if (typeof updateNoteBadges === 'function') updateNoteBadges();
  if (typeof updateInboxBadge === 'function') updateInboxBadge();
  if (typeof checkNudges      === 'function') checkNudges();

  updateNotebookStatusUI();
  renderNotebookSwitcher();
  closeNotebookDropdown();
  if (typeof toast === 'function') toast('Switched to "' + nb.name + '"');
}

// ── UI: Notebook switcher ─────────────────────────────────────

function renderNotebookSwitcher() {
  const nameEl = document.getElementById('nb-current-name');
  const listEl = document.getElementById('nb-list');
  if (!nameEl || !listEl) return;

  const nb = getActiveNotebook();
  if (nb) nameEl.textContent = nb.name;

  listEl.innerHTML = '';
  NB_REGISTRY.forEach(entry => {
    const active    = entry.id === NB_ACTIVE_ID;
    const connected = fileStore.isActive(entry.id);
    const pending   = fileStore.isPending(entry.id);
    const dotClass  = connected ? 'connected' : (pending ? 'pending' : 'disconnected');

    const row = document.createElement('div');
    row.className = 'nb-row' + (active ? ' active' : '');
    row.dataset.id = entry.id;
    row.innerHTML =
      `<span class="nb-dot ${dotClass}"></span>` +
      `<span class="nb-row-name">${escHtml(entry.name)}</span>` +
      `<div class="nb-row-actions">` +
        `<button title="Rename" onclick="event.stopPropagation();openRenameNotebookModal('${entry.id}')">✎</button>` +
        `<button title="Delete" onclick="event.stopPropagation();deleteNotebook('${entry.id}')">✕</button>` +
      `</div>`;
    row.addEventListener('click', () => switchNotebook(entry.id));
    listEl.appendChild(row);
  });
}

function toggleNotebookDropdown() {
  const dd = document.getElementById('nb-dropdown');
  if (!dd) return;
  const opening = !dd.classList.contains('open');
  dd.classList.toggle('open', opening);
  if (opening) {
    setTimeout(() => {
      document.addEventListener('click', _closeDropdownOutside, { once: true });
    }, 0);
  }
}

function closeNotebookDropdown() {
  const dd = document.getElementById('nb-dropdown');
  if (dd) dd.classList.remove('open');
}

function _closeDropdownOutside(e) {
  const sw = document.getElementById('nb-switcher');
  if (sw && !sw.contains(e.target)) closeNotebookDropdown();
}

// ── Escape helper ─────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
