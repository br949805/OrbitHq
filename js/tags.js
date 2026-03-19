// ── tags.js ───────────────────────────────────────────────────
// Tag CRUD, sidebar rendering, and note-tag assignment.
// ─────────────────────────────────────────────────────────────

const TAG_COLORS = ['#c8f064','#5c9fff','#f0a040','#ff5c5c','#b07aff','#40d9c0','#ff9eb5','#ffda6e'];

function renderTagsSidebar() {
  const tree = document.getElementById('tag-tree');
  if (!tree) return;
  tree.innerHTML = '';
  if (!S.tags || !S.tags.length) {
    const e = document.createElement('div');
    e.style.cssText = 'padding:3px 12px;font-size:12px;color:var(--text3);font-style:italic';
    e.textContent = 'No tags yet';
    tree.appendChild(e);
    return;
  }
  S.tags.forEach(tag => tree.appendChild(buildTagRow(tag)));
}

function buildTagRow(tag) {
  const ct = S.notes.filter(n => (n.tags || []).includes(tag.id)).length;
  const div = document.createElement('div');
  const isActive = S.noteFilter === 'tag:' + tag.id;
  div.className = 'tag-row' + (isActive ? ' active' : '');
  div.innerHTML = `<span class="tag-dot" style="background:${tag.color || 'var(--text3)'}"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tag.name)}</span><span class="sbadge">${ct}</span><div class="folder-actions-wrap"><button class="fax" onclick="deleteTag('${tag.id}',event)" title="Delete">✕</button></div>`;
  div.onclick = (e) => { if (e.target.closest('.folder-actions-wrap')) return; setNoteFilter('tag:' + tag.id, div); };
  return div;
}

function openTagModal() {
  document.getElementById('tag-modal').classList.add('open');
  document.getElementById('tag-name-inp').value = '';
  document.getElementById('tag-color-inp').value = TAG_COLORS[S.tags.length % TAG_COLORS.length];
  renderTagColorPalette();
  setTimeout(() => document.getElementById('tag-name-inp').focus(), 50);
}

function renderTagColorPalette() {
  const pal = document.getElementById('tag-color-palette');
  pal.innerHTML = '';
  TAG_COLORS.forEach(c => {
    const dot = document.createElement('span');
    dot.className = 'pal-dot';
    dot.style.background = c;
    dot.title = c;
    dot.onclick = () => { document.getElementById('tag-color-inp').value = c; document.querySelectorAll('.pal-dot').forEach(d => d.classList.remove('sel')); dot.classList.add('sel'); };
    if (document.getElementById('tag-color-inp').value === c) dot.classList.add('sel');
    pal.appendChild(dot);
  });
}

function submitTag() {
  const name = document.getElementById('tag-name-inp').value.trim();
  if (!name) return;
  const color = document.getElementById('tag-color-inp').value || TAG_COLORS[0];
  if (!S.tags) S.tags = [];
  S.tags.push({ id: uid(), name, color });
  save(); renderTagsSidebar(); closeModal('tag-modal'); toast('Tag created');
}

function deleteTag(id, e) {
  e.stopPropagation();
  const tag = S.tags.find(t => t.id === id); if (!tag) return;
  if (!confirm(`Delete tag "${tag.name}"?`)) return;
  S.tags = S.tags.filter(t => t.id !== id);
  S.notes.forEach(n => { if (n.tags) n.tags = n.tags.filter(tid => tid !== id); });
  if (S.noteFilter === 'tag:' + id) setNoteFilter('all', document.getElementById('sb-all'));
  save(); renderTagsSidebar(); renderNotesList(); toast('Tag deleted');
}

function renderNoteTags(note) {
  const block = document.getElementById('tags-block');
  if (!block) return;
  block.innerHTML = '';
  const tags = (note.tags || []).map(tid => S.tags.find(t => t.id === tid)).filter(Boolean);
  tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.style.borderColor = tag.color || 'var(--border2)';
    chip.style.color = tag.color || 'var(--text2)';
    chip.innerHTML = `<span class="tag-dot" style="background:${tag.color}"></span>${esc(tag.name)}<button class="tag-chip-rm" onclick="removeNoteTag('${note.id}','${tag.id}')" title="Remove">×</button>`;
    block.appendChild(chip);
  });
  const btn = document.createElement('button');
  btn.className = 'tag-add-btn';
  btn.textContent = '+ Tag';
  btn.onclick = () => openTagPicker(note.id);
  block.appendChild(btn);
}

function openTagPicker(noteId) {
  const picker = document.getElementById('tag-picker');
  if (!picker) return;
  picker.innerHTML = '';
  if (!S.tags || !S.tags.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'padding:8px 12px;font-size:12px;color:var(--text3)';
    msg.textContent = 'No tags yet — create one first.';
    picker.appendChild(msg);
  } else {
    const note = S.notes.find(n => n.id === noteId);
    const currentTags = (note && note.tags) || [];
    S.tags.forEach(tag => {
      const row = document.createElement('div');
      row.className = 'tag-pick-row' + (currentTags.includes(tag.id) ? ' active' : '');
      row.innerHTML = `<span class="tag-dot" style="background:${tag.color}"></span><span>${esc(tag.name)}</span>${currentTags.includes(tag.id) ? '<span style="margin-left:auto;color:var(--accent)">✓</span>' : ''}`;
      row.onclick = () => { toggleNoteTag(noteId, tag.id); closePicker(); };
      picker.appendChild(row);
    });
  }
  const newBtn = document.createElement('div');
  newBtn.className = 'tag-pick-row';
  newBtn.style.cssText = 'border-top:1px solid var(--border);color:var(--accent)';
  newBtn.innerHTML = '<span>+ New Tag</span>';
  newBtn.onclick = () => { closePicker(); openTagModal(); };
  picker.appendChild(newBtn);

  const block = document.getElementById('tags-block');
  const rect = block ? block.getBoundingClientRect() : { bottom: 100, left: 20 };
  picker.style.top  = (rect.bottom + 4) + 'px';
  picker.style.left = rect.left + 'px';
  picker.classList.add('open');

  setTimeout(() => {
    function h(ev) { if (!picker.contains(ev.target) && !document.getElementById('tags-block').contains(ev.target)) { closePicker(); document.removeEventListener('click', h); } }
    document.addEventListener('click', h);
  }, 100);
}

function closePicker() {
  const picker = document.getElementById('tag-picker');
  if (picker) picker.classList.remove('open');
}

function toggleNoteTag(noteId, tagId) {
  const note = S.notes.find(n => n.id === noteId); if (!note) return;
  if (!note.tags) note.tags = [];
  if (note.tags.includes(tagId)) note.tags = note.tags.filter(t => t !== tagId);
  else note.tags.push(tagId);
  note.updatedAt = nowMs();
  save(); renderNoteTags(note); renderNotesList(); renderTagsSidebar();
}

function removeNoteTag(noteId, tagId) {
  toggleNoteTag(noteId, tagId);
}
