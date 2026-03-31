// ── followups.js ──────────────────────────────────────────────
// Follow Up item CRUD, panel management, and contact autocomplete.
// Schema: { id, title, who, contactId, due, notes, noteId, createdAt, receivedAt }
// Storage: S.followups[] (pending), S.fuArchived[] (received/done)
// ──────────────────────────────────────────────────────────────

// ── Panel Mode ───────────────────────────────────────────────
// Modes: 'normal' (75/25 split), 'collapsed' (header bar only), 'full' (fu takes all)

function getFuMode() { return S.fuPanelMode || 'normal'; }

function setFuMode(mode) {
  S.fuPanelMode = mode;
  save();
  _applyFuMode();
}

function _applyFuMode() {
  const mode = getFuMode();
  const panel = document.getElementById('task-panel');
  if (!panel) return;
  panel.dataset.fuMode = mode;

  const colBtn = document.getElementById('fu-col-btn');
  const expBtn = document.getElementById('fu-exp-btn');
  if (colBtn) {
    colBtn.textContent = mode === 'collapsed' ? '▲' : '▼';
    colBtn.title = mode === 'collapsed' ? 'Show follow ups' : 'Collapse follow ups';
  }
  if (expBtn) {
    expBtn.textContent = mode === 'full' ? '↙' : '⤢';
    expBtn.title = mode === 'full' ? 'Restore split view' : 'Expand follow ups';
  }
}

function toggleFuCollapse() {
  setFuMode(getFuMode() === 'collapsed' ? 'normal' : 'collapsed');
}

function toggleFuExpand() {
  setFuMode(getFuMode() === 'full' ? 'normal' : 'full');
}

// ── Render ───────────────────────────────────────────────────

function renderFollowUps() {
  const pending = S.followups || [];

  // Update sidebar badge
  const badge = document.getElementById('sb-fu-badge');
  if (badge) badge.textContent = pending.length;

  const body = document.getElementById('fu-body');
  if (!body) return;
  body.innerHTML = '';

  if (!pending.length) {
    const e = document.createElement('div');
    e.className = 'fu-empty';
    e.textContent = 'No follow ups pending';
    body.appendChild(e);
    _applyFuMode();
    return;
  }

  const sorted = [...pending].sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return a.createdAt - b.createdAt;
  });
  sorted.forEach(fu => body.appendChild(buildFuCard(fu)));
  _applyFuMode();
}

function buildFuCard(fu) {
  const div = document.createElement('div');
  div.className = 'fucard';
  div.dataset.id = fu.id;

  const today = todayISO();
  const isOverdue = fu.due && fu.due < today;
  const isToday   = fu.due === today;
  if (isOverdue) div.classList.add('ov-card');

  const contact  = fu.contactId ? (S.contacts || []).find(c => c.id === fu.contactId) : null;
  const whoLabel = contact ? (contact.name || fu.who) : (fu.who || '');
  const hasNotes = !!(fu.notes && fu.notes.trim());
  if (hasNotes) div.classList.add('has-notes');

  div.innerHTML = `
    <div class="fu-row">
      <div class="fu-chk" onclick="receiveFollowUp('${fu.id}')" title="Mark received"></div>
      <div class="fu-body-col">
        <div class="fu-title" contenteditable="true" spellcheck="false"
          onblur="saveFuTitle('${fu.id}',this)"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}if(event.key==='Escape')this.blur()"
        >${esc(fu.title)}</div>
        <div class="fu-meta">
          ${whoLabel ? `<span class="fu-who${contact ? ' linked' : ''}"${contact ? ` onclick="openEditContact('${contact.id}')"` : ''}>${esc(whoLabel)}</span>` : ''}
          ${fu.due ? `<span class="fu-date${isOverdue ? ' ov' : isToday ? ' td' : ''}">${fmtDate(fu.due)}</span>` : ''}
        </div>
      </div>
      <button class="fu-tax${hasNotes ? ' active' : ''}" onclick="toggleFuNotes('${fu.id}',this)" title="Notes">≡</button>
      <div class="fu-actions">
        <button class="fu-tax" onclick="deleteFu('${fu.id}')">✕</button>
      </div>
    </div>
    <div class="fu-notes-area">
      <textarea class="fu-notes-ta" placeholder="Add notes…"
        onblur="saveFuNotes('${fu.id}',this)"
        onkeydown="if(event.key==='Escape')this.blur()"
      >${esc(fu.notes || '')}</textarea>
    </div>`;
  return div;
}

// ── CRUD ─────────────────────────────────────────────────────

function receiveFollowUp(id) {
  const fu = (S.followups || []).find(f => f.id === id); if (!fu) return;
  fu.receivedAt = Date.now();
  S.fuArchived = [...(S.fuArchived || []), fu];
  S.followups  = (S.followups || []).filter(f => f.id !== id);

  const card = document.querySelector(`.fucard[data-id="${id}"]`);
  function archiveNow() { save(); renderFollowUps(); toast('Follow up received ✓'); }
  if (card) {
    card.classList.add('fu-completing');
    card.addEventListener('animationend', archiveNow, { once: true });
  } else {
    archiveNow();
  }
}

