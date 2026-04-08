// ── shortcuts.js ──────────────────────────────────────────────
// All keyboard shortcut handlers: global hotkeys and modal enters.
// ──────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  const tag     = document.activeElement.tagName.toLowerCase();
  const editing = ['input','textarea','select'].includes(tag) || document.activeElement.contentEditable === 'true';

  if (e.key === 'Escape') {
    ['cap-modal','type-modal','folder-modal','assign-folder-modal','conv-task-modal','settings-modal','sync-modal'].forEach(id => closeModal(id));
    closeWikiAC(); hideArchive();
    if (document.getElementById('processor').classList.contains('vis')) exitProcessor();
    return;
  }
  if (e.altKey && e.key === 'ArrowLeft') { navBack(); return; }
  if (editing) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openCapture('task'); }
  if (e.key === 'm' || e.key === 'M') { e.preventDefault(); openTypeSelector(); }
  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    const note = createNote('scratchpad');
    if (currentView === 'inbox') showView('dashboard');
    openNote(note.id); renderNotesList(); updateNoteBadges(); updateInboxBadge(); toast('Scratchpad created');
  }
  if (e.key === '/') { e.preventDefault(); document.getElementById('search-input').focus(); }
  if (e.key === 'Enter' && document.getElementById('processor').classList.contains('vis') && !document.getElementById('proc-done').classList.contains('vis')) procApply();
});

// Modal enter-key shortcuts
document.getElementById('cap-task-title').addEventListener('keydown',  e => { if (e.key === 'Enter') { e.preventDefault(); submitCapture(); } });
document.getElementById('cap-note-title').addEventListener('keydown',  e => { if (e.key === 'Enter') { e.preventDefault(); submitCapture(); } });
document.getElementById('folder-name-inp').addEventListener('keydown', e => { if (e.key === 'Enter') submitFolder(); });
document.getElementById('conv-task-title').addEventListener('keydown', e => { if (e.key === 'Enter') submitConvTask(); });
