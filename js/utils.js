// ── utils.js ──────────────────────────────────────────────────
// Pure helpers: uid, esc, date formatting, toast, modal utils.
// ──────────────────────────────────────────────────────────────

function uid()    { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function nowMs()  { return Date.now(); }
function esc(s)   { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function strip(s) { return (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function wc(n)    { return strip(n.content || '').split(/\s+/).filter(Boolean).length; }

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + (+d);
}

function fmtAge(ts) {
  const d = Date.now() - ts;
  if (d < 3600000)  return Math.floor(d / 60000)   + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000)  + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}

function fmtTS(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' +
         d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
}

function toast(m, dur = 2500) {
  const el = document.getElementById('toast');
  el.textContent = m;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function handleMoClick(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

let _confirmCb = null;
function showConfirm(message, title, onConfirm) {
  _confirmCb = onConfirm;
  document.getElementById('confirm-modal-title').textContent = title || 'Confirm';
  document.getElementById('confirm-modal-msg').textContent   = message;
  document.getElementById('confirm-modal').classList.add('open');
}
function _confirmOk() {
  closeModal('confirm-modal');
  if (_confirmCb) { _confirmCb(); _confirmCb = null; }
}
function _confirmCancel() {
  closeModal('confirm-modal');
  _confirmCb = null;
}

let asTimer = null;
function showSaving() { document.getElementById('asdot').classList.remove('saved'); document.getElementById('aslbl').textContent = 'saving…'; }
function showSaved()  { document.getElementById('asdot').classList.add('saved');    document.getElementById('aslbl').textContent = 'saved'; }
