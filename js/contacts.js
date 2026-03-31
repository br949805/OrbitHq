// ── contacts.js ───────────────────────────────────────────────
// Contact CRUD, directory view, meeting attendee chip picker.
// Schema: { id, name, email, phone, organization, role, notes, createdAt, updatedAt }
// ──────────────────────────────────────────────────────────────

// ── Contact CRUD ─────────────────────────────────────────────

function createContact(name) {
  if (!S.contacts) S.contacts = [];
  const c = { id:uid(), name:name||'', email:'', phone:'', organization:'', role:'', notes:'', createdAt:nowMs(), updatedAt:nowMs() };
  S.contacts.push(c);
  save();
  _updateContactBadge();
  return c;
}

function saveContact(id, fields) {
  const c = (S.contacts || []).find(x => x.id === id); if (!c) return;
  Object.assign(c, fields, { updatedAt: nowMs() });
  save();
  _updateContactBadge();
}

function deleteContact(id) {
  const c = (S.contacts || []).find(x => x.id === id); if (!c) return;
  showConfirm(`Delete "${c.name || 'Unnamed'}"?`, 'Delete Contact', () => {
    S.contacts = (S.contacts || []).filter(x => x.id !== id);
    // Remove from any meeting attendeeLists
    S.notes.forEach(n => {
      if (n.metadata && n.metadata.attendeeIds) {
        n.metadata.attendeeIds = n.metadata.attendeeIds.filter(aid => aid !== id);
      }
    });
    // Remove from follow ups
    (S.followups || []).forEach(f => { if (f.contactId === id) f.contactId = null; });
    save();
    renderContactsView();
    _updateContactBadge();
    toast('Contact deleted');
  });
}

function _updateContactBadge() {
  const el = document.getElementById('ct-badge');
  if (el) el.textContent = (S.contacts || []).length;
}

// ── Contacts View ─────────────────────────────────────────────

let _contactSearch = '';
let _editingContactId = null;

function showContacts() {
  document.getElementById('contacts-view').classList.add('vis');
  _contactSearch = '';
  const searchEl = document.getElementById('cv-search');
  if (searchEl) searchEl.value = '';
  renderContactsView();
}

function hideContacts() {
  document.getElementById('contacts-view').classList.remove('vis');
}

function renderContactsView(query) {
  if (query !== undefined) _contactSearch = query;
  const list = document.getElementById('cv-list');
  if (!list) return;
  list.innerHTML = '';
  _updateContactBadge();

  const q = _contactSearch.toLowerCase();
  const contacts = (S.contacts || [])
    .filter(c => !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.organization || '').toLowerCase().includes(q))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (!contacts.length) {
    list.innerHTML = '<div class="cv-empty">' + (q ? 'No contacts match your search.' : 'No contacts yet — add one to get started.') + '</div>';
    return;
  }
  contacts.forEach(c => list.appendChild(buildContactCard(c)));
}

function buildContactCard(contact) {
  const div = document.createElement('div');
  div.className = 'cv-card';
  div.dataset.id = contact.id;

  const meta = [contact.organization, contact.role].filter(Boolean).join(' · ');
  const fuCount = (S.followups || []).filter(f => f.contactId === contact.id).length;

  div.innerHTML = `
    <div class="cv-card-main">
      <div class="cv-name">${esc(contact.name || 'Unnamed')}</div>
      ${meta ? `<div class="cv-meta">${esc(meta)}</div>` : ''}
      <div class="cv-details">
        ${contact.email ? `<a class="cv-link" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>` : ''}
        ${contact.phone ? `<span class="cv-ph">${esc(contact.phone)}</span>` : ''}
        ${fuCount ? `<span class="cv-fu-badge">${fuCount} follow up${fuCount !== 1 ? 's' : ''}</span>` : ''}
      </div>
      ${contact.notes ? `<div class="cv-notes">${esc(contact.notes)}</div>` : ''}
    </div>
    <div class="cv-actions">
      <button class="cv-btn" onclick="openEditContact('${contact.id}')">Edit</button>
      <button class="cv-btn danger" onclick="deleteContact('${contact.id}')">✕</button>
    </div>`;
  return div;
}

