// ── folders.js ────────────────────────────────────────────────
// Folder tree render, CRUD, and note-folder assignment.
// ──────────────────────────────────────────────────────────────

function renderFolderTree() {
  const tree = document.getElementById('folder-tree'); tree.innerHTML = '';
  const top  = S.folders.filter(f => !f.parentId);
  top.forEach(f => {
    tree.appendChild(buildFolderRow(f, false));
    S.folders.filter(c => c.parentId === f.id).forEach(c => tree.appendChild(buildFolderRow(c, true)));
  });
}

function buildFolderRow(f, isSub) {
  const ct  = S.notes.filter(n => n.folderId === f.id).length;
  const div = document.createElement('div');
  div.className = 'folder-row' + (isSub ? ' sub' : '') + (S.noteFilter === `folder:${f.id}` ? ' active' : '');
  div.innerHTML = `<span style="color:var(--amber);font-size:14px;width:15px;text-align:center;flex-shrink:0">📁</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span><span class="sbadge">${ct}</span><div class="folder-actions-wrap"><button class="fax" onclick="deleteFolder('${f.id}',event)" title="Delete">✕</button></div>`;
  div.onclick = (e) => { if (e.target.closest('.folder-actions-wrap')) return; setNoteFilter(`folder:${f.id}`, div); };
  return div;
}

function openFolderModal() {
  const sel = document.getElementById('folder-parent-sel');
  sel.innerHTML = '<option value="">— Top level —</option>';
  S.folders.filter(f => !f.parentId).forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; sel.appendChild(o); });
  document.getElementById('folder-modal').classList.add('open');
  document.getElementById('folder-name-inp').focus();
}

function submitFolder() {
  const name = document.getElementById('folder-name-inp').value.trim(); if (!name) return;
  const parentId = document.getElementById('folder-parent-sel').value || null;
  S.folders.push({ id:uid(), name, parentId, createdAt:nowMs() });
  save(); renderFolderTree(); closeModal('folder-modal');
  document.getElementById('folder-name-inp').value = ''; toast('Folder created');
}

function deleteFolder(id, e) {
  e.stopPropagation();
  const f = S.folders.find(x => x.id === id); if (!f) return;
  const ct = S.notes.filter(n => n.folderId === id).length;
  if (!confirm(`Delete "${f.name}"?${ct ? ` ${ct} notes will be unfiled.` : ''}`)) return;
  S.notes.forEach(n => { if (n.folderId === id) n.folderId = null; });
  S.folders.filter(c => c.parentId === id).forEach(c => { S.notes.forEach(n => { if (n.folderId === c.id) n.folderId = null; }); });
  S.folders = S.folders.filter(x => x.id !== id && x.parentId !== id);
  if (S.noteFilter === `folder:${id}`) setNoteFilter('all', document.getElementById('sb-all'));
  save(); renderFolderTree(); renderNotesList(); updateInboxBadge(); toast('Folder deleted');
}

function openAssignFolder() {
  const sel  = document.getElementById('assign-folder-sel');
  const note = getNote(S.activeNoteId);
  sel.innerHTML = '<option value="">— Unfiled —</option>';
  S.folders.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = (f.parentId ? '  ↳ ' : '') + f.name; if (note && note.folderId === f.id) o.selected = true; sel.appendChild(o); });
  document.getElementById('assign-folder-modal').classList.add('open');
}

function submitAssignFolder() {
  const note = getNote(S.activeNoteId); if (!note) return;
  note.folderId  = document.getElementById('assign-folder-sel').value || null;
  note.updatedAt = nowMs(); save();
  const fn = S.folders.find(f => f.id === note.folderId);
  document.getElementById('folder-btn').textContent = fn ? '📁 ' + fn.name : '⊡ Folder';
  renderFolderTree(); renderNotesList(); updateInboxBadge(); updateCtxPrompt(note);
  closeModal('assign-folder-modal'); toast(fn ? `Moved to "${fn.name}"` : ' Note unfiled');
}
