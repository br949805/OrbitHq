// ── tasks.js ──────────────────────────────────────────────────
// Task render, CRUD, recurrence logic, and auto-archive.
// ──────────────────────────────────────────────────────────────

function taskClass(t) {
  if (!t.due) return 'nd';
  const d = todayISO();
  if (t.due < d)  return 'ov';
  if (t.due === d) return 'td';
  return 'up';
}

function nextRecur(dateStr, recur) {
  const d = new Date(dateStr + 'T12:00:00');
  if (recur === 'daily')    d.setDate(d.getDate() + 1);
  else if (recur === 'weekdays') { do { d.setDate(d.getDate() + 1); } while ([0,6].includes(d.getDay())); }
  else if (recur === 'weekly')   d.setDate(d.getDate() + 7);
  else if (recur === 'monthly')  d.setMonth(d.getMonth() + 1);
  else return null;
  return d.toISOString().slice(0, 10);
}

function runAutoArchive() {
  const cut = Date.now() - S.settings.archiveDelay * 86400000;
  const toArc = S.tasks.filter(t => t.completedAt && t.completedAt < cut);
  if (!toArc.length) return;
  S.archived = [...(S.archived || []), ...toArc];
  S.tasks = S.tasks.filter(t => !(t.completedAt && t.completedAt < cut));
  save();
}

function renderTasks() {
  const active = S.tasks.filter(t => !t.completedAt || (Date.now() - t.completedAt < S.settings.archiveDelay * 86400000));
  const ov = active.filter(t => taskClass(t) === 'ov');
  const td = active.filter(t => taskClass(t) === 'td');
  const up = active.filter(t => taskClass(t) === 'up');
  const nd = active.filter(t => taskClass(t) === 'nd');

  renderTaskSection('ov', ov, 'ov-card');
  renderTaskSection('td', td, 'td-card');
  renderUpcoming(up);
  renderTaskSection('nd', nd, '');

  document.getElementById('ct-ov').textContent = ov.length;
  document.getElementById('ct-td').textContent = td.length;
  document.getElementById('ct-up').textContent = up.length;
  document.getElementById('ct-nd').textContent = nd.length;
  document.getElementById('sb-task-badge').textContent = active.filter(t => !t.completedAt).length;
  document.getElementById('archive-ct').textContent = (S.archived || []).length;
  document.getElementById('sb-archive-badge').textContent = (S.archived || []).length;
}

function renderTaskSection(sec, tasks, cardCls) {
  const body = document.getElementById('body-' + sec);
  const tog  = document.getElementById('tog-' + sec);
  const col  = S.collapsed[sec];
  tog.classList.toggle('col', col);
  body.classList.toggle('col', col);
  body.innerHTML = '';
  if (!tasks.length) { const e = document.createElement('div'); e.className = 'empty-sec'; e.textContent = 'No tasks'; body.appendChild(e); return; }
  tasks.sort((a, b) => (a.due || '').localeCompare(b.due || '') || a.createdAt - b.createdAt);
  tasks.forEach(t => body.appendChild(buildTaskCard(t, cardCls)));
}

function renderUpcoming(tasks) {
  const body = document.getElementById('body-up');
  const tog  = document.getElementById('tog-up');
  body.classList.toggle('col', S.collapsed.up);
  tog.classList.toggle('col', S.collapsed.up);
  body.innerHTML = '';
  if (!tasks.length) { const e = document.createElement('div'); e.className = 'empty-sec'; e.textContent = 'No tasks'; body.appendChild(e); return; }
  tasks.sort((a, b) => a.due.localeCompare(b.due));
  const groups = {};
  tasks.forEach(t => { if (!groups[t.due]) groups[t.due] = []; groups[t.due].push(t); });
  let first = true;
  Object.keys(groups).sort().forEach(date => {
    const h = document.createElement('div'); h.className = 'dgrp-hdr';
    h.textContent = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    if (first) first = false;
    body.appendChild(h);
    groups[date].forEach(t => body.appendChild(buildTaskCard(t, '')));
  });
}

