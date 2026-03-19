// ── search.js ─────────────────────────────────────────────────
// Global search across tasks and notes via the topbar input.
// ──────────────────────────────────────────────────────────────

const searchInput   = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  if (!q) { searchResults.classList.remove('open'); return; }
  const ql    = q.toLowerCase();
  const tasks = S.tasks.filter(t => !t.completedAt && (t.title || '').toLowerCase().includes(ql)).slice(0, 5);
  const notes = S.notes.filter(n => (n.title || '').toLowerCase().includes(ql) || (n.content || '').replace(/<[^>]*>/g, '').toLowerCase().includes(ql)).slice(0, 6);
  if (!tasks.length && !notes.length) {
    searchResults.innerHTML = '<div class="sr-empty">No results</div>';
    searchResults.classList.add('open'); return;
  }
  let html = '';
  if (tasks.length) {
    html += '<div class="sr-section">Tasks</div>';
    tasks.forEach(t => {
      const cls = taskClass(t);
      html += `<div class="sr-item" onclick="jumpToTask('${t.id}')"><span class="sr-icon" style="color:${cls==='ov'?'var(--red)':cls==='td'?'var(--amber)':'var(--text3)'}">☐</span><span class="sr-title">${esc(t.title)}</span><span class="sr-meta">${t.due ? fmtDate(t.due) : ''}</span></div>`;
    });
  }
  if (notes.length) {
    html += '<div class="sr-section">Notes</div>';
    notes.forEach(n => {
      const td = NT[n.type] || { icon:'○' };
      html += `<div class="sr-item" onclick="openNote('${n.id}');closeSearch()"><span class="sr-icon">${td.icon}</span><span class="sr-title">${esc(n.title||'Untitled')}</span><span class="sr-meta">${fmtAge(n.updatedAt)}</span></div>`;
    });
  }
  searchResults.innerHTML = html; searchResults.classList.add('open');
});

searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });
document.addEventListener('click', e => { if (!document.getElementById('search-wrap').contains(e.target)) closeSearch(); });

function closeSearch() { searchInput.value = ''; searchResults.classList.remove('open'); }

function jumpToTask(id) {
  closeSearch();
  showView('dashboard');
  setTimeout(() => {
    const el = document.querySelector(`.tcard[data-id="${id}"]`);
    if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.style.outline = '1px solid var(--accent)'; setTimeout(() => el.style.outline = '', 1500); }
  }, 100);
}
