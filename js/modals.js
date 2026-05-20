// ── modals.js ─────────────────────────────────────────────────
// Capture modal, type selector, settings panel, data export.
// ──────────────────────────────────────────────────────────────

// ── Type Selector ────────────────────────────────────────────

function openTypeSelector() {
  const grid = document.getElementById('type-grid'); grid.innerHTML = '';
  Object.entries(NT).forEach(([key, td]) => {
    const div = document.createElement('div'); div.className = 'type-opt';
    div.innerHTML = `<div class="to-icon">${td.icon}</div><div class="to-name" style="color:${td.color}">${td.label}</div><div class="to-desc">${td.desc}</div>`;
    div.onclick = () => { closeModal('type-modal'); const n = createNote(key); openNote(n.id); renderNotesList(); updateNoteBadges(); updateInboxBadge(); };
    grid.appendChild(div);
  });
  document.getElementById('type-modal').classList.add('open');
}

// ── Capture Modal ────────────────────────────────────────────

let capTab = 'task';

function openCapture(tab = 'task') {
  capTab = tab; switchCapTab(tab);
  document.getElementById('cap-task-due').value = todayISO();
  document.getElementById('cap-modal').classList.add('open');
  setTimeout(() => {
    if (tab === 'task') document.getElementById('cap-task-title').focus();
    else                document.getElementById('cap-note-title').focus();
  }, 50);
}

function switchCapTab(tab) {
  capTab = tab;
  document.getElementById('cap-task-form').style.display = tab === 'task' ? 'block' : 'none';
  document.getElementById('cap-note-form').style.display = tab === 'note' ? 'block' : 'none';
  document.getElementById('cap-tab-task').classList.toggle('pinned', tab === 'task');
  document.getElementById('cap-tab-note').classList.toggle('pinned', tab === 'note');
  document.getElementById('cap-submit-btn').textContent = tab === 'task' ? 'Create Task' : 'Create Note';
}

function submitCapture() {
  if (capTab === 'task') {
    const title = document.getElementById('cap-task-title').value.trim();
    if (!title) { document.getElementById('cap-task-title').style.borderColor = 'var(--red)'; return; }
    const due   = document.getElementById('cap-task-due').value   || null;
    const recur = document.getElementById('cap-task-recur').value || null;
    S.tasks.unshift({ id:uid(), title, due, recur, noteId:null, subtasks:[], createdAt:nowMs(), completedAt:null });
    save(); renderTasks(); closeModal('cap-modal');
    document.getElementById('cap-task-title').value  = '';
    document.getElementById('cap-task-due').value    = '';
    document.getElementById('cap-task-recur').value  = '';
    toast('Task created');
  } else {
    const type  = document.getElementById('cap-note-type').value;
    const title = document.getElementById('cap-note-title').value.trim();
    closeModal('cap-modal');
    const note  = createNote(type, title);
    if (currentView === 'inbox') showView('dashboard');
    openNote(note.id); renderNotesList(); updateNoteBadges(); updateInboxBadge();
    document.getElementById('cap-note-title').value = '';
    toast('Note created');
  }
}

// ── Settings ─────────────────────────────────────────────────

const THEME_BG = {
  'clean':      '#f8f7fc',
  'clean-dark': '#0d1117',
  'vibrant':    '#faf9ff',
  'carbon':     '#0e1012',
  'aurora':     '#1f1368',
};

function applyTheme(theme) {
  const valid = ['clean', 'clean-dark', 'vibrant', 'carbon', 'aurora'];
  document.body.dataset.theme = valid.includes(theme) ? theme : '';
  const color = THEME_BG[theme] || '#0f0f0f';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
}

function applyFontSize(size) {
  const valid = ['small', 'default', 'large', 'xlarge'];
  const v = valid.includes(size) ? size : 'default';
  if (v === 'default') {
    document.documentElement.removeAttribute('data-font-size');
  } else {
    document.documentElement.dataset.fontSize = v;
  }
}

function openSettings() {
  toggleHamburger(true);
}