function buildTaskCard(task, extraCls) {
  const div = document.createElement('div');
  const hasNotes = !!(task.notes && task.notes.trim());
  div.className = 'tcard ' + extraCls + (hasNotes ? ' has-notes' : '');
  div.dataset.id = task.id;
  const cls = taskClass(task);
  const done = !!task.completedAt;
  const linkedNote = task.noteId ? S.notes.find(n => n.id === task.noteId) : null;
  div.innerHTML = `
    <div class="trow">
      <div class="tchk${done ? ' done' : ''}" onclick="toggleTask('${task.id}')"></div>
      <div class="tbody">
        <div class="ttitle" contenteditable="true" spellcheck="false"
          onblur="saveTaskTitle('${task.id}',this)"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}if(event.key==='Escape')this.blur()"
          style="${done ? 'text-decoration:line-through;color:var(--text3)' : ''}">${esc(task.title)}</div>
        <div class="tmeta">
          ${task.due
            ? `<span class="tdate${cls==='ov'?' ov':cls==='td'?' td':''}" onclick="editTaskDate('${task.id}',this,event)">${fmtDate(task.due)}</span>`
            : `<span class="tdate" onclick="editTaskDate('${task.id}',this,event)" style="color:var(--text3)">+ date</span>`}
          ${task.recur ? `<span class="trecur" title="${task.recur}">↻</span>` : ''}
          ${linkedNote ? `<span class="tnote-link" onclick="openNote('${linkedNote.id}')" title="${esc(linkedNote.title||'Untitled')}">${esc((linkedNote.title||'Untitled').slice(0,20))}</span>` : ''}
        </div>
      </div>
      <button class="tax task-note-btn${hasNotes ? ' active' : ''}" onclick="toggleTaskNotes('${task.id}',this)" title="Notes">≡</button>
      <div class="tactions"><button class="tax" onclick="openTaskDetail('${task.id}')" title="Details">⋯</button><button class="tax" onclick="deleteTask('${task.id}')">✕</button></div>
    </div>
    <div class="task-notes-area">
      <textarea class="task-notes-ta" placeholder="Add notes..."
        onblur="saveTaskNotes('${task.id}',this)"
        onkeydown="if(event.key==='Escape')this.blur()"
      >${esc(task.notes || '')}</textarea>
      <div class="task-notes-links">${buildNotesLinks(task.notes || '')}</div>
    </div>`;
  return div;
}

function buildNotesLinks(notes) {
  const urls = notes.match(/https?:\/\/[^\s<>"]+/g);
  if (!urls) return '';
  return urls.map(u =>
    `<a class="tnotes-link" href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`
  ).join('');
}

function toggleTaskNotes(id, btn) {
  const card = btn.closest('.tcard');
  const area = card.querySelector('.task-notes-area');
  const isOpen = area.classList.toggle('open');
  card.classList.toggle('notes-open', isOpen);
  if (isOpen) card.querySelector('.task-notes-ta').focus();
}

function saveTaskNotes(id, el) {
  const t = S.tasks.find(t => t.id === id); if (!t) return;
  t.notes = el.value;
  const card = el.closest('.tcard');
  const hasNotes = !!(t.notes && t.notes.trim());
  card.classList.toggle('has-notes', hasNotes);
  card.querySelector('.task-note-btn').classList.toggle('active', hasNotes);
  card.querySelector('.task-notes-links').innerHTML = buildNotesLinks(t.notes);
  save();
}

function toggleSec(sec) { S.collapsed[sec] = !S.collapsed[sec]; save(); renderTasks(); }

let _taskDetailId = null;

function openTaskDetail(id) {
  const t = S.tasks.find(t => t.id === id); if (!t) return;
  _taskDetailId = id;
  document.getElementById('td-title').value   = t.title  || '';
  document.getElementById('td-due').value     = t.due    || '';
  document.getElementById('td-recur').value   = t.recur  || '';
  document.getElementById('td-notes').value   = t.notes  || '';
  document.getElementById('td-created').textContent = fmtTS(t.createdAt);
  document.getElementById('task-detail-modal').classList.add('open');
  setTimeout(() => document.getElementById('td-title').focus(), 50);
}

function saveTaskDetail() {
  const t = S.tasks.find(t => t.id === _taskDetailId); if (!t) return;
  const title = document.getElementById('td-title').value.trim();
  if (title) t.title = title;
  t.due   = document.getElementById('td-due').value   || null;
  t.recur = document.getElementById('td-recur').value || null;
  t.notes = document.getElementById('td-notes').value;
  save(); renderTasks(); closeModal('task-detail-modal'); toast('Task updated');
}

function playCompleteChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
      osc.start(t0); osc.stop(t0 + 0.45);
    });
  } catch(e) {}
}

function toggleTask(id) {
  const t = S.tasks.find(t => t.id === id); if (!t) return;
  if (t.completedAt) { delete t.completedAt; save(); renderTasks(); return; }
  t.completedAt = Date.now();
  if (t.recur && t.due) {
    const nd = nextRecur(t.due, t.recur);
    if (nd) { S.tasks.push({ id:uid(), title:t.title, due:nd, recur:t.recur, noteId:t.noteId||null, createdAt:Date.now(), completedAt:null }); toast('↻ Next: ' + fmtDate(nd)); }
  }
  // Play chime and animate card out, then immediately archive
  playCompleteChime();
  const card = document.querySelector(`.tcard[data-id="${id}"]`);
  function archiveNow() {
    S.archived = [...(S.archived || []), t];
    S.tasks = S.tasks.filter(t2 => t2.id !== id);
    save(); renderTasks();
    toast('Archived ✓');
  }
  if (card) {
    card.classList.add('completing');
    card.addEventListener('animationend', archiveNow, { once: true });
  } else {
    archiveNow();
  }
}

function deleteTask(id) {
  const t = S.tasks.find(t => t.id === id); if (!t) return;
  showConfirm(`Delete "${t.title}"?`, 'Delete Task', () => {
    S.tasks = S.tasks.filter(t => t.id !== id); save(); renderTasks(); toast('Task deleted');
  });
}

