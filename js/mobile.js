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

// Top-level columns inside #panels
const _MOB_COLUMNS = ['task-panel', 'notes-side'];

function _mobShowOnly(screen) {
  // screen is one of: 'tasks', 'followups', 'notes', 'editor', 'inbox', 'contacts'

  // Step 1: hide both top-level columns
  _MOB_COLUMNS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('mob-active');
  });

  // Step 2: hide everything inside notes-side
  const inboxView    = document.getElementById('inbox-view');
  const contactsView = document.getElementById('contacts-view');
  const notesArea    = document.getElementById('notes-area');
  const notesList    = document.getElementById('notes-list');
  const editorPanel  = document.getElementById('editor-panel');
  if (inboxView)    inboxView.classList.remove('vis');
  if (contactsView) contactsView.classList.remove('vis');
  if (notesArea)    notesArea.style.display = 'none';
  if (notesList)    notesList.classList.remove('mob-active');
  if (editorPanel)  editorPanel.classList.remove('mob-active');

  // Step 3: show the right column and child
  if (screen === 'tasks' || screen === 'followups') {
    document.getElementById('task-panel')?.classList.add('mob-active');
  } else {
    document.getElementById('notes-side')?.classList.add('mob-active');
    if (screen === 'inbox' && inboxView) {
      inboxView.classList.add('vis');
    } else if (screen === 'contacts' && contactsView) {
      contactsView.classList.add('vis');
    } else if (screen === 'notes' && notesArea && notesList) {
      notesArea.style.display = 'flex';
      notesList.classList.add('mob-active');
    } else if (screen === 'editor' && notesArea && editorPanel) {
      notesArea.style.display = 'flex';
      editorPanel.classList.add('mob-active');
    }
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
