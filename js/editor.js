// ── editor.js ─────────────────────────────────────────────────
// Rich text editor: open/save notes, metadata, wiki linking,
// backlinks, float toolbar, autosave, and editor event wiring.
// ──────────────────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { icon:'H1', label:'Heading 1',    keywords:['heading','h1','title','large'],        cmd:'h1' },
  { icon:'H2', label:'Heading 2',    keywords:['heading','h2','subtitle'],             cmd:'h2' },
  { icon:'H3', label:'Heading 3',    keywords:['heading','h3','small'],                cmd:'h3' },
  { icon:'≡',  label:'Bullet list',  keywords:['list','bullet','ul','unordered'],      cmd:'ul' },
  { icon:'1.', label:'Ordered list', keywords:['list','number','ol','ordered'],        cmd:'ol' },
  { icon:'"',  label:'Blockquote',   keywords:['quote','blockquote'],                  cmd:'blockquote' },
  { icon:'<>', label:'Code block',   keywords:['code','pre','block','snippet'],        cmd:'code' },
  { icon:'⊞',  label:'Table',        keywords:['table','grid','columns'],              cmd:'table' },
  { icon:'—',  label:'Divider',      keywords:['divider','hr','rule','line','sep'],    cmd:'hr' },
  { icon:'ℹ',  label:'Callout',      keywords:['callout','info','note','alert','box'], cmd:'callout' },
  { icon:'☐',  label:'Task',         keywords:['task','todo','checkbox','check'],      cmd:'task' },
];

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
    return { dateTime: todayISO() + 'T' + hh + ':' + mm, attendeeIds:[], decisions:'', project:'' };
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
  // Sync inline task done states and due dates after content load
  document.getElementById('ed-content').querySelectorAll('.task-item[data-task-id]').forEach(el => {
    const t = S.tasks.find(x => x.id === el.dataset.taskId);
    el.classList.toggle('ti-done', !!(t && t.completedAt));
    const dueInp = el.querySelector('.ti-due-inp');
    if (dueInp && t) dueInp.value = t.due || '';
  });
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
  document.querySelectorAll('#ed-content .contact-link').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); showView('contacts'); };
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
    grid.appendChild(buildAttendeeField(note));
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
    // Sync inline task titles and due dates from editor content
    const edContentEl = document.getElementById('ed-content');
    const presentIds = new Set([...edContentEl.querySelectorAll('.task-item[data-task-id]')].map(el => el.dataset.taskId));
    edContentEl.querySelectorAll('.task-item[data-task-id]').forEach(el => {
      const t = S.tasks.find(x => x.id === el.dataset.taskId);
      if (t) {
        const b = el.querySelector('.ti-body'); if (b) t.title = b.textContent.trim();
        const d = el.querySelector('.ti-due-inp'); if (d) t.due = d.value || null;
      }
    });
    // Remove tasks that were deleted from this note's editor content
    S.tasks = S.tasks.filter(t => t.noteId !== S.activeNoteId || presentIds.has(t.id));
    n.content   = edContentEl.innerHTML;
    n.title     = document.getElementById('ed-title').value.trim();
    n.updatedAt = nowMs();
    save(); showSaved(); renderNotesList(); renderTasks(); updateNoteBadges(); updateInboxBadge();
    updateCtxPrompt(n);
  }, 2000);
}

function forceSave() {
  clearTimeout(asTimer);
  const n = getNote(S.activeNoteId); if (!n) return;
  const edContentEl = document.getElementById('ed-content');
  const presentIds = new Set([...edContentEl.querySelectorAll('.task-item[data-task-id]')].map(el => el.dataset.taskId));
  S.tasks = S.tasks.filter(t => t.noteId !== S.activeNoteId || presentIds.has(t.id));
  n.content   = edContentEl.innerHTML;
  n.title     = document.getElementById('ed-title').value.trim();
  n.updatedAt = nowMs(); save(); showSaved(); renderNotesList(); renderTasks();
}

// ── Editor Commands ──────────────────────────────────────────

function ec(cmd)   { document.getElementById('ed-content').focus(); document.execCommand(cmd, false, null); scheduleAutosave(); }
function eh(lvl)   { document.getElementById('ed-content').focus(); document.execCommand('formatBlock', false, lvl === 'p' ? 'p' : 'h' + lvl); scheduleAutosave(); }
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