function saveTaskTitle(id, el) {
  const t = S.tasks.find(t => t.id === id); if (!t) return;
  const v = el.textContent.trim(); if (!v) { el.textContent = t.title; return; }
  t.title = v; save();
}

// ── Email Drag-and-Drop ───────────────────────────────────────

let _pendingEmailLink = '';

function initEmailDrop() {
  const zone = document.getElementById('email-drop-zone');

  function hasText(types) {
    for (let i = 0; i < types.length; i++) {
      if (types[i] === 'text/plain' || types[i] === 'text/html') return true;
    }
    return false;
  }

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');

    let subject = '';
    _pendingEmailLink = '';

    // Try every drag type; OWA drops JSON with a subjects[] array
    for (let i = 0; i < e.dataTransfer.types.length; i++) {
      const raw = e.dataTransfer.getData(e.dataTransfer.types[i]);
      if (!raw) continue;

      // OWA JSON format: { subjects: ["Email subject here"], latestItemIds: [...], ... }
      if (raw.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.subjects && parsed.subjects.length > 0) {
            subject = parsed.subjects[0].trim();
          }
          // Build deep link from item ID + mailbox address
          if (parsed.latestItemIds && parsed.latestItemIds.length > 0) {
            const itemId  = parsed.latestItemIds[0];
            const email   = (parsed.mailboxInfos && parsed.mailboxInfos[0] && parsed.mailboxInfos[0].mailboxSmtpAddress) || '';
            const isPersonal = /@(outlook|hotmail|live)\./i.test(email);
            const base = isPersonal ? 'https://outlook.live.com/owa/' : 'https://outlook.office.com/owa/';
            _pendingEmailLink = base + '?ItemID=' + encodeURIComponent(itemId) + '&viewmodel=ReadMessageItem';
          }
          if (subject) break;
        } catch (_) {}
      }

      // Plain text fallback — first non-empty line
      const line = raw.split('\n').map(l => l.trim()).find(l => l.length > 0);
      if (line) { subject = line; break; }
    }

    // Open the modal regardless — user can edit title if extraction failed
    openEmailFollowUpModal(subject ? 'Email Follow Up: ' + subject : '');
  });
}

function openEmailFollowUpModal(title) {
  document.getElementById('ef-title').value = title;
  document.getElementById('ef-due').value   = '';
  document.getElementById('ef-title').style.borderColor = '';
  document.getElementById('ef-due').style.borderColor   = '';
  const linkRow = document.getElementById('ef-link-row');
  const linkEl  = document.getElementById('ef-link-display');
  if (_pendingEmailLink) {
    linkEl.innerHTML = `<a href="${_pendingEmailLink}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:none" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${_pendingEmailLink}</a>`;
    linkRow.style.display = '';
  } else {
    linkRow.style.display = 'none';
  }
  document.getElementById('email-followup-modal').classList.add('open');
  setTimeout(() => {
    document.getElementById(title ? 'ef-due' : 'ef-title').focus();
  }, 50);
}

function submitEmailFollowUp() {
  const title = document.getElementById('ef-title').value.trim();
  const due   = document.getElementById('ef-due').value;
  if (!title) { document.getElementById('ef-title').style.borderColor = 'var(--red)'; return; }
  if (!due)   { document.getElementById('ef-due').style.borderColor   = 'var(--red)'; return; }
  const notes = _pendingEmailLink ? _pendingEmailLink : '';
  S.tasks.unshift({ id:uid(), title, due, recur:null, noteId:null, notes, createdAt:nowMs(), completedAt:null });
  save(); renderTasks(); closeModal('email-followup-modal');
  toast('Follow-up task created');
}

function editTaskDate(id, el, e) {
  e.stopPropagation();
  document.querySelectorAll('.date-pop').forEach(p => p.remove());
  const t = S.tasks.find(t => t.id === id); if (!t) return;
  const pop = document.createElement('div');
  pop.className = 'date-pop';
  pop.style.cssText = 'position:fixed;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:8px;z-index:500;box-shadow:0 8px 24px rgba(0,0,0,.5)';
  const inp = document.createElement('input'); inp.type = 'date'; inp.value = t.due || '';
  inp.style.cssText = 'background:var(--bg4);border:1px solid var(--border2);border-radius:3px;color:var(--text);font-family:var(--mono);font-size:11px;padding:4px 7px;outline:none;width:150px';
  const clr = document.createElement('button'); clr.textContent = 'Clear';
  clr.style.cssText = 'display:block;margin-top:5px;width:100%;background:none;border:1px solid var(--border);border-radius:3px;color:var(--text2);font-family:var(--mono);font-size:10px;padding:3px;cursor:pointer';
  clr.onclick = () => { t.due = null; save(); renderTasks(); pop.remove(); };
  pop.appendChild(inp); pop.appendChild(clr);
  const rect = el.getBoundingClientRect();
  pop.style.top = (rect.bottom + 4) + 'px'; pop.style.left = rect.left + 'px';
  document.body.appendChild(pop); inp.focus();
  inp.onchange = () => { t.due = inp.value || null; save(); renderTasks(); pop.remove(); };
  setTimeout(() => { function h(ev) { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', h); } } document.addEventListener('click', h); }, 100);
}
