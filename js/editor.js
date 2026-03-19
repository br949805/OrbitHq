// ── editor.js ─────────────────────────────────────────────────
// Rich text editor: open/save notes, metadata, wiki linking,
// backlinks, float toolbar, autosave, and editor event wiring.
// ──────────────────────────────────────────────────────────────

// ── Note CRUD ────────────────────────────────────────────────

function createNote(type, title = '') {
  const td = NT[type] || NT.note;
  const customTmpl = S.settings.templates?.[type];
  const content = customTmpl !== undefined ? customTmpl : (td.template || '');
  const folderId = S.noteFilter && S.noteFilter.startsWith('folder:') ? S.noteFilter.slice(7) : null;
  const note = { id:uid(), type, title, content, metadata:defaultMeta(type), folderId, pinned:false, createdAt:nowMs(), updatedAt:nowMs() };
  S.notes.unshift(note); save(); return note;
}

function defaultMeta(type) {
  if (type === 'meeting') {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(Math.round(now.getMinutes() / 15) * 15 % 60).padStart(2, '0');
    return { dateTime: todayISO() + 'T' + hh + ':' + mm, attendees:'', decisions:'', project:'' };
  }
  if (type === 'snippet') return { dateCaptured:todayISO(), language:'', sourceUrl:'', context:'' };
  if (type === 'idea')    return { dateCaptured:todayISO(), status:'Raw', category:'' };
  if (type === 'plan')    return { status:'Draft', targetDate:'' };
  return {};
}

function getNote(id) { return S.notes.find(n => n.id === id); }

function duplicateNote() {
  const n = getNote(S.activeNoteId); if (!n) return;
  const c = { ...JSON.parse(JSON.stringify(n)), id:uid(), title:'Copy of ' + (n.title || 'Untitled'), createdAt:nowMs(), updatedAt:nowMs(), pinned:false };
  S.notes.unshift(c); save(); openNote(c.id); renderNotesList(); updateNoteBadges(); toast('Duplicated');
}

function deleteCurrentNote() {
  const n = getNote(S.activeNoteId); if (!n) return;
  showConfirm(`Delete "${n.title || 'Untitled'}"?`, 'Delete Note', () => {
    S.notes = S.notes.filter(x => x.id !== n.id);
    S.activeNoteId = null; S.navHistory = [];
    document.getElementById('ed-empty').style.display = '';
    document.getElementById('ed-wrap').classList.remove('vis');
    save(); renderNotesList(); updateNoteBadges(); updateInboxBadge(); toast('Note deleted');
  });
}

function togglePin() {
  const n = getNote(S.activeNoteId); if (!n) return;
  n.pinned = !n.pinned; n.updatedAt = nowMs(); save();
  document.getElementById('pin-btn').classList.toggle('pinned', n.pinned);
  document.getElementById('pin-btn').textContent = n.pinned ? '📌 Unpin' : '📌 Pin';
  renderNotesList(); updateNoteBadges(); toast(n.pinned ? 'Pinned' : 'Unpinned');
}

// ── Open Note ────────────────────────────────────────────────

function openNote(id, pushHistory = true) {
  const note = getNote(id); if (!note) return;
  if (currentView === 'inbox') showView('dashboard');
  if (pushHistory && S.activeNoteId && S.activeNoteId !== id) { S.navHistory.push(S.activeNoteId); if (S.navHistory.length > 10) S.navHistory.shift(); }
  S.activeNoteId = id;
  document.querySelectorAll('.nitem').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  document.getElementById('ed-empty').style.display = 'none';
  document.getElementById('ed-wrap').classList.add('vis');
  document.getElementById('ed-back').classList.toggle('vis', S.navHistory.length > 0);
  document.getElementById('ed-title').value = note.title || '';
  document.getElementById('ed-content').innerHTML = note.content || '';
  renderMetadata(note);
  const fn = S.folders.find(f => f.id === note.folderId);
  document.getElementById('folder-btn').textContent = fn ? '📁 ' + fn.name : '⊡ Folder';
  document.getElementById('pin-btn').textContent = note.pinned ? '📌 Unpin' : '📌 Pin';
  document.getElementById('pin-btn').classList.toggle('pinned', note.pinned);
  renderNoteTags(note);
  updateCtxPrompt(note);
  renderBacklinks(note);
  document.querySelectorAll('#ed-content .wiki-link').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); const tid = a.dataset.noteId; if (tid) openNote(tid); };
  });
}

