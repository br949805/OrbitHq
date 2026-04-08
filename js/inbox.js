// ── inbox.js ──────────────────────────────────────────────────
// Inbox logic: unprocessed detection, card grid, discard,
// and the card-stack processor (apply / skip / discard / convert).
// ──────────────────────────────────────────────────────────────

// ── Inbox Queries ────────────────────────────────────────────

function isUnprocessed(n) {
  if (n.type === 'scratchpad') return true;
  if (!n.folderId && wc(n) < S.settings.wordThreshold) return true;
  return false;
}
function isAged(n)   { return isUnprocessed(n) && (Date.now() - n.createdAt) > 86400000; }
function getInbox()  { return S.notes.filter(n => isUnprocessed(n)); }
function getAged()   { return S.notes.filter(n => isAged(n)); }

// ── Badge / Stats ────────────────────────────────────────────

function updateInboxBadge() {
  const ct = getInbox().length;
  document.getElementById('sb-inbox-badge').textContent = ct;
  document.getElementById('sb-inbox-badge').classList.toggle('red', ct > 0);
  const tbadge = document.getElementById('inbox-tb-badge');
  tbadge.textContent = ct; tbadge.classList.toggle('show', ct > 0);
  if (typeof updateMobBadges === 'function') updateMobBadges();
}

function updateInboxStats() {
  const inbox = getInbox(); const aged = getAged();
  document.getElementById('ist-total').textContent = inbox.length;
  document.getElementById('ist-aged').textContent  = aged.length;
  if (S.session.clearedDate !== todayISO()) { S.session.clearedToday = 0; S.session.clearedDate = todayISO(); }
  document.getElementById('ist-today').textContent = S.session.clearedToday;
  document.getElementById('proc-all-btn').disabled  = inbox.length === 0;
  document.getElementById('proc-aged-btn').disabled = aged.length  === 0;
}

// ── Inbox Grid ───────────────────────────────────────────────

