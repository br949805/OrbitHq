// ── notes.js ──────────────────────────────────────────────────
// Notes list render, CRUD, filter, pin, and badge counts.
// ──────────────────────────────────────────────────────────────

let noteSearch = '';

function onNoteSearch(val) {
  noteSearch = val.trim();
  const btn = document.getElementById('nl-search-clear');
  if (btn) btn.classList.toggle('visible', noteSearch.length > 0);
  renderNotesList();
}

function clearNoteSearch() {
  noteSearch = '';
  const inp = document.getElementById('nl-search');
  if (inp) inp.value = '';
  const btn = document.getElementById('nl-search-clear');
  if (btn) btn.classList.remove('visible');
  renderNotesList();
}

function parseNoteQuery(raw) {
  // Tokenize respecting quoted phrases: "foo bar" stays as one token
  const tokens = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(raw)) !== null) tokens.push(m[1] || m[2]);

  const parsed = { types: [], tags: [], folders: [], pinned: null, after: null, before: null, text: [] };
  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (lower === 'and' || lower === 'or') continue; // stop words
    if (lower.startsWith('type:'))   { parsed.types.push(lower.slice(5)); continue; }
    if (lower.startsWith('tag:'))    { parsed.tags.push(lower.slice(4)); continue; }
    if (lower.startsWith('folder:')) { parsed.folders.push(lower.slice(7)); continue; }
    if (lower === 'is:pinned')       { parsed.pinned = true; continue; }
    if (lower === 'is:unpinned')     { parsed.pinned = false; continue; }
    if (lower.startsWith('after:'))  { parsed.after = new Date(tok.slice(6)).getTime(); continue; }
    if (lower.startsWith('before:')) { parsed.before = new Date(tok.slice(7)).getTime(); continue; }
    parsed.text.push(lower);
  }
  return parsed;
}

function matchesQuery(note, q) {
  if (q.types.length && !q.types.includes((note.type || '').toLowerCase())) return false;
  if (q.tags.length) {
    const noteTags = (note.tags || []).map(tid => { const t = (S.tags || []).find(x => x.id === tid); return t ? t.name.toLowerCase() : ''; });
    if (!q.tags.every(qt => noteTags.some(nt => nt.includes(qt)))) return false;
  }
  if (q.folders.length) {
    const folder = S.folders.find(f => f.id === note.folderId);
    const fname = folder ? folder.name.toLowerCase() : '';
    if (!q.folders.every(qf => fname.includes(qf))) return false;
  }
  if (q.pinned !== null && note.pinned !== q.pinned) return false;
  if (q.after  !== null && !isNaN(q.after)  && note.updatedAt < q.after)  return false;
  if (q.before !== null && !isNaN(q.before) && note.updatedAt > q.before) return false;
  if (q.text.length) {
    const haystack = [
      note.title || '',
      (note.content || '').replace(/<[^>]*>/g, ''),
      JSON.stringify(note.metadata || '')
    ].join(' ').toLowerCase();
    if (!q.text.every(t => haystack.includes(t))) return false;
  }
  return true;
}

function setNoteFilter(filter, el) {
  S.noteFilter = filter;
  document.querySelectorAll('.si[id^="sb-"]').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.folder-row').forEach(e => e.classList.remove('active'));
  if (el) el.classList.add('active');
  else { const e = document.getElementById('sb-all'); if (e) e.classList.add('active'); }
  const labels = { 'all':'All Notes', 'pinned':'Pinned', 'type:scratchpad':'Scratchpad', 'type:meeting':'Meeting', 'type:snippet':'Snippet', 'type:idea':'Idea', 'type:plan':'Plan', 'type:note':'Note' };
  let heading = labels[filter];
  if (!heading && filter.startsWith('folder:')) {
    const fId = filter.slice(7);
    const folder = S.folders.find(f => f.id === fId);
    heading = folder ? folder.name : 'Folder';
  }
  document.getElementById('nl-heading').textContent = heading || filter;
  renderNotesList();
  if (currentView === 'inbox') showView('dashboard');
}