function navBack() {
  if (!S.navHistory.length) return;
  const prev = S.navHistory.pop();
  openNote(prev, false);
  document.getElementById('ed-back').classList.toggle('vis', S.navHistory.length > 0);
}

function updateCtxPrompt(note) {
  const show = isUnprocessed(note) && !S.dismissedCtx.includes(note.id);
  document.getElementById('ctx-prompt').classList.toggle('vis', show);
}

function dismissCtxPrompt() {
  if (!S.dismissedCtx.includes(S.activeNoteId)) S.dismissedCtx.push(S.activeNoteId);
  document.getElementById('ctx-prompt').classList.remove('vis');
}

// ── Metadata ─────────────────────────────────────────────────

function renderMetadata(note) {
  const block = document.getElementById('meta-block');
  if (note.type === 'scratchpad' || note.type === 'note') { block.classList.remove('vis'); block.innerHTML = ''; return; }
  block.classList.add('vis');
  const m = note.metadata || {};
  const grid = document.createElement('div'); grid.className = 'mg';
  const mf = (label, type, val, onChange, ph = '') => {
    const w = document.createElement('div'); w.className = 'mf';
    const l = document.createElement('div'); l.className = 'ml'; l.textContent = label;
    const inp = document.createElement('input'); inp.className = 'mi'; inp.type = type; inp.value = val; inp.placeholder = ph;
    inp.oninput = () => onChange(inp.value); w.appendChild(l); w.appendChild(inp); return w;
  };
  const ms = (label, opts, val, onChange) => {
    const w = document.createElement('div'); w.className = 'mf';
    const l = document.createElement('div'); l.className = 'ml'; l.textContent = label;
    const sel = document.createElement('select'); sel.className = 'ms';
    opts.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; if (o === val) op.selected = true; sel.appendChild(op); });
    sel.onchange = () => onChange(sel.value); w.appendChild(l); w.appendChild(sel); return w;
  };
  const smf = (field, v) => { const n = getNote(note.id); if (n) { n.metadata[field] = v; n.updatedAt = nowMs(); scheduleAutosave(); } };
  if (note.type === 'meeting') {
    grid.appendChild(mf('Meeting / Project', 'text', m.project || '', v => smf('project', v)));
    grid.appendChild(mf('Date', 'date', m.dateTime ? m.dateTime.slice(0, 10) : '', v => smf('dateTime', v)));
    grid.appendChild(mf('Attendees', 'text', m.attendees || '', v => smf('attendees', v), 'e.g. Alice, Bob'));
  } else if (note.type === 'snippet') {
    grid.appendChild(mf('Language / Tech', 'text', m.language || '', v => smf('language', v), 'Python, SQL…'));
    grid.appendChild(mf('Source URL', 'url', m.sourceUrl || '', v => smf('sourceUrl', v), 'https://…'));
    grid.appendChild(mf('Context', 'text', m.context || '', v => smf('context', v), 'What is this for?'));
    grid.appendChild(mf('Date Captured', 'date', m.dateCaptured || '', v => smf('dateCaptured', v)));
  } else if (note.type === 'idea') {
    grid.appendChild(ms('Status', ['Raw','Developing','Mature'], m.status || 'Raw', v => smf('status', v)));
    grid.appendChild(mf('Category / Theme', 'text', m.category || '', v => smf('category', v)));
    grid.appendChild(mf('Date Captured', 'date', m.dateCaptured || '', v => smf('dateCaptured', v)));
  } else if (note.type === 'plan') {
    grid.appendChild(ms('Status', ['Draft','In Progress','Complete'], m.status || 'Draft', v => smf('status', v)));
    grid.appendChild(mf('Target Date', 'date', m.targetDate || '', v => smf('targetDate', v)));
  }
  block.innerHTML = ''; block.appendChild(grid);
}

// ── Autosave ─────────────────────────────────────────────────