// ── Add / Edit Contact Modal ───────────────────────────────────

function openAddContactModal() {
  _editingContactId = null;
  document.getElementById('contact-modal-title').textContent = 'New Contact';
  document.getElementById('contact-name-inp').value     = '';
  document.getElementById('contact-email-inp').value    = '';
  document.getElementById('contact-phone-inp').value    = '';
  document.getElementById('contact-org-inp').value      = '';
  document.getElementById('contact-role-inp').value     = '';
  document.getElementById('contact-notes-inp').value    = '';
  document.getElementById('contact-name-inp').style.borderColor = '';
  document.getElementById('contact-modal').classList.add('open');
  setTimeout(() => document.getElementById('contact-name-inp').focus(), 50);
}

function openEditContact(id) {
  const c = (S.contacts || []).find(x => x.id === id); if (!c) return;
  _editingContactId = id;
  document.getElementById('contact-modal-title').textContent = 'Edit Contact';
  document.getElementById('contact-name-inp').value     = c.name     || '';
  document.getElementById('contact-email-inp').value    = c.email    || '';
  document.getElementById('contact-phone-inp').value    = c.phone    || '';
  document.getElementById('contact-org-inp').value      = c.organization || '';
  document.getElementById('contact-role-inp').value     = c.role     || '';
  document.getElementById('contact-notes-inp').value    = c.notes    || '';
  document.getElementById('contact-name-inp').style.borderColor = '';
  document.getElementById('contact-modal').classList.add('open');
  setTimeout(() => document.getElementById('contact-name-inp').focus(), 50);
}

function submitContactModal() {
  const name = document.getElementById('contact-name-inp').value.trim();
  if (!name) { document.getElementById('contact-name-inp').style.borderColor = 'var(--red)'; return; }
  const fields = {
    name,
    email:        document.getElementById('contact-email-inp').value.trim(),
    phone:        document.getElementById('contact-phone-inp').value.trim(),
    organization: document.getElementById('contact-org-inp').value.trim(),
    role:         document.getElementById('contact-role-inp').value.trim(),
    notes:        document.getElementById('contact-notes-inp').value.trim()
  };
  if (_editingContactId) {
    saveContact(_editingContactId, fields);
    // Re-render any open attendee chips
    S.notes.forEach(n => {
      if (n.metadata && (n.metadata.attendeeIds || []).includes(_editingContactId)) {
        renderAttendeeChipsFor(n);
      }
    });
    // Re-render follow-up cards if this contact is referenced
    renderFollowUps();
    toast('Contact updated');
  } else {
    if (!S.contacts) S.contacts = [];
    S.contacts.push({ id:uid(), ...fields, createdAt:nowMs(), updatedAt:nowMs() });
    save();
    _updateContactBadge();
    toast('Contact added');
  }
  closeModal('contact-modal');
  if (document.getElementById('contacts-view').classList.contains('vis')) renderContactsView();
}

// ── Meeting Attendee Chip Field ───────────────────────────────

// Called from editor.js renderMetadata when building meeting fields.
function buildAttendeeField(note) {
  const wrap = document.createElement('div');
  wrap.className = 'mf mf-full';
  const label = document.createElement('div');
  label.className = 'ml';
  label.textContent = 'Attendees';
  const chips = document.createElement('div');
  chips.className = 'attendee-chips';
  chips.id = 'attendee-chips-' + note.id;
  _fillAttendeeChips(chips, note);
  wrap.appendChild(label);
  wrap.appendChild(chips);
  return wrap;
}