function toggleHamburger(forceOpen) {
  const dropdown = document.getElementById('hamburger-dropdown');
  const btn = document.getElementById('hamburger-btn');
  const isOpen = dropdown.classList.contains('open');
  const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;
  if (shouldOpen) {
    document.getElementById('set-archive-delay').value = S.settings.archiveDelay;
    document.getElementById('set-word-thresh').value   = S.settings.wordThreshold;
    document.getElementById('set-review-day').value    = S.settings.reviewDay;
    document.getElementById('set-theme').value         = S.settings.theme || 'default';
    document.getElementById('set-font-size').value     = S.settings.fontSize || 'default';
    dropdown.classList.add('open');
    btn.classList.add('active');
    if (typeof updateSyncStatusUI === 'function') updateSyncStatusUI();
  } else {
    dropdown.classList.remove('open');
    btn.classList.remove('active');
  }
}

document.addEventListener('click', function(e) {
  const wrap = document.getElementById('hamburger-wrap');
  if (wrap && !wrap.contains(e.target)) {
    const dropdown = document.getElementById('hamburger-dropdown');
    const btn = document.getElementById('hamburger-btn');
    if (dropdown) dropdown.classList.remove('open');
    if (btn) btn.classList.remove('active');
  }
});

function saveSettings() {
  S.settings.archiveDelay  = parseInt(document.getElementById('set-archive-delay').value);
  S.settings.wordThreshold = parseInt(document.getElementById('set-word-thresh').value);
  S.settings.reviewDay     = parseInt(document.getElementById('set-review-day').value);
  S.settings.theme         = document.getElementById('set-theme').value;
  S.settings.fontSize      = document.getElementById('set-font-size').value;
  applyTheme(S.settings.theme);
  applyFontSize(S.settings.fontSize);
  save(); runAutoArchive(); renderTasks(); updateInboxBadge(); checkNudges(); toast('Settings saved');
}

// ── Template Editor ──────────────────────────────────────────

function openTemplateEditor(type = 'meeting') {
  document.getElementById('tmpl-type-sel').value = type;
  loadTemplateForType(type);
  document.getElementById('tmpl-modal').classList.add('open');
  setTimeout(() => document.getElementById('tmpl-editor').focus(), 50);
}

function loadTemplateForType(type) {
  const custom = S.settings.templates?.[type];
  const def = NT[type]?.template || '';
  document.getElementById('tmpl-editor').innerHTML = custom !== undefined ? custom : def;
}

function switchTemplateType(type) {
  loadTemplateForType(type);
}

function saveCurrentTemplate() {
  const type = document.getElementById('tmpl-type-sel').value;
  if (!S.settings.templates) S.settings.templates = {};
  S.settings.templates[type] = document.getElementById('tmpl-editor').innerHTML;
  save();
  toast('Template saved');
  closeModal('tmpl-modal');
}

function resetTemplateToDefault() {
  const type = document.getElementById('tmpl-type-sel').value;
  if (S.settings.templates) delete S.settings.templates[type];
  loadTemplateForType(type);
  toast('Reset to default');
}

function tmplEc(cmd) { document.getElementById('tmpl-editor').focus(); document.execCommand(cmd, false, null); }
function tmplEh(level) { document.getElementById('tmpl-editor').focus(); document.execCommand('formatBlock', false, 'h' + level); }
function tmplInsertCode() { document.getElementById('tmpl-editor').focus(); document.execCommand('insertHTML', false, '<pre><code>// code here</code></pre><p></p>'); }

// ── File Storage (notebook-scoped) ────────────────────────────