function scheduleAutosave() {
  showSaving(); clearTimeout(asTimer);
  asTimer = setTimeout(() => {
    const n = getNote(S.activeNoteId); if (!n) return;
    n.content   = document.getElementById('ed-content').innerHTML;
    n.title     = document.getElementById('ed-title').value.trim();
    n.updatedAt = nowMs();
    save(); showSaved(); renderNotesList(); updateNoteBadges(); updateInboxBadge();
    updateCtxPrompt(n);
  }, 2000);
}

function forceSave() {
  clearTimeout(asTimer);
  const n = getNote(S.activeNoteId); if (!n) return;
  n.content   = document.getElementById('ed-content').innerHTML;
  n.title     = document.getElementById('ed-title').value.trim();
  n.updatedAt = nowMs(); save(); showSaved(); renderNotesList();
}

// ── Editor Commands ──────────────────────────────────────────

function ec(cmd)   { document.getElementById('ed-content').focus(); document.execCommand(cmd, false, null); scheduleAutosave(); }
function eh(lvl)   { document.getElementById('ed-content').focus(); document.execCommand('formatBlock', false, 'h' + lvl); scheduleAutosave(); }
function eSize(size) {
  const ed = document.getElementById('ed-content'); ed.focus();
  document.execCommand('fontSize', false, '7');
  ed.querySelectorAll('font[size="7"]').forEach(el => {
    const span = document.createElement('span');
    span.style.fontSize = size; span.innerHTML = el.innerHTML; el.replaceWith(span);
  });
  scheduleAutosave();
}
function eColor(color) {
  document.getElementById('ed-content').focus();
  document.execCommand('foreColor', false, color);
  document.getElementById('color-dot').style.background = color;
  scheduleAutosave();
}
function eSub()   { document.getElementById('ed-content').focus(); document.execCommand('subscript',   false, null); scheduleAutosave(); }
function eSuper() { document.getElementById('ed-content').focus(); document.execCommand('superscript', false, null); scheduleAutosave(); }
function insertTable() { document.execCommand('insertHTML', false, '<table><thead><tr><th>Col 1</th><th>Col 2</th><th>Col 3</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr></tbody></table><p></p>'); scheduleAutosave(); }
function insertCode()  { document.execCommand('insertHTML', false, '<pre><code>// code here</code></pre><p></p>'); scheduleAutosave(); }

// ── Wiki Linking ─────────────────────────────────────────────

function triggerWiki() { document.getElementById('ed-content').focus(); document.execCommand('insertText', false, '[['); scheduleAutosave(); }

function handleWikiInput() {
  const sel = window.getSelection(); if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const text  = (range.startContainer.textContent || '').slice(0, range.startOffset);
  const bi    = text.lastIndexOf('[[');
  if (bi !== -1 && !text.slice(bi).includes(']]')) {
    showWikiAC(text.slice(bi + 2), range);
  } else { closeWikiAC(); }
}

function showWikiAC(query, range) {
  const ac = document.getElementById('wiki-ac');
  const q  = query.toLowerCase();
  const matches = S.notes.filter(n => n.id !== S.activeNoteId && (n.title || 'Untitled').toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) { closeWikiAC(); return; }
  ac.innerHTML = '';
  matches.forEach((n, i) => {
    const td  = NT[n.type] || { icon:'○', cls:'type-note', label:n.type };
    const div = document.createElement('div'); div.className = 'wac-item' + (i === 0 ? ' foc' : '');
    div.innerHTML = `<span class="wt ntbadge ${td.cls}">${td.icon}</span><span class="wn">${esc(n.title || 'Untitled')}</span>`;
    div.onmousedown = (e) => e.preventDefault();
    div.onclick = () => selectWikiLink(n);
    ac.appendChild(div);
  });
  const rect = range.getBoundingClientRect();
  ac.style.top = (rect.bottom + 4) + 'px'; ac.style.left = rect.left + 'px';
  ac.classList.add('open');
}

function selectWikiLink(note) {
  closeWikiAC();
  const sel = window.getSelection(); if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const node  = range.startContainer;
  const off   = range.startOffset;
  const text  = node.textContent || '';
  const bi    = text.slice(0, off).lastIndexOf('[[');
  if (bi === -1) return;
  const nr = document.createRange(); nr.setStart(node, bi); nr.setEnd(node, off); nr.deleteContents();
  const a = document.createElement('a'); a.className = 'wiki-link'; a.dataset.noteId = note.id;
  a.textContent = '[[' + (note.title || 'Untitled') + ']]';
  a.onclick = (e) => { e.preventDefault(); openNote(note.id); };
  nr.insertNode(a);
  const ar = document.createRange(); ar.setStartAfter(a); ar.collapse(true);
  sel.removeAllRanges(); sel.addRange(ar);
  scheduleAutosave();
}

