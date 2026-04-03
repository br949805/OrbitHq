// ── mobile.js ─────────────────────────────────────────────────
// Mobile navigation. Only activates on screens ≤ 768px.
// On boot, physically re-parents the app's existing panel DOM nodes
// into a clean #mob-shell div so there are no nested flex conflicts.
// Desktop #main is hidden entirely on mobile. All render functions
// (renderTasks, renderNotesList, etc.) continue targeting the same
// element IDs — they just now live inside the shell.
// ──────────────────────────────────────────────────────────────

const _MOB_MQ = window.matchMedia('(max-width: 768px)');
function _isMob() { return _MOB_MQ.matches; }

// ── Boot: build the shell and re-parent panels ────────────────

function _mobBuildShell() {
  // Create the full-screen shell
  const shell = document.createElement('div');
  shell.id = 'mob-shell';
  document.body.appendChild(shell);

  // Panels to re-parent, in order. Each becomes a direct child of shell.
  // We pull them from wherever they currently live in the desktop DOM.
  const ids = ['task-panel', 'fu-panel', 'inbox-view', 'notes-list', 'editor-panel', 'contacts-view'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) shell.appendChild(el);
  });

  // Hide the entire desktop layout
  const main = document.getElementById('main');
  if (main) main.style.display = 'none';

  // Also hide the desktop nudge bar and panels wrapper (they're outside #main)
  // They live in the anonymous wrapper div between sidebar and panels
  const panels = document.getElementById('panels');
  if (panels && panels.parentElement && panels.parentElement !== main) {
    panels.parentElement.style.display = 'none';
  }
}

// ── Screen switching ──────────────────────────────────────────
// Each panel is now a direct child of #mob-shell.
// Only one is visible at a time — we set display:flex/none directly.

const _MOB_PANELS = ['task-panel', 'fu-panel', 'inbox-view', 'notes-list', 'editor-panel', 'contacts-view'];

function _mobShowOnly(screen) {
  // Hide every panel
  _MOB_PANELS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Show the one we want
  let show = null;
  if (screen === 'tasks')    show = 'task-panel';
  if (screen === 'followups') show = 'fu-panel';
  if (screen === 'notes')    show = 'notes-list';
  if (screen === 'editor')   show = 'editor-panel';
  if (screen === 'inbox')    show = 'inbox-view';
  if (screen === 'contacts') show = 'contacts-view';

  if (show) {
    const el = document.getElementById(show);
    if (el) el.style.display = 'flex';
  }
}

// ── Tab navigation ────────────────────────────────────────────

let _mobCurrentTab = 'tasks';

const _MOB_ACTIONS = {
  tasks: () => {
    renderTasks();
    _mobShowOnly('tasks');
  },
  followups: () => {
    renderFollowUps();
    _mobShowOnly('followups');
  },
  notes: () => {
    renderNotesList();
    _mobShowOnly('notes');
  },
  inbox: () => {
    renderInbox();
    updateInboxStats();
    _mobShowOnly('inbox');
  },
  contacts: () => {
    if (typeof renderContactsView === 'function') renderContactsView();
    _mobShowOnly('contacts');
  },
};

function mobNav(tab) {
  if (!_isMob()) return;
  _mobCurrentTab = tab;

  document.querySelectorAll('.mob-tab').forEach(el => el.classList.remove('mob-active'));
  const tabEl = document.getElementById('mnt-' + tab);
  if (tabEl) tabEl.classList.add('mob-active');

  if (_MOB_ACTIONS[tab]) _MOB_ACTIONS[tab]();
}

// ── Note open / back ──────────────────────────────────────────

function mobOpenNote() {
  if (!_isMob()) return;
  _mobShowOnly('editor');
  document.querySelectorAll('.mob-tab').forEach(el => el.classList.remove('mob-active'));
  const notesTab = document.getElementById('mnt-notes');
  if (notesTab) notesTab.classList.add('mob-active');
}