// ── Contact @-Linking ────────────────────────────────────────

function handleContactInput() {
  const sel = window.getSelection(); if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const text  = (range.startContainer.textContent || '').slice(0, range.startOffset);
  const atIdx = text.lastIndexOf('@');
  if (atIdx !== -1) {
    const query = text.slice(atIdx + 1);
    if (!query.includes(' ') && !query.includes('@')) { showContactAC(query, range); return; }
  }
  closeContactAC();
}

function showContactAC(query, range) {
  const ac = document.getElementById('contact-ac');
  const q  = query.toLowerCase();
  const matches = (S.contacts || []).filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.organization || '').toLowerCase().includes(q)
  ).slice(0, 8);
  if (!matches.length) { closeContactAC(); return; }
  ac.innerHTML = '';
  matches.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'cac-item' + (i === 0 ? ' foc' : '');
    div.innerHTML = `<span class="cn">@${esc(c.name || 'Unnamed')}</span>${c.organization ? `<span class="co">${esc(c.organization)}</span>` : ''}`;
    div.onmousedown = e => e.preventDefault();
    div.onclick = () => selectContactLink(c);
    ac.appendChild(div);
  });
  const rect = range.getBoundingClientRect();
  ac.style.top = (rect.bottom + 4) + 'px'; ac.style.left = rect.left + 'px';
  ac.classList.add('open');
}

function selectContactLink(contact) {
  closeContactAC();
  const sel = window.getSelection(); if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const node  = range.startContainer;
  const off   = range.startOffset;
  const text  = node.textContent || '';
  const atIdx = text.slice(0, off).lastIndexOf('@');
  if (atIdx === -1) return;
  const nr = document.createRange(); nr.setStart(node, atIdx); nr.setEnd(node, off); nr.deleteContents();
  const a = document.createElement('a');
  a.className = 'contact-link'; a.dataset.contactId = contact.id;
  a.textContent = '@' + (contact.name || 'Unnamed');
  a.onclick = e => { e.preventDefault(); showView('contacts'); };
  nr.insertNode(a);
  const ar = document.createRange(); ar.setStartAfter(a); ar.collapse(true);
  sel.removeAllRanges(); sel.addRange(ar);
  scheduleAutosave();
}

function closeContactAC() { document.getElementById('contact-ac').classList.remove('open'); }

// ── Slash Commands ───────────────────────────────────────────

function handleSlashInput() {
  if (document.getElementById('wiki-ac').classList.contains('open')) return;
  if (document.getElementById('contact-ac').classList.contains('open')) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.startContainer.nodeType !== Node.TEXT_NODE) { closeSlashPicker(); return; }
  const text     = range.startContainer.textContent.slice(0, range.startOffset);
  const slashIdx = text.lastIndexOf('/');
  if (slashIdx === -1) { closeSlashPicker(); return; }
  if (text.slice(0, slashIdx).trim() !== '') { closeSlashPicker(); return; }
  const query = text.slice(slashIdx + 1);
  if (query.includes(' ')) { closeSlashPicker(); return; }
  showSlashPicker(query, range, range.startContainer, slashIdx);
}

function showSlashPicker(query, range, textNode, slashIdx) {
  const sp = document.getElementById('slash-picker');
  const q  = query.toLowerCase();
  const matches = SLASH_COMMANDS.filter(c =>
    !q || c.label.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q))
  );
  if (!matches.length) { closeSlashPicker(); return; }
  sp._slashNode = textNode;
  sp._slashOff  = slashIdx;
  sp.innerHTML  = '';
  matches.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'sp-item' + (i === 0 ? ' foc' : '');
    div.innerHTML = `<span class="sp-item-icon">${c.icon}</span><span>${esc(c.label)}</span>`;
    div.onmousedown = e => e.preventDefault();
    div.onclick = () => executeSlashCommand(c.cmd);
    sp.appendChild(div);
  });
  const rect = range.getBoundingClientRect();
  sp.style.top  = (rect.bottom + 4) + 'px';
  sp.style.left = rect.left + 'px';
  sp.classList.add('open');
}