function closeWikiAC() { document.getElementById('wiki-ac').classList.remove('open'); }

// ── Backlinks ────────────────────────────────────────────────

function renderBacklinks(note) {
  const sec    = document.getElementById('backlinks');
  const body   = document.getElementById('bl-body');
  const ct     = document.getElementById('bl-ct');
  const linking = S.notes.filter(n => n.id !== note.id && (n.content || '').includes(`data-note-id="${note.id}"`));
  ct.textContent = `(${linking.length})`; sec.style.display = 'block';
  body.innerHTML = '';
  if (!linking.length) { body.innerHTML = '<div class="bl-empty">No backlinks yet.</div>'; return; }
  linking.forEach(n => { const a = document.createElement('a'); a.className = 'bl-link'; a.textContent = n.title || 'Untitled'; a.onclick = () => openNote(n.id); body.appendChild(a); });
}

function toggleBacklinks() {
  S.blOpen = !S.blOpen;
  document.getElementById('bl-body').style.display = S.blOpen ? 'block' : 'none';
  document.getElementById('bl-tog').classList.toggle('open', S.blOpen);
}

// ── Float Toolbar ────────────────────────────────────────────

document.addEventListener('mouseup', () => {
  const sel = window.getSelection(); const ft = document.getElementById('float-tb');
  if (!sel || sel.isCollapsed || !sel.toString().trim()) { ft.classList.remove('open'); return; }
  const range = sel.getRangeAt(0);
  const rect  = range.getBoundingClientRect();
  const inEd  = document.getElementById('ed-content').contains(range.commonAncestorContainer);
  if (!inEd) { ft.classList.remove('open'); return; }
  ft.style.top  = (rect.top - 38 + window.scrollY) + 'px';
  ft.style.left = (rect.left + rect.width / 2 - 80) + 'px';
  ft.classList.add('open');
});

document.addEventListener('mousedown', e => {
  if (!document.getElementById('float-tb').contains(e.target))
    document.getElementById('float-tb').classList.remove('open');
});

function createTaskFromSel() {
  const sel  = window.getSelection(); const text = sel ? sel.toString().trim() : ''; if (!text) return;
  document.getElementById('float-tb').classList.remove('open');
  const task = { id:uid(), title:text, due:null, recur:null, noteId:S.activeNoteId||null, createdAt:nowMs(), completedAt:null };
  S.tasks.unshift(task); save(); renderTasks(); toast('Task created: ' + text.slice(0, 30));
}

// ── Editor Event Listeners ───────────────────────────────────

const edContent = document.getElementById('ed-content');
const edTitle   = document.getElementById('ed-title');

edContent.addEventListener('input', () => { handleWikiInput(); handleMarkdownInline(); scheduleAutosave(); });

// ── Toolbar State ─────────────────────────────────────────────

function updateToolbarState() {
  const ed = document.getElementById('ed-content');
  const sel = window.getSelection();
  let blockTag = '', inUL = false, inOL = false;
  if (sel && sel.rangeCount) {
    let el = sel.getRangeAt(0).commonAncestorContainer;
    if (el.nodeType === Node.TEXT_NODE) el = el.parentNode;
    while (el && el !== ed) {
      const tag = el.tagName;
      if (tag === 'H1' || tag === 'H2' || tag === 'H3') { blockTag = tag.toLowerCase(); break; }
      if (tag === 'UL') { inUL = true; break; }
      if (tag === 'OL') { inOL = true; break; }
      if (tag === 'LI') {
        const p = el.parentNode;
        if (p && p.tagName === 'UL') { inUL = true; break; }
        if (p && p.tagName === 'OL') { inOL = true; break; }
      }
      el = el.parentNode;
    }
  }
  const states = {
    'tbb-bold':      document.queryCommandState('bold'),
    'tbb-italic':    document.queryCommandState('italic'),
    'tbb-underline': document.queryCommandState('underline'),
    'tbb-h1': blockTag === 'h1',
    'tbb-h2': blockTag === 'h2',
    'tbb-h3': blockTag === 'h3',
    'tbb-ul': inUL,
    'tbb-ol': inOL,
  };
  for (const [id, active] of Object.entries(states)) {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', active);
  }
}

