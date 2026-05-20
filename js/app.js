// ── app.js ────────────────────────────────────────────────────
// Init, boot sequence, and top-level view switching.
// ──────────────────────────────────────────────────────────────

let currentView = 'dashboard'; // 'dashboard' | 'inbox'

function showView(view, siel) {
  currentView = view;
  document.getElementById('notes-area').style.display  = view === 'dashboard' ? 'flex' : 'none';
  document.getElementById('inbox-view').classList.toggle('vis', view === 'inbox');
  document.getElementById('processor').classList.remove('vis');

  document.querySelectorAll('.si').forEach(el => el.classList.remove('active'));
  if (siel) siel.classList.add('active');
  else {
    const el = document.getElementById(view === 'inbox' ? 'sb-inbox-si' : 'sb-dashboard');
    if (el) el.classList.add('active');
  }

  if (view === 'inbox') { renderInbox(); updateInboxStats(); }
  else                  { renderTasks(); renderNotesList(); }
}

function showInbox() { showView('inbox'); }

function toggleTaskPanel() {
  const panel = document.getElementById('task-panel');
  const btn   = document.getElementById('task-collapse-btn');
  const collapsed = panel.classList.toggle('collapsed');
  if (collapsed) {
    panel.style.width = '';
    panel.style.minWidth = '';
  } else {
    const sizes = loadPanelSizes();
    panel.style.width    = sizes.taskWidth + 'px';
    panel.style.minWidth = sizes.taskWidth + 'px';
  }
  if (btn) btn.textContent = collapsed ? '›' : '‹';
}

function toggleNotesPanel() {
  const panel = document.getElementById('notes-list');
  const btn   = document.getElementById('notes-collapse-btn');
  const lbl   = document.getElementById('notes-drawer-label');
  if (lbl && !panel.classList.contains('collapsed')) {
    lbl.textContent = document.getElementById('nl-heading').textContent;
  }
  const collapsed = panel.classList.toggle('collapsed');
  if (collapsed) {
    panel.style.width = '';
    panel.style.minWidth = '';
  } else {
    const sizes = loadPanelSizes();
    panel.style.width    = sizes.notesListWidth + 'px';
    panel.style.minWidth = sizes.notesListWidth + 'px';
  }
  if (btn) btn.textContent = collapsed ? '›' : '‹';
}

// ── Boot ─────────────────────────────────────────────────────

// Called after registry is loaded and a notebook is active.
async function _continueBoot() {
  const nb = getActiveNotebook();
  if (nb) await fileStore.initForNotebook(nb.id);
  if (nb) setStorageKey(nb.lsKey);

  // Handle Dropbox OAuth callback if present
  if (typeof dropboxSync !== 'undefined') {
    const wasCallback = await dropboxSync.handleAuthCallback();
    if (wasCallback) {
      // User just returned from Dropbox auth — auto-open sync modal to prompt for password
      setTimeout(() => {
        if (typeof openSyncModal === 'function') openSyncModal();
      }, 200);
    }
  }

  await loadAsync();
  applyTheme(S.settings.theme || 'default');
  applyFontSize(S.settings.fontSize || 'default');
  applyHeadingStyles();
  updateNotebookStatusUI();
  if (typeof updateSyncStatusUI === 'function') updateSyncStatusUI();
  renderNotebookSwitcher();
  _applyFuMode();
  _updateContactBadge();
  runAutoArchive();
  renderTasks();
  renderFollowUps();
  renderNotesList();
  renderFolderTree();
  initEmailDrop();
  renderTagsSidebar();
  updateNoteBadges();
  updateInboxBadge();
  checkNudges();
  setInterval(() => { runAutoArchive(); renderTasks(); updateInboxBadge(); checkNudges(); }, 3600000);

  // Show feature tour on first launch
  if (!S.settings.tourDone && S.notes.length === 0 && S.tasks.length === 0 && !(S.archived || []).length) {
    setTimeout(() => startTour(), 500);
  }
}

(async function boot() {
  initResize();
  await loadRegistry();

  if (NB_REGISTRY.length === 0) {
    // New user — show welcome screen; _continueBoot is called after they create/open a notebook.
    showWelcomeOverlay();
    return;
  }

  await _continueBoot();
})();