function renderInbox() {
  const wrap = document.getElementById('inbox-grid-wrap');
  wrap.innerHTML = '';
  document.getElementById('processor').classList.remove('vis');
  const inbox = getInbox().sort((a, b) => (isAged(b) ? 1 : -1) - (isAged(a) ? 1 : -1) || (b.createdAt - a.createdAt));
  if (!inbox.length) {
    wrap.innerHTML = `<div class="inbox-empty" style="padding:24px"><div class="ei">✦</div><div class="et">Inbox is clear</div><div class="es">Notes under ${S.settings.wordThreshold} words without a folder, and all Scratchpad notes, land here.</div></div>`;
    return;
  }
  const grid = document.createElement('div'); grid.className = 'inbox-grid';
  inbox.forEach(note => {
    const td    = NT[note.type] || { icon:'○', cls:'type-note', label:note.type };
    const aged  = isAged(note);
    const preview = strip(note.content || '').slice(0, 100);
    const card  = document.createElement('div');
    card.className = 'icard' + (aged ? ' aged' : '');
    card.innerHTML = `
      <div class="ic-top"><span class="ic-badge ${td.cls}">${td.icon} ${td.label}</span><span class="ic-ttl">${esc(note.title||'Untitled')}</span><span class="ic-age"${aged?' style="color:var(--amber)"':''}>${fmtAge(note.createdAt)}</span></div>
      ${preview ? `<div class="ic-preview">${esc(preview)}</div>` : '<div class="ic-preview" style="font-style:italic">No content…</div>'}
      <div class="ic-foot">
        <button class="ic-act accent" onclick="openNote('${note.id}')">Open</button>
        <button class="ic-act" onclick="quickFolderFromInbox('${note.id}')">📁 Folder</button>
        <button class="ic-act danger" onclick="quickDiscardNote('${note.id}')">✕ Discard</button>
      </div>`;
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
}

function quickDiscardNote(id) {
  const n = getNote(id); if (!n) return;
  if (!confirm(`Discard "${n.title || 'Untitled'}"?`)) return;
  S.notes = S.notes.filter(x => x.id !== id);
  incrCleared(); save(); renderNotesList(); updateNoteBadges(); updateInboxBadge(); updateInboxStats(); renderInbox(); toast('Note discarded');
}

function quickFolderFromInbox(id) { S.activeNoteId = id; openAssignFolder(); }

function discardAllInbox() {
  const inbox = getInbox(); if (!inbox.length) return;
  if (!confirm(`Discard all ${inbox.length} inbox items?`)) return;
  if (!confirm('This is permanent. Are you sure?')) return;
  const ids = new Set(inbox.map(n => n.id));
  S.notes = S.notes.filter(n => !ids.has(n.id));
  S.session.clearedToday = (S.session.clearedToday || 0) + inbox.length;
  save(); renderNotesList(); updateNoteBadges(); updateInboxBadge(); updateInboxStats(); renderInbox(); toast(`${inbox.length} notes discarded`);
}

function incrCleared() {
  if (S.session.clearedDate !== todayISO()) { S.session.clearedToday = 0; S.session.clearedDate = todayISO(); }
  S.session.clearedToday++; save();
}

// ── Processor ────────────────────────────────────────────────

let pQueue = [], pIndex = 0, pSkipped = [], pStats = { applied:0, discarded:0, converted:0 };

function startProcessor(agedOnly = false) {
  const inbox = agedOnly ? getAged() : getInbox();
  if (!inbox.length) { toast('Nothing to process'); return; }
  pQueue   = [...inbox].sort((a, b) => (isAged(b) ? 1 : 0) - (isAged(a) ? 1 : 0) || (a.createdAt - b.createdAt));
  pIndex   = 0; pSkipped = []; pStats = { applied:0, discarded:0, converted:0 };
  document.getElementById('inbox-grid-wrap').style.display = 'none';
  document.getElementById('proc-done').classList.remove('vis');
  document.getElementById('proc-card').style.display = 'block';
  document.getElementById('processor').classList.add('vis');
  populateProcFolders(); loadProcCard();
}

function exitProcessor() {
  document.getElementById('processor').classList.remove('vis');
  document.getElementById('inbox-grid-wrap').style.display = '';
  updateInboxStats(); renderInbox();
}

function populateProcFolders() {
  const sel = document.getElementById('pc-folder-sel'); const cur = sel.value;
  sel.innerHTML = '<option value="">— Unfiled —</option>';
  populateFolderSelect(sel, cur);
  sel.value = cur;
}

function loadProcCard() {
  if (pIndex >= pQueue.length) { showProcDone(); return; }
  const note  = pQueue[pIndex]; const td = NT[note.type] || NT.note; const aged = isAged(note);
  const total = pQueue.length; const pct = Math.round(pIndex / total * 100);
  document.getElementById('prog-fill').style.width      = pct + '%';
  document.getElementById('proc-prog-txt').textContent  = `${pIndex + 1} of ${total}`;
  document.getElementById('pc-bar').style.background    = td.color;
  const badge = document.getElementById('pc-tbadge'); badge.textContent = `${td.icon} ${td.label}`; badge.className = `pc-tbadge ${td.cls}`;
  const ageEl = document.getElementById('pc-age'); ageEl.textContent = fmtAge(note.createdAt); ageEl.style.color = aged ? 'var(--amber)' : 'var(--text3)';
  document.getElementById('pc-ttl').textContent = note.title || 'Untitled';
  const txt = strip(note.content || '');
  const bdy = document.getElementById('pc-bdy');
  bdy.textContent = txt ? txt.slice(0, 300) + (txt.length > 300 ? '…' : '') : 'No content.';
  bdy.className = 'pc-bdy' + (txt ? '' : ' empty');
  document.getElementById('pc-type-sel').value   = '';
  document.getElementById('pc-folder-sel').value = note.folderId || '';
  const card = document.getElementById('proc-card'); card.style.animation = 'none'; card.offsetHeight; card.style.animation = 'card-in .2s ease';
}

function procApply() {
  const note = pQueue[pIndex]; if (!note) return;
  const newType  = document.getElementById('pc-type-sel').value;
  const folderId = document.getElementById('pc-folder-sel').value;
  let changed = false;
  if (newType && newType !== note.type)           { note.type = newType; changed = true; }
  if (folderId !== (note.folderId || ''))         { note.folderId = folderId || null; changed = true; }
  if (changed) { note.updatedAt = nowMs(); pStats.applied++; incrCleared(); save(); }
  pIndex++; loadProcCard();
}

function procSkip()    { pSkipped.push(pQueue[pIndex]); pIndex++; loadProcCard(); }

function procDiscard() {
  const note = pQueue[pIndex]; if (!note) return;
  if (!confirm(`Discard "${note.title || 'Untitled'}"?`)) return;
  S.notes = S.notes.filter(n => n.id !== note.id);
  pStats.discarded++; incrCleared(); save();
  pQueue.splice(pIndex, 1);
  if (pIndex >= pQueue.length) { showProcDone(); return; }
  loadProcCard();
}

function procConvert() {
  const note = pQueue[pIndex]; if (!note) return;
  document.getElementById('conv-task-title').value = note.title || '';
  document.getElementById('conv-task-due').value   = '';
  document.getElementById('conv-task-modal').classList.add('open');
  setTimeout(() => document.getElementById('conv-task-title').focus(), 50);
}

function submitConvTask() {
  const note  = pQueue[pIndex]; if (!note) return;
  const title = document.getElementById('conv-task-title').value.trim();
  if (!title) { document.getElementById('conv-task-title').style.borderColor = 'var(--red)'; return; }
  const due = document.getElementById('conv-task-due').value || null;
  S.tasks.unshift({ id:uid(), title, due, recur:null, noteId:null, subtasks:[], createdAt:nowMs(), completedAt:null });
  S.notes = S.notes.filter(n => n.id !== note.id);
  pStats.converted++; pStats.applied++; incrCleared(); save();
  pQueue.splice(pIndex, 1); closeModal('conv-task-modal');
  if (pIndex >= pQueue.length) { showProcDone(); return; }
  loadProcCard(); renderTasks(); toast('Task created & note deleted');
}

function showProcDone() {
  document.getElementById('proc-card').style.display = 'none';
  document.getElementById('proc-done').classList.add('vis');
  document.getElementById('prog-fill').style.width        = '100%';
  document.getElementById('proc-prog-txt').textContent    = 'Done';
  document.getElementById('done-stats').innerHTML = `
    <div class="ds"><div class="ds-n">${pStats.applied}</div><div class="ds-l">Processed</div></div>
    <div class="ds"><div class="ds-n">${pStats.converted}</div><div class="ds-l">→ Tasks</div></div>
    <div class="ds"><div class="ds-n">${pStats.discarded}</div><div class="ds-l">Discarded</div></div>
    <div class="ds"><div class="ds-n">${pSkipped.length}</div><div class="ds-l">Skipped</div></div>`;
  if (!getInbox().length) { S.session.lastWeekly = todayISO(); save(); }
  renderNotesList(); updateNoteBadges(); updateInboxBadge(); updateInboxStats();
}