function updateNotebookStatusUI() {
  const el = document.getElementById('file-status');
  const banner = document.getElementById('reconnect-banner');
  const nbId   = NB_ACTIVE_ID;
  const active  = fileStore.isActive(nbId);
  const pending = fileStore.isPending(nbId);
  const fname   = fileStore.getFileName(nbId);
  const nb      = getActiveNotebook();
  const nbName  = nb ? nb.name : '';

  // Update footer file-status indicator.
  if (el) {
    if (active) {
      el.innerHTML = `<span class="fs-dot connected"></span><span class="fs-name">${nbName} — ${fname}</span><button class="fs-disconnect" onclick="reconnectFile()" title="Re-grant access">↺</button>`;
      el.title = 'Notebook file connected';
      if (banner) banner.style.display = 'none';
    } else if (pending) {
      el.innerHTML = `<span class="fs-dot pending"></span><span class="fs-name">${nbName} — ${fname}</span><button class="fs-reconnect" onclick="reconnectFile()" title="Click to re-grant access">↺</button>`;
      el.title = 'Click ↺ to re-grant file access';
      if (banner) {
        banner.querySelector('strong').textContent = nbName + ' / ' + fname;
        banner.style.display = 'flex';
      }
    } else {
      el.innerHTML = `<span class="fs-dot disconnected"></span><span class="fs-name">${nbName} — localStorage</span>`;
      el.title = 'No file connected — data saved in browser only';
      if (banner) banner.style.display = 'none';
    }
  }

  // Update settings panel file path display.
  const pathEl = document.getElementById('set-nb-file-path');
  if (pathEl) pathEl.textContent = active ? fname : (pending ? fname + ' (permission needed)' : 'localStorage only');

  // Update cloud sync indicator
  if (typeof updateSyncStatusUI === 'function') updateSyncStatusUI();
}

// Keep old name as alias for any callers.
function updateFileStatusUI() { updateNotebookStatusUI(); }

async function reconnectFile() {
  const granted = await fileStore.requestPermissionForNotebook(NB_ACTIVE_ID);
  if (granted) {
    const fileData = await fileStore.readFileForNotebook(NB_ACTIVE_ID);
    if (fileData) {
      const migrated = applyVersionMigrations(fileData);
      const prevSettings = S.settings;
      S = { ...S, ...migrated };
      S.settings = { ...prevSettings, ...migrated.settings };
      normalizeState(); save();
      renderTasks(); renderNotesList(); renderFolderTree();
      updateNoteBadges(); updateInboxBadge();
      toast('Data loaded from file');
    }
  }
  updateNotebookStatusUI();
  renderNotebookSwitcher();
}

async function connectFile() {
  if (!('showOpenFilePicker' in window)) {
    toast('File picker not supported — use Import JSON instead');
    return;
  }
  const ok = await connectFileToNotebook(NB_ACTIVE_ID);
  if (!ok) return;

  const fname = fileStore.getFileName(NB_ACTIVE_ID);
  const shouldLoad = confirm(
    `Connected to "${fname}".\n\nLoad data from this file?\n\n` +
    `OK = load file data (replaces current notebook)\n` +
    `Cancel = keep current data and write it to file`
  );

  if (shouldLoad) {
    const fileData = await fileStore.readFileForNotebook(NB_ACTIVE_ID);
    if (fileData) {
      const migrated = applyVersionMigrations(fileData);
      S = { ...S, ...migrated };
      normalizeState(); save();
      renderTasks(); renderNotesList(); renderFolderTree();
      updateNoteBadges(); updateInboxBadge();
      toast('Data loaded from file');
    } else {
      toast('File appears empty — current data written to it');
      save();
    }
  } else {
    save();
    toast('Current data written to file');
  }
  updateNotebookStatusUI();
  renderNotebookSwitcher();
}

async function createFile() {
  if (!('showSaveFilePicker' in window)) {
    toast('File picker not supported — use Export JSON instead');
    return;
  }
  const nb = getActiveNotebook();
  const suggested = (nb ? nb.name.toLowerCase().replace(/\s+/g,'-') : 'notebook') + '-data.json';
  const ok = await createFileForNotebook(NB_ACTIVE_ID, { version:1, savedAt:new Date().toISOString(), ...S }, suggested);
  if (!ok) return;
  toast(`Created and connected to "${fileStore.getFileName(NB_ACTIVE_ID)}"`);
  updateNotebookStatusUI();
  renderNotebookSwitcher();
}

function disconnectFile() {
  disconnectFileFromNotebook(NB_ACTIVE_ID);
  updateNotebookStatusUI();
  renderNotebookSwitcher();
  toast('File disconnected — saving to localStorage only');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text    = await file.text();
      const data    = JSON.parse(text);
      const migrated = applyVersionMigrations(data);
      S = { ...S, ...migrated };
      normalizeState(); save();
      renderTasks(); renderNotesList(); renderFolderTree();
      updateNoteBadges(); updateInboxBadge();
      toast('Data imported');
    } catch(err) { toast('Import failed: invalid JSON'); }
  };
  input.click();
}

