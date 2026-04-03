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

const _MOB_ALL_PANELS = ['task-panel', 'notes-list', 'editor-panel', 'inbox-view', 'contacts-view'];

function _mobShowOnly(panelId) {
  // Hide all panels (mob-active class)
  _MOB_ALL_PANELS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('mob-active');
  });

  // contacts-view and inbox-view use .vis instead of .mob-active — clear both
  const contactsView = document.getElementById('contacts-view');
  if (contactsView) contactsView.classList.remove('vis');
  const inboxView = document.getElementById('inbox-view');
  if (inboxView) inboxView.classList.remove('vis');

  // notes-area wraps notes-list + editor-panel; show it only for those screens
  const notesArea = document.getElementById('notes-area');
  if (notesArea) {
    notesArea.style.display = (panelId === 'notes-list' || panelId === 'editor-panel') ? 'flex' : 'none';
  }

  // For vis-based panels, add .vis instead of .mob-active
  if (panelId === 'inbox-view' && inboxView) {
    inboxView.classList.add('vis');
  } else if (panelId === 'contacts-view' && contactsView) {
    contactsView.classList.add('vis');
  } else {
    const target = document.getElementById(panelId);
    if (target) target.classList.add('mob-active');
  }
}

// ── Tab navigation ────────────────────────────────────────────

let _mobCurrentTab = 'tasks';

const _MOB_ACTIONS = {
  tasks: () => {
    // Show tasks only — hide follow-ups by setting fu-mode to collapsed
    setFuMode('collapsed');
    renderTasks();
    _mobShowOnly('task-panel');
  },
  followups: () => {
    // Show follow-ups only — use fu-mode full which hides task-scroll
    setFuMode('full');
    renderFollowUps();
    _mobShowOnly('task-panel');
  },
  notes: () => {
    renderNotesList();
    _mobShowOnly('notes-list');
  },
  inbox: () => {
    renderInbox();
    updateInboxStats();
    _mobShowOnly('inbox-view');
  },
  contacts: () => {
    if (typeof showContacts === 'function') showContacts();
    _mobShowOnly('contacts-view');
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
  _mobShowOnly('editor-panel');
  document.querySelectorAll('.mob-tab').forEach(el => el.classList.remove('mob-active'));
  const notesTab = document.getElementById('mnt-notes');
  if (notesTab) notesTab.classList.add('mob-active');
}

// Back button in editor header → return to notes list.
function mobBack() {
  if (!_isMob()) return;
  _mobShowOnly('notes-list');
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