function mobBack() {
  if (!_isMob()) return;
  _mobShowOnly('notes');
  document.querySelectorAll('.mob-tab').forEach(el => el.classList.remove('mob-active'));
  const notesTab = document.getElementById('mnt-notes');
  if (notesTab) notesTab.classList.add('mob-active');
}

// ── Badge sync ────────────────────────────────────────────────

function updateMobBadges() {
  if (!_isMob()) return;
  const taskCount  = parseInt(document.getElementById('sb-task-badge')?.textContent  || '0', 10);
  const inboxCount = parseInt(document.getElementById('sb-inbox-badge')?.textContent || '0', 10);
  const fuCount    = parseInt(document.getElementById('sb-fu-badge')?.textContent    || '0', 10);

  const taskEl  = document.getElementById('mnt-task-badge');
  const inboxEl = document.getElementById('mnt-inbox-badge');
  const fuEl    = document.getElementById('mnt-fu-badge');

  if (taskEl)  { taskEl.textContent  = taskCount  || ''; taskEl.classList.toggle('show',  taskCount  > 0); }
  if (inboxEl) { inboxEl.textContent = inboxCount || ''; inboxEl.classList.toggle('show', inboxCount > 0); }
  if (fuEl)    { fuEl.textContent    = fuCount    || ''; fuEl.classList.toggle('show',    fuCount    > 0); }
}

// ── Mobile note filter chip helper ───────────────────────────

function mobNoteFilter(filter, el) {
  if (!_isMob()) return;
  document.querySelectorAll('.mob-nf-chip').forEach(c => c.classList.remove('mob-nf-active'));
  if (el) el.classList.add('mob-nf-active');
  setNoteFilter(filter, null);
}

// ── Mobile folder picker ──────────────────────────────────────

function openMobFolderPicker() {
  if (!_isMob()) return;
  const body = document.getElementById('mob-folder-body');
  if (!body) return;
  body.innerHTML = '';

  // All Notes shortcut
  const allRow = document.createElement('div');
  allRow.className = 'mob-folder-row';
  allRow.innerHTML = '<span class="mob-folder-ic">◈</span><span>All Notes</span>';
  allRow.onclick = () => { mobNoteFilter('all', null); _resetMobNFChip('all'); closeModal('mob-folder-modal'); };
  body.appendChild(allRow);

  // Pinned
  const pinRow = document.createElement('div');
  pinRow.className = 'mob-folder-row';
  pinRow.innerHTML = '<span class="mob-folder-ic">⊙</span><span>Pinned</span>';
  pinRow.onclick = () => { mobNoteFilter('pinned', null); _resetMobNFChip('pinned'); closeModal('mob-folder-modal'); };
  body.appendChild(pinRow);

  // Folders
  if (S.folders && S.folders.length) {
    const hdr = document.createElement('div');
    hdr.className = 'mob-folder-sec';
    hdr.textContent = 'Folders';
    body.appendChild(hdr);
    S.folders.forEach(f => {
      const row = document.createElement('div');
      row.className = 'mob-folder-row';
      row.innerHTML = `<span class="mob-folder-ic">📁</span><span>${esc(f.name)}</span>`;
      row.onclick = () => {
        setNoteFilter('folder:' + f.id, null);
        document.getElementById('nl-heading').textContent = f.name;
        _resetMobNFChip('folder');
        closeModal('mob-folder-modal');
      };
      body.appendChild(row);
    });
  }

  document.getElementById('mob-folder-modal').classList.add('open');
}

function _resetMobNFChip(filter) {
  document.querySelectorAll('.mob-nf-chip').forEach(c => c.classList.remove('mob-nf-active'));
  // Highlight chip that matches filter, if it exists
  const map = {'all':0,'pinned':1};
  if (filter in map) {
    const chips = document.querySelectorAll('.mob-nf-chip');
    if (chips[map[filter]]) chips[map[filter]].classList.add('mob-nf-active');
  }
}

// ── Boot ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!_isMob()) return;
  _mobBuildShell();
  // Defer nav until app.js _continueBoot has finished rendering
  requestAnimationFrame(() => requestAnimationFrame(() => mobNav('tasks')));
});