function exportData() {
  const nb   = getActiveNotebook();
  const name = nb ? nb.name.toLowerCase().replace(/\s+/g,'-') : 'notebook';
  const blob = new Blob([JSON.stringify({ version:1, exported:new Date().toISOString(), ...S }, null, 2)], { type:'application/json' });
  const a    = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '-export-' + todayISO() + '.json'; a.click();
  toast('Data exported');
}

function clearAllData() {
  // Clear only the active notebook's data.
  S = { tasks:[], archived:[], notes:[], folders:[], tags:[], contacts:[], followups:[], fuArchived:[], fuPanelMode:'normal', collapsed:{}, noteFilter:'all', activeNoteId:null, navHistory:[], blOpen:false, dismissedCtx:[], settings:{ archiveDelay:7, wordThreshold:50, reviewDay:1, theme:'clean-dark', templates:{} }, session:{ lastWeekly:null, agedSnoozedUntil:null, clearedToday:0, clearedDate:null } };
  save(); location.reload();
}

// ── Welcome overlay (first launch) ───────────────────────────

function showWelcomeOverlay() {
  document.getElementById('welcome-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('welcome-nb-name').focus(), 100);
}

function hideWelcomeOverlay() {
  document.getElementById('welcome-overlay').style.display = 'none';
}

async function welcomeCreateNotebook() {
  const inp  = document.getElementById('welcome-nb-name');
  const name = inp.value.trim();
  if (!name) { inp.style.borderColor = 'var(--red)'; inp.focus(); return; }
  inp.style.borderColor = '';

  let handle = null;
  if (isFSSupported()) {
    // File picker MUST be first — preserves the user gesture across async calls.
    handle = await _pickNotebookFile(name);
    if (handle === 'cancelled') return;
    if (handle === 'insecure') { toast('File save requires a web server — open via localhost, not file://'); return; }
    if (handle === 'error')    { toast('Could not create notebook file — check browser permissions'); return; }
    // 'unsupported' falls through as null (localStorage-only)
  }

  const nb = await createNotebook(name, handle);
  setActiveId(nb.id);
  hideWelcomeOverlay();
  await _continueBoot();
}

async function welcomeImportNotebook() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const derivedName = file.name.replace(/\.json$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const id    = uid();
      const lsKey = nbLsKey(id);
      try { localStorage.setItem(lsKey, JSON.stringify(data)); } catch(e) {}
      const entry = { id, name: derivedName, lsKey, hasFile: false, fileNameHint: null, createdAt: Date.now() };
      NB_REGISTRY.push(entry);
      saveRegistry();
      setActiveId(entry.id);
      hideWelcomeOverlay();
      await _continueBoot();
    } catch(e) {
      toast('Could not read notebook file');
    }
  };
  inp.click();
}

async function welcomeOpenNotebook() {
  const entry = await openNotebookFromFile();
  if (!entry) return;  // cancelled or failed
  setActiveId(entry.id);
  hideWelcomeOverlay();
  await _continueBoot();
}

// Also exposed for the switcher dropdown "Open Notebook" action.
async function openNotebookAction() {
  const entry = await openNotebookFromFile();
  if (!entry) return;
  await switchNotebook(entry.id);
}

// Mobile: import a notebook from a JSON file using <input type="file">.
async function importNotebookAction() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const derivedName = file.name.replace(/\.json$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const id    = uid();
      const lsKey = nbLsKey(id);
      try { localStorage.setItem(lsKey, JSON.stringify(data)); } catch(e) {}
      const entry = { id, name: derivedName, lsKey, hasFile: false, fileNameHint: null, createdAt: Date.now() };
      NB_REGISTRY.push(entry);
      saveRegistry();
      await switchNotebook(entry.id);
    } catch(e) {
      toast('Could not read notebook file');
    }
  };
  inp.click();
}

// ── Notebook CRUD modals ──────────────────────────────────────

let _renamingNbId = null;

function openNewNotebookModal() {
  closeNotebookDropdown();
  document.getElementById('nb-name-inp').value = '';
  document.getElementById('nb-modal').classList.add('open');
  setTimeout(() => document.getElementById('nb-name-inp').focus(), 50);
}