function _fillAttendeeChips(chipsEl, note) {
  chipsEl.innerHTML = '';
  const ids = (note.metadata && note.metadata.attendeeIds) || [];
  ids.forEach(cid => {
    const c = (S.contacts || []).find(x => x.id === cid);
    const chip = document.createElement('span');
    chip.className = 'attendee-chip';
    chip.innerHTML = `${esc(c ? c.name : '?')}<button class="attendee-chip-rm" onclick="removeAttendee('${note.id}','${cid}')">×</button>`;
    chipsEl.appendChild(chip);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'tag-add-btn';
  addBtn.textContent = '+ Attendee';
  addBtn.onclick = e => { e.preventDefault(); openAttendeePicker(note.id, addBtn); };
  chipsEl.appendChild(addBtn);
}

function renderAttendeeChipsFor(note) {
  const el = document.getElementById('attendee-chips-' + note.id);
  if (el) _fillAttendeeChips(el, note);
}

function toggleAttendee(noteId, contactId) {
  const note = S.notes.find(n => n.id === noteId); if (!note) return;
  if (!note.metadata) note.metadata = {};
  if (!note.metadata.attendeeIds) note.metadata.attendeeIds = [];
  if (note.metadata.attendeeIds.includes(contactId))
    note.metadata.attendeeIds = note.metadata.attendeeIds.filter(id => id !== contactId);
  else
    note.metadata.attendeeIds.push(contactId);
  note.updatedAt = nowMs();
  save();
  renderAttendeeChipsFor(note);
}

function removeAttendee(noteId, contactId) { toggleAttendee(noteId, contactId); }

// ── Attendee Picker (like tag picker) ─────────────────────────

function openAttendeePicker(noteId, anchorEl) {
  const picker = document.getElementById('attendee-picker');
  picker.innerHTML = '';

  // Search input
  const searchInp = document.createElement('input');
  searchInp.className = 'ap-search';
  searchInp.placeholder = 'Search contacts…';
  searchInp.oninput = () => _fillAttendeePicker(picker, noteId, searchInp.value);
  picker.appendChild(searchInp);

  _fillAttendeePicker(picker, noteId, '');

  const rect = anchorEl.getBoundingClientRect();
  picker.style.top  = (rect.bottom + 4) + 'px';
  picker.style.left = rect.left + 'px';
  picker.classList.add('open');
  searchInp.focus();

  setTimeout(() => {
    function h(ev) {
      if (!picker.contains(ev.target) && ev.target !== anchorEl) {
        picker.classList.remove('open');
        document.removeEventListener('click', h);
      }
    }
    document.addEventListener('click', h);
  }, 100);
}

function _fillAttendeePicker(picker, noteId, query) {
  // Remove rows (keep search input at index 0)
  [...picker.children].slice(1).forEach(el => el.remove());

  const q = query.toLowerCase();
  const note = S.notes.find(n => n.id === noteId);
  const currentIds = (note && note.metadata && note.metadata.attendeeIds) || [];
  const contacts = (S.contacts || []).filter(c =>
    !q || (c.name || '').toLowerCase().includes(q) || (c.organization || '').toLowerCase().includes(q)
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (contacts.length) {
    contacts.forEach(c => {
      const row = document.createElement('div');
      const active = currentIds.includes(c.id);
      row.className = 'tag-pick-row' + (active ? ' active' : '');
      const org = c.organization ? `<span class="ap-org"> · ${esc(c.organization)}</span>` : '';
      row.innerHTML = `<span class="ap-name">${esc(c.name)}</span>${org}${active ? '<span style="margin-left:auto;color:var(--accent)">✓</span>' : ''}`;
      row.onmousedown = e => e.preventDefault();
      row.onclick = () => {
        toggleAttendee(noteId, c.id);
        _fillAttendeePicker(picker, noteId, query);
      };
      picker.appendChild(row);
    });
  } else if (!q) {
    const msg = document.createElement('div');
    msg.style.cssText = 'padding:8px 12px;font-size:12px;color:var(--text3)';
    msg.textContent = 'No contacts yet.';
    picker.appendChild(msg);
  }

  // "Create" option — always shown when typing, or as "+ New Contact" when empty
  const createRow = document.createElement('div');
  createRow.className = 'tag-pick-row';
  createRow.style.cssText = 'border-top:1px solid var(--border);color:var(--green)';
  createRow.innerHTML = q
    ? `<span>+ Create <strong>${esc(query)}</strong></span>`
    : `<span>+ New Contact</span>`;
  createRow.onmousedown = e => e.preventDefault();
  createRow.onclick = () => {
    const c = createContact(query || '');
    toggleAttendee(noteId, c.id);
    picker.classList.remove('open');
    if (!query) openEditContact(c.id);
  };
  picker.appendChild(createRow);
}