function closeSlashPicker() {
  const sp = document.getElementById('slash-picker');
  sp.classList.remove('open');
  sp._slashNode = null; sp._slashOff = null;
}

function executeSlashCommand(cmd) {
  const sp       = document.getElementById('slash-picker');
  const textNode = sp._slashNode;
  const slashOff = sp._slashOff;
  closeSlashPicker();
  edContent.focus();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  // Delete the /query text from the text node
  if (textNode && textNode.parentNode && slashOff !== null) {
    const curOff = sel.getRangeAt(0).startOffset;
    const endOff = Math.min(Math.max(slashOff, curOff), textNode.length);
    const dr = document.createRange();
    dr.setStart(textNode, slashOff); dr.setEnd(textNode, endOff);
    dr.deleteContents();
    const cr = document.createRange(); cr.setStart(textNode, slashOff); cr.collapse(true);
    sel.removeAllRanges(); sel.addRange(cr);
  }
  const info  = getBlockLineText();
  const block = info ? info.block : null;
  if (cmd === 'task')  { insertInlineTask(block); return; }
  if (cmd === 'table') { insertTable(); return; }
  if (cmd === 'code')  { insertCode();  return; }
  if (cmd === 'h1' || cmd === 'h2' || cmd === 'h3') {
    if (block) {
      const h = document.createElement(cmd);
      h.innerHTML = block.innerHTML || '<br>'; h.removeAttribute('style');
      block.replaceWith(h);
      const cr = document.createRange(); cr.selectNodeContents(h); cr.collapse(false);
      sel.removeAllRanges(); sel.addRange(cr);
    } else { document.execCommand('formatBlock', false, cmd); }
  } else if (cmd === 'ul' || cmd === 'ol') {
    if (block) {
      const list = document.createElement(cmd);
      const li = document.createElement('li'); li.innerHTML = block.innerHTML || '<br>';
      list.appendChild(li); block.replaceWith(list);
      const cr = document.createRange(); cr.selectNodeContents(li); cr.collapse(false);
      sel.removeAllRanges(); sel.addRange(cr);
    } else { document.execCommand(cmd === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false, null); }
  } else if (cmd === 'blockquote') {
    document.execCommand('formatBlock', false, 'blockquote');
  } else if (cmd === 'hr') {
    const hr = document.createElement('hr');
    const p  = document.createElement('p'); p.innerHTML = '<br>';
    if (block) {
      block.replaceWith(hr); hr.after(p);
      const cr = document.createRange(); cr.selectNodeContents(p); cr.collapse(false);
      sel.removeAllRanges(); sel.addRange(cr);
    } else { document.execCommand('insertHTML', false, '<hr><p><br></p>'); }
  } else if (cmd === 'callout') {
    const div = document.createElement('div'); div.className = 'callout'; div.innerHTML = '<br>';
    const p   = document.createElement('p');   p.innerHTML   = '<br>';
    if (block) {
      block.replaceWith(div); div.after(p);
      const cr = document.createRange(); cr.selectNodeContents(div); cr.collapse(false);
      sel.removeAllRanges(); sel.addRange(cr);
    } else { document.execCommand('insertHTML', false, '<div class="callout"><br></div><p><br></p>'); }
  }
  scheduleAutosave();
}

// ── Inline Task Checkboxes ────────────────────────────────────

function insertInlineTask(block) {
  const taskId = uid();
  const task = { id:taskId, title:'', due:null, recur:null, noteId:S.activeNoteId||null, createdAt:nowMs(), completedAt:null };
  S.tasks.unshift(task);
  const div  = document.createElement('div');  div.className = 'task-item'; div.dataset.taskId = taskId;
  const chk  = document.createElement('span'); chk.className = 'ti-chk';
  const body = document.createElement('span'); body.className = 'ti-body'; body.innerHTML = '<br>';
  const due  = document.createElement('input'); due.type = 'date'; due.className = 'ti-due-inp';
  div.appendChild(chk); div.appendChild(body); div.appendChild(due);
  const sel = window.getSelection();
  if (block) {
    block.replaceWith(div);
  } else if (sel && sel.rangeCount) {
    sel.getRangeAt(0).insertNode(div);
  }
  const cr = document.createRange(); cr.selectNodeContents(body); cr.collapse(false);
  sel.removeAllRanges(); sel.addRange(cr);
  save(); renderTasks(); scheduleAutosave();
}