edContent.addEventListener('keyup', updateToolbarState);
edContent.addEventListener('mouseup', updateToolbarState);
document.addEventListener('selectionchange', () => {
  if (document.activeElement === edContent) updateToolbarState();
});

// ── Markdown Shortcuts ───────────────────────────────────────

function mdLineText() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if (!r.collapsed || r.startContainer.nodeType !== Node.TEXT_NODE) return null;
  return { node: r.startContainer, offset: r.startOffset, text: r.startContainer.textContent.slice(0, r.startOffset) };
}

// Robust version for block shortcuts — works whether cursor is in a text node
// or an element node (empty line, start of block, after toolbar use, etc.)
function getBlockLineText() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  const ed = document.getElementById('ed-content');
  if (!ed.contains(r.startContainer)) return null;
  // Find nearest block ancestor inside ed-content
  let block = r.startContainer.nodeType === Node.TEXT_NODE
    ? r.startContainer.parentNode : r.startContainer;
  while (block && block !== ed &&
    !['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','PRE'].includes(block.tagName)) {
    block = block.parentNode;
  }
  const hasBlock = block && block !== ed;
  const anchor = hasBlock ? block : ed;
  const rangeToC = document.createRange();
  try {
    rangeToC.setStart(anchor, 0);
    rangeToC.setEnd(r.startContainer, r.startOffset);
  } catch(_) { return null; }
  return { block: hasBlock ? block : null, text: rangeToC.toString(), prefixRange: rangeToC };
}

// Delete prefix AND update the live selection so subsequent execCommands see a valid cursor.
function mdDeleteAndSelect(node, len) {
  const sel = window.getSelection();
  const r = document.createRange();
  r.setStart(node, 0); r.setEnd(node, len);
  sel.removeAllRanges(); sel.addRange(r); // set selection first
  r.deleteContents();                     // collapses r to offset 0
  sel.removeAllRanges(); sel.addRange(r); // re-apply collapsed range so execCommand sees it
}

// Find the closest block ancestor inside ed-content
function mdParentBlock(node) {
  const ed = document.getElementById('ed-content');
  let el = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (el && el !== ed && !['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','PRE'].includes(el.tagName)) {
    el = el.parentNode;
  }
  return (el && el !== ed) ? el : null;
}

function handleMarkdownBlockShortcut() {
  const info = getBlockLineText(); if (!info) return false;
  const { block, text, prefixRange } = info;
  let headingTag = null, listCmd = null;
  if      (text === '###') headingTag = 'h3';
  else if (text === '##')  headingTag = 'h2';
  else if (text === '#')   headingTag = 'h1';
  else if (text === '-' || text === '*') listCmd = 'insertUnorderedList';
  else if (text === '1.')  listCmd = 'insertOrderedList';
  else return false;

  if (headingTag) {
    // Delete the markdown prefix chars
    prefixRange.deleteContents();
    if (block) {
      // Direct DOM replacement — no execCommand, no inherited inline styles
      const h = document.createElement(headingTag);
      h.innerHTML = block.innerHTML || '<br>';
      h.removeAttribute('style'); // clear any stale inline styles
      block.replaceWith(h);
      const cr = document.createRange(); cr.selectNodeContents(h); cr.collapse(false);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(cr);
    } else {
      // Bare text directly in ed-content (rare) — wrap in block first
      const p = document.createElement('p');
      const sc = prefixRange.startContainer;
      if (sc.nodeType === Node.TEXT_NODE) {
        sc.parentNode.insertBefore(p, sc);
        p.appendChild(sc);
      }
      const h = document.createElement(headingTag);
      h.innerHTML = p.innerHTML || '<br>';
      h.removeAttribute('style');
      p.replaceWith(h);
      const cr = document.createRange(); cr.selectNodeContents(h); cr.collapse(false);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(cr);
    }
  } else {
    // List shortcuts — delete prefix then let execCommand wrap in list
    prefixRange.deleteContents();
    const sel = window.getSelection();
    const cr = document.createRange();
    cr.setStart(prefixRange.startContainer, prefixRange.startOffset);
    cr.collapse(true);
    sel.removeAllRanges(); sel.addRange(cr);
    document.execCommand(listCmd, false, null);
  }
  scheduleAutosave(); return true;
}

