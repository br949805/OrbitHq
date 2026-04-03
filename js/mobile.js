// ── mobile.js ─────────────────────────────────────────────────
// Mobile navigation and panel management.
// Only activates on screens ≤ 768px. All desktop behaviour unchanged.
// ──────────────────────────────────────────────────────────────

const _MOB_MQ = window.matchMedia('(max-width: 768px)');

function _isMob() { return _MOB_MQ.matches; }

// ── Screen switching ──────────────────────────────────────────
// On mobile, exactly one screen fills the viewport at a time.
// We hide every panel then show just the one we want.
//
// Complication: #task-panel, #notes-list, and #editor-panel live inside
// a flex wrapper (#panels → inner div → #notes-area) alongside #inbox-view.
// showView() sets inline display styles that would fight our class approach,
// so we bypass it entirely on mobile.

function _mobShowOnly(screen) {
  // screen: 'tasks' | 'followups' | 'notes' | 'editor' | 'inbox' | 'contacts'

  // Hide all top-level screens
  document.getElementById('task-panel')?.classList.remove('mob-active');
  document.getElementById('notes-side')?.classList.remove('mob-active');
  document.getElementById('inbox-view')?.classList.remove('vis');
  document.getElementById('contacts-view')?.classList.remove('vis');

  // Hide notes sub-panels
  const notesArea   = document.getElementById('notes-area');
  const notesList   = document.getElementById('notes-list');
  const editorPanel = document.getElementById('editor-panel');
  if (notesArea)   notesArea.style.display = 'none';
  if (notesList)   notesList.classList.remove('mob-active');
  if (editorPanel) editorPanel.classList.remove('mob-active');

  // Show the requested screen
  if (screen === 'tasks' || screen === 'followups') {
    document.getElementById('task-panel')?.classList.add('mob-active');
  } else if (screen === 'inbox') {
    document.getElementById('inbox-view')?.classList.add('vis');
  } else if (screen === 'contacts') {
    document.getElementById('contacts-view')?.classList.add('vis');
  } else if (screen === 'notes') {
    document.getElementById('notes-side')?.classList.add('mob-active');
    if (notesArea) notesArea.style.display = 'flex';
    notesList?.classList.add('mob-active');
  } else if (screen === 'editor') {
    document.getElementById('notes-side')?.classList.add('mob-active');
    if (notesArea) notesArea.style.display = 'flex';
    editorPanel?.classList.add('mob-active');
  }
}

// ── Tab navigation ────────────────────────────────────────────

let _mobCurrentTab = 'tasks';

const _MOB_ACTIONS = {
  tasks: () => {
    setFuMode('collapsed');
    renderTasks();
    _mobShowOnly('tasks');
  },
  followups: () => {
    setFuMode('full');
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

// Called at the end of openNote() in editor.js.
function mobOpenNote() {
  if (!_isMob()) return;
  _mobShowOnly('editor');
  document.querySelectorAll('.mob-tab').forEach(el => el.classList.remove('mob-active'));
  const notesTab = document.getElementById('mnt-notes');
  if (notesTab) notesTab.classList.add('mob-active');
}

// Back button in editor header → return to notes list.
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

// ── Boot: initialise default panel on mobile ─────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (_isMob()) {
    // Defer until the app's own boot has run (app.js calls _continueBoot)
    requestAnimationFrame(() => requestAnimationFrame(() => mobNav('tasks')));
  }
});