function toggleInlineTask(taskId) {
  const el = document.getElementById('ed-content').querySelector(`.task-item[data-task-id="${taskId}"]`);
  // Check both active tasks and archived
  let task = S.tasks.find(t => t.id === taskId);
  const wasArchived = !task;
  if (wasArchived) task = (S.archived || []).find(t => t.id === taskId);
  if (!task) return;

  if (wasArchived) {
    // Uncomplete: restore from archive to tasks
    delete task.completedAt;
    S.archived = S.archived.filter(t => t.id !== taskId);
    S.tasks.unshift(task);
    if (el) el.classList.remove('ti-done');
  } else {
    // Complete: archive it
    task.completedAt = nowMs();
    if (el) el.classList.add('ti-done');
    S.archived = [...(S.archived || []), task];
    S.tasks = S.tasks.filter(t => t.id !== taskId);
  }
  save(); renderTasks(); scheduleAutosave();
}

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

edContent.addEventListener('input', () => { handleWikiInput(); handleContactInput(); handleSlashInput(); handleMarkdownInline(); scheduleAutosave(); });

// ── Image Paste & Drag-Drop ───────────────────────────────────

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

function insertImageFile(file) {
  if (file.size > MAX_IMAGE_BYTES) {
    alert(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 2 MB.`);
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.execCommand('insertHTML', false,
      `<img src="${ev.target.result}" style="max-width:100%;height:auto;display:block;margin:4px 0;" alt="pasted image">`
    );
    scheduleAutosave();
  };
  reader.readAsDataURL(file);
}

edContent.addEventListener('paste', e => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) insertImageFile(file);
      return;
    }
  }
});

edContent.addEventListener('dragover', e => {
  if ([...e.dataTransfer.items].some(i => i.type.startsWith('image/'))) e.preventDefault();
});

edContent.addEventListener('drop', e => {
  const imageItem = [...e.dataTransfer.items].find(i => i.type.startsWith('image/'));
  if (!imageItem) return;
  e.preventDefault();
  const file = imageItem.getAsFile();
  if (file) insertImageFile(file);
});

edContent.addEventListener('click', e => {
  const chk = e.target.closest('.ti-chk');
  if (chk) { const item = chk.closest('.task-item'); if (item && item.dataset.taskId) { e.preventDefault(); toggleInlineTask(item.dataset.taskId); } }
});

// Sync inline task title immediately on input (don't wait for autosave debounce)
edContent.addEventListener('input', e => {
  const tiBody = e.target.closest && e.target.closest('.ti-body');
  if (!tiBody) return;
  const item = tiBody.closest('.task-item');
  if (!item) return;
  const task = S.tasks.find(t => t.id === item.dataset.taskId);
  if (task) { task.title = tiBody.textContent.trim(); renderTasks(); }
});

// Sync inline task due date on change
edContent.addEventListener('change', e => {
  const inp = e.target.closest && e.target.closest('.ti-due-inp');
  if (!inp) return;
  const item = inp.closest('.task-item');
  if (!item) return;
  const task = S.tasks.find(t => t.id === item.dataset.taskId);
  if (task) { task.due = inp.value || null; save(); renderTasks(); }
});

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
  else if (text === '[ ]') { prefixRange.deleteContents(); insertInlineTask(block); return true; }
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
    // List shortcuts — don't fire inside heading elements
    if (block && /^H[1-6]$/.test(block.tagName)) return false;
    // Delete prefix then manually build list structure.
    // Avoids execCommand('insertUnorderedList') which can absorb adjacent blocks.
    prefixRange.deleteContents();
    if (block) {
      const tag  = listCmd === 'insertOrderedList' ? 'ol' : 'ul';
      const list = document.createElement(tag);
      const li   = document.createElement('li');
      li.innerHTML = block.innerHTML || '<br>';
      if (!li.innerHTML) li.innerHTML = '<br>';
      list.appendChild(li);
      block.replaceWith(list);
      const cr = document.createRange(); cr.selectNodeContents(li); cr.collapse(false);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(cr);
    } else {
      // Rare: cursor not inside a block element — fall back to execCommand
      const sel = window.getSelection();
      const cr  = document.createRange();
      cr.setStart(prefixRange.startContainer, prefixRange.startOffset);
      cr.collapse(true);
      sel.removeAllRanges(); sel.addRange(cr);
      document.execCommand(listCmd, false, null);
    }
  }
  scheduleAutosave(); return true;
}

function handleMarkdownEnterShortcut() {
  const info = getBlockLineText(); if (!info) return false;
  const { block, text, prefixRange } = info;

  if (text === '---') {
    const hr = document.createElement('hr');
    const p  = document.createElement('p'); p.innerHTML = '<br>';
    if (block) {
      block.replaceWith(hr);
      hr.after(p);
    } else {
      prefixRange.deleteContents();
      const cr = document.createRange();
      cr.setStart(prefixRange.startContainer, prefixRange.startOffset);
      cr.insertNode(p); cr.insertNode(hr);
    }
    const cr2 = document.createRange(); cr2.selectNodeContents(p); cr2.collapse(false);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(cr2);
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
  const cac = document.getElementById('contact-ac');
  if (cac.classList.contains('open')) {
    const opts = cac.querySelectorAll('.cac-item'); const foc = cac.querySelector('.cac-item.foc'); const idx = [...opts].indexOf(foc);
    if (e.key === 'ArrowDown') { e.preventDefault(); foc && foc.classList.remove('foc'); const n = opts[(idx + 1) % opts.length]; n && n.classList.add('foc'); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); foc && foc.classList.remove('foc'); const p = opts[(idx - 1 + opts.length) % opts.length]; p && p.classList.add('foc'); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const f = cac.querySelector('.cac-item.foc'); if (f) f.click(); return; }
    if (e.key === 'Escape') { closeContactAC(); return; }
  }
  const sp = document.getElementById('slash-picker');
  if (sp.classList.contains('open')) {
    const opts = sp.querySelectorAll('.sp-item'); const foc = sp.querySelector('.sp-item.foc'); const idx = [...opts].indexOf(foc);
    if (e.key === 'ArrowDown') { e.preventDefault(); foc && foc.classList.remove('foc'); const n = opts[(idx + 1) % opts.length]; n && n.classList.add('foc'); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); foc && foc.classList.remove('foc'); const p = opts[(idx - 1 + opts.length) % opts.length]; p && p.classList.add('foc'); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const f = sp.querySelector('.sp-item.foc'); if (f) f.click(); return; }
    if (e.key === 'Escape') { closeSlashPicker(); return; }
  }
  if (e.key === 'Escape') { closeWikiAC(); closeContactAC(); closeSlashPicker(); return; }
  if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) { if (handleMarkdownBlockShortcut()) { e.preventDefault(); return; } }
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // Inside a task-item: insert a new paragraph after it instead of cloning the div structure
    const _sel = window.getSelection();
    if (_sel && _sel.rangeCount) {
      const _node = _sel.getRangeAt(0).startContainer;
      const _el   = _node.nodeType === Node.TEXT_NODE ? _node.parentNode : _node;
      const _item = _el.closest && _el.closest('.task-item');
      if (_item) {
        e.preventDefault();
        const _p = document.createElement('p'); _p.innerHTML = '<br>';
        _item.after(_p);
        const _cr = document.createRange(); _cr.selectNodeContents(_p); _cr.collapse(false);
        _sel.removeAllRanges(); _sel.addRange(_cr);
        scheduleAutosave(); return;
      }
    }
    if (handleMarkdownEnterShortcut()) { e.preventDefault(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); forceSave(); toast('Saved'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); ec('bold'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); ec('italic'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); ec('underline'); }
  if (e.key === 'Tab') {
    const s = window.getSelection();
    if (s && s.anchorNode) {
      const el = s.anchorNode.nodeType === Node.TEXT_NODE ? s.anchorNode.parentNode : s.anchorNode;
      if (el && el.closest && el.closest('li')) {
        e.preventDefault(); e.shiftKey ? document.execCommand('outdent') : document.execCommand('indent');
      }
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
  if (!document.getElementById('contact-ac').contains(e.target) && e.target !== edContent) closeContactAC();
  if (!document.getElementById('slash-picker').contains(e.target) && e.target !== edContent) closeSlashPicker();
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