async function submitNewNotebook() {
  const name = document.getElementById('nb-name-inp').value.trim();
  if (!name) { document.getElementById('nb-name-inp').style.borderColor = 'var(--red)'; return; }

  let handle = null;
  if (isFSSupported()) {
    // File picker MUST be first — preserves the user gesture.
    handle = await _pickNotebookFile(name);
    if (handle === 'cancelled') return;
    if (handle === 'insecure') { toast('File save requires a web server — open via localhost, not file://'); return; }
    if (handle === 'error')    { toast('Could not create notebook file — check browser permissions'); return; }
  }

  closeModal('nb-modal');
  const nb = await createNotebook(name, handle);
  await switchNotebook(nb.id);
}

function openRenameNotebookModal(id) {
  _renamingNbId = id;
  const nb = NB_REGISTRY.find(n => n.id === id);
  document.getElementById('nb-rename-inp').value = nb ? nb.name : '';
  document.getElementById('nb-rename-modal').classList.add('open');
  setTimeout(() => document.getElementById('nb-rename-inp').focus(), 50);
}

function submitRenameNotebook() {
  const name = document.getElementById('nb-rename-inp').value.trim();
  if (!name || !_renamingNbId) return;
  renameNotebook(_renamingNbId, name);
  closeModal('nb-rename-modal');
  _renamingNbId = null;
}

// ── Cloud Sync Modal ─────────────────────────────────────────

function openSyncModal() {
  _populateSyncModal();
  document.getElementById('sync-modal').classList.add('open');
}

function _populateSyncModal() {
  const body = document.getElementById('sync-modal-body');
  const footer = document.getElementById('sync-modal-footer');
  const authorized = dropboxSync && dropboxSync._hasToken();
  const unlocked = isSyncUnlocked && isSyncUnlocked();
  const settings = getSyncSettings();
  const lastSync = settings.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleString() : 'Never';

  footer.innerHTML = `<span class="mhint" id="sync-last-sync-lbl">Last sync: ${lastSync}</span><button class="btn-gh" onclick="closeModal('sync-modal')">Done</button>`;

  if (!authorized) {
    // State 1: Not connected
    body.innerHTML = `
      <div class="fg">
        <p style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:12px">
          Connect your Dropbox account to sync your notebooks securely. Your data is encrypted end-to-end — only you can decrypt it with your password.
        </p>
      </div>
      <div class="frow" style="gap:10px">
        <button class="btn-pr" style="flex:1" onclick="syncModalConnect()">🔗 Connect Dropbox</button>
      </div>
    `;
  } else if (!unlocked) {
    // State 2: Connected, locked
    body.innerHTML = `
      <div class="fg">
        <label class="fl">Sync Status</label>
        <div style="font-size:13px;color:var(--text2);padding:8px 0">Connected • Waiting for password</div>
      </div>
      <div class="fg">
        <label class="fl">Encryption Password</label>
        <input class="fi" id="sync-password-inp" type="password" placeholder="Enter your password…" style="font-size:15px;padding:8px">
      </div>
      <div style="font-size:11px;color:var(--text3);margin:8px 0">Your password is never sent to any server — only used locally to encrypt your data.</div>
      <div class="frow" style="gap:10px;margin-top:12px">
        <button class="btn-pr" style="flex:1" onclick="syncModalUnlock()">🔓 Unlock</button>
        <button class="btn-dr" style="flex:0" onclick="syncModalDisconnect()">Disconnect</button>
      </div>
    `;
    setTimeout(() => document.getElementById('sync-password-inp').focus(), 50);
  } else if (settings.enabled) {
    // State 3: Connected, unlocked, enabled
    body.innerHTML = `
      <div class="fg">
        <label class="fl">Status</label>
        <div style="font-size:13px;color:var(--text2);padding:8px 0">✓ Synced and active</div>
      </div>
      <div class="fg" style="margin-top:12px">
        <label class="fl" style="margin-bottom:4px">Auto-sync</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);cursor:pointer">
          <input type="checkbox" id="sync-enabled-check" checked onchange="syncModalToggleEnabled(this.checked)" style="cursor:pointer">
          Save changes automatically to Dropbox
        </label>
      </div>
      <div class="frow" style="gap:10px;margin-top:16px">
        <button class="btn-pr" style="flex:1" onclick="syncNow()">↻ Sync Now</button>
        <button class="btn-gh" style="flex:0" onclick="syncModalLock()">🔒 Lock</button>
      </div>
      <button class="btn-dr" style="width:100%;margin-top:10px" onclick="syncModalDisconnect()">Disconnect Dropbox</button>
    `;
  } else {
    // State 4: Connected, unlocked, disabled
    body.innerHTML = `
      <div class="fg">
        <label class="fl">Status</label>
        <div style="font-size:13px;color:var(--text2);padding:8px 0">Paused</div>
      </div>
      <div class="fg" style="margin-top:12px">
        <label class="fl" style="margin-bottom:4px">Auto-sync</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);cursor:pointer">
          <input type="checkbox" id="sync-enabled-check" onchange="syncModalToggleEnabled(this.checked)" style="cursor:pointer">
          Save changes automatically to Dropbox
        </label>
      </div>
      <div class="frow" style="gap:10px;margin-top:16px">
        <button class="btn-pr" style="flex:1" onclick="syncModalToggleEnabled(true); setTimeout(_populateSyncModal, 100)">Enable Sync</button>
        <button class="btn-gh" style="flex:0" onclick="syncModalLock()">🔒 Lock</button>
      </div>
      <button class="btn-dr" style="width:100%;margin-top:10px" onclick="syncModalDisconnect()">Disconnect Dropbox</button>
    `;
  }
}

