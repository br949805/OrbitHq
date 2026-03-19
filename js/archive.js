// ── archive.js ────────────────────────────────────────────────
// Archive view: show, restore, delete, and clear archived tasks.
// ──────────────────────────────────────────────────────────────

function showArchive() {
  const av   = document.getElementById('archive-view'); av.classList.add('vis');
  const list = document.getElementById('av-list'); list.innerHTML = '';
  const arch = S.archived || [];
  if (!arch.length) { list.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:12px">No archived tasks.</div>'; return; }
  [...arch].reverse().forEach(t => {
    const row = document.createElement('div'); row.className = 'av-row';
    row.innerHTML = `<div class="av-title">${esc(t.title)}</div><div class="av-meta">due: ${t.due ? fmtDate(t.due) : '—'}</div><div class="av-meta">done: ${t.completedAt ? fmtTS(t.completedAt) : '—'}</div><button class="btn-gh" style="font-size:10px;padding:4px 9px" onclick="restoreTask('${t.id}')">Restore</button><button class="btn-dr" style="font-size:10px;padding:4px 9px" onclick="deleteArchived('${t.id}')">Delete</button>`;
    list.appendChild(row);
  });
}

function hideArchive() { document.getElementById('archive-view').classList.remove('vis'); }

function clearArchive() {
  if (!confirm('Clear all archived tasks?')) return;
  S.archived = []; save(); hideArchive(); renderTasks(); toast('Archive cleared');
}

function restoreTask(id) {
  const t = (S.archived || []).find(x => x.id === id); if (!t) return;
  delete t.completedAt;
  S.archived = S.archived.filter(x => x.id !== id); S.tasks.push(t);
  save(); showArchive(); renderTasks(); toast('Task restored');
}

function deleteArchived(id) {
  S.archived = S.archived.filter(x => x.id !== id); save(); showArchive(); renderTasks(); toast('Deleted');
}