function handleMarkdownEnterShortcut() {
  const info = getBlockLineText(); if (!info) return false;
  const { block, text, prefixRange } = info;

  if (text === '---') {
    prefixRange.deleteContents();
    const sel = window.getSelection();
    const cr = document.createRange();
    cr.setStart(prefixRange.startContainer, prefixRange.startOffset);
    cr.collapse(true);
    sel.removeAllRanges(); sel.addRange(cr);
    document.execCommand('insertHorizontalRule', false, null);
    scheduleAutosave(); return true;
  }

  if (text === '```') {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.appendChild(document.createTextNode(''));
    pre.appendChild(code);
    const p = document.createElement('p'); p.innerHTML = '<br>';
    if (block) {
      block.replaceWith(pre);
      pre.after(p);
    } else {
      prefixRange.deleteContents();
      const cr = document.createRange();
      cr.setStart(prefixRange.startContainer, prefixRange.startOffset);
      cr.insertNode(p); cr.insertNode(pre);
    }
    const cr2 = document.createRange(); cr2.setStart(code, 0); cr2.collapse(true);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(cr2);
    scheduleAutosave(); return true;
  }
  return false;
}

function handleMarkdownInline() {
  const l = mdLineText(); if (!l) return;
  const { node, offset, text } = l;
  const boldMatch = text.match(/\*\*([^*\n]+)\*\*$/);
  if (boldMatch) { applyInlineMd(node, offset - boldMatch[0].length, offset, 'strong', boldMatch[1]); return; }
  const codeMatch = text.match(/`([^`\n]+)`$/);
  if (codeMatch) { applyInlineMd(node, offset - codeMatch[0].length, offset, 'code', codeMatch[1]); return; }
}

// Direct DOM element creation — avoids execCommand('insertHTML') quirks
function applyInlineMd(node, start, end, tag, innerText) {
  const r = document.createRange();
  r.setStart(node, start); r.setEnd(node, end);
  r.deleteContents();
  const el = document.createElement(tag);
  el.textContent = innerText;
  r.insertNode(el);
  // place cursor right after the inserted element
  const cr = document.createRange(); cr.setStartAfter(el); cr.collapse(true);
  window.getSelection().removeAllRanges(); window.getSelection().addRange(cr);
  scheduleAutosave();
}

edContent.addEventListener('keydown', e => {
  const ac = document.getElementById('wiki-ac');
  if (ac.classList.contains('open')) {
    const opts = ac.querySelectorAll('.wac-item'); const foc = ac.querySelector('.wac-item.foc'); const idx = [...opts].indexOf(foc);
    if (e.key === 'ArrowDown') { e.preventDefault(); foc && foc.classList.remove('foc'); const n = opts[(idx + 1) % opts.length]; n && n.classList.add('foc'); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); foc && foc.classList.remove('foc'); const p = opts[(idx - 1 + opts.length) % opts.length]; p && p.classList.add('foc'); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const f = ac.querySelector('.wac-item.foc'); if (f) f.click(); return; }
    if (e.key === 'Escape') { closeWikiAC(); return; }
  }
  if (e.key === 'Escape') { closeWikiAC(); return; }
  if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) { if (handleMarkdownBlockShortcut()) { e.preventDefault(); return; } }
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) { if (handleMarkdownEnterShortcut()) { e.preventDefault(); return; } }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); forceSave(); toast('Saved'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); ec('bold'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); ec('italic'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); ec('underline'); }
  if (e.key === 'Tab') {
    const s = window.getSelection();
    if (s && s.anchorNode && s.anchorNode.closest && s.anchorNode.closest('li')) {
      e.preventDefault(); e.shiftKey ? document.execCommand('outdent') : document.execCommand('indent');
    }
  }
});

edTitle.addEventListener('input', scheduleAutosave);
edTitle.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); edContent.focus(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); forceSave(); toast('Saved'); }
});

document.addEventListener('click', e => {
  if (!document.getElementById('wiki-ac').contains(e.target) && e.target !== edContent) closeWikiAC();
});

// ── Heading Styles ───────────────────────────────────────────

function applyHeadingStyles() {
  let el = document.getElementById('dyn-heading-styles');
  if (!el) { el = document.createElement('style'); el.id = 'dyn-heading-styles'; document.head.appendChild(el); }
  const hs = S.settings.headingStyles || {};
  el.textContent = ['h1','h2','h3'].map(h => {
    const s = hs[h] || {}; const parts = [];
    if (s.color) parts.push('color:' + s.color);
    if (s.size)  parts.push('font-size:' + s.size + 'px');
    return parts.length ? '#ed-content ' + h + '{' + parts.join(';') + '}' : '';
  }).filter(Boolean).join('\n');
}

function openHeadingStylesModal() {
  const hs = S.settings.headingStyles || {};
  ['h1','h2','h3'].forEach(h => {
    const s = hs[h] || {};
    document.getElementById('hs-' + h + '-color').value = s.color || '#e8e6e0';
    document.getElementById('hs-' + h + '-size').value  = s.size  || '';
  });
  toggleHamburger(false);
  document.getElementById('heading-styles-modal').classList.add('open');
}

function saveHeadingStyles() {
  if (!S.settings.headingStyles) S.settings.headingStyles = {};
  ['h1','h2','h3'].forEach(h => {
    S.settings.headingStyles[h] = {
      color: document.getElementById('hs-' + h + '-color').value,
      size:  document.getElementById('hs-' + h + '-size').value.trim()
    };
  });
  save(); applyHeadingStyles(); closeModal('heading-styles-modal'); toast('Heading styles updated');
}

function resetHeading(h) {
  document.getElementById('hs-' + h + '-color').value = '#e8e6e0';
  document.getElementById('hs-' + h + '-size').value = '';
}

// ── Extract list → tasks ──────────────────────────────────────

let _extractTexts = [];

function openExtractModal() {
  const noteId = S.activeNoteId;
  if (!noteId) return;

  // Find the list the cursor is in, then fall back to first list in note
  const edEl = document.getElementById('ed-content');
  const sel   = window.getSelection();
  let node    = sel && sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
  let list    = null;
  while (node && node !== edEl) {
    if (node.nodeName === 'UL' || node.nodeName === 'OL') { list = node; break; }
    node = node.parentNode;
  }
  if (!list) list = edEl.querySelector('ul, ol');
  if (!list) { toast('No list found — add a bullet or numbered list first'); return; }

  _extractTexts = [...list.querySelectorAll('li')]
    .map(li => li.textContent.trim())
    .filter(t => t.length > 0);

  if (!_extractTexts.length) { toast('List is empty'); return; }

  // Build per-item rows
  const container = document.getElementById('extract-rows');
  container.innerHTML = '';
  _extractTexts.forEach((text, i) => {
    const row = document.createElement('div');
    row.className = 'extract-row';
    row.innerHTML = `<span class="extract-item-lbl" title="${esc(text)}">${esc(text)}</span><input class="fi extract-item-due" type="date" data-idx="${i}">`;
    container.appendChild(row);
  });

  document.getElementById('extract-all-due').value = '';
  document.getElementById('extract-modal').classList.add('open');
  setTimeout(() => document.getElementById('extract-all-due').focus(), 50);
}

function setAllExtractDates(val) {
  document.querySelectorAll('.extract-item-due').forEach(inp => inp.value = val);
}

function submitExtract() {
  const noteId = S.activeNoteId;
  if (!noteId || !_extractTexts.length) return;
  const dueDates = [...document.querySelectorAll('.extract-item-due')].map(inp => inp.value || null);
  _extractTexts.forEach((title, i) => {
    S.tasks.unshift({ id:uid(), title, due: dueDates[i] || null, recur:null, noteId, createdAt:nowMs(), completedAt:null });
  });
  const count = _extractTexts.length;
  _extractTexts = [];
  closeModal('extract-modal');
  save();
  renderTasks();
  toast(`Created ${count} task${count !== 1 ? 's' : ''} from list`);
}