function syncModalConnect() {
  if (dropboxSync) dropboxSync.startAuth();
}

function syncModalDisconnect() {
  if (confirm('Disconnect from Dropbox? (Your local data stays safe.)')) {
    if (dropboxSync) dropboxSync.disconnect();
    lockSync();
    updateSyncStatusUI();
    _populateSyncModal();
    toast('Disconnected from Dropbox');
  }
}

function syncModalUnlock() {
  const pw = document.getElementById('sync-password-inp').value;
  if (!pw) { toast('Enter a password'); return; }
  unlockSync(pw).then(success => {
    _populateSyncModal();
    if (success && isSyncUnlocked()) {
      toast('Sync unlocked');
      updateSyncStatusUI();
    } else {
      toast('Could not unlock — check your password');
    }
  });
}

function syncModalLock() {
  lockSync();
  _populateSyncModal();
  updateSyncStatusUI();
  toast('Sync locked');
}

function syncModalToggleEnabled(val) {
  const settings = getSyncSettings();
  settings.enabled = val;
  saveSyncSettings(settings);
  updateSyncStatusUI();
}

function updateSyncStatusUI() {
  const el = document.getElementById('cloud-status');
  if (!el) return;

  const status = getSyncStatus ? getSyncStatus() : 'idle';
  const enabled = isSyncEnabled ? isSyncEnabled() : false;
  const authorized = dropboxSync && dropboxSync._hasToken();
  const unlocked = isSyncUnlocked ? isSyncUnlocked() : false;

  if (!enabled || !authorized) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';

  let dotClass, label, title;
  if (status === 'syncing') {
    dotClass = 'pending';
    label = 'syncing…';
    title = 'Cloud sync in progress';
  } else if (status === 'error') {
    dotClass = 'sync-error';
    label = 'sync error';
    title = 'Sync failed — click to retry';
  } else if (status === 'offline') {
    dotClass = 'disconnected';
    label = 'offline';
    title = 'Sync offline — local data only';
  } else if (!unlocked) {
    dotClass = 'sync-locked';
    label = 'locked';
    title = 'Sync locked — unlock in settings';
  } else {
    dotClass = 'sync-ok';
    label = 'cloud ✓';
    title = 'Cloud sync active';
  }

  let html = `<span class="fs-dot ${dotClass}"></span><span class="fs-name">${label}</span>`;
  if (status === 'error') {
    html += `<button class="fs-reconnect" onclick="syncNow()" title="Retry sync">↺</button>`;
  }

  el.innerHTML = html;
  el.title = title;
}
