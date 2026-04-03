// ── mobile.js ─────────────────────────────────────────────────
// Mobile navigation and panel management.
// Only activates on screens ≤ 768px. All desktop behaviour unchanged.
// ──────────────────────────────────────────────────────────────

const _MOB_MQ = window.matchMedia('(max-width: 768px)');

function _isMob() { return _MOB_MQ.matches; }

// ── Panel activation ──────────────────────────────────────────

const _MOB_PANEL_IDS = ['task-panel','notes-list','editor-panel','inbox-view','contacts-view'];

function _mobActivate(panelId) {
  _MOB_PANEL_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('mob-active');
  });
  const target = document.getElementById(panelId);
  if (target) target.classList.add('mob-active');
}

// ── Tab navigation ────────────────────────────────────────────

const _MOB_ACTIONS = {
  tasks:     () => { showView('dashboard'); _mobActivate('task-panel'); },
  notes:     () => { showView('dashboard'); _mobActivate('notes-list'); },
  inbox:     () => { showView('inbox');     _mobActivate('inbox-view'); },
  followups: () => { showView('dashboard'); setFuMode('full'); _mobActivate('task-panel'); },
  contacts:  () => { showContacts();        _mobActivate('contacts-view'); },
};

let _mobCurrentTab = 'tasks';

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
  _mobActivate('editor-panel');
  // Mark Notes tab active since we came from notes list
  document.querySelectorAll('.mob-tab').forEach(el => el.classList.remove('mob-active'));
  const notesTab = document.getElementById('mnt-notes');
  if (notesTab) notesTab.classList.add('mob-active');
}

// Back button in editor header → return to notes list.
function mobBack() {
  if (!_isMob()) return;
  _mobActivate('notes-list');
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