function deleteFu(id) {
  const fu = (S.followups || []).find(f => f.id === id); if (!fu) return;
  showConfirm(`Delete "${fu.title}"?`, 'Delete Follow Up', () => {
    S.followups = (S.followups || []).filter(f => f.id !== id);
    save(); renderFollowUps(); toast('Follow up deleted');
  });
}

function saveFuTitle(id, el) {
  const fu = (S.followups || []).find(f => f.id === id); if (!fu) return;
  const v = el.textContent.trim(); if (!v) { el.textContent = fu.title; return; }
  fu.title = v; save();
}

function toggleFuNotes(id, btn) {
  const card = btn.closest('.fucard');
  const area = card.querySelector('.fu-notes-area');
  const isOpen = area.classList.toggle('open');
  card.classList.toggle('notes-open', isOpen);
  if (isOpen) card.querySelector('.fu-notes-ta').focus();
}

function saveFuNotes(id, el) {
  const fu = (S.followups || []).find(f => f.id === id); if (!fu) return;
  fu.notes = el.value;
  const card = el.closest('.fucard');
  const hasNotes = !!(fu.notes && fu.notes.trim());
  card.classList.toggle('has-notes', hasNotes);
  card.querySelector('.fu-tax').classList.toggle('active', hasNotes);
  save();
}

// ── Capture Modal ─────────────────────────────────────────────

function openFuCapture() {
  document.getElementById('fu-title-inp').value  = '';
  document.getElementById('fu-who-inp').value    = '';
  document.getElementById('fu-who-id').value     = '';
  document.getElementById('fu-due-inp').value    = '';
  document.getElementById('fu-notes-inp').value  = '';
  document.getElementById('fu-title-inp').style.borderColor = '';
  hideFuAC();
  document.getElementById('fu-modal').classList.add('open');
  setTimeout(() => document.getElementById('fu-title-inp').focus(), 50);
}

function submitFuCapture() {
  const title = document.getElementById('fu-title-inp').value.trim();
  if (!title) { document.getElementById('fu-title-inp').style.borderColor = 'var(--red)'; return; }
  const who       = document.getElementById('fu-who-inp').value.trim();
  const contactId = document.getElementById('fu-who-id').value || null;
  const due       = document.getElementById('fu-due-inp').value || null;
  const notes     = document.getElementById('fu-notes-inp').value;

  if (!S.followups) S.followups = [];
  S.followups.unshift({
    id: uid(), title, who, contactId, due,
    notes, noteId: null, createdAt: nowMs(), receivedAt: null
  });
  save(); renderFollowUps(); closeModal('fu-modal'); toast('Follow up added');
}

// ── Contact Autocomplete ──────────────────────────────────────

function onFuWhoInput(inp) {
  const q = inp.value.toLowerCase().trim();
  document.getElementById('fu-who-id').value = '';
  if (!q) { hideFuAC(); return; }
  const contacts = (S.contacts || []).filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.organization || '').toLowerCase().includes(q)
  );
  showFuAC(contacts, inp.value.trim());
}

function showFuAC(contacts, raw) {
  const ac = document.getElementById('fu-who-ac');
  ac.innerHTML = '';
  contacts.slice(0, 6).forEach(c => {
    const div = document.createElement('div'); div.className = 'fu-ac-item';
    const org = c.organization ? ' · ' + c.organization : '';
    div.innerHTML = `<span class="fu-ac-name">${esc(c.name || 'Unnamed')}</span><span class="fu-ac-sub">${esc(org)}</span>`;
    div.onmousedown = e => e.preventDefault();
    div.onclick = () => selectFuContact(c);
    ac.appendChild(div);
  });
  const create = document.createElement('div'); create.className = 'fu-ac-item fu-ac-create';
  create.innerHTML = `<span>+ Create contact: <strong>${esc(raw)}</strong></span>`;
  create.onmousedown = e => e.preventDefault();
  create.onclick = () => createFuContact(raw);
  ac.appendChild(create);
  ac.classList.add('open');
}

function hideFuAC() {
  const ac = document.getElementById('fu-who-ac');
  if (ac) ac.classList.remove('open');
}

function selectFuContact(c) {
  document.getElementById('fu-who-inp').value = c.name || 'Unnamed';
  document.getElementById('fu-who-id').value  = c.id;
  hideFuAC();
}

function createFuContact(name) {
  const c = createContact(name);
  document.getElementById('fu-who-inp').value = c.name;
  document.getElementById('fu-who-id').value  = c.id;
  hideFuAC();
  toast('Contact created: ' + name);
}

// Close autocomplete when clicking outside
document.addEventListener('click', e => {
  const ac = document.getElementById('fu-who-ac');
  const inp = document.getElementById('fu-who-inp');
  if (ac && inp && !ac.contains(e.target) && e.target !== inp) hideFuAC();
});