function getFilteredNotes() {
  let notes = [...S.notes];
  if (noteSearch) {
    const q = parseNoteQuery(noteSearch);
    notes = notes.filter(n => matchesQuery(n, q));
  }
  if (S.noteFilter === 'all')    return notes;
  if (S.noteFilter === 'pinned') return notes.filter(n => n.pinned);
  if (S.noteFilter.startsWith('type:'))   return notes.filter(n => n.type === S.noteFilter.slice(5));
  if (S.noteFilter.startsWith('folder:')) return notes.filter(n => n.folderId === S.noteFilter.slice(7));
  if (S.noteFilter.startsWith('tag:'))    return notes.filter(n => (n.tags || []).includes(S.noteFilter.slice(4)));
  return notes;
}

function renderNotesList() {
  const cont = document.getElementById('nl-scroll');
  cont.innerHTML = '';
  const all      = getFilteredNotes();
  const pinned   = all.filter(n =>  n.pinned);
  const unpinned = all.filter(n => !n.pinned);
  if (pinned.length) {
    const h = document.createElement('div'); h.className = 'nl-sec-hdr'; h.textContent = 'Pinned'; cont.appendChild(h);
    pinned.forEach(n => cont.appendChild(buildNoteItem(n)));
  }
  if (unpinned.length) {
    if (pinned.length) { const h = document.createElement('div'); h.className = 'nl-sec-hdr'; h.textContent = 'Notes'; cont.appendChild(h); }
    unpinned.forEach(n => cont.appendChild(buildNoteItem(n)));
  }
  if (!all.length) { cont.innerHTML = '<div style="padding:16px 12px;font-size:11px;color:var(--text3)">No notes found.</div>'; }
  updateNoteBadges();
}

function buildNoteItem(note) {
  const td     = NT[note.type] || { label:note.type, icon:'○', cls:'type-note' };
  const folder = S.folders.find(f => f.id === note.folderId);
  const unproc = isUnprocessed(note);
  const preview = strip(note.content || '').slice(0, 60);
  const meta   = buildMetaSnippet(note);
  const div    = document.createElement('div');
  div.className = 'nitem' + (note.id === S.activeNoteId ? ' active' : '');
  div.dataset.id = note.id;
  div.onclick = () => openNote(note.id);
  div.innerHTML = `
    <div class="nitem-top">
      <span class="ntbadge ${td.cls}">${td.icon} ${td.label}</span>
      ${note.pinned ? '<span class="npin">⊙</span>' : ''}
      <span class="ntitle">${esc(note.title || 'Untitled')}</span>
      ${unproc ? '<span class="nufiled">inbox</span>' : ''}
    </div>
    <div class="nmeta">${meta || (folder ? '📁 ' + esc(folder.name) : '')} ${fmtAge(note.updatedAt)}</div>
    ${(note.tags && note.tags.length) ? `<div class="ntags">${(note.tags).map(tid => { const t = S.tags ? S.tags.find(x => x.id === tid) : null; return t ? `<span class="ntag-chip" style="border-color:${t.color};color:${t.color}">${esc(t.name)}</span>` : ''; }).filter(Boolean).join('')}</div>` : ''}
    ${preview ? `<div class="npreview">${esc(preview)}</div>` : ''}`;
  return div;
}

function buildMetaSnippet(n) {
  const m = n.metadata || {};
  if (n.type === 'meeting') return m.project || m.dateTime || '';
  if (n.type === 'snippet') return m.language || m.context || '';
  if (n.type === 'idea')    return m.status ? 'Status: ' + m.status : '';
  if (n.type === 'plan')    return m.status ? 'Status: ' + m.status : '';
  return '';
}

function updateNoteBadges() {
  const counts = { all:0, pinned:0, scratchpad:0, meeting:0, snippet:0, idea:0, plan:0, note:0 };
  S.notes.forEach(n => { counts.all++; if (n.pinned) counts.pinned++; if (counts[n.type] !== undefined) counts[n.type]++; });
  Object.keys(counts).forEach(k => { const el = document.getElementById('nb-' + k); if (el) el.textContent = counts[k]; });
  if (typeof updateMobBadges === 'function') updateMobBadges();
}
